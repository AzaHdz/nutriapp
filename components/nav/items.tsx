import type { Role } from "@prisma/client";
import {
  BulbIcon,
  CalendarIcon,
  ClipboardIcon,
  GearIcon,
  HomeIcon,
  InboxIcon,
  PlanIcon,
  ShieldIcon,
  UsersIcon,
} from "./icons";

export type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  /** Active only on this exact route (see NavLink). */
  exact?: boolean;
};

export type NavBadges = {
  todaysAppointments: number;
  pendingPlans: number;
  newRequests: number;
};

/** Hides a zero count instead of showing a "0" badge. */
const count = (n: number) => (n > 0 ? n : undefined);

/**
 * Single list of app destinations, shared by the desktop sidebar and the mobile
 * bottom bar. To add a section, add it here.
 * - main: the four most used; the mobile bar shows them directly.
 * - secondary: on mobile they live under "Más".
 * - admin: only for ADMIN accounts.
 */
export function getNavItems({ role, badges }: { role: Role; badges: NavBadges }) {
  const main: NavItem[] = [
    { href: "/dashboard", label: "Inicio", icon: <HomeIcon /> },
    { href: "/agenda", label: "Agenda", icon: <CalendarIcon />, badge: count(badges.todaysAppointments) },
    { href: "/pacientes", label: "Pacientes", icon: <UsersIcon /> },
    { href: "/consultas", label: "Consultas", icon: <ClipboardIcon /> },
  ];
  const secondary: NavItem[] = [
    { href: "/planes", label: "Planes", icon: <PlanIcon />, badge: count(badges.pendingPlans) },
    { href: "/ajustes", label: "Ajustes", icon: <GearIcon /> },
    { href: "/sugerencias", label: "Sugerencias", icon: <BulbIcon /> },
  ];
  const admin: NavItem[] =
    role === "ADMIN"
      ? [
          { href: "/admin", label: "Admin", icon: <ShieldIcon />, exact: true },
          { href: "/admin/solicitudes", label: "Solicitudes", icon: <InboxIcon />, badge: count(badges.newRequests) },
        ]
      : [];

  return { main, secondary, admin };
}
