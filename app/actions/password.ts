"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createResetToken, consumeResetToken, resetUrl } from "@/lib/resetTokens";
import { sendResetEmail } from "@/lib/email";

const ResetRequestInput = z.object({
  email: z.string().email("Email inválido"),
});

/**
 * Requests a reset. The response is ALWAYS the same whether or not the account
 * exists (no enumeration of registered emails).
 */
export async function requestPasswordReset(formData: FormData) {
  const parsed = ResetRequestInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect(`/recuperar?error=${encodeURIComponent(parsed.error.issues[0].message)}`);
  }
  const email = parsed.data.email.toLowerCase().trim();

  const user = await prisma.user.findUnique({
    where: { email },
    select: { status: true, passwordHash: true },
  });

  if (user && user.status !== "SUSPENDED" && user.passwordHash) {
    const token = await createResetToken(email);
    await sendResetEmail(email, await resetUrl(email, token));
  }

  redirect("/recuperar?ok=1");
}

const ResetPasswordInput = z.object({
  email: z.string().email(),
  token: z.string().min(1),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
  confirmPassword: z.string(),
});

export async function resetPassword(formData: FormData) {
  const parsed = ResetPasswordInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect(`/recuperar?error=${encodeURIComponent("Solicitud inválida, pide un link nuevo")}`);
  }
  const { token, password, confirmPassword } = parsed.data;
  const email = parsed.data.email.toLowerCase().trim();

  if (password !== confirmPassword) {
    redirect(
      `/restablecer?email=${encodeURIComponent(email)}&token=${token}&error=${encodeURIComponent("Las contraseñas no coinciden")}`
    );
  }

  const valid = await consumeResetToken(email, token);
  if (!valid) {
    redirect(
      `/recuperar?error=${encodeURIComponent("El link es inválido o expiró. Solicita uno nuevo.")}`
    );
  }

  await prisma.user.update({
    where: { email },
    data: { passwordHash: await bcrypt.hash(password, 12) },
  });

  redirect("/login?ok=password-reset");
}
