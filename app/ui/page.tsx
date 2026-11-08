import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Stat } from "@/components/ui/Stat";
import { Field } from "@/components/ui/Field";
import { Input, Textarea, Select } from "@/components/ui/Input";
import { BRAND } from "@/lib/brand";

export const metadata = { title: `${BRAND.name} — Kitchen sink UI` };

/** Showcase of every primitive in design system 1c.
 *  Public route (outside the (app) group) for checking the look in light/dark. */
export default function UIPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-10">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-primary">
            Kitchen sink
          </h1>
          <p className="mt-1 text-sm text-text-3">
            Sistema de diseño 2 · Verde nutricional. Usa el toggle para ver ambos modos.
          </p>
        </div>
        <ThemeToggle />
      </header>

      <div className="mt-10 flex flex-col gap-12">
        {/* Typography */}
        <Section title="Tipografía">
          <div className="flex flex-col gap-2">
            <p className="font-display text-3xl font-bold text-text">
              Bricolage Grotesque · títulos
            </p>
            <p className="font-sans text-base text-text">
              DM Sans · cuerpo y UI. La quema veloz de jugo y kiwi.
            </p>
            <p className="font-mono text-base tabular-nums text-text-2">
              IBM Plex Mono · cifras clínicas 0123456789 · 72.4 kg
            </p>
          </div>
        </Section>

        {/* Buttons */}
        <Section title="Botones">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="primary" disabled>
              Disabled
            </Button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
          </div>
        </Section>

        {/* Badges */}
        <Section title="Badges">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="neutral">Neutral</Badge>
            <Badge tone="primary">Primary</Badge>
            <Badge tone="success">Aprobado</Badge>
            <Badge tone="warning">Pendiente</Badge>
            <Badge tone="danger">Error</Badge>
            <Badge tone="info">Info</Badge>
          </div>
        </Section>

        {/* Clinical figures */}
        <Section title="Cifras clínicas (Stat) con rango">
          <Card className="p-5">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Stat label="Peso" value="72.4" unit="kg" />
              <Stat label="IMC" value="24.1" range="in" />
              <Stat label="% grasa" value="31.2" unit="%" range="out" />
              <Stat label="Glucosa" value="148" unit="mg/dL" range="critical" />
            </div>
          </Card>
        </Section>

        {/* Forms */}
        <Section title="Formularios">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre" htmlFor="ks-name">
              <Input id="ks-name" placeholder="María Fernanda López" />
            </Field>
            <Field label="Género" htmlFor="ks-gender">
              <Select id="ks-gender" defaultValue="FEMALE">
                <option value="FEMALE">Femenino</option>
                <option value="MALE">Masculino</option>
                <option value="OTHER">Otro</option>
              </Select>
            </Field>
            <Field label="Email" htmlFor="ks-email" hint="Opcional, para enviar el plan.">
              <Input id="ks-email" type="email" placeholder="tu@correo.com" />
            </Field>
            <Field label="Peso (kg)" htmlFor="ks-weight" error="Ingresa un número mayor a 0.">
              <Input id="ks-weight" type="number" defaultValue={-1} />
            </Field>
            <Field label="Notas" htmlFor="ks-notes" className="sm:col-span-2">
              <Textarea id="ks-notes" rows={3} placeholder="Observaciones de la consulta…" />
            </Field>
          </div>
        </Section>

        {/* Surfaces */}
        <Section title="Superficies y bordes">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-card border border-border bg-surface p-4 text-sm text-text-2">
              surface
            </div>
            <div className="rounded-card border border-border bg-surface-2 p-4 text-sm text-text-2">
              surface-2
            </div>
            <div className="rounded-card border border-border bg-surface-3 p-4 text-sm text-text-2">
              surface-3
            </div>
          </div>
        </Section>

        {/* Semantic feedback */}
        <Section title="Bloques semánticos">
          <div className="flex flex-col gap-3">
            <Callout tone="success">Plan aprobado y listo para exportar.</Callout>
            <Callout tone="warning">La validación numérica encontró 2 puntos a revisar.</Callout>
            <Callout tone="danger">No se pudo generar el plan. Intenta de nuevo.</Callout>
            <Callout tone="info">El plan es un borrador hasta que lo apruebes.</Callout>
          </div>
        </Section>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-4 font-display text-sm font-semibold uppercase tracking-wide text-text-3">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Callout({
  tone,
  children,
}: {
  tone: "success" | "warning" | "danger" | "info";
  children: React.ReactNode;
}) {
  const cls = {
    success: "border-success-brd bg-success-soft text-success",
    warning: "border-warning-brd bg-warning-soft text-warning",
    danger: "border-danger-brd bg-danger-soft text-danger",
    info: "border-info-brd bg-info-soft text-info",
  }[tone];
  return (
    <div className={`rounded-card border p-3 text-sm ${cls}`}>{children}</div>
  );
}
