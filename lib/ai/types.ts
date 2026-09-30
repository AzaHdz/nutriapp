import type { MealPlan } from "@/lib/ai/planSchema";

export type PlanInput = {
  // Clinical data only — NEVER the patient's name/email/phone (data minimization)
  ageYears: number;
  gender: "FEMALE" | "MALE" | "OTHER";
  weightKg: number;
  heightCm: number;
  measurements: {
    waistCm?: number | null;
    hipCm?: number | null;
    armCm?: number | null;
    bodyFatPct?: number | null;
  };
  goals: string;
  restrictions: string;
};

export type PlanOptions = {
  // The nutritionist's style preferences (User.promptStyle). Injected into the
  // user turn of the prompt, delimited as data.
  nutritionistStyle?: string | null;
};

export type PlanResult = {
  plan: MealPlan;
  promptVersion: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
};
