"use client";

import { useMemo, useState } from "react";

export type SeriesPoint = { t: number; date: string; value: number };
export type MetricSeries = {
  key: string;
  label: string;
  unit: string;
  points: SeriesPoint[];
};

/** A clinical figure: one decimal, without a trailing ".0" (92.0 → 92). */
function fmt(v: number): string {
  return v.toFixed(1).replace(/\.0$/, "");
}

/** Patient progress chart, one metric at a time.
 *
 *  The SVG uses a 0-100 viewBox on both axes with preserveAspectRatio="none", so a
 *  coordinate (25, 40) lands exactly at left:25% / top:40% of the container, and the
 *  markers, crosshair and tooltip can be HTML positioned by percentage (circles that
 *  don't distort and text at real size) without measuring the width.
 *  The line uses vector-effect so its stroke doesn't stretch with the container. */
export function ProgressChart({ series }: { series: MetricSeries[] }) {
  const [metricKey, setMetricKey] = useState(series[0]?.key ?? "");
  const [active, setActive] = useState<number | null>(null);

  const current = series.find((s) => s.key === metricKey) ?? series[0];
  // Memoized: `?? []` would create a new array on every render and defeat the geo useMemo.
  const points = useMemo(() => current?.points ?? [], [current]);

  const geo = useMemo(() => {
    if (points.length < 2) return null;

    const ts = points.map((p) => p.t);
    const vs = points.map((p) => p.value);
    const tMin = Math.min(...ts);
    const tSpan = Math.max(...ts) - tMin || 1;

    // Y domain with padding so the line doesn't touch the edges. If every
    // measurement is the same, an artificial margin keeps the line centered
    // instead of stuck to the top.
    const vMin = Math.min(...vs);
    const vMax = Math.max(...vs);
    const spread = vMax - vMin;
    const padding = spread === 0 ? Math.abs(vMin) * 0.05 || 1 : spread * 0.12;
    const dMin = vMin - padding;
    const dSpan = vMax + padding - dMin;

    // Horizontal margin so the end markers don't get clipped.
    const padX = 3;
    const x = (t: number) => padX + ((t - tMin) / tSpan) * (100 - padX * 2);
    const y = (v: number) => (1 - (v - dMin) / dSpan) * 100;

    const coords = points.map((p) => ({ x: x(p.t), y: y(p.value) }));

    // Y axis ticks use real series values, not the padded domain.
    const ticks =
      spread === 0
        ? [{ v: vMin, y: y(vMin) }]
        : [vMax, (vMin + vMax) / 2, vMin].map((v) => ({ v, y: y(v) }));

    return { coords, ticks };
  }, [points]);

  if (series.length === 0) return null;
  // No metric reaches two points ⇒ the patient has a single consultation.
  // No metric reaches two points ⇒ the patient has a single consultation.
  const maxPoints = Math.max(...series.map((s) => s.points.length));
  if (maxPoints < 2) {
    return (
      <p className="mt-3 text-sm text-text-3">
        Se necesita al menos una consulta más para graficar la evolución.
      </p>
    );
  }

  const last = points[points.length - 1];
  const previous = points[points.length - 2];
  const change = points.length >= 2 ? last.value - previous.value : null;

  function move(delta: number) {
    if (!geo) return;
    setActive((i) => {
      const base = i ?? points.length - 1;
      return Math.min(points.length - 1, Math.max(0, base + delta));
    });
  }

  function onPointer(e: React.PointerEvent<HTMLDivElement>) {
    if (!geo) return;
    const box = e.currentTarget.getBoundingClientRect();
    const pct = ((e.clientX - box.left) / box.width) * 100;
    let nearest = 0;
    let dist = Infinity;
    geo.coords.forEach((c, i) => {
      const d = Math.abs(c.x - pct);
      if (d < dist) {
        dist = d;
        nearest = i;
      }
    });
    setActive(nearest);
  }

  const summary = geo
    ? `${current.label}: ${points.length} registros del ${points[0].date} al ${last.date}, de ${fmt(points[0].value)} a ${fmt(last.value)} ${current.unit}`.trim()
    : "";

  return (
    <div className="mt-3">
      {/* Metric picker */}
      <div className="flex flex-wrap gap-1.5">
        {series.map((s) => {
          const selected = s.key === current.key;
          const noData = s.points.length < 2;
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => {
                setMetricKey(s.key);
                setActive(null);
              }}
              aria-pressed={selected}
              className={`rounded-pill border px-2.5 py-1 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                selected
                  ? "border-primary bg-primary text-on-primary"
                  : "border-border-strong bg-surface text-text-2 hover:bg-surface-3 hover:text-text"
              } ${noData && !selected ? "opacity-50" : ""}`}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Trend against the previous consultation. No color: whether going down is
          good or bad depends on the patient's goal, not on the metric. */}
      {change != null && (
        <p className="mt-3 text-[13px] text-text-2">
          <span className="font-mono font-semibold tabular-nums text-text">
            {Math.abs(change) < 0.05
              ? "Sin cambio"
              : `${change > 0 ? "↑" : "↓"} ${fmt(Math.abs(change))}${current.unit ? ` ${current.unit}` : ""}`}
          </span>{" "}
          vs. consulta anterior
        </p>
      )}

      {!geo ? (
        <p className="mt-3 text-sm text-text-3">
          Aún no hay suficientes registros de {current.label.toLowerCase()} para graficar.
        </p>
      ) : (
        <div className="mt-3 flex items-start gap-2">
          {/* Y axis. `items-start` + the same height as the plot area: if it stretched
              with the flex, `top: %` would be computed against a taller box and the
              figures would drift off their gridlines. */}
          <div className="relative h-40 w-9 shrink-0">
            {geo.ticks.map((m) => (
              <span
                key={m.v}
                className="absolute right-0 -translate-y-1/2 font-mono text-[10px] tabular-nums text-text-3"
                style={{ top: `${m.y}%` }}
              >
                {fmt(m.v)}
              </span>
            ))}
          </div>

          <div className="min-w-0 flex-1">
            <div
              role="img"
              aria-label={summary}
              tabIndex={0}
              onPointerMove={onPointer}
              onPointerLeave={() => setActive(null)}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight") {
                  e.preventDefault();
                  move(1);
                } else if (e.key === "ArrowLeft") {
                  e.preventDefault();
                  move(-1);
                } else if (e.key === "Home") {
                  e.preventDefault();
                  setActive(0);
                } else if (e.key === "End") {
                  e.preventDefault();
                  setActive(points.length - 1);
                } else if (e.key === "Escape") {
                  setActive(null);
                }
              }}
              className="relative h-40 rounded-ctl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                aria-hidden
                className="absolute inset-0 h-full w-full"
              >
                {geo.ticks.map((m) => (
                  <line
                    key={m.v}
                    x1={0}
                    y1={m.y}
                    x2={100}
                    y2={m.y}
                    className="stroke-border"
                    strokeWidth={1}
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
                <polyline
                  points={geo.coords.map((c) => `${c.x},${c.y}`).join(" ")}
                  fill="none"
                  className="stroke-primary"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>

              {/* Crosshair for the point under the cursor */}
              {active != null && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-y-0 w-px bg-border-strong"
                  style={{ left: `${geo.coords[active].x}%` }}
                />
              )}

              {/* Markers. The last point stands out by size and ring as well as
                  color: in dark mode primary and accent are close. */}
              {geo.coords.map((c, i) => {
                const isLast = i === geo.coords.length - 1;
                const isActive = i === active;
                return (
                  <span
                    key={i}
                    aria-hidden
                    className={`pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-pill ${
                      isLast ? "size-[11px] bg-accent" : "size-2 bg-primary"
                    } ${isLast || isActive ? "ring-2 ring-surface" : ""} ${
                      isActive ? "scale-125" : ""
                    }`}
                    style={{ left: `${c.x}%`, top: `${c.y}%` }}
                  />
                );
              })}

              {/* Tooltip. Its x is clamped so it stays inside the card; the marker
                  keeps its real position. */}
              {active != null && (
                <div
                  className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-ctl border border-border bg-surface px-2 py-1 shadow-md"
                  style={{
                    left: `${Math.min(85, Math.max(15, geo.coords[active].x))}%`,
                    top: `${geo.coords[active].y}%`,
                    marginTop: "-0.65rem",
                  }}
                >
                  <div className="whitespace-nowrap text-[10.5px] text-text-3">
                    {points[active].date}
                  </div>
                  <div className="whitespace-nowrap font-mono text-[13px] font-semibold tabular-nums text-text">
                    {fmt(points[active].value)}
                    {current.unit && (
                      <span className="ml-0.5 text-[11px] font-normal text-text-3">
                        {current.unit}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* X axis: the ends of the range. The tooltip gives per-point detail. */}
            <div
              className="mt-1.5 flex justify-between font-mono text-[10.5px] tabular-nums text-text-3"
              style={{ paddingLeft: "3%", paddingRight: "3%" }}
            >
              <span>{points[0].date}</span>
              <span>{last.date}</span>
            </div>
          </div>
        </div>
      )}

      {/* Announces the active point to screen readers during keyboard navigation */}
      <span className="sr-only" aria-live="polite">
        {active != null
          ? `${points[active].date}: ${fmt(points[active].value)} ${current.unit}`.trim()
          : ""}
      </span>
    </div>
  );
}
