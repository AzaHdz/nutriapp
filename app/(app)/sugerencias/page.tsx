import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { STATUS_LABELS, STATUS_TONES } from "@/lib/featureRequests";
import { formatShortDate } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { FeatureRequestForm } from "@/components/FeatureRequestForm";
import { BRAND } from "@/lib/brand";

export default async function SuggestionsPage() {
  const { userId } = await requireUser();

  const requests = await prisma.featureRequest.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="font-display text-[26px] font-bold tracking-tight text-text">
          Sugerencias
        </h1>
        <p className="mt-1 text-sm text-text-3">
          ¿Qué le falta a {BRAND.name}? Cuéntanos qué funcionalidad necesitas y le daremos
          seguimiento aquí mismo.
        </p>
      </div>

      <FeatureRequestForm />

      <div className="flex flex-col gap-3">
        <span className="font-display text-[15px] font-bold text-text">Tus solicitudes</span>
        {requests.length === 0 ? (
          <Card>
            <p className="px-5 py-8 text-center text-sm text-text-3">
              Aún no has enviado ninguna sugerencia.
            </p>
          </Card>
        ) : (
          requests.map((r) => (
            <Card key={r.id} className="p-4.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-bold text-text">{r.title}</span>
                <div className="flex items-center gap-2.5">
                  <span className="text-[11.5px] text-text-3">{formatShortDate(r.createdAt)}</span>
                  <Badge tone={STATUS_TONES[r.status]}>{STATUS_LABELS[r.status]}</Badge>
                </div>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-[13px] text-text-2">{r.description}</p>
              {r.adminResponse && (
                <div className="mt-3 rounded-ctl border-l-2 border-primary bg-surface-2 px-3.5 py-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-primary">Respuesta del equipo</span>
                    {r.respondedAt && (
                      <span className="text-[11px] text-text-3">{formatShortDate(r.respondedAt)}</span>
                    )}
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-[13px] text-text-2">
                    {r.adminResponse}
                  </p>
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
