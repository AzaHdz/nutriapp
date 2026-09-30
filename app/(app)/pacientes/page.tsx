import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { bmi, classifyBmi } from "@/lib/calculations";
import { formatShortDate } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { buttonVariants } from "@/components/ui/Button";

const rangeText = {
  in: "text-range-in",
  out: "text-range-out",
  critical: "text-range-critical",
} as const;

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filtro?: string }>;
}) {
  const { userId } = await requireUser();
  // `filtro` is a URL query param, which stays in Spanish
  const { q, filtro: filter } = await searchParams;
  const query = q?.trim();

  const total = await prisma.patient.count({ where: { userId } });

  const patients = await prisma.patient.findMany({
    where: {
      userId,
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { email: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { consultations: true } },
      consultations: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  // "Plan pendiente" filter (computed in memory from the latest consultation)
  const filtered =
    filter === "pendiente"
      ? patients.filter((p) => {
          const latest = p.consultations[0];
          return latest?.finalPlan && !latest.approvedAt;
        })
      : patients;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display text-[26px] font-bold tracking-tight text-text">
          Pacientes <span className="font-mono text-sm font-medium text-text-3">{total}</span>
        </h1>
        <Link href="/pacientes/nuevo" className={buttonVariants({ size: "sm" })}>
          + Nuevo paciente
        </Link>
      </div>

      {/* Search + filters */}
      <div className="flex flex-wrap items-center gap-2.5">
        <form className="flex max-w-sm flex-1 items-center gap-2 rounded-pill border border-border-strong bg-surface px-4 py-2">
          <SearchIcon />
          <input
            name="q"
            defaultValue={query}
            placeholder="Buscar por nombre o correo…"
            className="w-full bg-transparent text-sm text-text placeholder:text-text-3 focus:outline-none"
          />
          {filter && <input type="hidden" name="filtro" value={filter} />}
        </form>
        <FilterChip label="Todos" active={!filter} href={query ? `/pacientes?q=${query}` : "/pacientes"} />
        <FilterChip
          label="Plan pendiente"
          active={filter === "pendiente"}
          href={`/pacientes?filtro=pendiente${query ? `&q=${query}` : ""}`}
        />
      </div>

      <Card className="overflow-hidden">
        {/* thead */}
        <div className="grid grid-cols-[2fr_1.1fr_1.3fr_1.1fr_0.7fr] items-center gap-2 border-b border-border bg-surface-2 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-text-3">
          <span>Paciente</span>
          <span>Última consulta</span>
          <span>Objetivo</span>
          <span>Plan actual</span>
          <span>IMC</span>
        </div>

        {filtered.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-text-3">
            {query || filter ? "Ningún paciente coincide con el filtro." : "Sin pacientes todavía. Crea el primero para empezar."}
          </p>
        ) : (
          filtered.map((p) => {
            const latest = p.consultations[0];
            const bmiValue = latest ? bmi(latest.weight, latest.height) : null;
            const bmiClass = bmiValue != null ? classifyBmi(bmiValue) : null;
            const planBadge = !latest
              ? { tone: "neutral" as const, label: "Sin consulta" }
              : latest.approvedAt
                ? { tone: "success" as const, label: "Aprobado" }
                : latest.finalPlan
                  ? { tone: "warning" as const, label: "Pendiente" }
                  : { tone: "neutral" as const, label: "Sin plan" };
            return (
              <Link
                key={p.id}
                href={`/pacientes/${p.id}`}
                className="grid grid-cols-[2fr_1.1fr_1.3fr_1.1fr_0.7fr] items-center gap-2 border-b border-border px-5 py-3 transition-colors last:border-0 hover:bg-surface-3"
              >
                <span className="flex items-center gap-2.5">
                  <Avatar name={p.name} />
                  <span className="min-w-0">
                    <span className="block truncate text-[13.5px] font-semibold text-text">{p.name}</span>
                    <span className="block truncate text-[11.5px] text-text-3">{p.email ?? "—"}</span>
                  </span>
                </span>
                <span className="font-mono text-[12.5px] tabular-nums text-text-2">
                  {latest ? formatShortDate(latest.createdAt) : "—"}
                </span>
                <span className="truncate text-[13px] text-text">{latest?.goals ?? "—"}</span>
                <span>
                  <Badge tone={planBadge.tone}>{planBadge.label}</Badge>
                </span>
                <span className={`flex items-center gap-1.5 font-mono text-[12.5px] tabular-nums ${bmiClass ? rangeText[bmiClass.range] : "text-text-3"}`}>
                  {bmiValue != null ? bmiValue.toFixed(1) : "—"}
                  {bmiClass && <span className={`size-1.5 rounded-full ${rangeDot[bmiClass.range]}`} />}
                </span>
              </Link>
            );
          })
        )}
      </Card>

      <p className="text-[12.5px] text-text-3">
        Mostrando {filtered.length} de {total} paciente{total === 1 ? "" : "s"}
      </p>
    </div>
  );
}

const rangeDot = {
  in: "bg-range-in",
  out: "bg-range-out",
  critical: "bg-range-critical",
} as const;

function FilterChip({ label, active, href }: { label: string; active: boolean; href: string }) {
  return (
    <Link
      href={href}
      className={
        active
          ? "rounded-pill border border-primary-soft-brd bg-primary-soft px-3.5 py-1.5 text-[12.5px] font-semibold text-primary"
          : "rounded-pill border border-border-strong px-3.5 py-1.5 text-[12.5px] font-medium text-text-2 transition-colors hover:bg-surface-3"
      }
    >
      {label}
    </Link>
  );
}

function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-text-3" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}
