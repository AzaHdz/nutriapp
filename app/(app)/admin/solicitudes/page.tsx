import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { TIER_LIMITS } from "@/lib/limits";
import {
  FEATURE_REQUEST_STATUSES,
  STATUS_LABELS,
  STATUS_TONES,
  VERDICT_LABELS,
  VERDICT_TONES,
  type AiVerdict,
} from "@/lib/featureRequests";
import { formatShortDate } from "@/lib/format";
import { updateFeatureRequestAdmin } from "@/app/actions/featureRequests";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";

export default async function AdminFeatureRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  // `estado` is a URL query param, which stays in Spanish
  const { estado } = await searchParams;
  const filter = FEATURE_REQUEST_STATUSES.find((s) => s === estado);

  const where: Prisma.FeatureRequestWhereInput = filter ? { status: filter } : {};
  const requests = await prisma.featureRequest.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { user: { select: { id: true, name: true, email: true, tier: true } } },
  });

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <Link href="/admin" className="text-xs font-semibold text-primary hover:underline">
          ← Administración
        </Link>
        <h1 className="mt-3 font-display text-[26px] font-bold tracking-tight text-text">
          Solicitudes de funcionalidades
        </h1>
        <p className="mt-1 text-sm text-text-3">
          Sugerencias enviadas por los nutriólogos. La respuesta que escribas aquí es
          visible para quien la envió.
        </p>
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap gap-2">
        <FilterPill href="/admin/solicitudes" active={!filter}>
          Todas
        </FilterPill>
        {FEATURE_REQUEST_STATUSES.map((s) => (
          <FilterPill key={s} href={`/admin/solicitudes?estado=${s}`} active={filter === s}>
            {STATUS_LABELS[s]}
          </FilterPill>
        ))}
      </div>

      {requests.length === 0 ? (
        <Card>
          <p className="px-5 py-8 text-center text-sm text-text-3">
            {filter
              ? `No hay solicitudes en estado ${STATUS_LABELS[filter].toLowerCase()}.`
              : "Aún no hay solicitudes."}
          </p>
        </Card>
      ) : (
        requests.map((r) => (
          <Card key={r.id} className="p-4.5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-sm font-bold text-text">{r.title}</span>
                  <Badge tone={STATUS_TONES[r.status]}>{STATUS_LABELS[r.status]}</Badge>
                  {r.analyzedAt && r.aiVerdict && (
                    <Badge tone={VERDICT_TONES[r.aiVerdict as AiVerdict] ?? "neutral"}>
                      IA: {VERDICT_LABELS[r.aiVerdict as AiVerdict] ?? r.aiVerdict}
                    </Badge>
                  )}
                </div>
                <Link
                  href={`/admin/cuentas/${r.user.id}`}
                  className="mt-1.5 flex items-center gap-2 hover:underline"
                >
                  <Avatar name={r.user.name ?? r.user.email} size="sm" />
                  <span className="truncate text-[12.5px] text-text-2">
                    {r.user.name ?? "Sin nombre"} · {r.user.email} ·{" "}
                    {TIER_LIMITS[r.user.tier].name}
                  </span>
                </Link>
              </div>
              <span className="text-[11.5px] text-text-3">{formatShortDate(r.createdAt)}</span>
            </div>

            <p className="mt-2.5 whitespace-pre-wrap text-[13px] text-text-2">{r.description}</p>

            {r.aiAnalysis && (
              <details className="mt-3 rounded-ctl border border-border bg-surface-2 px-3.5 py-2.5">
                <summary className="cursor-pointer text-xs font-bold text-text-2">
                  Análisis de viabilidad (IA)
                  {r.analyzedAt && ` · ${formatShortDate(r.analyzedAt)}`}
                </summary>
                <p className="mt-2 whitespace-pre-wrap text-[13px] text-text-2">{r.aiAnalysis}</p>
              </details>
            )}

            <form
              action={updateFeatureRequestAdmin}
              className="mt-3.5 flex flex-col gap-2.5 border-t border-border pt-3.5"
            >
              <input type="hidden" name="requestId" value={r.id} />
              <div className="flex items-center gap-2.5">
                <select
                  name="status"
                  defaultValue={r.status}
                  className="h-9 rounded-ctl border border-border-strong bg-surface px-2.5 text-sm text-text"
                >
                  {FEATURE_REQUEST_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
                <Button size="sm" variant="secondary">
                  Guardar
                </Button>
              </div>
              <textarea
                name="response"
                defaultValue={r.adminResponse ?? r.aiDraftResponse ?? ""}
                rows={2}
                maxLength={2000}
                placeholder="Respuesta visible para el nutriólogo…"
                className="w-full rounded-ctl border border-border-strong bg-surface px-2.5 py-2 text-sm text-text"
              />
              {!r.adminResponse && r.aiDraftResponse && (
                <p className="text-[11.5px] text-text-3">
                  Borrador sugerido por IA — revísalo antes de guardar.
                </p>
              )}
            </form>
          </Card>
        ))
      )}
    </div>
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
          ? "border-primary-soft-brd bg-primary-soft text-primary"
          : "border-border text-text-2 hover:bg-surface-3",
      )}
    >
      {children}
    </Link>
  );
}
