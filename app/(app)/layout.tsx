import Link from "next/link";
import { Prisma } from "@prisma/client";
import { auth, requireUser, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NavLink } from "@/components/nav-link";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar } from "@/components/ui/Avatar";
import { endOfDay, todayKey, startOfDay } from "@/lib/dates";

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

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="sticky top-0 hidden h-screen w-[220px] shrink-0 flex-col border-r border-border bg-surface-2 px-3.5 py-5 md:flex print:hidden">
        <Link
          href="/dashboard"
          className="px-2.5 pb-4 font-display text-lg font-bold tracking-tight text-text"
        >
          Planify
        </Link>

        <nav className="flex flex-col gap-0.5">
          <NavLink href="/dashboard" icon={<HomeIcon />}>
            Inicio
          </NavLink>
          <NavLink href="/agenda" icon={<CalendarIcon />} badge={todaysAppointments > 0 ? todaysAppointments : undefined}>
            Agenda
          </NavLink>
          <NavLink href="/pacientes" icon={<UsersIcon />}>
            Pacientes
          </NavLink>
          <NavLink href="/consultas" icon={<ClipboardIcon />}>
            Consultas
          </NavLink>
          <NavLink
            href="/planes"
            icon={<PlanIcon />}
            badge={pendingPlans > 0 ? pendingPlans : undefined}
          >
            Planes
          </NavLink>
          <NavLink href="/ajustes" icon={<GearIcon />}>
            Ajustes
          </NavLink>
          <NavLink href="/sugerencias" icon={<BulbIcon />}>
            Sugerencias
          </NavLink>
          {role === "ADMIN" && (
            <div className="mt-2 border-t border-border pt-2">
              <NavLink href="/admin" icon={<ShieldIcon />}>
                Admin
              </NavLink>
              <NavLink
                href="/admin/solicitudes"
                icon={<InboxIcon />}
                badge={newRequests > 0 ? newRequests : undefined}
              >
                Solicitudes
              </NavLink>
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
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button className="w-full rounded-ctl px-2.5 py-1.5 text-left text-[13px] font-medium text-text-2 transition-colors hover:bg-surface-3 hover:text-text">
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border bg-surface-2 px-4 py-3 md:hidden print:hidden">
          <Link href="/dashboard" className="font-display text-lg font-bold text-text">
            Planify
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/pacientes" className="text-sm font-medium text-text-2">
              Pacientes
            </Link>
            <ThemeToggle />
          </div>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">{children}</main>
      </div>
    </div>
  );
}

function CalendarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 9.5 12 3l9 6.5" />
      <path d="M5 10v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V10" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function ClipboardIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="8" y="3" width="8" height="4" rx="1" />
      <path d="M9 5H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-3" />
    </svg>
  );
}

function PlanIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 5h16M4 12h16M4 19h10" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function BulbIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 18h6M10 22h4" />
      <path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.4 1 2.3h6c0-.9.4-1.8 1-2.3A7 7 0 0 0 12 2z" />
    </svg>
  );
}

function InboxIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M22 12h-6l-2 3h-4l-2-3H2" />
      <path d="M5.5 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.7 4H7.3a2 2 0 0 0-1.8 1.1z" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-2.82 1.17V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 8 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 3 15a1.65 1.65 0 0 0-1.51-1H1a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 3 8.6a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 8 3.6 1.65 1.65 0 0 0 9 2.09V2a2 2 0 0 1 4 0v.09A1.65 1.65 0 0 0 15 3.6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 21 9c.14.31.22.66.22 1a2 2 0 0 1-2 2 1.65 1.65 0 0 0 .18 1z" />
    </svg>
  );
}
