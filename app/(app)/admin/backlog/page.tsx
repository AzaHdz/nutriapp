import Link from "next/link";
import type {
  BacklogPriority,
  BacklogStatus,
  BacklogType,
  FeatureRequestStatus,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  BACKLOG_PRIORITIES,
  BACKLOG_PRIORITY_TONES,
  BACKLOG_STATUSES,
  BACKLOG_STATUS_LABELS,
  BACKLOG_STATUS_TONES,
  BACKLOG_TYPES,
  BACKLOG_TYPE_LABELS,
  BACKLOG_TYPE_TONES,
  BUG_SEVERITY_LABELS,
  compareBacklogItems,
} from "@/lib/backlog";
import { formatShortDate } from "@/lib/format";
import { STATUS_LABELS, STATUS_TONES } from "@/lib/featureRequests";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/components/ui/cn";
import { BacklogItemForm } from "@/components/backlog/BacklogItemForm";
import { BacklogStatusForm } from "@/components/backlog/BacklogStatusForm";

type Filters = { status?: BacklogStatus; type?: BacklogType; priority?: BacklogPriority };

/** Builds a /admin/backlog URL. Query params stay in Spanish (estado, tipo, prioridad). */
function backlogHref({ status, type, priority }: Filters) {
  const qs = new URLSearchParams();
  if (status) qs.set("estado", status);
  if (type) qs.set("tipo", type);
  if (priority) qs.set("prioridad", priority);
  const s = qs.toString();
  return s ? `/admin/backlog?${s}` : "/admin/backlog";
}

