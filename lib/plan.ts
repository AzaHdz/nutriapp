import type { MealPlan } from "@/lib/ai/planSchema";

/** Reads the target kcal from a stored plan (Json) without parsing the whole schema. */
export function planKcal(finalPlan: unknown): number | null {
  if (finalPlan && typeof finalPlan === "object" && "dailyKcalTarget" in finalPlan) {
    const v = (finalPlan as { dailyKcalTarget?: unknown }).dailyKcalTarget;
    return typeof v === "number" ? Math.round(v) : null;
  }
  return null;
}

export type MacroSummary = { grams: number; pct: number };

export type PlanSummaryData = {
  target: number;
  planKcal: number;
  deviation: number;
  onTarget: boolean;
  macros: { protein: MacroSummary; carbs: MacroSummary; fat: MacroSummary };
};

/**
 * Plan arithmetic shared by the summary view and the live editor.
 * planKcal = sum of the average option per meal (same rule as validatePlan).
 * Macro percentages are relative to the kcal the macros provide (4/4/9 kcal/g).
 */
export function summarizePlan(plan: MealPlan): PlanSummaryData {
  const { protein_g, carbs_g, fat_g } = plan.macros;
  const kcalProtein = protein_g * 4;
  const kcalCarbs = carbs_g * 4;
  const kcalFat = fat_g * 9;
  const kcalMacros = kcalProtein + kcalCarbs + kcalFat || 1;

  const planKcal = Math.round(
    plan.meals.reduce((total, meal) => {
      if (meal.options.length === 0) return total;
      return total + meal.options.reduce((s, o) => s + o.approxKcal, 0) / meal.options.length;
    }, 0),
  );

  const target = Math.round(plan.dailyKcalTarget);
  const deviation = target > 0 ? Math.abs(planKcal - target) / target : 0;

  return {
    target,
    planKcal,
    deviation,
    onTarget: deviation <= 0.15,
    macros: {
      protein: { grams: protein_g, pct: (kcalProtein / kcalMacros) * 100 },
      carbs: { grams: carbs_g, pct: (kcalCarbs / kcalMacros) * 100 },
      fat: { grams: fat_g, pct: (kcalFat / kcalMacros) * 100 },
    },
  };
}
