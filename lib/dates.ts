/** Appointment dates, always in Mexico time.
 *
 *  The app is deployed on Vercel, where the server runs in UTC. Formatting a
 *  `Date` without pinning a time zone draws a 21:00 appointment on the next day.
 *  Everything that touches appointments goes through here; `lib/format.ts` still
 *  serves the rest of the app, which does not depend on the time of day.
 *
 *  In the DB `startsAt` is always a UTC instant. The zone is only applied when
 *  interpreting what the nutritionist types and when rendering it. */

export const TIME_ZONE = "America/Mexico_City";

const twoDigits = (n: number) => String(n).padStart(2, "0");

/** Splits an instant into the calendar values seen in Mexico. */
function partsInZone(d: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(d);

  const v = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  // `hour12: false` can return 24 instead of 0 for midnight.
  const hour = v("hour") % 24;
  return { year: v("year"), month: v("month"), day: v("day"), hour, minute: v("minute"), second: v("second") };
}

/** Minutes the zone is ahead of UTC at that instant (Mexico: −360). */
function offsetMin(instant: Date): number {
  const p = partsInZone(instant);
  const asIfUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return (asIfUtc - instant.getTime()) / 60_000;
}

/** "2026-08-10" + "21:00" read as Mexico time → the UTC instant to store.
 *
 *  Mexico abolished daylight saving time in 2022, so the offset is fixed today;
 *  it is still computed for the concrete instant so we don't depend on that fact. */
export function toUtc(isoDate: string, timeHHmm: string): Date {
  const [year, month, day] = isoDate.split("-").map(Number);
  const [hour, minute] = timeHHmm.split(":").map(Number);
  const tentative = Date.UTC(year, month - 1, day, hour, minute);
  return new Date(tentative - offsetMin(new Date(tentative)) * 60_000);
}

/** Calendar day the instant belongs to in Mexico: "2026-08-10".
 *  It is the key used to group appointments into the grid cells. */
export function dayKey(d: Date): string {
  const p = partsInZone(d);
  return `${p.year}-${twoDigits(p.month)}-${twoDigits(p.day)}`;
}

/** First instant (UTC) of the given calendar day. */
export function startOfDay(key: string): Date {
  return toUtc(key, "00:00");
}

/** Instant the day ends: the start of the next one. For range queries like
 *  `{ gte: startOfDay(a), lt: endOfDay(b) }` without dropping the last night. */
export function endOfDay(key: string): Date {
  return toUtc(key, "24:00"); // Date.UTC normalizes hour 24 to the next day
}

export function todayKey(): string {
  return dayKey(new Date());
}

/** Time an appointment ends, already in the zone: "10:00". */
export function endTimeInZone(startsAt: Date, durationMin: number): string {
  return timeInZone(new Date(startsAt.getTime() + durationMin * 60_000));
}

/** "21:00" */
export function timeInZone(d: Date): string {
  const p = partsInZone(d);
  return `${twoDigits(p.hour)}:${twoDigits(p.minute)}`;
}

/** "lun 10 ago, 21:00" */
export function dateTimeInZone(d: Date): string {
  const label = new Intl.DateTimeFormat("es-MX", {
    timeZone: TIME_ZONE,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(d);
  return `${label}, ${timeInZone(d)}`;
}

/** "lunes 10 de agosto de 2026", for the reminder message.
 *  The comma es-MX adds after the weekday is removed: inside a running sentence
 *  ("tu cita el lunes, 10 de agosto") it reads oddly. */
export function longDateInZone(d: Date): string {
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
    .format(d)
    .replace(",", "");
}

/** "agosto 2026", the grid header. The values are pure calendar values already
 *  built in UTC, so they are formatted in UTC so they don't shift. */
export function monthName(year: number, month: number): string {
  return new Intl.DateTimeFormat("es-MX", { timeZone: "UTC", month: "long", year: "numeric" }).format(
    new Date(Date.UTC(year, month - 1, 1))
  );
}

/** "YYYY-MM-DD" to prefill an `<input type="date">`.
 *
 *  Read in UTC on purpose: a date input sends "1992-03-15", which `z.coerce.date()`
 *  turns into UTC midnight. Reading it in another zone would shift it a day back.
 *  This applies to pure calendar dates (birth date), not to instants with a time
 *  like `Appointment.startsAt`; those use `dayKey`. */
export function dateForInput(d: Date): string {
  return `${d.getUTCFullYear()}-${twoDigits(d.getUTCMonth() + 1)}-${twoDigits(d.getUTCDate())}`;
}

export type DayCell = { key: string; day: number; inMonth: boolean };

/** The 6 weeks of the grid, Monday to Sunday, including the padding days from the
 *  previous and next month. Pure calendar arithmetic (all in UTC), independent of
 *  the zone: August 10 is August 10. */
export function monthGrid(year: number, month: number): DayCell[] {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const shift = (first.getUTCDay() + 6) % 7; // getUTCDay: 0 = Sunday → 0 = Monday

  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(Date.UTC(year, month - 1, 1 - shift + i));
    return {
      key: `${d.getUTCFullYear()}-${twoDigits(d.getUTCMonth() + 1)}-${twoDigits(d.getUTCDate())}`,
      day: d.getUTCDate(),
      inMonth: d.getUTCFullYear() === year && d.getUTCMonth() === month - 1,
    };
  });
}

export const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"] as const;

/** Previous and next month, for the ‹ › header links. */
export function adjacentMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const d = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
}

/** "2026-08" → { year, month }. Returns the current month if the value is invalid. */
export function parseMonth(value?: string): { year: number; month: number } {
  const m = value?.match(/^(\d{4})-(\d{2})$/);
  if (m) {
    const year = Number(m[1]);
    const month = Number(m[2]);
    if (month >= 1 && month <= 12) return { year, month };
  }
  const p = partsInZone(new Date());
  return { year: p.year, month: p.month };
}

export function monthKey(year: number, month: number): string {
  return `${year}-${twoDigits(month)}`;
}
