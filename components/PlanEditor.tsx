"use client";

import { useEffect, useRef, useState } from "react";
import type { MealPlan } from "@/lib/ai/planSchema";
import { MealPlan as PlanSchema } from "@/lib/ai/planSchema";
import { summarizePlan } from "@/lib/plan";
import { saveFinalPlan } from "@/app/actions/consultations";
import { Card } from "@/components/ui/Card";
import { MacroBar } from "@/components/ui/MacroBar";
import { Textarea } from "@/components/ui/Input";
import { PlanEditorJson } from "@/components/ConsultationActions";

type SaveStatus = "idle" | "saving" | "saved" | "invalid" | "error";

const clone = (p: MealPlan): MealPlan => JSON.parse(JSON.stringify(p));

/** Drops empty foods/recommendations and trims strings before saving/validating. */
function clean(p: MealPlan): MealPlan {
  return {
    ...p,
    meals: p.meals.map((meal) => ({
      ...meal,
      name: meal.name.trim(),
      suggestedTime: meal.suggestedTime.trim(),
      options: meal.options.map((o) => ({
        ...o,
        description: o.description.trim(),
        foods: o.foods.map((f) => f.trim()).filter(Boolean),
      })),
    })),
    generalRecommendations: p.generalRecommendations.map((r) => r.trim()).filter(Boolean),
  };
}

/** Replaces NaN with 0 for the live summary only (never persisted). */
function numeric(p: MealPlan): MealPlan {
  const n = (x: number) => (Number.isFinite(x) ? x : 0);
  return {
    ...p,
    dailyKcalTarget: n(p.dailyKcalTarget),
    macros: {
      protein_g: n(p.macros.protein_g),
      carbs_g: n(p.macros.carbs_g),
      fat_g: n(p.macros.fat_g),
    },
    meals: p.meals.map((meal) => ({
      ...meal,
      options: meal.options.map((o) => ({ ...o, approxKcal: n(o.approxKcal) })),
    })),
  };
}

