import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { TIER_LIMITS, consultationsUsedThisMonth } from "@/lib/limits";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SettingsForm } from "@/components/SettingsForm";

export default async function SettingsPage() {
  const { userId, tier } = await requireUser();

  const [user, usedThisMonth] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, licenseNumber: true, logoUrl: true, promptStyle: true },
    }),
    consultationsUsedThisMonth(userId),
  ]);

  const plan = TIER_LIMITS[tier];

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <div>
        <h1 className="font-display text-[26px] font-bold tracking-tight text-text">Ajustes</h1>
        <p className="mt-1 text-sm text-text-3">
          Estos datos encabezan el PDF del plan que entregas a tus pacientes.
        </p>
      </div>

      <SettingsForm
        name={user?.name ?? ""}
        licenseNumber={user?.licenseNumber ?? ""}
        logoUrl={user?.logoUrl ?? ""}
        promptStyle={user?.promptStyle ?? ""}
      />

      <Card className="p-4.5">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-bold text-text">Tu plan</span>
          <Badge tone={tier === "FREE" ? "neutral" : "primary"}>{plan.name}</Badge>
        </div>
        <p className="text-[13px] text-text-2">
          {plan.consultationsPerMonth === null
            ? "Consultas ilimitadas."
            : `${usedThisMonth} de ${plan.consultationsPerMonth} consultas usadas este mes.`}
        </p>
        <p className="mt-1.5 text-[11.5px] text-text-3">
          Los cambios de plan se gestionan con el administrador de Planify.
        </p>
      </Card>
    </div>
  );
}
