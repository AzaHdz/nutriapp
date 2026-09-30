"use client";

import { useState, useTransition } from "react";
import { createConsultation } from "@/app/actions/consultations";
import { bmi, bmrMifflin, ACTIVITY_FACTORS, classifyBmi } from "@/lib/calculations";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import type { Gender } from "@prisma/client";

/** New consultation form with live BMI and TEE (GET) calculation. */
export function ConsultationForm({
  patientId,
  age,
  gender,
}: {
  patientId: string;
  age: number;
  gender: Gender;
}) {
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      // On success the action redirects to the new consultation and never returns
      const r = await createConsultation(formData);
      if (r && !r.ok) setError(r.error);
    });
  }

  const w = parseFloat(weight);
  const h = parseFloat(height);
  const hasBasics = w > 0 && h > 0;
  const bmiValue = hasBasics ? bmi(w, h) : null;
  const bmiClass = bmiValue != null ? classifyBmi(bmiValue) : null;
  // Total energy expenditure (GET in the UI), assuming a sedentary activity factor
  const tee = hasBasics
    ? Math.round(bmrMifflin({ weightKg: w, heightCm: h, age, gender }) * ACTIVITY_FACTORS.sedentary)
    : null;

  const rangeText = { in: "text-range-in", out: "text-range-out", critical: "text-range-critical" } as const;

  return (
    <form action={onSubmit} className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
      <input type="hidden" name="patientId" value={patientId} />

      {/* Left column */}
      <div className="flex flex-col gap-4">
        <Card className="p-5">
          <div className="mb-3.5 flex items-baseline justify-between">
            <span className="font-display text-[15px] font-bold text-text">Antropometría</span>
            <span className="text-[11.5px] text-text-3">Los cálculos se actualizan al escribir</span>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Field label="Peso (kg) *" htmlFor="weight">
              <Input id="weight" name="weight" type="number" step="0.1" min="1" required value={weight} onChange={(e) => setWeight(e.target.value)} />
            </Field>
            <Field label="Altura (cm) *" htmlFor="height">
              <Input id="height" name="height" type="number" step="0.5" min="1" required value={height} onChange={(e) => setHeight(e.target.value)} />
            </Field>
            <Field label="% grasa" htmlFor="bodyFatPct">
              <Input id="bodyFatPct" name="bodyFatPct" type="number" step="0.1" />
            </Field>
            <Field label="Cintura (cm)" htmlFor="waist">
              <Input id="waist" name="waist" type="number" step="0.5" />
            </Field>
            <Field label="Cadera (cm)" htmlFor="hip">
              <Input id="hip" name="hip" type="number" step="0.5" />
            </Field>
            <Field label="Brazo (cm)" htmlFor="arm">
              <Input id="arm" name="arm" type="number" step="0.5" />
            </Field>
          </div>

          {/* "Calculado" strip */}
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 rounded-ctl bg-surface-2 px-4 py-2.5 text-[13px]">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-text-3">Calculado</span>
            <span className="text-text-2">
              IMC{" "}
              <b className={`font-mono tabular-nums ${bmiClass ? rangeText[bmiClass.range] : "text-text"}`}>
                {bmiValue != null ? bmiValue.toFixed(1) : "—"}
              </b>
              {bmiClass && <span className="ml-1 text-text-3">{bmiClass.label}</span>}
            </span>
            <span className="text-text-2">
              GET <b className="font-mono tabular-nums text-text">{tee != null ? tee.toLocaleString("es-MX") : "—"}</b>
              <span className="ml-1 text-text-3">kcal</span>
            </span>
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-3.5 font-display text-[15px] font-bold text-text">Objetivo y notas</div>
          <Field label="Objetivo del plan *" htmlFor="goals">
            <Textarea
              id="goals"
              name="goals"
              rows={2}
              required
              placeholder="Ej. pérdida de grasa gradual, mejorar energía"
            />
          </Field>
        </Card>
      </div>

      {/* Right column */}
      <div className="flex flex-col gap-4">
        <Card className="p-5">
          <div className="mb-3.5 font-display text-[15px] font-bold text-text">Restricciones para la IA</div>
          <Field
            label="Alergias, intolerancias y preferencias"
            htmlFor="restrictions"
            hint="Sepáralas con comas. Ej: alergia a nuez, intolerancia a lactosa, no come res"
          >
            <Textarea
              id="restrictions"
              name="restrictions"
              rows={4}
              placeholder="Ej. intolerancia a la lactosa, no come cerdo"
            />
          </Field>
          <div className="mt-4 rounded-ctl border border-primary-soft-brd bg-primary-soft p-3 text-[12.5px] text-text-2">
            <b className="text-primary">✦ La IA usará este contexto.</b> El plan saldrá en borrador:
            nada llega al paciente sin tu aprobación.
          </div>
        </Card>

        {error && (
          <div className="rounded-ctl border border-danger-brd bg-danger-soft px-4 py-3 text-[13px] text-danger">
            {error}
          </div>
        )}

        <div className="flex justify-end">
          <Button type="submit" disabled={pending}>
            {pending ? "Guardando…" : "Guardar consulta"}
          </Button>
        </div>
      </div>
    </form>
  );
}
