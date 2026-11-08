import Link from "next/link";
import { cn } from "./cn";

/** Pill link used as a list filter (Todos, Pendientes…). */
export function FilterChip({ label, active, href }: { label: string; active: boolean; href: string }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "rounded-pill border px-3.5 py-1.5 text-[12.5px] whitespace-nowrap",
        active
          ? "border-primary-soft-brd bg-primary-soft font-semibold text-primary"
          : "border-border-strong font-medium text-text-2 transition-colors hover:bg-surface-3",
      )}
    >
      {label}
    </Link>
  );
}
