"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/components/ui/cn";

/** A nav item is active on its own route and on any route below it. */
export function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

/** Count badge for nav items (pending plans, today's appointments…). */
export function NavBadge({ value, className }: { value: number; className?: string }) {
  return (
    <span
      className={cn(
        "rounded-pill border border-warning-brd bg-warning-soft px-1.5 py-px text-[10.5px] font-bold text-warning",
        className,
      )}
    >
      {value}
    </span>
  );
}

/** Sidebar navigation link with an active state (matched by route prefix). */
export function NavLink({
  href,
  icon,
  badge,
  exact = false,
  onClick,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  badge?: number;
  /** Active only on this exact route (e.g. /admin, so /admin/solicitudes doesn't light it up too). */
  exact?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = exact ? pathname === href : isActive(pathname, href);

  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-ctl px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-primary-soft text-primary"
          : "text-text-2 hover:bg-surface-3 hover:text-text",
      )}
    >
      <span className="shrink-0 text-current">{icon}</span>
      {children}
      {badge != null && <NavBadge value={badge} className="ml-auto" />}
    </Link>
  );
}
