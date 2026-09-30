import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { TIER_LIMITS, startOfMonth } from "@/lib/limits";
import { formatShortDate, formatLongDate } from "@/lib/format";
import { setAccountStatus, assignTier, saveAdminNote } from "@/app/actions/admin";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { ResetLinkAdmin } from "@/components/ResetLinkAdmin";

export default async function AdminAccountPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await requireAdmin();
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      licenseNumber: true,
      createdAt: true,
      status: true,
      tier: true,
      role: true,
      tierUpdatedAt: true,
      suspendedAt: true,
      adminNotes: true,
      _count: { select: { patients: true, consultations: true } },
    },
  });
  if (!user) notFound();

  const [totalUsage, monthConsultations, recentConsultations] = await Promise.all([
    prisma.consultation.aggregate({
      where: { userId: id },
      _sum: { inputTokens: true, outputTokens: true },
      _max: { createdAt: true },
    }),
    prisma.consultation.count({ where: { userId: id, createdAt: { gte: startOfMonth() } } }),
    prisma.consultation.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        createdAt: true,
        aiModel: true,
        inputTokens: true,
        outputTokens: true,
        approvedAt: true,
      },
    }),
  ]);

  const limit = TIER_LIMITS[user.tier].consultationsPerMonth;
  const isSelf = user.id === admin.userId;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <Link href="/admin" className="text-xs font-semibold text-primary hover:underline">
          ← Administración
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <Avatar name={user.name ?? user.email} size="md" />
          <div className="min-w-0">
            <h1 className="font-display text-[24px] font-bold tracking-tight text-text">
              {user.name ?? "Sin nombre"}
            </h1>
            <p className="text-sm text-text-3">
              {user.email}
              {user.licenseNumber ? ` · Cédula ${user.licenseNumber}` : ""} · Alta el{" "}
              {formatLongDate(user.createdAt)}
            </p>
          </div>
          <div className="flex gap-2">
            {user.role === "ADMIN" && <Badge tone="info">Admin</Badge>}
            {user.status === "ACTIVE" ? (
              <Badge tone="success">Activa</Badge>
            ) : user.status === "SUSPENDED" ? (
              <Badge tone="danger">Suspendida</Badge>
            ) : (
              <Badge tone="warning">Pendiente</Badge>
            )}
            <Badge tone={user.tier === "FREE" ? "neutral" : "primary"}>
              {TIER_LIMITS[user.tier].name}
            </Badge>
          </div>
        </div>
        {user.suspendedAt && (
          <p className="mt-2 text-[12.5px] text-danger">
            Suspendida el {formatLongDate(user.suspendedAt)}
          </p>
        )}
      </div>

      {/* Account stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Pacientes" value={`${user._count.patients}`} note="Registrados" />
        <StatCard label="Consultas totales" value={`${user._count.consultations}`} note="Desde el alta" />
        <StatCard
          label="Consultas este mes"
          value={limit === null ? `${monthConsultations}` : `${monthConsultations} / ${limit}`}
          note={limit === null ? "Sin límite" : `Límite del plan ${TIER_LIMITS[user.tier].name}`}
          warning={limit !== null && monthConsultations >= limit}
        />
        <StatCard
          label="Tokens IA"
          value={(
            (totalUsage._sum.inputTokens ?? 0) + (totalUsage._sum.outputTokens ?? 0)
          ).toLocaleString("es-MX")}
          note={
            totalUsage._max.createdAt
              ? `Última actividad ${formatShortDate(totalUsage._max.createdAt)}`
              : "Sin actividad"
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.55fr_1fr]">
        {/* Latest consultations (metadata only, no clinical content) */}
        <Card className="overflow-hidden">
          <div className="border-b border-border px-5 py-4">
            <span className="font-display text-[15px] font-bold text-text">Últimas consultas</span>
          </div>
          {recentConsultations.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-text-3">Sin consultas todavía.</p>
          ) : (
            recentConsultations.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-3 border-b border-border px-5 py-3 last:border-0"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold text-text">
                    {formatShortDate(c.createdAt)}
                  </div>
                  <div className="font-mono text-[11.5px] tabular-nums text-text-3">
                    {c.aiModel ?? "Sin plan generado"}
                    {c.inputTokens != null &&
                      ` · ${((c.inputTokens ?? 0) + (c.outputTokens ?? 0)).toLocaleString("es-MX")} tokens`}
                  </div>
                </div>
                {c.approvedAt ? (
                  <Badge tone="success">Aprobada</Badge>
                ) : (
                  <Badge tone="neutral">Sin aprobar</Badge>
                )}
              </div>
            ))
          )}
        </Card>

        {/* Admin controls */}
        <div className="flex flex-col gap-4">
          <Card className="p-4.5">
            <div className="mb-2.5 text-sm font-bold text-text">Plan</div>
            <form action={assignTier} className="flex items-center gap-2.5">
              <input type="hidden" name="userId" value={user.id} />
              <select
                name="tier"
                defaultValue={user.tier}
                className="h-9 flex-1 rounded-ctl border border-border-strong bg-surface px-2.5 text-sm text-text"
              >
                {Object.entries(TIER_LIMITS).map(([tier, info]) => (
                  <option key={tier} value={tier}>
                    {info.name}
                    {info.consultationsPerMonth !== null
                      ? ` — ${info.consultationsPerMonth} consultas/mes`
                      : " — sin límite"}
                    {info.priceMXN > 0 ? ` ($${info.priceMXN} MXN)` : ""}
                  </option>
                ))}
              </select>
              <Button size="sm" variant="secondary">
                Guardar
              </Button>
            </form>
            {user.tierUpdatedAt && (
              <p className="mt-2 text-[11.5px] text-text-3">
                Último cambio: {formatShortDate(user.tierUpdatedAt)}
              </p>
            )}
          </Card>

          <Card className="p-4.5">
            <div className="mb-2.5 text-sm font-bold text-text">Nota interna</div>
            <form action={saveAdminNote} className="flex flex-col gap-2.5">
              <input type="hidden" name="userId" value={user.id} />
              <textarea
                name="note"
                defaultValue={user.adminNotes ?? ""}
                rows={3}
                maxLength={2000}
                placeholder="Solo visible para ti (acuerdos, contexto, seguimiento)…"
                className="w-full rounded-ctl border border-border-strong bg-surface px-2.5 py-2 text-sm text-text"
              />
              <Button size="sm" variant="secondary" className="self-end">
                Guardar nota
              </Button>
            </form>
          </Card>

          <Card className="p-4.5">
            <div className="mb-2.5 text-sm font-bold text-text">Contraseña</div>
            <p className="mb-3 text-[12.5px] text-text-3">
              Si olvidó su contraseña, genera un link de restablecimiento y compárteselo.
            </p>
            <ResetLinkAdmin userId={user.id} />
          </Card>

          {!isSelf && (
            <Card className="p-4.5">
              <div className="mb-2.5 text-sm font-bold text-text">
                {user.status === "SUSPENDED" ? "Reactivar cuenta" : "Suspender cuenta"}
              </div>
              <p className="mb-3 text-[12.5px] text-text-3">
                {user.status === "SUSPENDED"
                  ? "La cuenta podrá volver a iniciar sesión y usar la app."
                  : "La cuenta no podrá iniciar sesión ni usar la app hasta que la reactives. Sus datos no se borran."}
              </p>
              <form action={setAccountStatus}>
                <input type="hidden" name="userId" value={user.id} />
                <input
                  type="hidden"
                  name="status"
                  value={user.status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED"}
                />
                <Button
                  size="sm"
                  variant={user.status === "SUSPENDED" ? "secondary" : "destructive"}
                >
                  {user.status === "SUSPENDED" ? "Reactivar" : "Suspender"}
                </Button>
              </form>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  note,
  warning,
}: {
  label: string;
  value: string;
  note: string;
  warning?: boolean;
}) {
  return (
    <Card className={`p-4.5 ${warning ? "border-warning-brd" : ""}`}>
      <div className={`text-[11px] font-semibold uppercase tracking-wide ${warning ? "text-warning" : "text-text-3"}`}>
        {label}
      </div>
      <div className={`mt-1.5 font-mono text-[26px] font-semibold tabular-nums ${warning ? "text-warning" : "text-text"}`}>
        {value}
      </div>
      <div className="mt-0.5 text-[11.5px] text-text-3">{note}</div>
    </Card>
  );
}
