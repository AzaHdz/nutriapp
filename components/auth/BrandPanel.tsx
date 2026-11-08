import { BRAND } from "@/lib/brand";
import { TIER_LIMITS } from "@/lib/limits";

// Value proposition shown on the auth screens. Benefit first, then the feature
// that backs it: every claim here must stay true to what the app does.
const HEADLINE = "Planes alimenticios en minutos. La última palabra es tuya.";
const SUBHEAD =
  "La IA prepara el borrador con los datos de la consulta; tú lo ajustas, lo apruebas y lo entregas en PDF con tu marca.";
const MOBILE_TAGLINE = "Planes con IA que tú apruebas, en minutos.";
const BENEFITS = [
  { title: "Ahorra horas por paciente:", text: "el plan sale de la consulta, no de una hoja en blanco." },
  { title: "Revisión clínica automática:", text: "calorías y macros contra el requerimiento de cada paciente." },
  { title: "PDF profesional", text: "con tu logo y cédula, listo para entregar." },
  { title: "Expediente, progreso y agenda", text: "con recordatorios por WhatsApp, todo en un lugar." },
];
const FREE_CONSULTATIONS = TIER_LIMITS.FREE.consultationsPerMonth;

/** Left brand panel on the auth screens (large screens only).
 *  Colors come from the --brand-panel and --on-brand-panel* tokens in globals.css. */
export function BrandPanel() {
  return (
    <div className="hidden w-[46%] shrink-0 flex-col bg-brand-panel p-14 lg:flex">
      <div className="font-display text-2xl font-bold text-on-brand-panel">{BRAND.name}</div>

      <div className="mt-auto">
        <h2 className="max-w-md text-pretty font-display text-[38px] font-semibold leading-[1.15] tracking-tight text-on-brand-panel">
          {HEADLINE}
        </h2>
        <p className="mt-4 max-w-md text-[15px] leading-relaxed text-on-brand-panel-2">{SUBHEAD}</p>
        <ul className="mt-7 flex max-w-md flex-col gap-3">
          {BENEFITS.map((b) => (
            <li key={b.title} className="flex gap-2.5 text-sm leading-relaxed text-on-brand-panel-2">
              <span className="mt-[7px] size-[7px] shrink-0 rounded-full bg-accent" />
              <span>
                <strong className="font-semibold text-on-brand-panel">{b.title}</strong> {b.text}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-auto pt-10 text-xs text-on-brand-panel-3">
        Hecho para nutriólogos de México · Empieza gratis con {FREE_CONSULTATIONS} consultas al mes
      </div>
    </div>
  );
}

/** Compact brand header for small screens, where BrandPanel is hidden. */
export function BrandMobileHeader() {
  return (
    <div className="mb-8 lg:hidden">
      <div className="font-display text-xl font-bold text-primary">{BRAND.name}</div>
      <p className="mt-1 text-sm text-text-2">{MOBILE_TAGLINE}</p>
    </div>
  );
}

/** Trust seal below the form. */
export function TrustSeal() {
  return (
    <div className="mt-6 flex items-center justify-center gap-2 text-[11.5px] text-text-3">
      <span className="size-[7px] rounded-[2px] bg-success" />
      Datos de salud cifrados · Solo tú accedes a tus expedientes
    </div>
  );
}
