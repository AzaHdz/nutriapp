import Link from "next/link";
import { Prisma } from "@prisma/client";
import { auth, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NavLink } from "@/components/nav/NavLink";
import { MobileNav } from "@/components/nav/MobileNav";
import { getNavItems, type NavItem } from "@/components/nav/items";
import { signOutAction } from "@/app/actions/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar } from "@/components/ui/Avatar";
import { endOfDay, todayKey, startOfDay } from "@/lib/dates";
import { BRAND } from "@/lib/brand";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // requireUser redirects to /login when there is no session or the account is suspended
  const { userId, role } = await requireUser();
  const session = await auth();

  // "Planes" badge: consultations with a generated plan awaiting approval.
  const pendingPlans = await prisma.consultation.count({
    where: { userId, finalPlan: { not: Prisma.DbNull }, approvedAt: null },
  });

  // "Agenda" badge: today's appointments that are still on. The range is computed
  // in Mexico time, not the server's zone (UTC on Vercel).
  const todaysAppointments = await prisma.appointment.count({
    where: {
      userId,
      status: { in: ["SCHEDULED", "CONFIRMED"] },
      startsAt: { gte: startOfDay(todayKey()), lt: endOfDay(todayKey()) },
    },
  });

  // "Solicitudes" badge (admin only): unreviewed suggestions.
  const newRequests =
    role === "ADMIN" ? await prisma.featureRequest.count({ where: { status: "NEW" } }) : 0;

  const displayName = session?.user?.name ?? session?.user?.email ?? "Nutriólogo";

  const nav = getNavItems({ role, badges: { todaysAppointments, pendingPlans, newRequests } });

  return (
    <div className="flex min-h-screen">
      {/* Sidebar (md and up) */}
      <aside className="sticky top-0 hidden h-screen w-[220px] shrink-0 flex-col border-r border-border bg-surface-2 px-3.5 py-5 md:flex print:hidden">
        <Link
          href="/dashboard"
          className="px-2.5 pb-4 font-display text-lg font-bold tracking-tight text-text"
        >
          {BRAND.name}
        </Link>

        <nav className="flex flex-col gap-0.5">
          {[...nav.main, ...nav.secondary].map((item) => (
            <SidebarLink key={item.href} item={item} />
          ))}
          {nav.admin.length > 0 && (
            <div className="mt-2 border-t border-border pt-2">
              {nav.admin.map((item) => (
                <SidebarLink key={item.href} item={item} />
              ))}
            </div>
          )}
        </nav>

        <div className="mt-auto flex flex-col gap-2 border-t border-border pt-3">
          <div className="flex items-center gap-2.5 px-1 py-1.5">
            <Avatar name={displayName} size="md" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[12.5px] font-semibold text-text">{displayName}</div>
              <div className="text-[11px] text-text-3">Nutrióloga clínica</div>
            </div>
            <ThemeToggle />
          </div>
          <form action={signOutAction}>
            <button className="w-full rounded-ctl px-2.5 py-1.5 text-left text-[13px] font-medium text-text-2 transition-colors hover:bg-surface-3 hover:text-text">
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar: brand only; navigation lives in the bottom bar */}
        <header className="border-b border-border bg-surface-2 px-4 py-3 md:hidden print:hidden">
          <Link href="/dashboard" className="font-display text-lg font-bold text-text">
            {BRAND.name}
          </Link>
        </header>

        {/* pb-24 on mobile keeps the last content clear of the bottom bar */}
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-6 pb-24 md:px-6 md:py-8">{children}</main>
      </div>

      <MobileNav main={nav.main} more={[...nav.secondary, ...nav.admin]} />
    </div>
  );
}

function SidebarLink({ item }: { item: NavItem }) {
  return (
    <NavLink href={item.href} icon={item.icon} badge={item.badge} exact={item.exact}>
      {item.label}
    </NavLink>
  );
}
