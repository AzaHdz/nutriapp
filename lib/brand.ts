/**
 * Single source of truth for the product's name.
 *
 * To rebrand: change `name` here, then (optionally) the non-code places listed
 * in README.md → "Rebranding". Everything user-facing (UI, page titles, PDF,
 * emails, error messages) reads from this file.
 *
 * The domain is not hard-coded anywhere: absolute links (e.g. password reset)
 * are built from the incoming request's host, so a custom domain only needs to
 * be added in Vercel. The email sender comes from EMAIL_FROM once you verify
 * that domain in Resend.
 */
const name = "NutriApp";

export const BRAND = {
  name,
  tagline: "Nutrición asistida por IA",
  description: "Expedientes, consultas y planes alimenticios con IA para nutriólogos",
  /** Default sender; override with EMAIL_FROM (e.g. "NutriApp <hola@tudominio.com>"). */
  emailFrom: process.env.EMAIL_FROM ?? `${name} <onboarding@resend.dev>`,
} as const;
