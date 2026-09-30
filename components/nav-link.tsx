"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "./ui/cn";

/** Sidebar navigation link with an active state (matched by route prefix). */
export function NavLink({
  href,
  icon,
  badge,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  badge?: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
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
      {badge != null && (
        <span className="ml-auto rounded-pill border border-warning-brd bg-warning-soft px-1.5 py-px text-[10.5px] font-bold text-warning">
          {badge}
        </span>
      )}
    </Link>
  );
}
