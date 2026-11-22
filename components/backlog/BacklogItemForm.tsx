"use client";

import { useRef, useState, useTransition } from "react";
import type { BacklogItem, BacklogType } from "@prisma/client";
import { createBacklogItem, updateBacklogItem } from "@/app/actions/backlog";
import {
  BACKLOG_PRIORITIES,
  BACKLOG_PRIORITY_LABELS,
  BACKLOG_TYPES,
  BACKLOG_TYPE_LABELS,
  BUG_SEVERITIES,
  BUG_SEVERITY_LABELS,
} from "@/lib/backlog";
import { Field } from "@/components/ui/Field";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

type EditableItem = Pick<
  BacklogItem,
  "id" | "type" | "title" | "description" | "priority" | "severity" | "area" | "stepsToRepro" | "pageUrl"
>;

/** Full create/edit form for /admin/backlog. Without `item` it creates (always into INBOX). */
export function BacklogItemForm({ item }: { item?: EditableItem }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [type, setType] = useState<BacklogType>(item?.type ?? "BUG");
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const idp = item ? `edit-${item.id}-` : "new-";

  function onSubmit(formData: FormData) {
    setResult(null);
    startTransition(async () => {
      const r = item ? await updateBacklogItem(formData) : await createBacklogItem(formData);
      if (r.ok) {
        setResult({ ok: true, message: item ? "Cambios guardados ✓" : "Agregado a la bandeja ✓" });
        if (!item) {
          formRef.current?.reset();
          setType("BUG");
        }
      } else {
        setResult({ ok: false, message: r.error });
      }
    });
  }

  return (
    <form ref={formRef} action={onSubmit} className="flex flex-col gap-3.5">
      {item && <input type="hidden" name="id" value={item.id} />}

      <Field label="Título" htmlFor={`${idp}title`}>
        <Input
          id={`${idp}title`}
          name="title"
          required
          minLength={3}
          maxLength={160}
          defaultValue={item?.title}
          placeholder="Ej. El calendario no carga en Safari"
        />
      </Field>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        <Field label="Tipo" htmlFor={`${idp}type`}>
          <Select
            id={`${idp}type`}
            name="type"
            value={type}
            onChange={(e) => setType(e.target.value as BacklogType)}
          >
            {BACKLOG_TYPES.map((t) => (
              <option key={t} value={t}>
                {BACKLOG_TYPE_LABELS[t]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Prioridad" htmlFor={`${idp}priority`}>
          <Select id={`${idp}priority`} name="priority" defaultValue={item?.priority ?? "P3"}>
            {BACKLOG_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {BACKLOG_PRIORITY_LABELS[p]}
              </option>
            ))}
          </Select>
        </Field>
        {type === "BUG" ? (
          <Field label="Severidad" htmlFor={`${idp}severity`}>
            <Select id={`${idp}severity`} name="severity" defaultValue={item?.severity ?? ""}>
              <option value="">Sin definir</option>
              {BUG_SEVERITIES.map((s) => (
                <option key={s} value={s}>
                  {BUG_SEVERITY_LABELS[s]}
                </option>
              ))}
            </Select>
          </Field>
        ) : (
          <div className="hidden sm:block" />
        )}
      </div>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <Field label="Área" htmlFor={`${idp}area`} hint="Opcional. Ej. agenda, planes, login">
          <Input id={`${idp}area`} name="area" maxLength={60} defaultValue={item?.area ?? ""} />
        </Field>
        <Field label="Página" htmlFor={`${idp}pageUrl`} hint="Opcional. Ruta donde ocurre">
          <Input
            id={`${idp}pageUrl`}
            name="pageUrl"
            maxLength={2000}
            defaultValue={item?.pageUrl ?? ""}
            placeholder="/agenda"
          />
        </Field>
      </div>

      <Field label="Descripción" htmlFor={`${idp}description`}>
        <Textarea
          id={`${idp}description`}
          name="description"
          rows={3}
          maxLength={5000}
          defaultValue={item?.description}
          placeholder="Qué pasa y qué debería pasar…"
        />
      </Field>

      {/* Hidden (not unmounted) for non-bugs so switching type doesn't wipe it */}
      <Field
        label="Pasos para reproducir"
        htmlFor={`${idp}stepsToRepro`}
        className={type === "BUG" ? undefined : "hidden"}
      >
        <Textarea
          id={`${idp}stepsToRepro`}
          name="stepsToRepro"
          rows={3}
          maxLength={5000}
          defaultValue={item?.stepsToRepro ?? ""}
          placeholder={"1. Entrar a…\n2. Tocar…\n3. Ver que…"}
        />
      </Field>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Guardando…" : item ? "Guardar cambios" : "Agregar al backlog"}
        </Button>
        {result && (
          <span role="status" className={result.ok ? "text-sm text-success" : "text-sm text-danger"}>
            {result.message}
          </span>
        )}
      </div>
    </form>
  );
}
