import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { MealPlan } from "@/lib/ai/planSchema";
import {
  PROMPT_VERSION,
  SYSTEM_PROMPT_PLAN,
  fewShotMessages,
  buildUserMessage,
} from "@/lib/ai/prompts/plan-v3";
import type { PlanInput, PlanOptions, PlanResult } from "@/lib/ai/types";

const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

export async function generatePlanOpenAI(
  input: PlanInput,
  options?: PlanOptions
): Promise<PlanResult> {
  const client = new OpenAI();

  // Reasoning models (gpt-5*, o*) accept `reasoning.effort`;
  // "low" keeps the arithmetic right with much lower latency.
  const isReasoningModel = /^(gpt-5|o\d)/.test(MODEL);

  const response = await client.responses.parse({
    model: MODEL,
    ...(isReasoningModel && {
      reasoning: {
        effort: (process.env.OPENAI_REASONING_EFFORT ?? "low") as "low",
      },
    }),
    instructions: SYSTEM_PROMPT_PLAN,
    input: [
      ...fewShotMessages(),
      {
        role: "user" as const,
        content: buildUserMessage(input, options?.nutritionistStyle),
      },
    ],
    text: { format: zodTextFormat(MealPlan, "meal_plan") },
  });

  if (!response.output_parsed) {
    throw new Error("El modelo no pudo generar el plan. Intenta de nuevo o revisa los datos.");
  }

  return {
    plan: response.output_parsed,
    promptVersion: PROMPT_VERSION,
    model: MODEL,
    inputTokens: response.usage?.input_tokens ?? 0,
    outputTokens: response.usage?.output_tokens ?? 0,
  };
}