export function PlanEditor({
  consultationId,
  plan: initialPlan,
}: {
  consultationId: string;
  plan: MealPlan;
}) {
  const [plan, setPlan] = useState<MealPlan>(initialPlan);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const touched = useRef(false);

  // Debounced autosave. Validation and status updates live inside the timeout,
  // so the effect never calls setState synchronously (cascading renders) and
  // "invalid" doesn't flicker mid-typing.
  useEffect(() => {
    if (!touched.current) return;
    const t = setTimeout(async () => {
      const parsed = PlanSchema.safeParse(clean(plan));
      if (!parsed.success) {
        setSaveStatus("invalid");
        return;
      }
      setSaveStatus("saving");
      try {
        await saveFinalPlan(consultationId, JSON.stringify(parsed.data));
        setSaveStatus("saved");
      } catch {
        setSaveStatus("error");
      }
    }, 800);
    return () => clearTimeout(t);
  }, [plan, consultationId]);

  // Immutable mutators
  function edit(fn: (p: MealPlan) => void) {
    touched.current = true;
    setPlan((prev) => {
      const copy = clone(prev);
      fn(copy);
      return copy;
    });
  }

  const r = summarizePlan(numeric(plan));

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[1.7fr_1fr]">
      {/* Editable column */}
      <div className="flex flex-col gap-4">
        <SaveIndicator status={saveStatus} />

        {/* Day settings */}
        <Card className="p-5">
          <div className="mb-3.5 font-display text-[15px] font-bold text-text">Ajustes del día</div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <NumberField label="Kcal objetivo" value={plan.dailyKcalTarget} onChange={(v) => edit((p) => { p.dailyKcalTarget = v; })} />
            <NumberField label="Proteínas (g)" value={plan.macros.protein_g} onChange={(v) => edit((p) => { p.macros.protein_g = v; })} />
            <NumberField label="Carbohidratos (g)" value={plan.macros.carbs_g} onChange={(v) => edit((p) => { p.macros.carbs_g = v; })} />
            <NumberField label="Grasas (g)" value={plan.macros.fat_g} onChange={(v) => edit((p) => { p.macros.fat_g = v; })} />
          </div>
        </Card>

        {/* Meals */}
        {plan.meals.map((meal, ci) => (
          <Card key={ci} className="overflow-hidden">
            <div className="flex flex-wrap items-center gap-2 border-b border-border bg-surface-2 px-4 py-3">
              <input
                value={meal.name}
                onChange={(e) => edit((p) => { p.meals[ci].name = e.target.value; })}
                placeholder="Nombre de la comida"
                className="min-w-0 flex-1 rounded-ctl border border-transparent bg-transparent px-1.5 py-1 font-display text-sm font-bold text-text hover:border-border focus:border-primary focus:bg-surface focus:outline-none"
              />
              <input
                value={meal.suggestedTime}
                onChange={(e) => edit((p) => { p.meals[ci].suggestedTime = e.target.value; })}
                placeholder="Horario"
                className="w-28 rounded-ctl border border-transparent bg-transparent px-1.5 py-1 font-mono text-xs text-text-2 hover:border-border focus:border-primary focus:bg-surface focus:outline-none"
              />
              <IconButton label="Quitar comida" onClick={() => edit((p) => { p.meals.splice(ci, 1); })} />
            </div>

            <div className="flex flex-col divide-y divide-border">
              {meal.options.map((option, oi) => (
                <div key={oi} className="flex flex-col gap-2 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="shrink-0 rounded-pill bg-surface-3 px-2 py-0.5 font-mono text-[10.5px] font-semibold text-text-2">
                      {String.fromCharCode(65 + oi)}
                    </span>
                    <input
                      value={option.description}
                      onChange={(e) => edit((p) => { p.meals[ci].options[oi].description = e.target.value; })}
                      placeholder="Descripción del platillo"
                      className="min-w-0 flex-1 rounded-ctl border border-border-strong bg-surface px-2.5 py-1.5 text-[13px] font-semibold text-text focus:border-primary focus:outline-none"
                    />
                    <div className="w-24 shrink-0">
                      <NumberField
                        value={option.approxKcal}
                        onChange={(v) => edit((p) => { p.meals[ci].options[oi].approxKcal = v; })}
                        suffix="kcal"
                        compact
                      />
                    </div>
                    <IconButton label="Quitar opción" onClick={() => edit((p) => { p.meals[ci].options.splice(oi, 1); })} />
                  </div>
                  <Textarea
                    value={option.foods.join("\n")}
                    onChange={(e) => edit((p) => { p.meals[ci].options[oi].foods = e.target.value.split("\n"); })}
                    rows={Math.max(2, option.foods.length)}
                    placeholder="Un alimento por línea, ej. 1 taza de arroz cocido"
                    className="text-[12.5px]"
                  />
                </div>
              ))}
            </div>

            <button
              onClick={() => edit((p) => { p.meals[ci].options.push({ description: "", foods: [], approxKcal: 0 }); })}
              className="w-full border-t border-border px-4 py-2.5 text-left text-[13px] font-semibold text-primary transition-colors hover:bg-primary-soft"
            >
              + Agregar opción
            </button>
          </Card>
        ))}

        <button
          onClick={() => edit((p) => { p.meals.push({ name: "Nueva comida", suggestedTime: "", options: [] }); })}
          className="rounded-card border border-dashed border-border-strong px-4 py-3 text-[13px] font-semibold text-text-2 transition-colors hover:bg-surface-3"
        >
          + Agregar comida
        </button>

        {/* Recommendations */}
        <Card className="p-5">
          <div className="mb-2.5 font-display text-[15px] font-bold text-text">Recomendaciones generales</div>
          <Textarea
            value={plan.generalRecommendations.join("\n")}
            onChange={(e) => edit((p) => { p.generalRecommendations = e.target.value.split("\n"); })}
            rows={Math.max(3, plan.generalRecommendations.length)}
            placeholder="Una recomendación por línea"
            className="text-[13px]"
          />
        </Card>

        {/* Advanced JSON (reseeded with the current plan) */}
        <PlanEditorJson
          consultationId={consultationId}
          planJson={JSON.stringify(clean(plan), null, 2)}
          label="⚙ Editar JSON (avanzado)"
        />
      </div>

      {/* Live summary (sticky) */}
      <div className="lg:sticky lg:top-6">
        <Card className="p-5">
          <div className="mb-3.5 font-display text-[15px] font-bold text-text">Resumen en vivo</div>
          <div className="mb-4 flex items-baseline justify-between rounded-ctl bg-surface-2 px-3.5 py-2.5">
            <span className="text-[13px] text-text-2">
              <b className="font-mono tabular-nums text-text">{r.target.toLocaleString("es-MX")}</b> kcal objetivo
            </span>
            <span className={`text-[13px] ${r.onTarget ? "text-success" : "text-warning"}`}>
              <b className="font-mono tabular-nums">{r.planKcal.toLocaleString("es-MX")}</b> kcal plan {r.onTarget ? "✓" : "⚠"}
            </span>
          </div>
          <div className="flex flex-col gap-3">
            <MacroBar label="Proteína" grams={r.macros.protein.grams} pct={r.macros.protein.pct} tone="primary" />
            <MacroBar label="Carbohidratos" grams={r.macros.carbs.grams} pct={r.macros.carbs.pct} tone="accent" />
            <MacroBar label="Grasas" grams={r.macros.fat.grams} pct={r.macros.fat.pct} tone="info" />
          </div>

          <Hints plan={plan} onTarget={r.onTarget} deviation={r.deviation} />
        </Card>
      </div>
    </div>
  );
}

