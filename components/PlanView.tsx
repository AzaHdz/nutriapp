import type { MealPlan } from "@/lib/ai/planSchema";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

function mealKcal(options: { approxKcal: number }[]): number {
  if (options.length === 0) return 0;
  return Math.round(options.reduce((s, o) => s + o.approxKcal, 0) / options.length);
}

/** One card per meal with its options (screen view). Read-only. */
export function PlanView({ plan }: { plan: MealPlan }) {
  return (
    <div className="flex flex-col gap-3.5">
      {plan.meals.map((meal) => (
        <div key={meal.name} className="overflow-hidden rounded-card border border-border bg-surface break-inside-avoid">
          <div className="flex items-center justify-between gap-2 border-b border-border bg-surface-2 px-4 py-2.5">
            <span className="font-display text-sm font-bold text-text">{meal.name}</span>
            <span className="font-mono text-[11.5px] tabular-nums text-text-3">
              {meal.suggestedTime} · ~{mealKcal(meal.options)} kcal
            </span>
          </div>
          <ol className="flex flex-col divide-y divide-border">
            {meal.options.map((option, i) => (
              <li key={i} className="flex items-start gap-3 px-4 py-3">
                <span className="mt-px shrink-0 rounded-pill bg-surface-3 px-2 py-0.5 font-mono text-[10.5px] font-semibold text-text-2">
                  {LETTERS[i] ?? i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-[13.5px] font-semibold text-text">{option.description}</p>
                    <span className="shrink-0 font-mono text-[11px] tabular-nums text-text-3">
                      ~{Math.round(option.approxKcal)} kcal
                    </span>
                  </div>
                  <p className="mt-0.5 text-[12.5px] text-text-2">{option.foods.join(" · ")}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      ))}

      {(plan.supplements?.length ?? 0) > 0 && (
        <div className="overflow-hidden rounded-card border border-border bg-surface break-inside-avoid">
          <div className="border-b border-border bg-surface-2 px-4 py-2.5">
            <span className="font-display text-sm font-bold text-text">Suplementación</span>
          </div>
          <ul className="flex flex-col divide-y divide-border">
            {plan.supplements.map((s, i) => (
              <li key={i} className="flex items-baseline justify-between gap-2 px-4 py-2.5">
                <span className="text-[13.5px] font-semibold text-text">{s.item}</span>
                <span className="text-[12.5px] text-text-2">{s.timing}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
