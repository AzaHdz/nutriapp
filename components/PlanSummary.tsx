import type { MealPlan } from "@/lib/ai/planSchema";
import { summarizePlan } from "@/lib/plan";
import { Card } from "@/components/ui/Card";
import { MacroBar } from "@/components/ui/MacroBar";

/** Daily nutrition summary: target vs plan, macro bars and checklist. */
export function PlanSummary({ plan }: { plan: MealPlan }) {
  const r = summarizePlan(plan);

  return (
    <Card className="p-5">
      <div className="mb-3.5 font-display text-[15px] font-bold text-text">Resumen nutricional del día</div>

      <div className="mb-4 flex items-baseline justify-between rounded-ctl bg-surface-2 px-3.5 py-2.5">
        <span className="text-[13px] text-text-2">
          <b className="font-mono tabular-nums text-text">{r.target.toLocaleString("es-MX")}</b> kcal objetivo
        </span>
        <span className={`text-[13px] ${r.onTarget ? "text-success" : "text-warning"}`}>
          <b className="font-mono tabular-nums">{r.planKcal.toLocaleString("es-MX")}</b> kcal plan {r.onTarget ? "✓" : "⚠"}
        </span>
      </div>

      <div className="flex flex-col gap-3">
        <MacroBar label="Proteína" grams={r.macros.protein.grams} pct={r.macros.protein.pct} tone="primary" />
        <MacroBar label="Carbohidratos" grams={r.macros.carbs.grams} pct={r.macros.carbs.pct} tone="accent" />
        <MacroBar label="Grasas" grams={r.macros.fat.grams} pct={r.macros.fat.pct} tone="info" />
      </div>

      <div className="mt-4 flex flex-col gap-1.5 border-t border-dashed border-border pt-3.5">
        {plan.warnings.length === 0 ? (
          <div className="flex items-center gap-2 text-[12.5px] text-text-2">
            <span className="size-1.5 rounded-full bg-success" />
            Sin conflictos detectados por la validación.
          </div>
        ) : (
          plan.warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-2 text-[12.5px] text-text-2">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-warning" />
              {w}
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
