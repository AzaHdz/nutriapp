import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { ageInYears } from "@/lib/calculations";
import { MealPlan } from "@/lib/ai/planSchema";
import { PlanView } from "@/components/PlanView";
import { PlanSummary } from "@/components/PlanSummary";
import { PlanPanel } from "@/components/PlanPanel";
import { Card } from "@/components/ui/Card";
import { Stat } from "@/components/ui/Stat";
import { Badge } from "@/components/ui/Badge";
import { GeneratePlanButton, ApproveButton } from "@/components/ConsultationActions";

export default async function ConsultationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { userId } = await requireUser();

  const consultation = await prisma.consultation.findFirst({
    where: { id, userId },
    include: { patient: true },
  });
  if (!consultation) notFound();

  const plan = consultation.finalPlan ? MealPlan.parse(consultation.finalPlan) : null;

  const measurements: [string, number | null, string][] = [
    ["Peso", consultation.weight, "kg"],
    ["Altura", consultation.height, "cm"],
    ["Cintura", consultation.waist, "cm"],
    ["Cadera", consultation.hip, "cm"],
    ["Brazo", consultation.arm, "cm"],
    ["Grasa", consultation.bodyFatPct, "%"],
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-text-3">
            <Link href={`/pacientes/${consultation.patientId}`} className="hover:underline">
              {consultation.patient.name}
            </Link>{" "}
            · {ageInYears(consultation.patient.birthDate)} años ·{" "}
            {consultation.createdAt.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2.5">
            <h1 className="font-display text-2xl font-bold tracking-tight text-text">
              {plan ? `Plan alimenticio · ${consultation.patient.name.split(" ")[0]}` : "Consulta"}
            </h1>
            {plan && <Badge tone="primary">✦ Generado por IA</Badge>}
            {consultation.approvedAt ? (
              <Badge tone="success">Aprobado</Badge>
            ) : plan ? (
              <Badge tone="warning">Borrador — pendiente de aprobar</Badge>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <GeneratePlanButton consultationId={consultation.id} hasPlan={Boolean(plan)} />
          {plan && <ApproveButton consultationId={consultation.id} approved={Boolean(consultation.approvedAt)} />}
        </div>
      </div>

      {/* Anthropometrics */}
      <Card className="p-5">
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
          {measurements.map(([label, value, unit]) => (
            <Stat key={label} label={label} value={value ?? "—"} unit={value != null ? unit : undefined} />
          ))}
        </div>
        <div className="mt-4 grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
          <div>
            <p className="text-xs text-text-3">Objetivos</p>
            <p className="text-sm text-text">{consultation.goals}</p>
          </div>
          <div>
            <p className="text-xs text-text-3">Restricciones</p>
            <p className="text-sm text-text">{consultation.restrictions}</p>
          </div>
        </div>
      </Card>

      {/* Plan */}
      {!plan ? (
        <div className="flex flex-col items-center gap-4 rounded-card border border-dashed border-border-strong p-10 text-center">
          <p className="text-sm text-text-3">
            Aún no se genera el plan. Usa &ldquo;Generar plan con IA&rdquo; para crear un borrador.
          </p>
        </div>
      ) : (
        <PlanPanel
          consultationId={consultation.id}
          plan={plan}
          readView={
            <>
              <PlanView plan={plan} />
              {consultation.promptVersion && (
                <p className="text-xs text-text-3">
                  Generado con {consultation.aiModel ?? "modelo desconocido"} ({consultation.promptVersion}) ·{" "}
                  {consultation.inputTokens ?? "?"} tokens entrada / {consultation.outputTokens ?? "?"} salida
                </p>
              )}
            </>
          }
          summary={
            <>
              <PlanSummary plan={plan} />
              {plan.generalRecommendations.length > 0 && (
                <Card className="p-5">
                  <div className="mb-2.5 font-display text-[15px] font-bold text-text">Recomendaciones</div>
                  <ul className="flex list-disc flex-col gap-1 pl-5 text-[13px] text-text-2">
                    {plan.generalRecommendations.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                  <p className="mt-3 text-[11.5px] text-text-3">Aparecen al final del PDF.</p>
                </Card>
              )}
            </>
          }
        />
      )}
    </div>
  );
}
