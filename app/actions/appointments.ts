"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { toUtc, dayKey, monthKey } from "@/lib/dates";

const AppointmentInput = z.object({
  patientId: z.string().min(1, "Elige un paciente"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Hora inválida"),
  durationMin: z.coerce
    .number()
    .int()
    .min(15, "La cita debe durar al menos 15 minutos")
    .max(480, "La cita no puede durar más de 8 horas"),
  notes: z.string().optional(),
});

/** Refreshes everything that shows appointments. The schedule and dashboard
 *  always; the patient record only when we know which patient it is. */
function refresh(patientId?: string) {
  revalidatePath("/agenda");
  revalidatePath("/dashboard");
  if (patientId) revalidatePath(`/pacientes/${patientId}`);
}

/** Where to go back after touching an appointment: its day on the grid. */
function dayUrl(startsAt: Date): string {
  const day = dayKey(startsAt);
  const [year, month] = day.split("-").map(Number);
  return `/agenda?mes=${monthKey(year, month)}&dia=${day}`;
}

/** Create and reschedule return the error as a value: a client form calls them
 *  with useTransition, and a throw in production is masked as a generic 500
 *  (same reason as in app/actions/consultations.ts). */
export async function createAppointment(formData: FormData) {
  const { userId } = await requireUser();

  const parsed = AppointmentInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues.map((i) => i.message).join(", ") };
  }
  const d = parsed.data;

  // The patient must belong to this nutritionist; existing is not enough
  const patient = await prisma.patient.findFirst({
    where: { id: d.patientId, userId },
    select: { id: true },
  });
  if (!patient) return { ok: false as const, error: "Paciente no encontrado" };

  const startsAt = toUtc(d.date, d.time);
  await prisma.appointment.create({
    data: {
      userId,
      patientId: d.patientId,
      startsAt,
      durationMin: d.durationMin,
      notes: d.notes || null,
    },
  });

  refresh(d.patientId);
  redirect(dayUrl(startsAt));
}

const RescheduleInput = AppointmentInput.omit({ patientId: true }).extend({
  appointmentId: z.string().min(1),
});

export async function rescheduleAppointment(formData: FormData) {
  const { userId } = await requireUser();

  const parsed = RescheduleInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues.map((i) => i.message).join(", ") };
  }
  const d = parsed.data;

  const startsAt = toUtc(d.date, d.time);
  // updateMany scoped by userId: another nutritionist's id updates nothing
  const r = await prisma.appointment.updateMany({
    where: { id: d.appointmentId, userId },
    data: { startsAt, durationMin: d.durationMin, notes: d.notes || null },
  });
  if (r.count === 0) return { ok: false as const, error: "Cita no encontrada" };

  const appointment = await prisma.appointment.findFirst({
    where: { id: d.appointmentId, userId },
    select: { patientId: true },
  });
  refresh(appointment?.patientId);
  redirect(dayUrl(startsAt));
}

const StatusInput = z.object({
  appointmentId: z.string().min(1),
  status: z.enum(["SCHEDULED", "CONFIRMED", "CANCELLED", "COMPLETED"]),
});

/** Changing status and deleting do throw: server component forms call them,
 *  and there is nowhere to render a returned error. */
export async function setAppointmentStatus(formData: FormData) {
  const { userId } = await requireUser();

  const parsed = StatusInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error("Datos inválidos");

  const r = await prisma.appointment.updateMany({
    where: { id: parsed.data.appointmentId, userId },
    data: { status: parsed.data.status },
  });
  if (r.count === 0) throw new Error("Cita no encontrada");

  const appointment = await prisma.appointment.findFirst({
    where: { id: parsed.data.appointmentId, userId },
    select: { patientId: true },
  });
  refresh(appointment?.patientId);
}

export async function deleteAppointment(formData: FormData) {
  const { userId } = await requireUser();
  const appointmentId = String(formData.get("appointmentId") ?? "");
  if (!appointmentId) throw new Error("Datos inválidos");

  const appointment = await prisma.appointment.findFirst({
    where: { id: appointmentId, userId },
    select: { patientId: true, startsAt: true },
  });
  // deleteMany scoped by userId can't delete another nutritionist's appointments
  await prisma.appointment.deleteMany({ where: { id: appointmentId, userId } });

  refresh(appointment?.patientId);
  redirect(appointment ? dayUrl(appointment.startsAt) : "/agenda");
}
