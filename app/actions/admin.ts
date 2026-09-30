"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { createResetToken, resetUrl } from "@/lib/resetTokens";

const StatusInput = z.object({
  userId: z.string().min(1),
  status: z.enum(["ACTIVE", "SUSPENDED"]),
});

export async function setAccountStatus(formData: FormData) {
  const admin = await requireAdmin();

  const parsed = StatusInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error("Datos inválidos");
  const { userId, status } = parsed.data;

  if (userId === admin.userId) {
    throw new Error("No puedes suspender tu propia cuenta de administrador.");
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      status,
      suspendedAt: status === "SUSPENDED" ? new Date() : null,
    },
  });

  revalidatePath("/admin");
  revalidatePath(`/admin/cuentas/${userId}`);
}

const TierInput = z.object({
  userId: z.string().min(1),
  tier: z.enum(["FREE", "PRO", "UNLIMITED"]),
});

export async function assignTier(formData: FormData) {
  await requireAdmin();

  const parsed = TierInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error("Datos inválidos");
  const { userId, tier } = parsed.data;

  await prisma.user.update({
    where: { id: userId },
    data: { tier, tierUpdatedAt: new Date() },
  });

  revalidatePath("/admin");
  revalidatePath(`/admin/cuentas/${userId}`);
}

const ResetInput = z.object({
  userId: z.string().min(1),
});

/**
 * Generates a password reset link to share by hand (e.g. over WhatsApp).
 * Single use, valid for 1 hour.
 */
export async function generateResetLink(formData: FormData) {
  await requireAdmin();

  const parsed = ResetInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false as const, error: "Datos inválidos" };

  const user = await prisma.user.findUnique({
    where: { id: parsed.data.userId },
    select: { email: true },
  });
  if (!user) return { ok: false as const, error: "Cuenta no encontrada" };

  const token = await createResetToken(user.email);
  return { ok: true as const, url: await resetUrl(user.email, token) };
}

const NoteInput = z.object({
  userId: z.string().min(1),
  note: z.string().max(2000),
});

export async function saveAdminNote(formData: FormData) {
  await requireAdmin();

  const parsed = NoteInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error("Datos inválidos");
  const { userId, note } = parsed.data;

  await prisma.user.update({
    where: { id: userId },
    data: { adminNotes: note.trim() || null },
  });

  revalidatePath(`/admin/cuentas/${userId}`);
}
