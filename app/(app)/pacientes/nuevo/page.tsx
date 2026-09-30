import { createPatient } from "@/app/actions/patients";
import { Field } from "@/components/ui/Field";
import { Input, Textarea, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function NewPatientPage() {
  return (
    <div className="mx-auto max-w-lg">
      <h1 className="font-display text-2xl font-bold tracking-tight text-text">Nuevo paciente</h1>

      <form action={createPatient} className="mt-6 flex flex-col gap-4">
        <Field label="Nombre completo *" htmlFor="name">
          <Input id="name" name="name" required />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Fecha de nacimiento *" htmlFor="birthDate">
            <Input id="birthDate" name="birthDate" type="date" required />
          </Field>
          <Field label="Género *" htmlFor="gender">
            <Select id="gender" name="gender" required>
              <option value="FEMALE">Femenino</option>
              <option value="MALE">Masculino</option>
              <option value="OTHER">Otro</option>
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Email" htmlFor="email">
            <Input id="email" name="email" type="email" />
          </Field>
          <Field label="Teléfono" htmlFor="phone">
            <Input id="phone" name="phone" />
          </Field>
        </div>

        <Field label="Notas" htmlFor="notes">
          <Textarea id="notes" name="notes" rows={3} />
        </Field>

        <label className="flex items-start gap-2 rounded-ctl bg-surface-3 p-3 text-sm text-text-2">
          <input type="checkbox" name="consent" value="true" required className="mt-0.5 accent-primary" />
          <span>
            El paciente otorgó su consentimiento para el tratamiento de sus
            datos personales y de salud conforme al aviso de privacidad. *
          </span>
        </label>

        <Button type="submit" className="self-start">
          Guardar paciente
        </Button>
      </form>
    </div>
  );
}
