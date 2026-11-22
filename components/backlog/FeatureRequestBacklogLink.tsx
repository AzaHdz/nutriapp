"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type { BacklogItem } from "@prisma/client";
import {
  createBacklogItemFromRequest,
  linkFeatureRequestToBacklog,
  unlinkFeatureRequestFromBacklog,
  type BacklogActionResult,
} from "@/app/actions/backlog";
import { BACKLOG_STATUS_LABELS, BACKLOG_STATUS_TONES } from "@/lib/backlog";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

type ItemSummary = Pick<BacklogItem, "id" | "title" | "status">;

/**
 * "Backlog" section on each /admin/solicitudes card. Linking or unlinking never
 * changes the request's status or its response to the nutritionist.
 */
export function FeatureRequestBacklogLink({
  requestId,
  linkedItem,
  openItems,
}: {
  requestId: string;
  linkedItem: ItemSummary | null;
  openItems: ItemSummary[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(action: (fd: FormData) => Promise<BacklogActionResult>) {
    return (formData: FormData) => {
      setError(null);
      startTransition(async () => {
        const r = await action(formData);
        if (!r.ok) setError(r.error);
      });
    };
  }

  return (
    <div className="mt-3.5 flex flex-col gap-2.5 border-t border-border pt-3.5">
      <span className="text-xs font-bold text-text-2">Backlog</span>

      {linkedItem ? (
        <form
          action={run(unlinkFeatureRequestFromBacklog)}
          className="flex flex-wrap items-center gap-2.5"
        >
          <input type="hidden" name="requestId" value={requestId} />
          <Link
            href={`/admin/backlog?estado=${linkedItem.status}#item-${linkedItem.id}`}
            className="min-w-0 truncate text-[13px] font-semibold text-primary hover:underline"
          >
            {linkedItem.title}
          </Link>
          <Badge tone={BACKLOG_STATUS_TONES[linkedItem.status]}>
            {BACKLOG_STATUS_LABELS[linkedItem.status]}
          </Badge>
          <Button size="sm" variant="ghost" disabled={pending}>
            {pending ? "Desligando…" : "Desligar"}
          </Button>
        </form>
      ) : (
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <form action={run(createBacklogItemFromRequest)}>
            <input type="hidden" name="requestId" value={requestId} />
            <Button size="sm" variant="secondary" disabled={pending}>
              Crear item en el backlog
            </Button>
          </form>

          {openItems.length > 0 && (
            <form action={run(linkFeatureRequestToBacklog)} className="flex min-w-0 items-center gap-2">
              <input type="hidden" name="requestId" value={requestId} />
              <select
                name="backlogItemId"
                required
                defaultValue=""
                aria-label="Ligar a un item existente"
                className="h-9 min-w-0 max-w-[260px] rounded-ctl border border-border-strong bg-surface px-2.5 text-sm text-text"
              >
                <option value="" disabled>
                  Ligar a un item existente…
                </option>
                {openItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title} ({BACKLOG_STATUS_LABELS[item.status]})
                  </option>
                ))}
              </select>
              <Button size="sm" variant="secondary" disabled={pending}>
                Ligar
              </Button>
            </form>
          )}
        </div>
      )}

      {error && <span className="text-sm text-danger">{error}</span>}
    </div>
  );
}
