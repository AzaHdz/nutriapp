"use client";

import { useRef, useState, useTransition } from "react";
import { createFeatureRequest } from "@/app/actions/featureRequests";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function FeatureRequestForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  function onSubmit(formData: FormData) {
    setStatus("idle");
    setError(null);
    startTransition(async () => {
      const r = await createFeatureRequest(formData);
      if (r.ok) {
        setStatus("ok");
        formRef.current?.reset();
      } else {
        setStatus("error");
        setError(r.error ?? "No se pudo enviar.");
      }
    });
  }

  return (
    <form ref={formRef} action={onSubmit}>
      <Card className="flex flex-col gap-4 p-6">
        <Field label="¿Qué necesitas?" htmlFor="title">
          <Input
            id="title"
            name="title"
            required
            maxLength={120}
            placeholder="Ej. Recordatorios de consulta por WhatsApp"
          />
        </Field>

        <Field
          label="Cuéntanos más"
          htmlFor="description"
          hint="¿Qué problema te resolvería? ¿Cómo te imaginas que funcione?"
        >
          <Textarea
            id="description"
            name="description"
            required
            rows={4}
            maxLength={2000}
            placeholder="Describe la funcionalidad y para qué la usarías…"
          />
        </Field>

        <div className="flex items-center gap-3 pt-1">
          <Button type="submit" disabled={pending}>
            {pending ? "Enviando…" : "Enviar sugerencia"}
          </Button>
          {status === "ok" && (
            <span className="text-sm text-success">Enviada ✓ — la revisaremos pronto</span>
          )}
          {status === "error" && <span className="text-sm text-danger">{error}</span>}
        </div>
      </Card>
    </form>
  );
}
