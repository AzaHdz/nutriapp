"use client";

import { useState, useTransition } from "react";
import type { BacklogStatus } from "@prisma/client";
import { updateBacklogStatus } from "@/app/actions/backlog";
import { BACKLOG_STATUSES, BACKLOG_STATUS_LABELS } from "@/lib/backlog";
import { Input, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

/** Status select on each backlog card. Moving to DONE asks for resolution and commit. */
export function BacklogStatusForm({
  id,
  status: currentStatus,
  resolution,
  commitRef,
}: {
  id: string;
  status: BacklogStatus;
  resolution: string | null;
  commitRef: string | null;
}) {
  const [status, setStatus] = useState<BacklogStatus>(currentStatus);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const r = await updateBacklogStatus(formData);
      if (!r.ok) setError(r.error);
    });
  }

  return (
    <form action={onSubmit} className="flex flex-col gap-2.5">
      <input type="hidden" name="id" value={id} />
      <div className="flex items-center gap-2.5">
        <select
          name="status"
          aria-label="Estado"
          value={status}
          onChange={(e) => setStatus(e.target.value as BacklogStatus)}
          className="h-9 rounded-ctl border border-border-strong bg-surface px-2.5 text-sm text-text"
        >
          {BACKLOG_STATUSES.map((s) => (
            <option key={s} value={s}>
              {BACKLOG_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <Button size="sm" variant="secondary" disabled={pending}>
          {pending ? "Guardando…" : "Guardar"}
        </Button>
        {error && <span className="text-sm text-danger">{error}</span>}
      </div>

      {status === "DONE" && (
        <div className="flex flex-col gap-2">
          <Textarea
            name="resolution"
            rows={2}
            maxLength={5000}
            defaultValue={resolution ?? ""}
            aria-label="Resolución"
            placeholder="Cómo se resolvió (opcional)…"
          />
          <Input
            name="commitRef"
            maxLength={200}
            defaultValue={commitRef ?? ""}
            aria-label="Commit o PR"
            placeholder="Commit o URL del PR (opcional)"
          />
        </div>
      )}
    </form>
  );
}
