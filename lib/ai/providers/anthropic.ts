import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { MealPlan } from "@/lib/ai/planSchema";
import {
  PROMPT_VERSION,
  SYSTEM_PROMPT_PLAN,
  fewShotMessages,
  buildUserMessage,
} from "@/lib/ai/prompts/plan-v3";
import type { PlanInput, PlanOptions, PlanResult } from "@/lib/ai/types";

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5";

export async function generatePlanAnthropic(
  input: PlanInput,
  options?: PlanOptions
): Promise<PlanResult> {
  const client = new Anthropic();

  // The prefix (system + few-shots) is static: a cache breakpoint on the last
  // few-shot makes every later generation cheaper. The variable part
  // (nutritionist style + patient data) goes after it, in the last turn.
  const fewShot = fewShotMessages();
  const messages: Anthropic.MessageParam[] = fewShot.map((m, i) =>
    i === fewShot.length - 1
      ? {
          role: m.role,
          content: [
            {
              type: "text" as const,
              text: m.content,
              cache_control: { type: "ephemeral" as const },
            },
          ],
        }
      : { role: m.role, content: m.content }
  );
  messages.push({
    role: "user",
    content: buildUserMessage(input, options?.nutritionistStyle),
  });

  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    system: SYSTEM_PROMPT_PLAN,
    messages,
    output_config: { format: zodOutputFormat(MealPlan) },
  });

  if (response.stop_reason === "refusal" || !response.parsed_output) {
    throw new Error("El modelo no pudo generar el plan. Intenta de nuevo o revisa los datos.");
  }

  return {
    plan: response.parsed_output,
    promptVersion: PROMPT_VERSION,
    model: MODEL,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };
}
