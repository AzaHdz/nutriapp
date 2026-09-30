"use client";

import { useState } from "react";
import type { MealPlan } from "@/lib/ai/planSchema";
import { PlanEditor } from "@/components/PlanEditor";
import { Button } from "@/components/ui/Button";

/** Toggles between the read-only plan view and the visual editor. */
export function PlanPanel({
  consultationId,
  plan,
  readView,
  summary,
}: {
  consultationId: string;
  plan: MealPlan;
  readView: React.ReactNode;
  summary: React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button variant={editing ? "primary" : "secondary"} size="sm" onClick={() => setEditing((v) => !v)}>
          {editing ? "Listo" : "✎ Editar plan"}
        </Button>
      </div>

      {editing ? (
        <PlanEditor consultationId={consultationId} plan={plan} />
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-[1.7fr_1fr]">
          <div className="flex flex-col gap-4">{readView}</div>
          <div className="flex flex-col gap-4">{summary}</div>
        </div>
      )}
    </div>
  );
}
