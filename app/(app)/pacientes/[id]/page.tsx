import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { ageInYears, bmi, classifyBmi } from "@/lib/calculations";
import { formatShortDate, GENDER_LABELS } from "@/lib/format";
import { dayKey, dateTimeInZone, todayKey, startOfDay } from "@/lib/dates";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { buttonVariants } from "@/components/ui/Button";
import { ProgressChart, type MetricSeries } from "@/components/ProgressChart";

const rangeText = { in: "text-range-in", out: "text-range-out", critical: "text-range-critical" } as const;

/** Chartable metrics. BMI is not stored: it is computed per consultation. Optional
 *  measurements return null and that consultation is skipped (no interpolation). */
const METRICS: {
  key: string;
  label: string;
  unit: string;
  value: (c: { weight: number; height: number; bodyFatPct: number | null; waist: number | null; hip: number | null; arm: number | null }) => number | null;
}[] = [
  { key: "weight", label: "Peso", unit: "kg", value: (c) => c.weight },
  { key: "bmi", label: "IMC", unit: "", value: (c) => bmi(c.weight, c.height) },
  { key: "bodyFat", label: "% grasa", unit: "%", value: (c) => c.bodyFatPct },
  { key: "waist", label: "Cintura", unit: "cm", value: (c) => c.waist },
  { key: "hip", label: "Cadera", unit: "cm", value: (c) => c.hip },
  { key: "arm", label: "Brazo", unit: "cm", value: (c) => c.arm },
];

