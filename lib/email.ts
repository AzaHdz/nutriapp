import { Resend } from "resend";
import { BRAND } from "@/lib/brand";

/**
 * Sends the password reset email. Without AUTH_RESEND_KEY (dev), it prints the
 * link to the server log so the flow can still be completed.
 * Note: Resend's free key without a verified domain only delivers to the account
 * owner; sending to anyone else requires a verified domain.
 */
export async function sendResetEmail(email: string, url: string): Promise<void> {
  const key = process.env.AUTH_RESEND_KEY;

  if (!key) {
    console.log(`[reset-password] Link para ${email}: ${url}`);
    return;
  }

  try {
    const resend = new Resend(key);
    await resend.emails.send({
      from: BRAND.emailFrom,
      to: email,
      subject: `Restablece tu contraseña de ${BRAND.name}`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #1a1a1a;">Restablece tu contraseña</h2>
          <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta de ${BRAND.name}.</p>
          <p style="margin: 24px 0;">
            <a href="${url}" style="background: #16a34a; color: #fff; padding: 12px 24px; border-radius: 999px; text-decoration: none; font-weight: 600;">
              Crear nueva contraseña
            </a>
          </p>
          <p style="color: #666; font-size: 13px;">
            El link es válido por 1 hora y solo puede usarse una vez.
            Si no solicitaste este cambio, ignora este correo — tu contraseña actual sigue funcionando.
          </p>
        </div>
      `,
    });
  } catch (e) {
    // Don't leak the failure to the user (the flow always answers generically)
    console.error("[reset-password] Error enviando correo:", e);
  }
}
