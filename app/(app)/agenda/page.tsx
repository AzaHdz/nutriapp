import Link from "next/link";
import type { AppointmentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth, requireUser } from "@/lib/auth";
import { setAppointmentStatus } from "@/app/actions/appointments";
import { Card } from "@/components/ui/Card";
import { Badge, type Tone } from "@/components/ui/Badge";
import { Button, buttonVariants } from "@/components/ui/Button";
import { WhatsAppReminder } from "@/components/WhatsAppReminder";
import {
  WEEKDAYS,
  dayKey,
  monthKey,
  longDateInZone,
  endOfDay,
  timeInZone,
  endTimeInZone,
  todayKey,
  startOfDay,
  adjacentMonth,
  monthName,
  parseMonth,
  monthGrid,
} from "@/lib/dates";

const STATUS_BADGE: Record<AppointmentStatus, { label: string; tone: Tone }> = {
  SCHEDULED: { label: "Programada", tone: "neutral" },
  CONFIRMED: { label: "Confirmada", tone: "success" },
  CANCELLED: { label: "Cancelada", tone: "danger" },
  COMPLETED: { label: "Completada", tone: "info" },
};

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; dia?: string }>;
}) {
  const { userId } = await requireUser();
  const session = await auth();
  // `mes` and `dia` are URL query params, which stay in Spanish
  const sp = await searchParams;

  const { year, month } = parseMonth(sp.mes);
  const cells = monthGrid(year, month);
  const today = todayKey();
  const selectedDay = sp.dia && /^\d{4}-\d{2}-\d{2}$/.test(sp.dia) ? sp.dia : null;

  // A single query for the whole grid, including the padding days from the
  // neighboring months that do get drawn.
  const appointments = await prisma.appointment.findMany({
    where: {
      userId,
      startsAt: { gte: startOfDay(cells[0].key), lt: endOfDay(cells[41].key) },
    },
    include: { patient: { select: { id: true, name: true, phone: true } } },
    orderBy: { startsAt: "asc" },
  });

  // Grouped by their day in Mexico, not by the instant's UTC day
  const byDay = new Map<string, typeof appointments>();
  for (const a of appointments) {
    const k = dayKey(a.startsAt);
    const list = byDay.get(k);
    if (list) list.push(a);
    else byDay.set(k, [a]);
  }

  const prevMonth = adjacentMonth(year, month, -1);
  const nextMonth = adjacentMonth(year, month, 1);
  const dayAppointments = selectedDay ? (byDay.get(selectedDay) ?? []) : [];
  const activeCount = appointments.filter((a) => a.status !== "CANCELLED").length;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-[26px] font-bold tracking-tight text-text">
          Agenda{" "}
          <span className="font-mono text-sm font-medium text-text-3">
            {activeCount} cita{activeCount === 1 ? "" : "s"}
          </span>
        </h1>
        <Link
          href={`/agenda/nueva?dia=${selectedDay ?? today}`}
          className={buttonVariants({ size: "sm" })}
        >
          + Nueva cita
        </Link>
      </div>

      {/* Month navigation */}
      <div className="flex items-center gap-2">
        <Link
          href={`/agenda?mes=${monthKey(prevMonth.year, prevMonth.month)}`}
          aria-label="Mes anterior"
          className={buttonVariants({ variant: "secondary", size: "sm", className: "px-3" })}
        >
          ‹
        </Link>
        {/* first-letter, not capitalize: "agosto de 2026" must become "Agosto de 2026",
            not "Agosto De 2026" */}
        <span className="min-w-[9.5rem] text-center font-display text-[15px] font-bold text-text first-letter:uppercase">
          {monthName(year, month)}
        </span>
        <Link
          href={`/agenda?mes=${monthKey(nextMonth.year, nextMonth.month)}`}
          aria-label="Mes siguiente"
          className={buttonVariants({ variant: "secondary", size: "sm", className: "px-3" })}
        >
          ›
        </Link>
        <Link
          href={`/agenda?dia=${today}`}
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          Hoy
        </Link>
      </div>

      {/* Grid */}
      <Card className="overflow-hidden">
        <div className="grid grid-cols-7 border-b border-border bg-surface-2">
          {WEEKDAYS.map((d) => (
            <div
              key={d}
              className="px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-text-3"
            >
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {cells.map((cell) => {
            const cellAppointments = byDay.get(cell.key) ?? [];
            const isToday = cell.key === today;
            const isSelected = cell.key === selectedDay;

            return (
              <Link
                key={cell.key}
                href={`/agenda?mes=${monthKey(year, month)}&dia=${cell.key}`}
                aria-current={isSelected ? "date" : undefined}
                className={`min-h-[96px] border-b border-r border-border p-1.5 transition-colors last:border-r-0 ${
                  isSelected ? "bg-primary-soft" : cell.inMonth ? "hover:bg-surface-3" : "bg-surface-2"
                }`}
              >
                <span
                  className={`inline-flex size-6 items-center justify-center rounded-pill font-mono text-[11.5px] tabular-nums ${
                    isToday
                      ? "bg-primary font-bold text-on-primary"
                      : cell.inMonth
                        ? "text-text-2"
                        : "text-text-3"
                  }`}
                >
                  {cell.day}
                </span>

                <div className="mt-1 flex flex-col gap-0.5">
                  {cellAppointments.slice(0, 3).map((c) => (
                    <span
                      key={c.id}
                      className={`truncate rounded-chip px-1 py-px text-[10.5px] ${
                        c.status === "CANCELLED"
                          ? "text-text-3 line-through"
                          : "bg-surface-3 text-text-2"
                      }`}
                    >
                      {/* On mobile the cell is ~48px wide: the name doesn't fit and
                          would crowd everything out. The time alone reads fine. */}
                      <span className="font-mono tabular-nums">{timeInZone(c.startsAt)}</span>
                      <span className="hidden sm:inline"> {c.patient.name.split(" ")[0]}</span>
                    </span>
                  ))}
                  {cellAppointments.length > 3 && (
                    <span className="px-1 text-[10.5px] font-semibold text-primary">
                      +{cellAppointments.length - 3} más
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </Card>

      {appointments.length === 0 && (
        <p className="text-center text-sm text-text-3">
          Sin citas en {monthName(year, month)}. Usa “+ Nueva cita” para agendar la primera.
        </p>
      )}

      {/* Selected day detail */}
      {selectedDay && (
        <Card className="overflow-hidden">
          <div className="flex items-baseline justify-between border-b border-border bg-surface-2 px-5 py-3">
            <span className="font-display text-[15px] font-bold text-text first-letter:uppercase">
              {longDateInZone(startOfDay(selectedDay))}
            </span>
            <span className="font-mono text-xs text-text-3">
              {dayAppointments.length} cita{dayAppointments.length === 1 ? "" : "s"}
            </span>
          </div>

          {dayAppointments.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-sm text-text-3">No hay citas este día.</p>
              <Link
                href={`/agenda/nueva?dia=${selectedDay}`}
                className={buttonVariants({ variant: "secondary", size: "sm", className: "mt-3" })}
              >
                Agendar una
              </Link>
            </div>
          ) : (
            dayAppointments.map((c) => (
              <div key={c.id} className="border-b border-border px-5 py-4 last:border-0">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  <span className="font-mono text-[13px] font-semibold tabular-nums text-text">
                    {timeInZone(c.startsAt)} – {endTimeInZone(c.startsAt, c.durationMin)}
                  </span>
                  <Link
                    href={`/pacientes/${c.patient.id}`}
                    className="text-sm font-semibold text-text hover:underline"
                  >
                    {c.patient.name}
                  </Link>
                  <Badge tone={STATUS_BADGE[c.status].tone}>{STATUS_BADGE[c.status].label}</Badge>
                </div>

                {c.notes && <p className="mt-1.5 text-[12.5px] text-text-2">{c.notes}</p>}

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {c.status !== "CANCELLED" && (
                    <WhatsAppReminder
                      patientName={c.patient.name}
                      phone={c.patient.phone}
                      nutritionistName={session?.user?.name}
                      startsAt={c.startsAt}
                    />
                  )}

                  {c.status === "SCHEDULED" && (
                    <StatusAction appointmentId={c.id} status="CONFIRMED" label="Confirmar" />
                  )}
                  {(c.status === "SCHEDULED" || c.status === "CONFIRMED") && (
                    <>
                      <StatusAction appointmentId={c.id} status="COMPLETED" label="Completar" />
                      <Link
                        href={`/agenda/${c.id}/editar`}
                        className={buttonVariants({ variant: "ghost", size: "sm" })}
                      >
                        Reprogramar
                      </Link>
                      <StatusAction
                        appointmentId={c.id}
                        status="CANCELLED"
                        label="Cancelar"
                        variant="ghost"
                      />
                    </>
                  )}
                  {c.status === "CANCELLED" && (
                    <StatusAction appointmentId={c.id} status="SCHEDULED" label="Reactivar" />
                  )}
                  {c.status === "COMPLETED" && (
                    <Link
                      href={`/consultas/nueva?paciente=${c.patient.id}`}
                      className={buttonVariants({ size: "sm" })}
                    >
                      + Nueva consulta
                    </Link>
                  )}
                </div>
              </div>
            ))
          )}
        </Card>
      )}
    </div>
  );
}

function StatusAction({
  appointmentId,
  status,
  label,
  variant = "secondary",
}: {
  appointmentId: string;
  status: AppointmentStatus;
  label: string;
  variant?: "secondary" | "ghost";
}) {
  return (
    <form action={setAppointmentStatus}>
      <input type="hidden" name="appointmentId" value={appointmentId} />
      <input type="hidden" name="status" value={status} />
      <Button type="submit" variant={variant} size="sm">
        {label}
      </Button>
    </form>
  );
}
