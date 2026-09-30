/** Left brand panel on the auth screens.
 *  bg-brand-panel is the same in light and dark mode (deep plum). */
export function BrandPanel() {
  const bullets = [
    "Expediente clínico completo por paciente",
    "Planes generados por IA bajo tu aprobación",
    "PDF con tu marca y cédula profesional",
  ];
  return (
    <div className="hidden w-[46%] shrink-0 flex-col bg-brand-panel p-14 lg:flex">
      <div className="font-display text-2xl font-bold text-[#F7ECF2]">Planify</div>

      <div className="mt-auto">
        <h2 className="max-w-md text-pretty font-display text-[38px] font-semibold leading-[1.15] tracking-tight text-[#F7ECF2]">
          La consulta nutricional, en orden.
        </h2>
        <p className="mt-4 max-w-md text-[15px] leading-relaxed text-[#D9BFCC]">
          Expedientes, antropometría y planes alimenticios con IA — que tú revisas y apruebas
          antes de entregar.
        </p>
        <ul className="mt-7 flex flex-col gap-2.5">
          {bullets.map((b) => (
            <li key={b} className="flex items-center gap-2.5 text-sm text-[#F7ECF2]">
              <span className="size-[7px] shrink-0 rounded-full bg-accent" />
              {b}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-auto pt-10 text-xs text-[#B8899C]">
        Hecho para nutriólogos de México
      </div>
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
