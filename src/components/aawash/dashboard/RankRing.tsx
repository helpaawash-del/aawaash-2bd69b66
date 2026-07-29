import { useEffect, useId, useState } from "react";

/* ------------------------------------------------------------------ *
 * RankRing — professional rank gauge for the dashboard hero.
 * SVG stroke arc with a gradient sweep, tick track and a stat column.
 * ------------------------------------------------------------------ */

const SIZE = 168;
const STROKE = 13;
const R = (SIZE - STROKE) / 2;
const C = 2 * Math.PI * R;

export function RankRing({
  percent,
  rank,
  total,
  label = "Rank",
  caption,
  loading = false,
}: {
  percent: number;
  rank?: number | null;
  total?: number | null;
  label?: string;
  caption?: string;
  loading?: boolean;
}) {
  const target = Math.max(0, Math.min(100, Math.round(percent || 0)));
  const [shown, setShown] = useState(0);
  const gid = useId().replace(/:/g, "");

  useEffect(() => {
    if (loading) return;
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / 900);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, loading]);

  const value = loading ? 0 : shown;

  return (
    <div
      data-testid="rank-ring"
      className="relative overflow-hidden rounded-[30px] border border-border/70 bg-surface p-5 shadow-[var(--shadow-soft)] sm:p-6"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--leaf)_22%,transparent),transparent_70%)] blur-2xl"
      />

      <div className="relative flex items-center gap-5 sm:gap-7">
        <div
          className="relative grid shrink-0 place-items-center"
          role="img"
          aria-label={`${label}: ${value}%`}
          style={{ width: SIZE * 0.82, height: SIZE * 0.82 }}
        >
          <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-full w-full -rotate-90">
            <defs>
              <linearGradient id={`rr-${gid}`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="var(--leaf)" />
                <stop offset="100%" stopColor="var(--forest)" />
              </linearGradient>
            </defs>
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={R}
              fill="none"
              stroke="color-mix(in oklab, var(--primary) 12%, transparent)"
              strokeWidth={STROKE}
            />
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={R}
              fill="none"
              stroke={`url(#rr-${gid})`}
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C - (C * value) / 100}
              style={{ transition: "stroke-dashoffset 120ms linear" }}
            />
          </svg>

          <div className="absolute inset-0 grid place-items-center">
            {loading ? (
              <div className="eco-skel h-8 w-16 rounded-full" />
            ) : (
              <>
                <span className="font-brand text-[clamp(1.7rem,6vw,2.2rem)] leading-none tracking-[-0.02em] text-foreground">
                  {value}
                  <span className="align-super text-[0.4em] font-semibold text-primary">%</span>
                </span>
                <span className="mt-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  {label}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Position
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="font-brand text-[clamp(1.6rem,7vw,2.1rem)] leading-none text-foreground">
              {rank ? `#${rank}` : "—"}
            </span>
            {total ? (
              <span className="text-[12px] font-medium text-muted-foreground">of {total}</span>
            ) : null}
          </div>

          {caption ? (
            <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-[11px] font-semibold text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              {caption}
            </span>
          ) : null}

          <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-primary/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-leaf to-forest"
              style={{ width: `${value}%`, transition: "width 120ms linear" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
