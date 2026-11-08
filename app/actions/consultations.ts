"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { generatePlan } from "@/lib/ai/generatePlan";
import { MealPlan } from "@/lib/ai/planSchema";
import { ageInYears, validatePlan } from "@/lib/calculations";
import { BRAND } from "@/lib/brand";
import {
  TIER_LIMITS,
  MAX_GENERATIONS_PER_CONSULTATION,
  consultationsUsedThisMonth,
} from "@/lib/limits";

const ConsultationInput = z.object({
  patientId: z.string().min(1),
  weight: z.coerce.number().positive("Peso inválido"),
  height: z.coerce.number().positive("Altura inválida"),
  waist: z.coerce.number().positive().optional().or(z.literal("")),
  hip: z.coerce.number().positive().optional().or(z.literal("")),
  arm: z.coerce.number().positive().optional().or(z.literal("")),
  bodyFatPct: z.coerce.number().min(1).max(70).optional().or(z.literal("")),
  goals: z.string().min(3, "Describe el objetivo"),
  restrictions: z.string().default(""),
});

function num(v: number | "" | undefined): number | null {
  return typeof v === "number" ? v : null;
}

export async function createConsultation(formData: FormData) {
  const { userId, tier } = await requireUser();

  // Monthly tier quota; generatePlanAction applies its own caps.
  // Errors are returned as values (not thrown) so the form can show them;
  // a throw in production is masked as a generic 500.
  const limit = TIER_LIMITS[tier].consultationsPerMonth;
  if (limit !== null) {
    const used = await consultationsUsedThisMonth(userId);
    if (used >= limit) {
      return {
        ok: false as const,
        error: `Alcanzaste el límite de ${limit} consultas de tu plan ${TIER_LIMITS[tier].name} este mes. El límite se reinicia el día 1; para ampliarlo, contacta al administrador de ${BRAND.name}.`,
      };
    }
  }

  const parsed = ConsultationInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }
  const d = parsed.data;

  // Make sure the patient belongs to this nutritionist
  const patient = await prisma.patient.findFirst({
    where: { id: d.patientId, userId },
    select: { id: true },
  });
  if (!patient) return { ok: false as const, error: "Paciente no encontrado" };

  const consultation = await prisma.consultation.create({
    data: {
      userId,
      patientId: d.patientId,
      weight: d.weight,
      height: d.height,
      waist: num(d.waist),
      hip: num(d.hip),
      arm: num(d.arm),
      bodyFatPct: num(d.bodyFatPct),
      goals: d.goals,
      restrictions: d.restrictions || "Sin restricciones declaradas",
    },
  });

  redirect(`/consultas/${consultation.id}`);
}

export async function generatePlanAction(consultationId: string) {
  const { userId, tier } = await requireUser();

  const consultation = await prisma.consultation.findFirst({
    where: { id: consultationId, userId },
    include: { patient: true, user: { select: { promptStyle: true } } },
  });
  if (!consultation) throw new Error("Consulta no encontrada");

  // Every AI call costs real tokens, so this is where the caps apply.
  if (consultation.generationCount >= MAX_GENERATIONS_PER_CONSULTATION) {
    return {
      ok: false as const,
      error: `Esta consulta ya usó sus ${MAX_GENERATIONS_PER_CONSULTATION} generaciones de plan. Ajusta el plan con el editor.`,
    };
  }
  // The first generation skips the monthly quota: it belongs to a consultation
  // that already passed that check when created (blocking it would leave the
  // month's last allowed consultation without a plan). Regenerating does count.
  const limit = TIER_LIMITS[tier].consultationsPerMonth;
  if (consultation.generationCount >= 1 && limit !== null) {
    const used = await consultationsUsedThisMonth(userId);
    if (used >= limit) {
      return {
        ok: false as const,
        error: `Alcanzaste el límite de ${limit} consultas de tu plan ${TIER_LIMITS[tier].name} este mes, así que regenerar planes queda pausado hasta el día 1. Puedes seguir editando el plan actual.`,
      };
    }
  }

  const result = await generatePlan(
    {
      ageYears: ageInYears(consultation.patient.birthDate),
      gender: consultation.patient.gender,
      weightKg: consultation.weight,
      heightCm: consultation.height,
      measurements: {
        waistCm: consultation.waist,
        hipCm: consultation.hip,
        armCm: consultation.arm,
        bodyFatPct: consultation.bodyFatPct,
      },
      goals: consultation.goals,
      restrictions: consultation.restrictions,
    },
    { nutritionistStyle: consultation.user.promptStyle }
  );

  await prisma.consultation.update({
    where: { id: consultation.id },
    data: {
      generatedPlan: result.plan,
      finalPlan: result.plan, // starting point for editing
      promptVersion: result.promptVersion,
      aiModel: result.model,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      generationCount: { increment: 1 },
      approvedAt: null, // regenerating invalidates any earlier approval
    },
  });

  revalidatePath(`/consultas/${consultationId}`);
  return { ok: true as const };
}

export async function saveFinalPlan(consultationId: string, planJson: string) {
  const { userId } = await requireUser();

  const parsed = MealPlan.safeParse(JSON.parse(planJson));
  if (!parsed.success) {
    throw new Error("El plan editado no tiene un formato válido: " +
      parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
  }

  const result = await prisma.consultation.updateMany({
    where: { id: consultationId, userId },
    data: { finalPlan: parsed.data, approvedAt: null },
  });
  if (result.count === 0) throw new Error("Consulta no encontrada");

  revalidatePath(`/consultas/${consultationId}`);
}

export async function approveConsultation(
  consultationId: string,
  opts?: { confirm?: boolean }
) {
  const { userId } = await requireUser();

  const consultation = await prisma.consultation.findFirst({
    where: { id: consultationId, userId },
    include: { patient: true },
  });
  if (!consultation) throw new Error("Consulta no encontrada");
  if (!consultation.finalPlan) throw new Error("No hay plan que aprobar");

  // Arithmetic validation in code before allowing approval (§3.5)
  const plan = MealPlan.parse(consultation.finalPlan);
  const warnings = validatePlan(plan, {
    weightKg: consultation.weight,
    heightCm: consultation.height,
    age: ageInYears(consultation.patient.birthDate),
    gender: consultation.patient.gender,
  });

  // With warnings, approving needs explicit confirmation: the nutritionist's
  // judgment can overrule the validator, but never by accident.
  if (warnings.length > 0 && !opts?.confirm) {
    return { approved: false as const, warnings };
  }

  await prisma.consultation.update({
    where: { id: consultation.id },
    data: { approvedAt: new Date() },
  });

  revalidatePath(`/consultas/${consultationId}`);
  return { approved: true as const, warnings };
}
