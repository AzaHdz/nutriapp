import Link from "next/link";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { auth } from "@/lib/auth";
import { formatLongDate } from "@/lib/format";
import { planKcal } from "@/lib/plan";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { buttonVariants } from "@/components/ui/Button";
import { TIER_LIMITS } from "@/lib/limits";
import { dayKey, dateTimeInZone, todayKey, startOfDay } from "@/lib/dates";

export default async function DashboardPage() {
  const { userId, tier } = await requireUser();
  const session = await auth();
  const displayName = session?.user?.name ?? "Doctor(a)";
  const monthlyLimit = TIER_LIMITS[tier].consultationsPerMonth;

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [
    totalPatients,
    newPatientsThisMonth,
    monthConsultations,
    totalConsultations,
    pendingApproval,
    recentConsultations,
    upcomingAppointments,
  ] = await Promise.all([
    prisma.patient.count({ where: { userId } }),
    prisma.patient.count({ where: { userId, createdAt: { gte: monthStart } } }),
    prisma.consultation.count({ where: { userId, createdAt: { gte: monthStart } } }),
    prisma.consultation.count({ where: { userId } }),
    prisma.consultation.findMany({
      where: { userId, finalPlan: { not: Prisma.DbNull }, approvedAt: null },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { patient: { select: { name: true } } },
    }),
    prisma.consultation.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { patient: { select: { name: true } } },
    }),
    // From the start of today in Mexico, not from "now": an appointment earlier
    // this morning is still part of today's schedule.
    prisma.appointment.findMany({
      where: {
        userId,
        status: { in: ["SCHEDULED", "CONFIRMED"] },
        startsAt: { gte: startOfDay(todayKey()) },
      },
      orderBy: { startsAt: "asc" },
      take: 5,
      include: { patient: { select: { id: true, name: true } } },
    }),
  ]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-[26px] font-bold tracking-tight text-text">
            {greeting}, {displayName.split(" ")[0]}
          </h1>
          <p className="mt-0.5 text-sm text-text-3">
            {formatLongDate(new Date())} · {monthConsultations} consulta{monthConsultations === 1 ? "" : "s"} este mes
          </p>
        </div>
        <div className="flex gap-2.5">
          <Link href="/pacientes/nuevo" className={buttonVariants({ variant: "secondary", size: "sm" })}>
            + Nuevo paciente
          </Link>
          <Link href="/pacientes" className={buttonVariants({ size: "sm" })}>
            + Nueva consulta
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Pacientes activos" value={totalPatients} note={`+${newPatientsThisMonth} este mes`} noteTone="success" />
        <StatCard
          label="Consultas este mes"
          value={monthConsultations}
          note={
            monthlyLimit === null
              ? "Sin límite en tu plan"
              : `de ${monthlyLimit} en tu plan ${TIER_LIMITS[tier].name}`
          }
          warning={monthlyLimit !== null && monthlyLimit - monthConsultations <= 1}
        />
        <StatCard
          label="Planes por aprobar"
          value={pendingApproval.length}
          note={pendingApproval.length ? "Revísalos abajo" : "Todo al día"}
          warning={pendingApproval.length > 0}
        />
        <StatCard label="Consultas totales" value={totalConsultations} note="Desde el inicio" />
      </div>

      {/* Body */}
      <div className="grid gap-4 lg:grid-cols-[1.55fr_1fr]">
        {/* Recent consultations */}
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <span className="font-display text-[15px] font-bold text-text">Consultas recientes</span>
            <Link href="/pacientes" className="text-xs font-semibold text-primary hover:underline">
              Ver pacientes
            </Link>
          </div>
          {recentConsultations.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-text-3">
              Aún no hay consultas. Da de alta un paciente y crea la primera.
            </p>
          ) : (
            recentConsultations.map((c) => (
              <Link
                key={c.id}
                href={`/consultas/${c.id}`}
                className="flex items-center gap-3.5 border-b border-border px-5 py-3 transition-colors last:border-0 hover:bg-surface-3"
              >
                <Avatar name={c.patient.name} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-semibold text-text">{c.patient.name}</div>
                  <div className="font-mono text-[11.5px] tabular-nums text-text-3">
                    {c.weight} kg · {c.createdAt.toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
                  </div>
                </div>
                {c.approvedAt ? (
                  <Badge tone="success">Aprobada</Badge>
                ) : c.finalPlan ? (
                  <Badge tone="warning">Borrador</Badge>
                ) : (
                  <Badge tone="neutral">Sin plan</Badge>
                )}
              </Link>
            ))
          )}
        </Card>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-warning-brd bg-warning-soft px-4.5 py-3.5">
              <span className="text-sm font-bold text-warning">Planes por aprobar</span>
              <span className="font-mono text-xs font-semibold text-warning">{pendingApproval.length}</span>
            </div>
            {pendingApproval.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-text-3">Nada pendiente. 🎉</p>
            ) : (
              pendingApproval.map((c) => {
                const kcal = planKcal(c.finalPlan);
                return (
                  <div key={c.id} className="flex items-center gap-2.5 border-b border-border px-4 py-3 last:border-0">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-semibold text-text">{c.patient.name}</div>
                      <div className="text-[11.5px] text-text-3">
                        {c.createdAt.toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
                        {kcal ? ` · ${kcal.toLocaleString("es-MX")} kcal` : ""}
                      </div>
                    </div>
                    <Link
                      href={`/consultas/${c.id}`}
                      className="rounded-pill border border-primary-soft-brd px-3 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary-soft"
                    >
                      Revisar
                    </Link>
                  </div>
                );
              })
            )}
          </Card>

          <Card className="overflow-hidden">
            <div className="flex items-baseline justify-between border-b border-border px-4.5 py-3.5">
              <span className="font-display text-[15px] font-bold text-text">Próximas citas</span>
              <Link href="/agenda" className="text-xs font-semibold text-primary hover:underline">
                Ver agenda
              </Link>
            </div>
            {upcomingAppointments.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-text-3">
                No tienes citas agendadas.
              </p>
            ) : (
              upcomingAppointments.map((c) => (
                <Link
                  key={c.id}
                  href={`/agenda?dia=${dayKey(c.startsAt)}`}
                  className="flex items-center justify-between gap-3 border-b border-border px-4.5 py-3 transition-colors last:border-0 hover:bg-surface-3"
                >
                  <div className="min-w-0">
                    <div className="truncate text-[13.5px] font-semibold text-text">
                      {c.patient.name}
                    </div>
                    <div className="font-mono text-[11.5px] tabular-nums text-text-3">
                      {dateTimeInZone(c.startsAt)}
                    </div>
                  </div>
                  {dayKey(c.startsAt) === todayKey() && <Badge tone="primary">Hoy</Badge>}
                </Link>
              ))
            )}
          </Card>

          <Card className="p-4.5">
            <div className="mb-2.5 text-sm font-bold text-text">Accesos rápidos</div>
            <div className="flex flex-col gap-2">
              <QuickLink href="/pacientes/nuevo" dot="primary" label="Registrar nuevo paciente" />
              <QuickLink href="/pacientes" dot="accent" label="Iniciar consulta con paciente" />
              <QuickLink href="/pacientes" dot="info" label="Ver expedientes" />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  note,
  noteTone,
  warning,
}: {
  label: string;
  value: number;
  note: string;
  noteTone?: "success";
  warning?: boolean;
}) {
  return (
    <Card className={`p-4.5 ${warning ? "border-warning-brd" : ""}`}>
      <div className={`text-[11px] font-semibold uppercase tracking-wide ${warning ? "text-warning" : "text-text-3"}`}>
        {label}
      </div>
      <div className={`mt-1.5 font-mono text-[26px] font-semibold tabular-nums ${warning ? "text-warning" : "text-text"}`}>
        {value}
      </div>
      <div className={`mt-0.5 text-[11.5px] ${noteTone === "success" ? "text-success" : "text-text-3"}`}>
        {note}
      </div>
    </Card>
  );
}

const dotColors = {
  primary: "bg-primary",
  accent: "bg-accent",
  info: "bg-info",
} as const;

function QuickLink({
  href,
  dot,
  label,
}: {
  href: string;
  dot: keyof typeof dotColors;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 rounded-ctl border border-border px-3 py-2.5 text-[13px] font-medium text-text transition-colors hover:bg-surface-3"
    >
      <span className={`size-[7px] rounded-full ${dotColors[dot]}`} />
      {label}
    </Link>
  );
}
