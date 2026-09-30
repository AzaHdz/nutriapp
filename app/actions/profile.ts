"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

const ProfileInput = z.object({
  name: z.string().min(2, "El nombre es demasiado corto"),
  licenseNumber: z.string().max(30).optional().or(z.literal("")),
  logoUrl: z.string().url("La URL del logo no es válida").optional().or(z.literal("")),
  promptStyle: z.string().max(1500, "Máximo 1500 caracteres").optional().or(z.literal("")),
});

/** Updates the nutritionist's profile (the data in the PDF header). */
export async function updateProfile(formData: FormData) {
  const { userId } = await requireUser();

  const parsed = ProfileInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join(", ") };
  }
  const d = parsed.data;

  await prisma.user.update({
    where: { id: userId },
    data: {
      name: d.name,
      licenseNumber: d.licenseNumber || null,
      logoUrl: d.logoUrl || null,
      promptStyle: d.promptStyle?.trim() || null,
    },
  });

  // Refreshes the sidebar name (layout) and the PDF data
  revalidatePath("/", "layout");
  return { ok: true as const };
}
