/** Avatar initials: first letter of the first and last words. */
export function initials(name?: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] ?? "" : "";
  return (first + last).toUpperCase();
}

/** Short es-MX date: "02 jul 2026". */
export function formatShortDate(d: Date): string {
  return d.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Long es-MX date: "viernes 17 de julio de 2026". */
export function formatLongDate(d: Date): string {
  return d.toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Spanish labels for the Gender enum, lowercase to fit inside a sentence. */
export const GENDER_LABELS = {
  FEMALE: "femenino",
  MALE: "masculino",
  OTHER: "otro",
} as const;
