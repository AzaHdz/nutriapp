import { cn } from "./cn";

type Range = "in" | "out" | "critical";

const rangeColor: Record<Range, string> = {
  in: "text-range-in",
  out: "text-range-out",
  critical: "text-range-critical",
};

/** Labeled clinical figure (weight, body fat %, waist…).
 *  `range` colors the value by whether it is in or out of range. */
export function Stat({
  label,
  value,
  unit,
  range,
  className,
}: {
  label: string;
  value: string | number;
  unit?: string;
  range?: Range;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      <span className="text-xs text-text-3">{label}</span>
      <span
        className={cn(
          "font-mono text-lg font-semibold tabular-nums",
          range ? rangeColor[range] : "text-text",
        )}
      >
        {value}
        {unit && <span className="ml-1 text-sm font-normal text-text-3">{unit}</span>}
      </span>
    </div>
  );
}
