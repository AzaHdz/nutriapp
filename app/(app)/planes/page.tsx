import Link from "next/link";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { formatShortDate } from "@/lib/format";
import { planKcal } from "@/lib/plan";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { buttonVariants } from "@/components/ui/Button";

export default async function PlansPage() {
  const { userId } = await requireUser();

  const [pending, approved] = await Promise.all([
    prisma.consultation.findMany({
      where: { userId, finalPlan: { not: Prisma.DbNull }, approvedAt: null },
      include: { patient: { select: { name: true } } },
      orderBy: { createdAt: "asc" }, // oldest first
    }),
    prisma.consultation.findMany({
      where: { userId, approvedAt: { not: null } },
      include: { patient: { select: { name: true } } },
      orderBy: { approvedAt: "desc" },
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-[26px] font-bold tracking-tight text-text">Planes</h1>

      {/* Awaiting approval */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-warning-brd bg-warning-soft px-5 py-3.5">
          <span className="text-sm font-bold text-warning">Pendientes de aprobar</span>
          <span className="font-mono text-xs font-semibold text-warning">{pending.length}</span>
        </div>
        {pending.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-text-3">Nada pendiente. 🎉</p>
        ) : (
          pending.map((c) => {
            const kcal = planKcal(c.finalPlan);
            return (
              <div key={c.id} className="flex items-center gap-3 border-b border-border px-5 py-3 last:border-0">
                <Avatar name={c.patient.name} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-semibold text-text">{c.patient.name}</div>
                  <div className="font-mono text-[11.5px] tabular-nums text-text-3">
                    {formatShortDate(c.createdAt)}
                    {kcal ? ` · ${kcal.toLocaleString("es-MX")} kcal` : ""}
                  </div>
                </div>
                <Link href={`/consultas/${c.id}`} className={buttonVariants({ size: "sm" })}>
                  Revisar
                </Link>
              </div>
            );
          })
        )}
      </Card>

      {/* Approved */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-border bg-surface-2 px-5 py-3.5">
          <span className="text-sm font-bold text-text">Aprobados</span>
          <span className="font-mono text-xs font-semibold text-text-3">{approved.length}</span>
        </div>
        {approved.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-text-3">Aún no has aprobado ningún plan.</p>
        ) : (
          approved.map((c) => {
            const kcal = planKcal(c.finalPlan);
            return (
              <div key={c.id} className="flex items-center gap-3 border-b border-border px-5 py-3 last:border-0">
                <Avatar name={c.patient.name} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-semibold text-text">{c.patient.name}</div>
                  <div className="font-mono text-[11.5px] tabular-nums text-text-3">
                    Aprobado {c.approvedAt ? formatShortDate(c.approvedAt) : ""}
                    {kcal ? ` · ${kcal.toLocaleString("es-MX")} kcal` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link href={`/consultas/${c.id}`} className={buttonVariants({ variant: "secondary", size: "sm" })}>
                    Ver
                  </Link>
                  <a
                    href={`/consultas/${c.id}/imprimir`}
                    target="_blank"
                    className={buttonVariants({ variant: "secondary", size: "sm" })}
                  >
                    PDF
                  </a>
                </div>
              </div>
            );
          })
        )}
      </Card>
    </div>
  );
}
