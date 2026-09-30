/** Joins classes conditionally. Our primitives' variants never overlap,
 *  so a plain join is enough (no clsx or tailwind-merge). */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
