import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { ageInYears } from "@/lib/calculations";
import { formatShortDate } from "@/lib/format";
import { TIER_LIMITS, consultationsUsedThisMonth } from "@/lib/limits";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { buttonVariants } from "@/components/ui/Button";
import { ConsultationForm } from "@/components/ConsultationForm";
import { BRAND } from "@/lib/brand";

export default async function NewConsultationPage({
  searchParams,
}: {
  searchParams: Promise<{ paciente?: string }>;
}) {
  // `paciente` is a URL query param, which stays in Spanish
  const { paciente: patientId } = await searchParams;
  const { userId, tier } = await requireUser();

  if (!patientId) redirect("/pacientes");

  // Monthly quota: if it's already used up, say so before the form is filled in
  // (createConsultation checks again; this is just UX)
  const limit = TIER_LIMITS[tier].consultationsPerMonth;
  const used = limit !== null ? await consultationsUsedThisMonth(userId) : 0;
  const quotaExhausted = limit !== null && used >= limit;

  const patient = await prisma.patient.findFirst({
    where: { id: patientId, userId },
    include: { consultations: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  if (!patient) notFound();

  const previous = patient.consultations[0];
  const number = patient.consultations.length + 1;
  const restrictions =
    previous?.restrictions && previous.restrictions !== "Sin restricciones declaradas"
      ? previous.restrictions.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean)
      : [];

  return (
    <div className="flex flex-col gap-6">
      {/* Context bar */}
      <div className="flex flex-wrap items-center gap-3">
        <Avatar name={patient.name} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-xl font-bold tracking-tight text-text">
            Nueva consulta · {patient.name}
          </h1>
          <p className="text-[13px] text-text-3">
            Consulta {number} ·{" "}
            {previous
              ? `Anterior: ${previous.weight} kg (${formatShortDate(previous.createdAt)})`
              : "Primera consulta · valoración inicial"}
          </p>
        </div>
        {restrictions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {restrictions.slice(0, 3).map((r, i) => (
              <Badge key={i} tone={/alergia|intoleranc/i.test(r) ? "danger" : "neutral"}>
                {r}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {quotaExhausted ? (
        <Card className="p-6">
          <p className="font-display text-[15px] font-bold text-text">
            Alcanzaste el límite de tu plan {TIER_LIMITS[tier].name}
          </p>
          <p className="mt-1.5 max-w-xl text-sm text-text-2">
            Usaste las {limit} consultas incluidas este mes. El contador se reinicia el día 1;
            si necesitas más consultas ahora, contacta al administrador de {BRAND.name} para ampliar
            tu plan.
          </p>
          <div className="mt-4">
            <Link href="/ajustes" className={buttonVariants({ variant: "secondary", size: "sm" })}>
              Ver mi plan en Ajustes
            </Link>
          </div>
        </Card>
      ) : (
        <ConsultationForm
          patientId={patient.id}
          age={ageInYears(patient.birthDate)}
          gender={patient.gender}
        />
      )}
    </div>
  );
}
