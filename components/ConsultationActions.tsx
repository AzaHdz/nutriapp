"use client";

import { useState, useTransition } from "react";
import {
  generatePlanAction,
  saveFinalPlan,
  approveConsultation,
} from "@/app/actions/consultations";
import { Button, buttonVariants } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";

export function GeneratePlanButton({
  consultationId,
  hasPlan,
}: {
  consultationId: string;
  hasPlan: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-2">
      <Button
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            try {
              const r = await generatePlanAction(consultationId);
              if (!r.ok) setError(r.error);
            } catch (e) {
              setError(e instanceof Error ? e.message : "Error al generar el plan");
            }
          });
        }}
      >
        {pending
          ? "Generando plan…"
          : hasPlan
            ? "Regenerar plan con IA"
            : "Generar plan con IA"}
      </Button>
      {pending && (
        <p className="text-xs text-text-3">
          Esto puede tomar alrededor de un minuto. El plan es un borrador: revísalo antes de aprobar.
        </p>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}

export function PlanEditorJson({
  consultationId,
  planJson,
  label = "Editar plan (JSON)",
}: {
  consultationId: string;
  planJson: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(planJson);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  // Re-syncs with the current plan when the visual editor changes it
  // (adjusted during render, not in an effect, to avoid cascading renders).
  const [prevPlanJson, setPrevPlanJson] = useState(planJson);
  if (prevPlanJson !== planJson) {
    setPrevPlanJson(planJson);
    setValue(planJson);
  }

  return (
    <div className="rounded-card border border-border bg-surface">
      <button
        onClick={() => setOpen(!open)}
        className="w-full rounded-card px-4 py-3 text-left text-sm font-medium text-text-2 transition-colors hover:bg-surface-3"
      >
        {open ? "▾" : "▸"} {label}
      </button>
      {open && (
        <div className="flex flex-col gap-2 border-t border-border p-4">
          <Textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={18}
            spellCheck={false}
            className="font-mono text-xs"
          />
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              disabled={pending}
              onClick={() => {
                setMessage(null);
                startTransition(async () => {
                  try {
                    await saveFinalPlan(consultationId, value);
                    setMessage("Guardado ✓ (la aprobación previa se invalidó)");
                  } catch (e) {
                    setMessage(e instanceof Error ? e.message : "Error al guardar");
                  }
                });
              }}
            >
              {pending ? "Guardando…" : "Guardar cambios"}
            </Button>
            {message && <p className="text-sm text-text-2">{message}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

export function ApproveButton({
  consultationId,
  approved,
}: {
  consultationId: string;
  approved: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  if (approved) {
    return (
      <div className="flex items-center gap-3">
        <Badge tone="success">✓ Plan aprobado</Badge>
        <a
          href={`/consultas/${consultationId}/imprimir`}
          target="_blank"
          className={buttonVariants({ variant: "secondary", size: "sm" })}
        >
          Exportar PDF
        </a>
      </div>
    );
  }

  const approve = (confirm: boolean) => {
    setError(null);
    startTransition(async () => {
      try {
        const r = await approveConsultation(consultationId, { confirm });
        setWarnings(r.approved ? [] : r.warnings);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al aprobar");
      }
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <Button variant="secondary" disabled={pending} onClick={() => approve(false)}>
        {pending ? "Validando…" : "Aprobar plan"}
      </Button>
      {warnings.length > 0 && (
        <div className="rounded-card border border-warning-brd bg-warning-soft p-3 text-sm text-warning">
          <p className="font-medium">El plan no se aprobó: la validación numérica encontró…</p>
          <ul className="mt-1 list-disc pl-5">
            {warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
          <p className="mt-2">Corrige el plan, o aprueba bajo tu criterio profesional:</p>
          <Button
            variant="secondary"
            size="sm"
            className="mt-2"
            disabled={pending}
            onClick={() => approve(true)}
          >
            Aprobar de todas formas
          </Button>
        </div>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
