import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { ageInYears } from "@/lib/calculations";
import { MealPlan } from "@/lib/ai/planSchema";
import { PrintButton } from "@/components/PrintButton";
import { BRAND } from "@/lib/brand";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

function mealKcal(options: { approxKcal: number }[]): number {
  if (options.length === 0) return 0;
  return Math.round(options.reduce((s, o) => s + o.approxKcal, 0) / options.length);
}

export default async function PrintPlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { userId } = await requireUser();

  const consultation = await prisma.consultation.findFirst({
    where: { id, userId },
    include: { patient: true, user: true },
  });
  if (!consultation) notFound();

  // Approval rule: the PDF only exists for approved plans (§3.6)
  if (!consultation.approvedAt || !consultation.finalPlan) {
    return (
      <div className="mx-auto max-w-lg rounded-card border border-warning-brd bg-warning-soft p-6 text-sm text-warning">
        Este plan aún no está aprobado. Apruébalo en la consulta antes de exportarlo.
      </div>
    );
  }

  const plan = MealPlan.parse(consultation.finalPlan);
  const n = consultation.user;
  const avoid =
    consultation.restrictions && consultation.restrictions !== "Sin restricciones declaradas"
      ? consultation.restrictions
      : null;

  return (
    <div className="mx-auto max-w-3xl bg-surface p-10 print:p-0">
      <div className="mb-6 flex justify-end print:hidden">
        <PrintButton />
      </div>

      {/* Letterhead */}
      <header className="flex items-start justify-between gap-6 border-b-2 border-primary pb-5">
        <div className="flex size-16 items-center justify-center overflow-hidden rounded-ctl border border-dashed border-border-strong text-center text-[9px] text-text-3">
          {n.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={n.logoUrl} alt="Logo" className="size-full object-contain" />
          ) : (
            "logo del nutriólogo"
          )}
        </div>
        <div className="text-right">
          <div className="font-display text-lg font-bold text-text">{n.name ?? "Nutriólogo(a)"}</div>
          <div className="text-[12.5px] text-text-2">
            Nutrióloga clínica
            {n.licenseNumber ? ` · Cédula profesional ${n.licenseNumber}` : ""}
          </div>
          <div className="text-[12.5px] text-text-3">{n.email}</div>
        </div>
      </header>

      {/* Title + date */}
      <div className="mt-6 flex items-baseline justify-between">
        <h1 className="font-display text-xl font-bold text-text">Plan alimenticio</h1>
        <span className="font-mono text-sm tabular-nums text-text-3">
          {consultation.approvedAt.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}
        </span>
      </div>

      {/* Patient info strip */}
      <div className="mt-4 flex flex-wrap gap-x-7 gap-y-1.5 rounded-ctl bg-surface-2 px-4 py-3 text-[13px] text-text-2">
        <span>
          <b className="text-text">Paciente:</b> {consultation.patient.name}
        </span>
        <span>
          <b className="text-text">Edad:</b> {ageInYears(consultation.patient.birthDate)} años
        </span>
        <span>
          <b className="text-text">Objetivo:</b> {Math.round(plan.dailyKcalTarget).toLocaleString("es-MX")} kcal/día
        </span>
        {avoid && (
          <span className="text-warning">
            <b>Evitar:</b> {avoid}
          </span>
        )}
      </div>

      {/* Plan body (prose) */}
      <div className="mt-6 flex flex-col gap-4">
        {plan.meals.map((meal) => (
          <section key={meal.name} className="break-inside-avoid">
            <div className="flex items-baseline justify-between border-b border-border pb-1">
              <h2 className="font-display text-base font-semibold text-text">
                {meal.name}
                <span className="ml-2 text-sm font-normal text-text-3">{meal.suggestedTime}</span>
              </h2>
              <span className="font-mono text-xs tabular-nums text-text-3">~{mealKcal(meal.options)} kcal</span>
            </div>
            <div className="mt-2 flex flex-col gap-1.5 text-[13px] text-text-2">
              {meal.options.map((option, i) => (
                <p key={i}>
                  <b className="text-text">Opción {LETTERS[i] ?? i + 1}.</b> {option.description} — {option.foods.join(", ")}.
                </p>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Instructions */}
      {plan.generalRecommendations.length > 0 && (
        <div className="mt-6 rounded-ctl bg-surface-2 px-4 py-3 text-[13px] text-text-2">
          <b className="text-text">Indicaciones:</b>{" "}
          {plan.generalRecommendations.join(" ")}
        </div>
      )}

      {/* Supplements */}
      {(plan.supplements?.length ?? 0) > 0 && (
        <div className="mt-3 rounded-ctl bg-surface-2 px-4 py-3 text-[13px] text-text-2">
          <b className="text-text">Suplementación:</b>{" "}
          {plan.supplements.map((s) => `${s.item} (${s.timing})`).join(" · ")}
        </div>
      )}

      {/* Footer */}
      <footer className="mt-10 flex items-end justify-between gap-6">
        <p className="max-w-md text-[11px] text-text-3">
          Plan revisado y aprobado por {n.name ?? "el nutriólogo tratante"}
          {n.licenseNumber ? ` (cédula ${n.licenseNumber})` : ""} el{" "}
          {consultation.approvedAt.toLocaleDateString("es-MX")} · Elaborado con {BRAND.name}. Este documento
          es una herramienta de apoyo nutricional individualizada; no sustituye una valoración médica.
        </p>
        <div className="w-48 shrink-0 border-t border-text-3 pt-1.5 text-center text-[11px] text-text-3">
          Firma
        </div>
      </footer>
    </div>
  );
}
