"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { signOutAction } from "@/app/actions/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/components/ui/cn";
import { MoreIcon } from "./icons";
import type { NavItem } from "./items";
import { NavBadge, NavLink, isActive } from "./NavLink";

/**
 * Bottom tab bar for small screens (the sidebar is hidden below md).
 * Shows the main destinations directly; everything else lives in the "Más" sheet,
 * together with the theme toggle and sign-out.
 */
export function MobileNav({ main, more }: { main: NavItem[]; more: NavItem[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const moreActive = more.some((item) => isActive(pathname, item.href));
  const moreBadge = more.reduce((sum, item) => sum + (item.badge ?? 0), 0);

  return (
    <>
      <nav
        aria-label="Navegación principal"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] md:hidden print:hidden"
      >
        <ul className="grid grid-cols-5">
          {main.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className="flex h-16 flex-col items-center justify-center gap-1"
                >
                  <TabIcon icon={item.icon} active={active} badge={item.badge} />
                  <TabLabel active={active}>{item.label}</TabLabel>
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={open}
              className="flex h-16 w-full flex-col items-center justify-center gap-1"
            >
              <TabIcon icon={<MoreIcon />} active={moreActive} badge={moreBadge || undefined} />
              <TabLabel active={moreActive}>Más</TabLabel>
            </button>
          </li>
        </ul>
      </nav>

      {open && <MoreSheet items={more} onClose={close} />}
    </>
  );
}

function TabIcon({ icon, active, badge }: { icon: React.ReactNode; active: boolean; badge?: number }) {
  return (
    <span
      className={cn(
        "relative flex h-7 w-12 items-center justify-center rounded-pill transition-colors",
        active ? "bg-primary-soft text-primary" : "text-text-2",
      )}
    >
      {icon}
      {badge != null && <NavBadge value={badge} className="absolute -right-1 -top-1" />}
    </span>
  );
}

function TabLabel({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <span className={cn("text-[11px] leading-none", active ? "font-semibold text-primary" : "font-medium text-text-2")}>
      {children}
    </span>
  );
}

/** Bottom sheet with the secondary destinations, theme and sign-out. */
function MoreSheet({ items, onClose }: { items: NavItem[]; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);

  // Move focus into the sheet and close it with Escape.
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 md:hidden print:hidden">
      <button
        type="button"
        aria-label="Cerrar menú"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 bg-overlay"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Más opciones"
        className="absolute inset-x-0 bottom-0 rounded-t-card border-t border-border bg-surface px-3 pt-3 pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-lg"
      >
        <div className="flex items-center justify-between px-3 pb-2">
          <span className="text-sm font-semibold text-text">Más</span>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="rounded-pill px-3 py-1.5 text-sm font-medium text-text-2 hover:bg-surface-3 hover:text-text"
          >
            Cerrar
          </button>
        </div>

        <nav className="flex flex-col gap-0.5" aria-label="Más secciones">
          {items.map((item) => (
            <NavLink key={item.href} href={item.href} icon={item.icon} badge={item.badge} exact={item.exact} onClick={onClose}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-2 flex items-center justify-between border-t border-border px-3 pt-3">
          <span className="text-sm font-medium text-text-2">Tema</span>
          <ThemeToggle />
        </div>
        <form action={signOutAction} className="mt-1">
          <button className="w-full rounded-ctl px-3 py-2.5 text-left text-sm font-medium text-danger transition-colors hover:bg-danger-soft">
            Cerrar sesión
          </button>
        </form>
      </div>
    </div>
  );
}
