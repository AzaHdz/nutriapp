import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { updatePatient } from "@/app/actions/patients";
import { Field } from "@/components/ui/Field";
import { Input, Textarea, Select } from "@/components/ui/Input";
import { Button, buttonVariants } from "@/components/ui/Button";
import { dateForInput } from "@/lib/dates";

export default async function EditPatientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { userId } = await requireUser();

  const patient = await prisma.patient.findFirst({ where: { id, userId } });
  if (!patient) notFound();

  return (
    <div className="mx-auto max-w-lg">
      <div className="text-[12.5px] text-text-3">
        <Link href="/pacientes" className="hover:underline">
          Pacientes
        </Link>
        <span className="mx-1.5">/</span>
        <Link href={`/pacientes/${patient.id}`} className="hover:underline">
          {patient.name}
        </Link>
        <span className="mx-1.5">/</span>
        <span className="font-semibold text-text">Editar</span>
      </div>

      <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-text">Editar datos</h1>

      <form action={updatePatient} className="mt-6 flex flex-col gap-4">
        <input type="hidden" name="patientId" value={patient.id} />

        <Field label="Nombre completo *" htmlFor="name">
          <Input id="name" name="name" required defaultValue={patient.name} />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Fecha de nacimiento *" htmlFor="birthDate">
            <Input
              id="birthDate"
              name="birthDate"
              type="date"
              required
              defaultValue={dateForInput(patient.birthDate)}
            />
          </Field>
          <Field label="Género *" htmlFor="gender">
            <Select id="gender" name="gender" required defaultValue={patient.gender}>
              <option value="FEMALE">Femenino</option>
              <option value="MALE">Masculino</option>
              <option value="OTHER">Otro</option>
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Email" htmlFor="email">
            <Input id="email" name="email" type="email" defaultValue={patient.email ?? ""} />
          </Field>
          <Field
            label="Teléfono"
            htmlFor="phone"
            hint="Se usa para el recordatorio de cita por WhatsApp"
          >
            <Input id="phone" name="phone" defaultValue={patient.phone ?? ""} />
          </Field>
        </div>

        <Field label="Notas" htmlFor="notes">
          <Textarea id="notes" name="notes" rows={3} defaultValue={patient.notes ?? ""} />
        </Field>

        <div className="flex gap-2.5">
          <Button type="submit">Guardar cambios</Button>
          <Link
            href={`/pacientes/${patient.id}`}
            className={buttonVariants({ variant: "secondary" })}
          >
            Cancelar
          </Link>
        </div>
      </form>

      <p className="mt-6 border-t border-border pt-4 text-[12.5px] text-text-3">
        El consentimiento de tratamiento de datos se otorgó al dar de alta al paciente y no se
        edita desde aquí.
      </p>
    </div>
  );
}
