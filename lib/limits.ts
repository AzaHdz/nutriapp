import type { PlanTier } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { monthKey, startOfDay, parseMonth } from "@/lib/dates";

/** Prices and limits per tier. Changing a price or limit means editing here, not the DB.
 *  `consultationsPerMonth: null` = unlimited. */
export const TIER_LIMITS: Record<
  PlanTier,
  { consultationsPerMonth: number | null; name: string; priceMXN: number }
> = {
  FREE: { consultationsPerMonth: 5, name: "Gratis", priceMXN: 0 },
  PRO: { consultationsPerMonth: 50, name: "Pro", priceMXN: 399 },
  UNLIMITED: { consultationsPerMonth: null, name: "Ilimitado", priceMXN: 799 },
};

/** Every AI call costs real tokens; without a cap, regenerating the same
 *  consultation is unbounded spend. Past the cap, the plan is edited by hand. */
export const MAX_GENERATIONS_PER_CONSULTATION = 3;

/** Start of the current calendar month as seen from Mexico, same rule as the
 *  dashboard. On Vercel the process runs in UTC: using the process's local time
 *  would shift the quota cutover by 6 h. */
export function startOfMonth(): Date {
  const { year, month } = parseMonth();
  return startOfDay(`${monthKey(year, month)}-01`);
}

export async function consultationsUsedThisMonth(userId: string): Promise<number> {
  return prisma.consultation.count({
    where: { userId, createdAt: { gte: startOfMonth() } },
  });
}
