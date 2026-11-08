import Link from "next/link";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { formatShortDate } from "@/lib/format";
import { planKcal } from "@/lib/plan";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { FilterChip } from "@/components/ui/FilterChip";
import { SearchField } from "@/components/ui/SearchField";

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
        <SearchField
          placeholder="Buscar por paciente…"
          defaultValue={query}
          keep={{ estado: filter !== "todas" ? filter : undefined }}
        />
        {FILTERS.map((f) => (
          <FilterChip key={f.key} label={f.label} active={filter === f.key} href={chipHref(f.key)} />
        ))}
      </div>

      <Card className="overflow-hidden">
        {/* Table header on md+; on mobile each row becomes a compact card */}
        <div className="hidden grid-cols-[2fr_1fr_1.4fr_0.8fr_1fr] items-center gap-2 border-b border-border bg-surface-2 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-text-3 md:grid">
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
                className="flex items-center gap-3 border-b border-border px-4 py-3 transition-colors last:border-0 hover:bg-surface-3 md:grid md:grid-cols-[2fr_1fr_1.4fr_0.8fr_1fr] md:gap-2 md:px-5"
              >
                <span className="flex min-w-0 flex-1 items-center gap-2.5">
                  <Avatar name={c.patient.name} />
                  <span className="min-w-0">
                    <span className="block truncate text-[13.5px] font-semibold text-text">{c.patient.name}</span>
                    <span className="hidden truncate text-[11.5px] text-text-3 md:block">{c.patient.email ?? "—"}</span>
                    {/* Mobile meta line: replaces the date and kcal columns */}
                    <span className="block truncate font-mono text-[11.5px] tabular-nums text-text-3 md:hidden">
                      {formatShortDate(c.createdAt)}
                      {kcal ? ` · ${kcal.toLocaleString("es-MX")} kcal` : ""}
                    </span>
                  </span>
                </span>
                <span className="hidden font-mono text-[12.5px] tabular-nums text-text-2 md:block">{formatShortDate(c.createdAt)}</span>
                <span className="hidden truncate text-[13px] text-text md:block">{c.goals}</span>
                <span className="hidden font-mono text-[12.5px] tabular-nums text-text-2 md:block">
                  {kcal ? kcal.toLocaleString("es-MX") : "—"}
                </span>
                <span className="shrink-0">
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