export default async function AdminBacklogPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; tipo?: string; prioridad?: string }>;
}) {
  const { estado, tipo, prioridad } = await searchParams;
  const filters: Filters = {
    status: BACKLOG_STATUSES.find((s) => s === estado),
    type: BACKLOG_TYPES.find((t) => t === tipo),
    priority: BACKLOG_PRIORITIES.find((p) => p === prioridad),
  };

  // Type/priority filters apply to both the list and the tab counters.
  const base: Prisma.BacklogItemWhereInput = {
    ...(filters.type && { type: filters.type }),
    ...(filters.priority && { priority: filters.priority }),
  };

  const [items, counts] = await Promise.all([
    prisma.backlogItem.findMany({
      where: { ...base, ...(filters.status && { status: filters.status }) },
      include: {
        featureRequests: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            title: true,
            status: true,
            userId: true,
            user: { select: { name: true, email: true } },
          },
        },
      },
    }),
    prisma.backlogItem.groupBy({ by: ["status"], where: base, _count: true }),
  ]);
  items.sort(compareBacklogItems);

  const countByStatus = new Map(counts.map((c) => [c.status, c._count]));
  const total = counts.reduce((acc, c) => acc + c._count, 0);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <Link href="/admin" className="text-xs font-semibold text-primary hover:underline">
          ← Administración
        </Link>
        <h1 className="mt-3 font-display text-[26px] font-bold tracking-tight text-text">
          Backlog interno
        </h1>
        <p className="mt-1 text-sm text-text-3">
          Bugs y mejoras propias. Solo lo ve el administrador; las sugerencias de los
          nutriólogos están en{" "}
          <Link href="/admin/solicitudes" className="font-semibold text-primary hover:underline">
            Solicitudes
          </Link>
          .
        </p>
      </div>

      <Card className="p-4.5">
        <details>
          <summary className="cursor-pointer text-sm font-bold text-text">+ Nuevo elemento</summary>
          <div className="mt-3.5">
            <BacklogItemForm />
          </div>
        </details>
      </Card>

      {/* Status tabs */}
      <nav aria-label="Estado" className="flex flex-wrap gap-2 border-b border-border pb-3">
        <Tab href={backlogHref({ ...filters, status: undefined })} active={!filters.status} count={total}>
          Todos
        </Tab>
        {BACKLOG_STATUSES.map((s) => (
          <Tab
            key={s}
            href={backlogHref({ ...filters, status: s })}
            active={filters.status === s}
            count={countByStatus.get(s) ?? 0}
          >
            {BACKLOG_STATUS_LABELS[s]}
          </Tab>
        ))}
      </nav>

      {/* Type and priority filters */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-16 text-[11px] font-semibold uppercase tracking-wide text-text-3">Tipo</span>
          <FilterPill href={backlogHref({ ...filters, type: undefined })} active={!filters.type}>
            Todos
          </FilterPill>
          {BACKLOG_TYPES.map((t) => (
            <FilterPill key={t} href={backlogHref({ ...filters, type: t })} active={filters.type === t}>
              {BACKLOG_TYPE_LABELS[t]}
            </FilterPill>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-16 text-[11px] font-semibold uppercase tracking-wide text-text-3">
            Prioridad
          </span>
          <FilterPill href={backlogHref({ ...filters, priority: undefined })} active={!filters.priority}>
            Todas
          </FilterPill>
          {BACKLOG_PRIORITIES.map((p) => (
            <FilterPill
              key={p}
              href={backlogHref({ ...filters, priority: p })}
              active={filters.priority === p}
            >
              {p}
            </FilterPill>
          ))}
        </div>
      </div>

      {items.length === 0 ? (
        <Card>
          <p className="px-5 py-8 text-center text-sm text-text-3">
            {filters.status || filters.type || filters.priority
              ? "No hay elementos con estos filtros."
              : "El backlog está vacío."}
          </p>
        </Card>
      ) : (
        items.map((item) => (
          <Card key={item.id} id={`item-${item.id}`} className="scroll-mt-6 p-4.5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <span className="text-sm font-bold text-text">{item.title}</span>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <Badge tone={BACKLOG_TYPE_TONES[item.type]}>{BACKLOG_TYPE_LABELS[item.type]}</Badge>
                  {item.type === "BUG" && item.severity && (
                    <Badge tone={item.severity === "BLOCKER" ? "danger" : "neutral"}>
                      {BUG_SEVERITY_LABELS[item.severity]}
                    </Badge>
                  )}
                  <Badge tone={BACKLOG_PRIORITY_TONES[item.priority]}>{item.priority}</Badge>
                  <Badge tone={BACKLOG_STATUS_TONES[item.status]}>
                    {BACKLOG_STATUS_LABELS[item.status]}
                  </Badge>
                  {item.area && <span className="text-[12px] text-text-3">· {item.area}</span>}
                </div>
              </div>
              <span className="text-[11.5px] text-text-3">
                {formatShortDate(item.createdAt)}
                {item.resolvedAt && ` · cerrado ${formatShortDate(item.resolvedAt)}`}
              </span>
            </div>

            {item.description && (
              <p className="mt-2.5 whitespace-pre-wrap text-[13px] text-text-2">{item.description}</p>
            )}

            {item.stepsToRepro && (
              <div className="mt-2.5">
                <div className="text-xs font-bold text-text-2">Pasos para reproducir</div>
                <p className="mt-1 whitespace-pre-wrap text-[13px] text-text-2">{item.stepsToRepro}</p>
              </div>
            )}

            {(item.pageUrl || item.viewport || item.userAgent) && (
              <dl className="mt-2.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[12px] text-text-3">
                {item.pageUrl && (
                  <>
                    <dt className="font-semibold">Página</dt>
                    <dd className="truncate font-mono">{item.pageUrl}</dd>
                  </>
                )}
                {item.viewport && (
                  <>
                    <dt className="font-semibold">Pantalla</dt>
                    <dd className="font-mono">{item.viewport}</dd>
                  </>
                )}
                {item.userAgent && (
                  <>
                    <dt className="font-semibold">Navegador</dt>
                    <dd className="break-all font-mono">{item.userAgent}</dd>
                  </>
                )}
              </dl>
            )}

            {item.status === "DONE" && (item.resolution || item.commitRef) && (
              <div className="mt-3 rounded-ctl border border-success-brd bg-success-soft px-3.5 py-2.5 text-[13px] text-text-2">
                {item.resolution && <p className="whitespace-pre-wrap">{item.resolution}</p>}
                {item.commitRef && (
                  <p className="mt-1 break-all font-mono text-[12px] text-text-3">{item.commitRef}</p>
                )}
              </div>
            )}

            {item.featureRequests.length > 0 && (
              <LinkedRequests requests={item.featureRequests} />
            )}

            <div className="mt-3.5 border-t border-border pt-3.5">
              <BacklogStatusForm
                id={item.id}
                status={item.status}
                resolution={item.resolution}
                commitRef={item.commitRef}
              />
            </div>

            <details className="mt-3 rounded-ctl border border-border bg-surface-2 px-3.5 py-2.5">
              <summary className="cursor-pointer text-xs font-bold text-text-2">Editar</summary>
              <div className="mt-3">
                <BacklogItemForm item={item} />
              </div>
            </details>
          </Card>
        ))
      )}
    </div>
  );
}

function Tab({
  href,
  active,
  count,
  children,
}: {
  href: string;
  active: boolean;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill border px-3 py-1 text-xs font-semibold transition-colors",
        active
          ? "border-primary-soft-brd bg-primary-soft text-primary"
          : "border-border text-text-2 hover:bg-surface-3",
      )}
    >
      {children}
      <span className="font-mono tabular-nums opacity-70">{count}</span>
    </Link>
  );
}

function FilterPill({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-pill border px-3 py-1 text-xs font-semibold transition-colors",
        active
          ? "border-primary-soft-brd bg-primary-soft text-text"
          : "border-border text-text-2 hover:bg-surface-3",
      )}
    >
      {children}
    </Link>
  );
}

/** Feature requests linked to an item: "Pedido por N nutriólogos" + the list. */
function LinkedRequests({
  requests,
}: {
  requests: {
    id: string;
    title: string;
    status: FeatureRequestStatus;
    userId: string;
    user: { name: string | null; email: string };
  }[];
}) {
  // Count people, not requests: one nutritionist may have asked twice.
  const people = new Set(requests.map((r) => r.userId)).size;
  return (
    <details className="mt-3 rounded-ctl border border-primary-soft-brd bg-primary-soft px-3.5 py-2.5">
      <summary className="cursor-pointer text-xs font-bold text-primary">
        Pedido por {people} {people === 1 ? "nutriólogo" : "nutriólogos"}
      </summary>
      <ul className="mt-2 flex flex-col gap-1.5">
        {requests.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px]">
            <Link
              href={`/admin/solicitudes#solicitud-${r.id}`}
              className="font-semibold text-text hover:underline"
            >
              {r.title}
            </Link>
            <span className="text-text-3">· {r.user.name ?? r.user.email}</span>
            <Badge tone={STATUS_TONES[r.status]}>{STATUS_LABELS[r.status]}</Badge>
          </li>
        ))}
      </ul>
    </details>
  );
}
