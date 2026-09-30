import { cn } from "./cn";
import { initials } from "@/lib/format";

const sizes = {
  sm: "size-8 text-xs",
  md: "size-9 text-xs",
  lg: "size-14 text-lg",
} as const;

const tones = {
  primary: "bg-primary-soft border-primary-soft-brd text-primary",
  accent: "bg-accent-soft border-warning-brd text-accent",
} as const;

/** Circle with the name's initials. */
export function Avatar({
  name,
  size = "md",
  tone = "primary",
  className,
}: {
  name?: string | null;
  size?: keyof typeof sizes;
  tone?: keyof typeof tones;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-pill border font-bold",
        sizes[size],
        tones[tone],
        className,
      )}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}
