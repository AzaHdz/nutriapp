"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { BacklogPriority, BacklogStatus, BacklogType, BugSeverity } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { OPEN_BACKLOG_STATUSES, REQUESTED_BY_PREFIX, RESOLVED_STATUSES } from "@/lib/backlog";
import { IMPLEMENTED_ON_DONE_STATUSES } from "@/lib/featureRequests";
import { TIME_ZONE } from "@/lib/dates";

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

/** Backlog changes that also touch feature requests (links, cascaded statuses). */
function revalidateBacklogAndRequests() {
  revalidateBacklog();
  revalidatePath("/admin/solicitudes");
  revalidatePath("/sugerencias");
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
 * - Into DONE: also saves resolution and commitRef, and marks its linked feature
 *   requests that are still NEW / IN_REVIEW / APPROVED as IMPLEMENTED, in the
 *   same transaction. Their adminResponse is left untouched.
 * - Into WONT_FIX or reopening: linked requests are not changed.
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

  const updateItem = prisma.backlogItem.update({
    where: { id },
    data: {
      status,
      resolvedAt: resolved ? (wasResolved && current.resolvedAt) || new Date() : null,
      ...(status === "DONE" && { resolution, commitRef }),
    },
  });

  if (status === "DONE") {
    await prisma.$transaction([
      updateItem,
      prisma.featureRequest.updateMany({
        where: { backlogItemId: id, status: { in: IMPLEMENTED_ON_DONE_STATUSES } },
        data: { status: "IMPLEMENTED" },
      }),
    ]);
  } else {
    await updateItem;
  }

  revalidateBacklogAndRequests();
  return { ok: true };
}

// ── Linking feature requests (/admin/solicitudes) ─────────────────────────
// Linking or unlinking never changes the request's status or response.

const RequestIdInput = z.object({ requestId: z.string().min(1) });

/** "22 de noviembre de 2026", in Mexico time (the server runs in UTC). */
function requestDate(d: Date) {
  return d.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: TIME_ZONE,
  });
}

/** Thrown inside the transaction to roll back when the request got linked meanwhile. */
class LinkConflict extends Error {}

/**
 * Creates a backlog item (IMPROVEMENT, P3, TODO) from a feature request and links
 * the request to it. The description ends with who asked and when.
 */
export async function createBacklogItemFromRequest(formData: FormData): Promise<BacklogActionResult> {
  await requireAdmin();

  const parsed = RequestIdInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: "Datos inválidos" };
  const { requestId } = parsed.data;

  const request = await prisma.featureRequest.findUnique({
    where: { id: requestId },
    select: {
      title: true,
      description: true,
      createdAt: true,
      backlogItemId: true,
      user: { select: { name: true, email: true } },
    },
  });
  if (!request) return { ok: false, error: "La solicitud ya no existe" };
  if (request.backlogItemId) return { ok: false, error: "La solicitud ya está ligada a un item" };

  const footer = `${REQUESTED_BY_PREFIX}${request.user.name || request.user.email} el ${requestDate(request.createdAt)}`;

  const linked = await prisma.$transaction(async (tx) => {
    const item = await tx.backlogItem.create({
      data: {
        type: "IMPROVEMENT",
        priority: "P3",
        status: "TODO",
        title: request.title,
        description: `${request.description.trim()}\n\n${footer}`,
      },
    });
    // Only link if nobody linked it in the meantime; otherwise roll the item back.
    const { count } = await tx.featureRequest.updateMany({
      where: { id: requestId, backlogItemId: null },
      data: { backlogItemId: item.id },
    });
    if (count === 0) throw new LinkConflict();
    return true;
  }).catch((e) => {
    if (e instanceof LinkConflict) return false;
    throw e;
  });
  if (!linked) return { ok: false, error: "La solicitud ya está ligada a un item" };

  revalidateBacklogAndRequests();
  return { ok: true };
}

const LinkInput = RequestIdInput.extend({
  backlogItemId: z.string().min(1, "Elige un item del backlog"),
});

/** Links a request to an existing open item (several nutritionists asking for the same thing). */
export async function linkFeatureRequestToBacklog(formData: FormData): Promise<BacklogActionResult> {
  await requireAdmin();

  const parsed = LinkInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const { requestId, backlogItemId } = parsed.data;

  const item = await prisma.backlogItem.findUnique({
    where: { id: backlogItemId },
    select: { status: true },
  });
  if (!item) return { ok: false, error: "El item del backlog ya no existe" };
  if (!OPEN_BACKLOG_STATUSES.includes(item.status)) {
    return { ok: false, error: "Solo se puede ligar a items abiertos" };
  }

  const { count } = await prisma.featureRequest.updateMany({
    where: { id: requestId },
    data: { backlogItemId },
  });
  if (count === 0) return { ok: false, error: "La solicitud ya no existe" };

  revalidateBacklogAndRequests();
  return { ok: true };
}

/** Removes the link between a request and its backlog item. */
export async function unlinkFeatureRequestFromBacklog(formData: FormData): Promise<BacklogActionResult> {
  await requireAdmin();

  const parsed = RequestIdInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: "Datos inválidos" };

  await prisma.featureRequest.updateMany({
    where: { id: parsed.data.requestId },
    data: { backlogItemId: null },
  });

  revalidateBacklogAndRequests();
  return { ok: true };
}
