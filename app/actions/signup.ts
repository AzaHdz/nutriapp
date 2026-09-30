"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signIn } from "@/lib/auth";

const SignUpInput = z.object({
  name: z.string().min(2, "Nombre demasiado corto"),
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
});

/**
 * Open sign-up for the MVP. Before opening to more users (Phase 4),
 * switch to invitations or email verification.
 */
export async function signUp(formData: FormData) {
  const parsed = SignUpInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect(
      `/registro?error=${encodeURIComponent(parsed.error.issues[0].message)}`
    );
  }
  const { name, email, password } = parsed.data;
  const emailNorm = email.toLowerCase().trim();

  const existing = await prisma.user.findUnique({ where: { email: emailNorm } });
  if (existing) {
    redirect(`/registro?error=${encodeURIComponent("Ya existe una cuenta con ese email")}`);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.create({
    data: { name, email: emailNorm, passwordHash },
  });

  await signIn("credentials", {
    email: emailNorm,
    password,
    redirectTo: "/dashboard",
  });
}