export default async function PatientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { userId } = await requireUser();

  const patient = await prisma.patient.findFirst({
    where: { id, userId },
    include: { consultations: { orderBy: { createdAt: "desc" } } },
  });
  if (!patient) notFound();

  // This patient's upcoming appointments, from the start of today in Mexico
  const upcomingAppointments = await prisma.appointment.findMany({
    where: {
      userId,
      patientId: patient.id,
      status: { in: ["SCHEDULED", "CONFIRMED"] },
      startsAt: { gte: startOfDay(todayKey()) },
    },
    orderBy: { startsAt: "asc" },
    take: 3,
  });

  const consultations = patient.consultations;
  const latest = consultations[0];
  const previous = consultations[1];
  const chronological = [...consultations].reverse();
  const withPlan = consultations.filter((c) => c.finalPlan).length;

  // Chart series are built here so only plain serializable data reaches the
  // client. `t` is the timestamp, not the index: the X axis is proportional to
  // the time elapsed between consultations.
  const series: MetricSeries[] = METRICS.map((m) => ({
    key: m.key,
    label: m.label,
    unit: m.unit,
    points: chronological.flatMap((c) => {
      const value = m.value(c);
      return value == null
        ? []
        : [{ t: c.createdAt.getTime(), date: formatShortDate(c.createdAt), value }];
    }),
  }));

  const restrictions =
    latest?.restrictions && latest.restrictions !== "Sin restricciones declaradas"
      ? latest.restrictions.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean)
      : [];

  const bmiValue = latest ? bmi(latest.weight, latest.height) : null;
  const bmiClass = bmiValue != null ? classifyBmi(bmiValue) : null;

  const delta = (a?: number | null, b?: number | null) =>
    a != null && b != null ? a - b : null;

  const measurements = latest
    ? [
        { label: "Peso", value: latest.weight.toFixed(1), unit: "kg", d: delta(latest.weight, previous?.weight) },
        { label: "IMC", value: bmiValue!.toFixed(1), range: bmiClass!.range, note: bmiClass!.label },
        { label: "% grasa", value: latest.bodyFatPct?.toFixed(1) ?? "—", unit: latest.bodyFatPct != null ? "%" : "", d: delta(latest.bodyFatPct, previous?.bodyFatPct) },
        { label: "Cintura", value: latest.waist ?? "—", unit: latest.waist != null ? "cm" : "", d: delta(latest.waist, previous?.waist) },
        { label: "Cadera", value: latest.hip ?? "—", unit: latest.hip != null ? "cm" : "", d: delta(latest.hip, previous?.hip) },
        { label: "Brazo", value: latest.arm ?? "—", unit: latest.arm != null ? "cm" : "", d: delta(latest.arm, previous?.arm) },
      ]
    : [];

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb */}
      <div className="text-[12.5px] text-text-3">
        <Link href="/pacientes" className="hover:underline">Pacientes</Link>
        <span className="mx-1.5">/</span>
        <span className="font-semibold text-text">{patient.name}</span>
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-start gap-4">
        <Avatar name={patient.name} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-2xl font-bold tracking-tight text-text">{patient.name}</h1>
            <Badge tone="success">Activa</Badge>
          </div>
          <p className="mt-1 text-[13px] text-text-2">
            {ageInYears(patient.birthDate)} años · {GENDER_LABELS[patient.gender]} · Paciente desde{" "}
            {patient.createdAt.toLocaleDateString("es-MX", { month: "short", year: "numeric" })}
            {latest ? <> · Objetivo: <b className="text-text">{latest.goals}</b></> : null}
          </p>
          {restrictions.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-2">
              {restrictions.map((r, i) => (
                <Badge key={i} tone={/alergia|intoleranc/i.test(r) ? "danger" : "neutral"}>
                  {r}
                </Badge>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-2.5">
          {/* Ghost, not secondary: with three actions in the header, editing the
              details is the least frequent and shouldn't compete with the other two. */}
          <Link
            href={`/pacientes/${patient.id}/editar`}
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            Editar datos
          </Link>
          <Link
            href={`/agenda/nueva?paciente=${patient.id}`}
            className={buttonVariants({ variant: "secondary", size: "sm" })}
          >
            Agendar cita
          </Link>
          <Link href={`/consultas/nueva?paciente=${patient.id}`} className={buttonVariants({ size: "sm" })}>
            + Nueva consulta
          </Link>
        </div>
      </div>

      {/* Tabs (only Resumen works) */}
      <div className="flex gap-6 border-b border-border">
        <span className="border-b-2 border-primary pb-2.5 text-[13.5px] font-semibold text-primary">Resumen</span>
        <span className="pb-2.5 text-[13.5px] font-medium text-text-3">
          Consultas <span className="font-mono text-[11px]">{consultations.length}</span>
        </span>
        <span className="pb-2.5 text-[13.5px] font-medium text-text-3">
          Planes <span className="font-mono text-[11px]">{withPlan}</span>
        </span>
        <span className="cursor-not-allowed pb-2.5 text-[13.5px] font-medium text-text-3 opacity-60" title="Próximamente">
          Documentos
        </span>
      </div>

      {/* The right column always renders: a newly added patient has no
          consultations yet, but does have contact details, notes and maybe a
          booked appointment. The whole body used to hang off the else and vanish. */}
      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        {/* Left */}
        <div className="flex flex-col gap-4">
          {consultations.length === 0 ? (
            <p className="rounded-card border border-dashed border-border-strong p-8 text-center text-sm text-text-3">
              Sin consultas registradas. Crea la primera para ver la evolución.
            </p>
          ) : (
            <>
            <Card className="p-5">
              <div className="font-display text-[15px] font-bold text-text">Progreso</div>
              {/* The date range no longer sits in the header: the chart labels its
                  own ends under the X axis. */}
              <ProgressChart series={series} />
            </Card>

            <Card className="p-5">
              <div className="mb-3.5 font-display text-[15px] font-bold text-text">
                Última antropometría{" "}
                <span className="ml-1.5 text-xs font-normal text-text-3">{latest && formatShortDate(latest.createdAt)}</span>
              </div>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                {measurements.map((m) => (
                  <div key={m.label}>
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-text-3">{m.label}</div>
                    <div className={`mt-1 font-mono text-base font-semibold tabular-nums ${m.range ? rangeText[m.range] : "text-text"}`}>
                      {m.value}
                      {m.unit && <span className="text-[11px] font-normal text-text-3"> {m.unit}</span>}
                    </div>
                    {m.range ? (
                      <div className={`mt-0.5 text-[11px] font-semibold ${rangeText[m.range]}`}>{m.note}</div>
                    ) : m.d != null && Math.abs(m.d) > 0.01 ? (
                      <div className="mt-0.5 font-mono text-[11px] tabular-nums text-text-3">
                        {m.d > 0 ? "+" : ""}
                        {m.d.toFixed(1)}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </Card>
            </>
          )}
          </div>

          {/* Right: upcoming appointments + history */}
          <div className="flex flex-col gap-4">
            {upcomingAppointments.length > 0 && (
              <Card className="overflow-hidden">
                <div className="flex items-baseline justify-between border-b border-border px-5 py-4">
                  <span className="font-display text-[15px] font-bold text-text">Próximas citas</span>
                  <Link href="/agenda" className="text-xs font-semibold text-primary hover:underline">
                    Ver agenda
                  </Link>
                </div>
                {upcomingAppointments.map((c) => (
                  <Link
                    key={c.id}
                    href={`/agenda?dia=${dayKey(c.startsAt)}`}
                    className="flex items-center justify-between gap-3 border-b border-border px-5 py-3 transition-colors last:border-0 hover:bg-surface-3"
                  >
                    <span className="font-mono text-[12.5px] tabular-nums text-text-2">
                      {dateTimeInZone(c.startsAt)}
                    </span>
                    {dayKey(c.startsAt) === todayKey() && <Badge tone="primary">Hoy</Badge>}
                  </Link>
                ))}
              </Card>
            )}

            {/* The PLAN-2 spec asked for the notes only. Contact details are shown too
                because the phone feeds the appointment reminder, and until now there was
                no way to tell whether the patient had one on file. */}
            <Card className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <span className="font-display text-[15px] font-bold text-text">Contacto y notas</span>
                <Link
                  href={`/pacientes/${patient.id}/editar`}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Editar
                </Link>
              </div>
              <dl className="px-5 py-3.5 text-[13px]">
                <div className="flex gap-2">
                  <dt className="w-20 shrink-0 text-text-3">Email</dt>
                  <dd className="min-w-0 break-words text-text-2">{patient.email ?? "—"}</dd>
                </div>
                <div className="mt-2 flex gap-2">
                  <dt className="w-20 shrink-0 text-text-3">Teléfono</dt>
                  <dd className="min-w-0 break-words text-text-2">
                    {patient.phone ?? (
                      <span className="text-text-3">Sin registrar</span>
                    )}
                  </dd>
                </div>
                {patient.notes && (
                  <div className="mt-3 border-t border-border pt-3">
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-text-3">
                      Notas
                    </dt>
                    <dd className="mt-1 whitespace-pre-wrap text-text-2">{patient.notes}</dd>
                  </div>
                )}
              </dl>
            </Card>

            <Card className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <span className="font-display text-[15px] font-bold text-text">Historial de consultas</span>
              </div>
              {consultations.length === 0 && (
                <p className="px-5 py-8 text-center text-sm text-text-3">Todavía sin consultas.</p>
              )}
              {consultations.map((c, i) => (
                <Link
                  key={c.id}
                  href={`/consultas/${c.id}`}
                  className="flex gap-3 border-b border-border px-5 py-3 transition-colors last:border-0 hover:bg-surface-3"
                >
                <span className={`mt-1.5 size-2 shrink-0 rounded-full ${i === 0 ? "bg-primary" : "bg-primary-soft-brd"}`} />
                <span className="min-w-0 flex-1">
                  <span className="flex justify-between gap-2">
                    <span className="text-[13px] font-semibold text-text">
                      Consulta {consultations.length - i}
                    </span>
                    <span className="font-mono text-[11.5px] tabular-nums text-text-3">
                      {c.createdAt.toLocaleDateString("es-MX", { day: "2-digit", month: "short" })}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-[12px] text-text-2">
                    {c.weight} kg
                    {c.approvedAt ? (
                      <span className="font-semibold text-success"> · plan aprobado</span>
                    ) : c.finalPlan ? (
                      <span className="font-semibold text-warning"> · pendiente de aprobar</span>
                    ) : (
                      <span className="text-text-3"> · sin plan</span>
                    )}
                  </span>
                </span>
                </Link>
              ))}
            </Card>
          </div>
      </div>
    </div>
  );
}
