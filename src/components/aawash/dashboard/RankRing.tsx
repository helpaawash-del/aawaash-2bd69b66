import { useEffect, useId, useRef, useState } from "react";
import { Info } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/* ------------------------------------------------------------------ *
 * RankRing — professional rank gauge for the dashboard hero.
 * SVG stroke arc with a gradient sweep, animated value transitions and
 * an info panel explaining how the percentage is calculated.
 * ------------------------------------------------------------------ */

const SIZE = 168;
const STROKE = 13;
const R = (SIZE - STROKE) / 2;
const C = 2 * Math.PI * R;
const DURATION = 1100;

const easeOutExpo = (p: number) => (p === 1 ? 1 : 1 - Math.pow(2, -10 * p));

export function RankRing({
  percent,
  rank,
  total,
  label = "Rank",
  caption,
  info,
  loading = false,
}: {
  percent: number;
  rank?: number | null;
  total?: number | null;
  label?: string;
  caption?: string;
  info?: string;
  loading?: boolean;
}) {
  const target = Math.max(0, Math.min(100, Math.round(percent || 0)));
  const [shown, setShown] = useState(0);
  const fromRef = useRef(0);
  const gid = useId().replace(/:/g, "");

  useEffect(() => {
    if (loading) return;
    const from = fromRef.current;
    if (from === target) return;
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / DURATION);
      const v = from + (target - from) * easeOutExpo(p);
      fromRef.current = v;
      setShown(v);
      if (p < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, loading]);

  const value = loading ? 0 : shown;
  const rounded = Math.round(value);

  return (
    <div
      data-testid="rank-ring"
      className="relative overflow-hidden rounded-[30px] border border-border/70 bg-surface p-5 shadow-[var(--shadow-soft)] sm:p-6"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--leaf)_22%,transparent),transparent_70%)] blur-2xl"
      />

      {/* header row */}
      <div className="relative mb-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-[14px] font-bold tracking-normal text-foreground">
            {label}
          </h2>
          <p className="mt-0.5 text-[10.5px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Performance standing
          </p>
        </div>

        {info ? (
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label={`What does ${label.toLowerCase()} mean?`}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border/70 bg-surface-warm text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary focus-visible:ring-2 focus-visible:ring-ring outline-none"
              >
                <Info size={16} />
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              className="w-72 rounded-2xl border-border/70 text-[12.5px] leading-relaxed text-muted-foreground"
            >
              <p className="mb-1.5 text-[12px] font-bold uppercase tracking-[0.14em] text-foreground">
                How {label.toLowerCase()} works
              </p>
              {info}
            </PopoverContent>
          </Popover>
        ) : null}
      </div>

      <div className="relative flex items-center gap-5 sm:gap-7">
        <div
          className="relative grid shrink-0 place-items-center"
          role="img"
          aria-label={`${label}: ${rounded} percent`}
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
            />
          </svg>

          <div className="absolute inset-0 grid place-items-center">
            {loading ? (
              <div className="eco-skel h-8 w-16 rounded-full" />
            ) : (
              <span className="font-brand text-[clamp(1.7rem,6vw,2.2rem)] leading-none tracking-[-0.02em] text-foreground tabular-nums">
                {rounded}
                <span className="align-super text-[0.4em] font-semibold text-primary">%</span>
              </span>
            )}
          </div>

        </div>

        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Position
          </div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="font-brand text-[clamp(1.6rem,7vw,2.1rem)] leading-none text-foreground tabular-nums">
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

          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              <span>Progress</span>
              <span className="tabular-nums text-foreground">{rounded}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-primary/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-leaf to-forest"
                style={{ width: `${value}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