function SaveIndicator({ status }: { status: SaveStatus }) {
  const map: Record<SaveStatus, { text: string; cls: string } | null> = {
    idle: null,
    saving: { text: "Guardando…", cls: "text-text-3" },
    saved: { text: "Guardado ✓ · la aprobación previa se reinició", cls: "text-success" },
    invalid: { text: "Revisa los campos marcados antes de guardar", cls: "text-warning" },
    error: { text: "No se pudo guardar. Reintentando al siguiente cambio.", cls: "text-danger" },
  };
  const s = map[status];
  return <div className="h-4 text-xs">{s && <span className={s.cls}>{s.text}</span>}</div>;
}

/** Soft, non-blocking hints. */
function Hints({ plan, onTarget, deviation }: { plan: MealPlan; onTarget: boolean; deviation: number }) {
  const hints: string[] = [];
  if (!onTarget) {
    hints.push(`Las kcal del plan se desvían ${Math.round(deviation * 100)}% del objetivo (ideal ≤10%).`);
  }
  const fewOptions = plan.meals.filter((m) => m.options.length < 2).length;
  if (fewOptions > 0) {
    hints.push(`${fewOptions} comida(s) con menos de 2 opciones intercambiables.`);
  }
  if (hints.length === 0) return null;
  return (
    <div className="mt-4 flex flex-col gap-1.5 border-t border-dashed border-border pt-3.5">
      {hints.map((h, i) => (
        <div key={i} className="flex items-start gap-2 text-[12.5px] text-text-2">
          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-warning" />
          {h}
        </div>
      ))}
    </div>
  );
}

/** Numeric field that can be emptied (it is then flagged as invalid). */
function NumberField({
  label,
  value,
  onChange,
  suffix,
  compact,
}: {
  label?: string;
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
  compact?: boolean;
}) {
  const [str, setStr] = useState(Number.isFinite(value) ? String(value) : "");
  const invalid = str.trim() === "" || Number.isNaN(Number(str));

  // Mirrors external changes (e.g. a reset from the advanced JSON) during render;
  // the guard avoids clobbering what the user is typing.
  // Object.is: value can be NaN, and `NaN !== NaN` would re-sync on every render.
  const [prevValue, setPrevValue] = useState(value);
  if (!Object.is(prevValue, value)) {
    setPrevValue(value);
    if (Number.isFinite(value) && Number(str) !== value) setStr(String(value));
  }

  return (
    <label className="flex flex-col gap-1">
      {label && <span className="text-xs font-medium text-text-2">{label}</span>}
      <span className="relative flex items-center">
        <input
          type="number"
          inputMode="decimal"
          value={str}
          onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => {
            setStr(e.target.value);
            onChange(e.target.value.trim() === "" ? NaN : Number(e.target.value));
          }}
          className={`w-full rounded-ctl border bg-surface px-2.5 font-mono text-sm tabular-nums text-text focus:outline-none ${
            compact ? "py-1.5 text-[13px]" : "py-2"
          } ${invalid ? "border-danger" : "border-border-strong focus:border-primary"} ${suffix ? "pr-10" : ""}`}
        />
        {suffix && <span className="pointer-events-none absolute right-2.5 text-[11px] text-text-3">{suffix}</span>}
      </span>
    </label>
  );
}

function IconButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="inline-flex size-8 shrink-0 items-center justify-center rounded-pill text-text-3 transition-colors hover:bg-danger-soft hover:text-danger"
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
        <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      </svg>
    </button>
  );
}
