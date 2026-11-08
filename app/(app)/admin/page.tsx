import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { TIER_LIMITS, startOfMonth } from "@/lib/limits";
import { formatShortDate } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { BRAND } from "@/lib/brand";

export default async function AdminPage() {
  const monthStart = startOfMonth();

  const [users, usage, monthUsage, monthSignups, newRequests] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        status: true,
        tier: true,
        role: true,
        _count: { select: { patients: true, consultations: true } },
      },
    }),
    prisma.consultation.groupBy({
      by: ["userId"],
      _sum: { inputTokens: true, outputTokens: true },
      _max: { createdAt: true },
      _count: true,
    }),
    prisma.consultation.groupBy({
      by: ["userId"],
      where: { createdAt: { gte: monthStart } },
      _sum: { inputTokens: true, outputTokens: true },
      _count: true,
    }),
    prisma.user.count({ where: { createdAt: { gte: monthStart } } }),
    prisma.featureRequest.count({ where: { status: "NEW" } }),
  ]);

  const usageByUser = new Map(usage.map((u) => [u.userId, u]));
  const monthUsageByUser = new Map(monthUsage.map((u) => [u.userId, u]));

  const activeCount = users.filter((u) => u.status === "ACTIVE").length;
  const monthTokens = monthUsage.reduce(
    (acc, u) => acc + (u._sum.inputTokens ?? 0) + (u._sum.outputTokens ?? 0),
    0
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-[26px] font-bold tracking-tight text-text">
          Administración
        </h1>
        <p className="mt-0.5 text-sm text-text-3">
          Cuentas de nutriólogos registradas en {BRAND.name}
        </p>
      </div>

      {/* Global stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Nutriólogos" value={users.length} note={`+${monthSignups} este mes`} />
        <StatCard label="Cuentas activas" value={activeCount} note={`${users.length - activeCount} suspendidas`} />
        <StatCard
          label="Consultas este mes"
          value={monthUsage.reduce((acc, u) => acc + u._count, 0)}
          note="Todas las cuentas"
        />
        <StatCard label="Tokens IA este mes" value={monthTokens} note="Input + output" />
        <StatCard
          label="Solicitudes nuevas"
          value={newRequests}
          note="Sugerencias de nutriólogos"
        />
      </div>

      {/* Accounts table */}
      <Card className="overflow-hidden">
        <div className="border-b border-border px-5 py-4">
          <span className="font-display text-[15px] font-bold text-text">Cuentas</span>
        </div>
        {users.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-text-3">
            Aún no hay cuentas registradas.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-border text-[11px] uppercase tracking-wide text-text-3">
                  <th className="px-5 py-2.5 font-semibold">Cuenta</th>
                  <th className="px-3 py-2.5 font-semibold">Alta</th>
                  <th className="px-3 py-2.5 font-semibold">Estado</th>
                  <th className="px-3 py-2.5 font-semibold">Plan</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Pacientes</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Consultas (mes)</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Tokens IA</th>
                  <th className="px-5 py-2.5 text-right font-semibold">Última actividad</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const total = usageByUser.get(u.id);
                  const month = monthUsageByUser.get(u.id);
                  const tokens =
                    (total?._sum.inputTokens ?? 0) + (total?._sum.outputTokens ?? 0);
                  const lastActivity = total?._max.createdAt;
                  return (
                    <tr
                      key={u.id}
                      className="border-b border-border transition-colors last:border-0 hover:bg-surface-3"
                    >
                      <td className="px-5 py-3">
                        <Link href={`/admin/cuentas/${u.id}`} className="flex items-center gap-3">
                          <Avatar name={u.name ?? u.email} />
                          <span className="min-w-0">
                            <span className="block truncate font-semibold text-text">
                              {u.name ?? "Sin nombre"}
                              {u.role === "ADMIN" && (
                                <Badge tone="info" className="ml-2">Admin</Badge>
                              )}
                            </span>
                            <span className="block truncate text-[11.5px] text-text-3">
                              {u.email}
                            </span>
                          </span>
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-text-2">
                        {formatShortDate(u.createdAt)}
                      </td>
                      <td className="px-3 py-3">
                        {u.status === "ACTIVE" ? (
                          <Badge tone="success">Activa</Badge>
                        ) : u.status === "SUSPENDED" ? (
                          <Badge tone="danger">Suspendida</Badge>
                        ) : (
                          <Badge tone="warning">Pendiente</Badge>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <Badge tone={u.tier === "FREE" ? "neutral" : "primary"}>
                          {TIER_LIMITS[u.tier].name}
                        </Badge>
                      </td>
                      <td className="px-3 py-3 text-right font-mono tabular-nums text-text-2">
                        {u._count.patients}
                      </td>
                      <td className="px-3 py-3 text-right font-mono tabular-nums text-text-2">
                        {u._count.consultations} ({month?._count ?? 0})
                      </td>
                      <td className="px-3 py-3 text-right font-mono tabular-nums text-text-2">
                        {tokens.toLocaleString("es-MX")}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-right text-text-3">
                        {lastActivity ? formatShortDate(lastActivity) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function StatCard({ label, value, note }: { label: string; value: number; note: string }) {
  return (
    <Card className="p-4.5">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-text-3">{label}</div>
      <div className="mt-1.5 font-mono text-[26px] font-semibold tabular-nums text-text">
        {value.toLocaleString("es-MX")}
      </div>
      <div className="mt-0.5 text-[11.5px] text-text-3">{note}</div>
    </Card>
  );
}
