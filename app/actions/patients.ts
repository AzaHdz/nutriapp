"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

const PatientInput = z.object({
  name: z.string().min(2, "Nombre demasiado corto"),
  birthDate: z.coerce.date(),
  gender: z.enum(["FEMALE", "MALE", "OTHER"]),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  notes: z.string().optional(),
  consent: z.coerce.boolean(),
});

export async function createPatient(formData: FormData) {
  const { userId } = await requireUser();

  const parsed = PatientInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join(", "));
  }
  const d = parsed.data;
  if (!d.consent) {
    throw new Error("Se requiere el consentimiento del paciente para el tratamiento de sus datos de salud.");
  }

  const patient = await prisma.patient.create({
    data: {
      userId,
      name: d.name,
      birthDate: d.birthDate,
      gender: d.gender,
      email: d.email || null,
      phone: d.phone || null,
      notes: d.notes || null,
      consentAt: new Date(),
    },
  });

  revalidatePath("/pacientes");
  redirect(`/pacientes/${patient.id}`);
}

/** Same fields as creation, minus consent: it was granted once and is not
 *  edited from here. */
const UpdatePatientInput = PatientInput.omit({ consent: true }).extend({
  patientId: z.string().min(1),
});

export async function updatePatient(formData: FormData) {
  const { userId } = await requireUser();

  const parsed = UpdatePatientInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join(", "));
  }
  const d = parsed.data;

  // updateMany scoped by userId: another nutritionist's id updates nothing
  const r = await prisma.patient.updateMany({
    where: { id: d.patientId, userId },
    data: {
      name: d.name,
      birthDate: d.birthDate,
      gender: d.gender,
      email: d.email || null,
      phone: d.phone || null,
      notes: d.notes || null,
    },
  });
  if (r.count === 0) throw new Error("Paciente no encontrado");

  revalidatePath("/pacientes");
  revalidatePath(`/pacientes/${d.patientId}`);
  // The phone feeds the appointment reminder
  revalidatePath("/agenda");
  redirect(`/pacientes/${d.patientId}`);
}

export async function deletePatient(patientId: string) {
  const { userId } = await requireUser();
  // deleteMany scoped by userId can't delete another nutritionist's patients
  await prisma.patient.deleteMany({ where: { id: patientId, userId } });
  revalidatePath("/pacientes");
  redirect("/pacientes");
}
