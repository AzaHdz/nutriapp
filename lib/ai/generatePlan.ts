import { generatePlanAnthropic } from "@/lib/ai/providers/anthropic";
import { generatePlanOpenAI } from "@/lib/ai/providers/openai";
import type { PlanInput, PlanOptions, PlanResult } from "@/lib/ai/types";

export type { PlanInput, PlanOptions, PlanResult };

type Provider = "anthropic" | "openai";

function resolveProvider(): Provider {
  const explicit = process.env.AI_PROVIDER?.toLowerCase();
  if (explicit === "anthropic" || explicit === "openai") return explicit;
  if (explicit) {
    throw new Error(`AI_PROVIDER inválido: "${explicit}". Usa "openai" o "anthropic".`);
  }
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.OPENAI_API_KEY) return "openai";
  throw new Error(
    "No hay proveedor de IA configurado. Define OPENAI_API_KEY o ANTHROPIC_API_KEY en .env.local."
  );
}

export async function generatePlan(
  input: PlanInput,
  options?: PlanOptions
): Promise<PlanResult> {
  const provider = resolveProvider();
  return provider === "anthropic"
    ? generatePlanAnthropic(input, options)
    : generatePlanOpenAI(input, options);
}
