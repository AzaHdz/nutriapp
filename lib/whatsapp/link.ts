/** wa.me links for appointment reminders.
 *
 *  No API or keys: `wa.me` just opens WhatsApp with the message prefilled and the
 *  nutritionist presses send. Automatic sending (WhatsApp Cloud API) is a later phase.
 *
 *  The patient's phone is captured as free text and was never validated, so it is
 *  normalized to E.164 here with enough tolerance for what people actually type. */

import { longDateInZone, timeInZone } from "@/lib/dates";

/** Free text → Mexican E.164 without the `+` (`525512345678`), or null if impossible.
 *
 *  Accepts "55 1234 5678", "(55) 1234-5678", "+52 55 1234 5678" and the old WhatsApp
 *  format with a 1 after the 52 ("52 1 55 ..."), no longer used but still stored in
 *  many address books. */
export function normalizeMxPhone(raw?: string | null): string | null {
  if (!raw) return null;

  let d = raw.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2); // old-style international prefix

  if (d.length === 10) return `52${d}`; // national number
  if (d.length === 12 && d.startsWith("52")) return d;
  if (d.length === 13 && d.startsWith("521")) return `52${d.slice(3)}`;

  return null;
}

export function whatsAppLink(e164: string, message: string): string {
  return `https://wa.me/${e164}?text=${encodeURIComponent(message)}`;
}

/** First name only, so the greeting doesn't sound like an official letter. */
function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

/** Reminder message.
 *
 *  IMPORTANT: it must not carry any clinical data. Only name, when and with whom.
 *  The patient receives it on a channel we don't control, which anyone with access
 *  to their phone can read. */
export function reminderMessage({
  patientName,
  nutritionistName,
  startsAt,
}: {
  patientName: string;
  nutritionistName?: string | null;
  startsAt: Date;
}): string {
  const withWhom = nutritionistName?.trim() ? ` con ${nutritionistName.trim()}` : "";
  return (
    `Hola ${firstName(patientName)}, te recuerdo tu cita${withWhom} el ` +
    `${longDateInZone(startsAt)} a las ${timeInZone(startsAt)}. ` +
    `Si necesitas cambiarla, contéstame por aquí. ¡Nos vemos!`
  );
}
