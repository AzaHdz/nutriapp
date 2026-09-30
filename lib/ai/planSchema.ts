import { z } from "zod";

// Keys are English; the .describe() texts stay in Spanish because they are sent
// to the model, which must answer in Spanish.

export const MealOption = z.object({
  description: z.string().describe("Nombre corto del platillo, ej. 'Chilaquiles verdes con pollo'"),
  foods: z
    .array(z.string())
    .describe("Ingredientes con cantidad en medidas caseras, ej. '1 taza de arroz cocido'"),
  approxKcal: z.number().describe("Kilocalorías aproximadas de esta opción completa"),
});

export const Meal = z.object({
  name: z.string().describe("Ej. 'Desayuno', 'Colación matutina', 'Comida', 'Colación vespertina', 'Cena'"),
  suggestedTime: z.string().describe("Ej. '7:00–8:00'"),
  options: z.array(MealOption).describe("Exactamente 5 opciones intercambiables"),
});

export const MealPlan = z.object({
  dailyKcalTarget: z.number(),
  macros: z.object({
    protein_g: z.number(),
    carbs_g: z.number(),
    fat_g: z.number(),
  }),
  meals: z.array(Meal).describe("Exactamente 5 comidas"),
  generalRecommendations: z
    .array(z.string())
    .describe("Hidratación, actividad física, hábitos — máximo 6"),
  supplements: z
    .array(
      z.object({
        item: z.string().describe("Suplemento, ej. 'Omega 3' o 'Magnesio'"),
        timing: z.string().describe("Cuándo tomarlo, ej. 'después del desayuno'"),
      })
    )
    .default([])
    .describe(
      "Suplementación sugerida SOLO si aporta al objetivo del paciente; máximo 4; vacío si no aplica. El nutriólogo la valida."
    ),
  warnings: z
    .array(z.string())
    .describe(
      "Cualquier conflicto entre el plan y las restricciones/condiciones del paciente, o dudas que el nutriólogo deba revisar. Vacío si no hay."
    ),
});

export type MealPlan = z.infer<typeof MealPlan>;
