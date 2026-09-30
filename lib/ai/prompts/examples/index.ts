import { MealPlan } from "@/lib/ai/planSchema";
import type { PlanInput } from "@/lib/ai/types";
import fatLossStartPlan from "./plan-fat-loss-start.json";
import strengthRecompositionPlan from "./plan-strength-recomposition.json";

// Real plans from a practicing nutritionist, digitized and anonymized.
// They are validated against the schema on import: if the schema changes and an
// example drifts, the build fails here instead of silently degrading the prompt.
export type PlanExample = { input: PlanInput; plan: MealPlan };

export const EXAMPLES: PlanExample[] = [
  {
    // Fictional patient representative of the original plan (starting out, fat loss)
    input: {
      ageYears: 31,
      gender: "MALE",
      weightKg: 79,
      heightCm: 176,
      measurements: { waistCm: 87, hipCm: 99, armCm: 36, bodyFatPct: 21.5 },
      goals:
        "Pérdida de grasa corporal conservando masa muscular. Por indicación médica solo puede hacer ejercicio aeróbico por ahora.",
      restrictions: "Sin restricciones declaradas",
    },
    plan: MealPlan.parse(fatLossStartPlan),
  },
  {
    // Fictional patient representative of the original plan (strength, recomposition)
    input: {
      ageYears: 31,
      gender: "MALE",
      weightKg: 80,
      heightCm: 176,
      measurements: { waistCm: 84, hipCm: 99, armCm: 37, bodyFatPct: 17 },
      goals:
        "Recomposición corporal: ganar masa muscular manteniendo el porcentaje de grasa. Entrena fuerza 5 veces por semana, rutina vespertina.",
      restrictions: "Sin restricciones declaradas",
    },
    plan: MealPlan.parse(strengthRecompositionPlan),
  },
];
