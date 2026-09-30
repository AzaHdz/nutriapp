/**
 * Nutrition math done in code: the LLM's arithmetic is never trusted
 * (§3.5 of the handbook). Used to validate the generated plan.
 */

import type { Gender } from "@prisma/client";

export function ageInYears(birthDate: Date, today = new Date()): number {
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return age;
}

/** Body mass index. Weight in kg, height in cm. */
export function bmi(weightKg: number, heightCm: number): number {
  const m = heightCm / 100;
  return weightKg / (m * m);
}

/** Classifies the BMI and returns the clinical range used to color the figure
 *  ("in" = normal, "out" = mildly out of range, "critical" = obesity/severe underweight). */
export function classifyBmi(value: number): {
  label: string;
  range: "in" | "out" | "critical";
} {
  if (value < 16) return { label: "Bajo peso severo", range: "critical" };
  if (value < 18.5) return { label: "Bajo peso", range: "out" };
  if (value < 25) return { label: "Normal", range: "in" };
  if (value < 30) return { label: "Sobrepeso", range: "out" };
  return { label: "Obesidad", range: "critical" };
}

/** Basal metabolic rate, Mifflin-St Jeor. Weight in kg, height in cm. */
export function bmrMifflin(params: {
  weightKg: number;
  heightCm: number;
  age: number;
  gender: Gender;
}): number {
  const { weightKg, heightCm, age, gender } = params;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  // OTHER uses the average of both formulas
  if (gender === "MALE") return base + 5;
  if (gender === "FEMALE") return base - 161;
  return base - 78;
}

export const ACTIVITY_FACTORS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  intense: 1.725,
} as const;

/**
 * Checks the AI's proposed target kcal against the plausible range
 * (BMR × 1.2 with a 25% deficit … BMR × 1.725 with a 15% surplus).
 * Returns warnings to show the nutritionist; an empty list means OK.
 */
export function validatePlan(plan: {
  dailyKcalTarget: number;
  meals: { name: string; options: { approxKcal: number }[] }[];
  macros: { protein_g: number; carbs_g: number; fat_g: number };
}, patient: {
  weightKg: number;
  heightCm: number;
  age: number;
  gender: Gender;
}): string[] {
  const warnings: string[] = [];
  const bmr = bmrMifflin(patient);
  const min = bmr * ACTIVITY_FACTORS.sedentary * 0.75;
  const max = bmr * ACTIVITY_FACTORS.intense * 1.15;

  if (plan.dailyKcalTarget < min || plan.dailyKcalTarget > max) {
    warnings.push(
      `Las kcal objetivo (${Math.round(plan.dailyKcalTarget)}) están fuera del rango plausible ` +
      `(${Math.round(min)}–${Math.round(max)}) para una TMB de ${Math.round(bmr)} kcal.`
    );
  }

  // Picking one option from each meal should add up to ≈ the daily target.
  // The average option per meal is what gets checked.
  const dailyAverage = plan.meals.reduce((total, meal) => {
    if (meal.options.length === 0) return total;
    const avg =
      meal.options.reduce((s, o) => s + o.approxKcal, 0) / meal.options.length;
    return total + avg;
  }, 0);

  const deviation = Math.abs(dailyAverage - plan.dailyKcalTarget) / plan.dailyKcalTarget;
  if (deviation > 0.15) {
    warnings.push(
      `La suma promedio de las comidas (${Math.round(dailyAverage)} kcal) se desvía ` +
      `${Math.round(deviation * 100)}% del objetivo diario (${Math.round(plan.dailyKcalTarget)} kcal).`
    );
  }

  // Macro consistency: 4/4/9 kcal per gram
  const macroKcal =
    plan.macros.protein_g * 4 + plan.macros.carbs_g * 4 + plan.macros.fat_g * 9;
  const macroDeviation = Math.abs(macroKcal - plan.dailyKcalTarget) / plan.dailyKcalTarget;
  if (macroDeviation > 0.12) {
    warnings.push(
      `Los macros declarados equivalen a ${Math.round(macroKcal)} kcal, ` +
      `pero el objetivo es ${Math.round(plan.dailyKcalTarget)} kcal.`
    );
  }

  return warnings;
}
