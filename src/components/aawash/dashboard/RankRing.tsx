import { useEffect, useState } from "react";

/* ------------------------------------------------------------------ *
 * RankRing — circular percentage gauge used in the dashboard hero.
 * Shows a rank position with an animated conic progress arc.
 * ------------------------------------------------------------------ */

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

  useEffect(() => {
    if (loading) return;
    const start = performance.now();
    const from = 0;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / 900);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(Math.round(from + (target - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, loading]);

  const value = loading ? 0 : shown;

  return (
    <div
      data-testid="rank-ring"
      className="flex flex-col items-center rounded-[30px] bg-surface p-5 shadow-[var(--shadow-soft)]"
    >
      <div
        className="relative grid aspect-square w-[min(64vw,220px)] place-items-center rounded-full"
        role="img"
        aria-label={`${label}: ${value}%`}
        style={{
          background: `conic-gradient(var(--forest) ${value * 3.6}deg, color-mix(in oklab, var(--primary) 10%, transparent) ${value * 3.6}deg)`,
        }}
      >
        {/* soft outer halo */}
        <span
          aria-hidden
          className="pointer-events-none absolute -inset-4 rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--primary)_16%,transparent),transparent_70%)] blur-md"
        />
        {/* inner disc */}
        <div className="relative grid h-[76%] w-[76%] place-items-center rounded-full bg-surface shadow-[inset_0_1px_0_var(--card),var(--shadow-soft)]">
          {loading ? (
            <div className="eco-skel h-8 w-16 rounded-full" />
          ) : (
            <>
              <span className="font-brand text-[clamp(1.9rem,7vw,2.6rem)] font-normal leading-none tracking-[-0.02em] text-foreground">
                {value}
                <span className="align-super text-[0.42em] font-semibold">%</span>
              </span>
              <span className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                {label}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-[11px] font-bold tracking-[0.04em] text-primary">
          {rank ? `#${rank}` : "—"}
          {total ? <span className="font-medium opacity-70">of {total}</span> : null}
        </span>
        {caption ? (
          <span className="text-[11px] font-medium text-muted-foreground">{caption}</span>
        ) : null}
      </div>
    </div>
  );
}
