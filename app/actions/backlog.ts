"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { BacklogPriority, BacklogStatus, BacklogType, BugSeverity } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { RESOLVED_STATUSES } from "@/lib/backlog";

export type BacklogActionResult = { ok: true } | { ok: false; error: string };

/** Optional text field: trimmed, and "" (or a missing field) becomes null. */
const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} no puede pasar de ${max} caracteres`)
    .optional()
    .transform((v) => v || null);

/** Optional enum from a <select>: "" means "not set". */
const optionalEnum = <T extends Record<string, string>>(values: T) =>
  z.preprocess((v) => (v === "" ? undefined : v), z.enum(values).optional());

const BacklogItemFields = z.object({
  type: z.enum(BacklogType),
  title: z
    .string()
    .trim()
    .min(3, "El título es demasiado corto")
    .max(160, "El título no puede pasar de 160 caracteres"),
  description: z
    .string()
    .trim()
    .max(5000, "La descripción no puede pasar de 5000 caracteres")
    .optional()
    .transform((v) => v ?? ""),
  priority: z.enum(BacklogPriority).default("P3"),
  severity: optionalEnum(BugSeverity),
  area: optionalText(60, "El área"),
  stepsToRepro: optionalText(5000, "Los pasos"),
  pageUrl: optionalText(2000, "La URL"),
  userAgent: optionalText(500, "El user agent"),
  viewport: z
    .preprocess(
      (v) => (v === "" ? undefined : v),
      z.string().regex(/^\d{1,5}x\d{1,5}$/, "Viewport inválido").optional(),
    )
    .transform((v) => v ?? null),
});

function firstError(error: z.ZodError) {
  return error.issues.map((i) => i.message).join(", ");
}

/** Severity only applies to bugs; drop it for other types. */
function normalize(data: z.infer<typeof BacklogItemFields>) {
  return { ...data, severity: data.type === "BUG" ? (data.severity ?? null) : null };
}

function revalidateBacklog() {
  revalidatePath("/admin/backlog");
  revalidatePath("/admin");
  revalidatePath("/", "layout"); // INBOX badge in the admin nav
}

/** Creates an item (from /admin/backlog or the floating quick-capture button). Always INBOX. */
export async function createBacklogItem(formData: FormData): Promise<BacklogActionResult> {
  await requireAdmin();

  const parsed = BacklogItemFields.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };

  await prisma.backlogItem.create({ data: { ...normalize(parsed.data), status: "INBOX" } });

  revalidateBacklog();
  return { ok: true };
}

const UpdateInput = BacklogItemFields.extend({ id: z.string().min(1) });

/** Edits an item's fields. Status is changed separately (updateBacklogStatus). */
export async function updateBacklogItem(formData: FormData): Promise<BacklogActionResult> {
  await requireAdmin();

  const parsed = UpdateInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const { id, ...data } = parsed.data;

  // The edit form doesn't carry the auto-captured context: keep what's stored.
  const { pageUrl, userAgent, viewport, ...editable } = normalize(data);
  await prisma.backlogItem.update({
    where: { id },
    data: {
      ...editable,
      ...(formData.has("pageUrl") && { pageUrl }),
      ...(formData.has("userAgent") && { userAgent }),
      ...(formData.has("viewport") && { viewport }),
    },
  });

  revalidateBacklog();
  return { ok: true };
}

const StatusInput = z.object({
  id: z.string().min(1),
  status: z.enum(BacklogStatus),
  resolution: optionalText(5000, "La resolución"),
  commitRef: optionalText(200, "El commit"),
});

/**
 * Moves an item to another status.
 * - Into DONE or WONT_FIX: stamps resolvedAt (kept if it was already resolved).
 * - Back to an open status: clears resolvedAt.
 * - Into DONE: also saves resolution and commitRef.
 */
export async function updateBacklogStatus(formData: FormData): Promise<BacklogActionResult> {
  await requireAdmin();

  const parsed = StatusInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const { id, status, resolution, commitRef } = parsed.data;

  const current = await prisma.backlogItem.findUnique({
    where: { id },
    select: { status: true, resolvedAt: true },
  });
  if (!current) return { ok: false, error: "El elemento ya no existe" };

  const resolved = RESOLVED_STATUSES.includes(status);
  const wasResolved = RESOLVED_STATUSES.includes(current.status);

  await prisma.backlogItem.update({
    where: { id },
    data: {
      status,
      resolvedAt: resolved ? (wasResolved && current.resolvedAt) || new Date() : null,
      ...(status === "DONE" && { resolution, commitRef }),
    },
  });

  revalidateBacklog();
  return { ok: true };
}
