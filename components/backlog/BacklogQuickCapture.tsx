"use client";

import { useEffect, useState, useTransition } from "react";
import { createBacklogItem } from "@/app/actions/backlog";
import {
  BACKLOG_PRIORITIES,
  BACKLOG_PRIORITY_LABELS,
  BACKLOG_TYPES,
  BACKLOG_TYPE_LABELS,
} from "@/lib/backlog";
import { Field } from "@/components/ui/Field";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { BugIcon } from "@/components/nav/icons";

/**
 * Floating "report a bug" button, rendered for ADMIN accounts only (app layout).
 * Saves straight into the backlog INBOX, with the current route, user agent and
 * viewport captured automatically.
 *
 * On mobile it sits above the bottom tab bar (h-16 + safe area); z-30 keeps it
 * under the bar (z-40) and the "Más" sheet (z-50).
 */
export function BacklogQuickCapture() {
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(false), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <div className="print:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Registrar bug o mejora"
        title="Registrar bug o mejora"
        className="fixed right-4 bottom-[calc(env(safe-area-inset-bottom)+5rem)] z-30 flex h-11 w-11 items-center justify-center rounded-pill border border-border-strong bg-surface text-text-2 shadow-lg transition-colors hover:bg-surface-3 hover:text-text md:right-6 md:bottom-6"
      >
        <BugIcon />
      </button>

      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+5rem)] z-50 flex justify-center px-4 md:bottom-6"
      >
        {toast && (
          <span className="rounded-pill border border-success-brd bg-success-soft px-4 py-2 text-sm font-semibold text-success shadow-lg">
            Guardado en la bandeja del backlog ✓
          </span>
        )}
      </div>

      {open && (
        <QuickCaptureDialog
          onClose={() => setOpen(false)}
          onSaved={() => {
            setOpen(false);
            setToast(true);
          }}
        />
      )}
    </div>
  );
}

function QuickCaptureDialog({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Close with Escape (the title input takes focus via autoFocus).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function onSubmit(formData: FormData) {
    // Context is read at submit time, so it reflects the page the bug was seen on.
    formData.set("pageUrl", window.location.pathname + window.location.search);
    formData.set("userAgent", navigator.userAgent);
    formData.set("viewport", `${window.innerWidth}x${window.innerHeight}`);
    setError(null);
    startTransition(async () => {
      const r = await createBacklogItem(formData);
      if (r.ok) onSaved();
      else setError(r.error);
    });
  }

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Cerrar"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 bg-overlay"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-capture-title"
        className="absolute inset-x-0 bottom-0 rounded-t-card border-t border-border bg-surface p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-lg md:inset-x-auto md:right-6 md:bottom-20 md:w-[380px] md:rounded-card md:border md:pb-4"
      >
        <div className="mb-3 flex items-center justify-between">
          <span id="quick-capture-title" className="text-sm font-semibold text-text">
            Registrar en el backlog
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-pill px-3 py-1.5 text-sm font-medium text-text-2 hover:bg-surface-3 hover:text-text"
          >
            Cancelar
          </button>
        </div>

        <form action={onSubmit} className="flex flex-col gap-3">
          <Field label="Título" htmlFor="qc-title">
            <Input
              autoFocus
              id="qc-title"
              name="title"
              required
              minLength={3}
              maxLength={160}
              placeholder="¿Qué falló o qué mejorarías?"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tipo" htmlFor="qc-type">
              <Select id="qc-type" name="type" defaultValue="BUG">
                {BACKLOG_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {BACKLOG_TYPE_LABELS[t]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Prioridad" htmlFor="qc-priority">
              <Select id="qc-priority" name="priority" defaultValue="P3">
                {BACKLOG_PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {BACKLOG_PRIORITY_LABELS[p]}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Descripción (opcional)" htmlFor="qc-description">
            <Textarea id="qc-description" name="description" rows={3} maxLength={5000} />
          </Field>
          <p className="text-[11.5px] text-text-3">
            Se guarda la página actual, el navegador y el tamaño de pantalla.
          </p>
          <div className="flex items-center gap-3">
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Guardando…" : "Guardar"}
            </Button>
            {error && <span className="text-sm text-danger">{error}</span>}
          </div>
        </form>
      </div>
    </div>
  );
}
