"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, requireAdmin } from "@/lib/auth";
import { OPEN_STATUSES, MAX_OPEN_REQUESTS } from "@/lib/featureRequests";

const FeatureRequestInput = z.object({
  title: z
    .string()
    .trim()
    .min(4, "El título es demasiado corto")
    .max(120, "El título no puede pasar de 120 caracteres"),
  description: z
    .string()
    .trim()
    .min(10, "Cuéntanos un poco más sobre lo que necesitas")
    .max(2000, "La descripción no puede pasar de 2000 caracteres"),
});

/** A nutritionist submits a feature request. */
export async function createFeatureRequest(formData: FormData) {
  const { userId } = await requireUser();

  const parsed = FeatureRequestInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join(", ") };
  }

  const openCount = await prisma.featureRequest.count({
    where: { userId, status: { in: OPEN_STATUSES } },
  });
  if (openCount >= MAX_OPEN_REQUESTS) {
    return {
      ok: false,
      error: "Tienes demasiadas solicitudes pendientes de revisión. Espera a que revisemos las anteriores.",
    };
  }

  await prisma.featureRequest.create({ data: { userId, ...parsed.data } });

  revalidatePath("/sugerencias");
  revalidatePath("/", "layout"); // badge for new requests in the admin sidebar
  return { ok: true as const };
}

const AdminFeatureRequestInput = z.object({
  requestId: z.string().min(1),
  status: z.enum(["NEW", "IN_REVIEW", "APPROVED", "REJECTED", "IMPLEMENTED"]),
  response: z.string().max(2000),
});

/** The admin changes a request's status and/or writes the visible response. */
export async function updateFeatureRequestAdmin(formData: FormData) {
  await requireAdmin();

  const parsed = AdminFeatureRequestInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error("Datos inválidos");
  const { requestId, status, response } = parsed.data;

  const text = response.trim();
  await prisma.featureRequest.update({
    where: { id: requestId },
    data: {
      status,
      adminResponse: text || null,
      respondedAt: text ? new Date() : null,
    },
  });

  revalidatePath("/admin/solicitudes");
  revalidatePath("/admin");
  revalidatePath("/sugerencias");
  revalidatePath("/", "layout");
}
