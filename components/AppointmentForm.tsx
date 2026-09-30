"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { createAppointment, rescheduleAppointment } from "@/app/actions/appointments";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Button, buttonVariants } from "@/components/ui/Button";

const DURATIONS = [30, 45, 60, 90, 120];

type Values = {
  appointmentId?: string;
  patientId?: string;
  date?: string;
  time?: string;
  durationMin?: number;
  notes?: string | null;
};

/** Creates or reschedules an appointment. Rescheduling never changes the patient:
 *  moving an appointment to someone else means cancelling it and creating another. */
export function AppointmentForm({
  patients,
  values,
  patientName,
}: {
  patients: { id: string; name: string }[];
  values?: Values;
  /** Rescheduling only, to show whose appointment it is. */
  patientName?: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const editing = Boolean(values?.appointmentId);

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      // On success the action redirects to the appointment's day and never returns
      const r = editing ? await rescheduleAppointment(formData) : await createAppointment(formData);
      if (r && !r.ok) setError(r.error);
    });
  }

  return (
    <form action={onSubmit} className="mt-6 flex flex-col gap-4">
      {editing && <input type="hidden" name="appointmentId" value={values!.appointmentId} />}

      <Card className="flex flex-col gap-4 p-5">
        {editing ? (
          <Field label="Paciente">
            <p className="text-sm font-semibold text-text">{patientName}</p>
            <p className="mt-0.5 text-xs text-text-3">
              Para cambiar de paciente, cancela esta cita y crea una nueva.
            </p>
          </Field>
        ) : (
          <Field label="Paciente *" htmlFor="patientId">
            <Select id="patientId" name="patientId" required defaultValue={values?.patientId ?? ""}>
              <option value="" disabled>
                Elige un paciente…
              </option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Field label="Fecha *" htmlFor="date">
            <Input id="date" name="date" type="date" required defaultValue={values?.date} />
          </Field>
          <Field label="Hora *" htmlFor="time">
            <Input id="time" name="time" type="time" required defaultValue={values?.time ?? "09:00"} />
          </Field>
        </div>

        <Field label="Duración" htmlFor="durationMin" hint="Horario de la Ciudad de México">
          <Select id="durationMin" name="durationMin" defaultValue={String(values?.durationMin ?? 60)}>
            {DURATIONS.map((m) => (
              <option key={m} value={m}>
                {m} minutos
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Notas"
          htmlFor="notes"
          hint="Logística de la cita: motivo, si viene acompañado… No datos clínicos."
        >
          <Textarea id="notes" name="notes" rows={3} defaultValue={values?.notes ?? ""} />
        </Field>
      </Card>

      {error && (
        <div className="rounded-ctl border border-danger-brd bg-danger-soft px-4 py-3 text-[13px] text-danger">
          {error}
        </div>
      )}

      <div className="flex gap-2.5">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : editing ? "Guardar cambios" : "Agendar cita"}
        </Button>
        <Link href="/agenda" className={buttonVariants({ variant: "secondary" })}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}
