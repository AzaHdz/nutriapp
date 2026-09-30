import Link from "next/link";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { formatShortDate } from "@/lib/format";
import { planKcal } from "@/lib/plan";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";

// The filter keys and the `estado` query param are part of the URL, which stays in Spanish.
type StatusFilter = "todas" | "aprobadas" | "pendientes" | "sin-plan";

const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "todas", label: "Todas" },
  { key: "aprobadas", label: "Aprobadas" },
  { key: "pendientes", label: "Pendientes" },
  { key: "sin-plan", label: "Sin plan" },
];

function whereForFilter(filter: StatusFilter): Prisma.ConsultationWhereInput {
  switch (filter) {
    case "aprobadas":
      return { approvedAt: { not: null } };
    case "pendientes":
      return { finalPlan: { not: Prisma.DbNull }, approvedAt: null };
    case "sin-plan":
      return { finalPlan: { equals: Prisma.DbNull } };
    default:
      return {};
  }
}

export default async function ConsultationsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; estado?: string }>;
}) {
  const { userId } = await requireUser();
  const { q, estado: rawFilter } = await searchParams;
  const query = q?.trim();
  const filter: StatusFilter = FILTERS.some((f) => f.key === rawFilter)
    ? (rawFilter as StatusFilter)
    : "todas";

  const consultations = await prisma.consultation.findMany({
    where: {
      userId,
      ...whereForFilter(filter),
      ...(query
        ? {
            patient: {
              OR: [
                { name: { contains: query, mode: "insensitive" } },
                { email: { contains: query, mode: "insensitive" } },
              ],
            },
          }
        : {}),
    },
    include: { patient: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });

  const chipHref = (key: StatusFilter) => {
    const p = new URLSearchParams();
    if (key !== "todas") p.set("estado", key);
    if (query) p.set("q", query);
    const s = p.toString();
    return s ? `/consultas?${s}` : "/consultas";
  };

  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-display text-[26px] font-bold tracking-tight text-text">
        Consultas <span className="font-mono text-sm font-medium text-text-3">{consultations.length}</span>
      </h1>

      {/* Search + filters */}
      <div className="flex flex-wrap items-center gap-2.5">
        <form className="flex max-w-sm flex-1 items-center gap-2 rounded-pill border border-border-strong bg-surface px-4 py-2">
          <SearchIcon />
          <input
            name="q"
            defaultValue={query}
            placeholder="Buscar por paciente…"
            className="w-full bg-transparent text-sm text-text placeholder:text-text-3 focus:outline-none"
          />
          {filter !== "todas" && <input type="hidden" name="estado" value={filter} />}
        </form>
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={chipHref(f.key)}
            className={
              filter === f.key
                ? "rounded-pill border border-primary-soft-brd bg-primary-soft px-3.5 py-1.5 text-[12.5px] font-semibold text-primary"
                : "rounded-pill border border-border-strong px-3.5 py-1.5 text-[12.5px] font-medium text-text-2 transition-colors hover:bg-surface-3"
            }
          >
            {f.label}
          </Link>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="grid grid-cols-[2fr_1fr_1.4fr_0.8fr_1fr] items-center gap-2 border-b border-border bg-surface-2 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-text-3">
          <span>Paciente</span>
          <span>Fecha</span>
          <span>Objetivo</span>
          <span>Kcal</span>
          <span>Estado</span>
        </div>

        {consultations.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-text-3">
            {query || filter !== "todas"
              ? "Ninguna consulta coincide con el filtro."
              : "Aún no hay consultas registradas."}
          </p>
        ) : (
          consultations.map((c) => {
            const kcal = planKcal(c.finalPlan);
            const badge = c.approvedAt
              ? { tone: "success" as const, label: "Aprobada" }
              : c.finalPlan
                ? { tone: "warning" as const, label: "Pendiente" }
                : { tone: "neutral" as const, label: "Sin plan" };
            return (
              <Link
                key={c.id}
                href={`/consultas/${c.id}`}
                className="grid grid-cols-[2fr_1fr_1.4fr_0.8fr_1fr] items-center gap-2 border-b border-border px-5 py-3 transition-colors last:border-0 hover:bg-surface-3"
              >
                <span className="flex items-center gap-2.5">
                  <Avatar name={c.patient.name} />
                  <span className="min-w-0">
                    <span className="block truncate text-[13.5px] font-semibold text-text">{c.patient.name}</span>
                    <span className="block truncate text-[11.5px] text-text-3">{c.patient.email ?? "—"}</span>
                  </span>
                </span>
                <span className="font-mono text-[12.5px] tabular-nums text-text-2">{formatShortDate(c.createdAt)}</span>
                <span className="truncate text-[13px] text-text">{c.goals}</span>
                <span className="font-mono text-[12.5px] tabular-nums text-text-2">
                  {kcal ? kcal.toLocaleString("es-MX") : "—"}
                </span>
                <span>
                  <Badge tone={badge.tone}>{badge.label}</Badge>
                </span>
              </Link>
            );
          })
        )}
      </Card>

      <p className="text-[12.5px] text-text-3">Mostrando {consultations.length} consulta{consultations.length === 1 ? "" : "s"}</p>
    </div>
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
