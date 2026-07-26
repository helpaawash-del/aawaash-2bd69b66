import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, ChevronRight } from "lucide-react";
import { useReveal } from "@/hooks/useReveal";

/**
 * PremiumKit — presentation-only building blocks for the Team Leader and
 * Team Member dashboards. Pure UI: no data fetching, no business logic.
 * Visual language: pure-white workspace, floating glass cards, 28px radii,
 * soft shadows, emerald primary with cyan / violet / sky / amber accents.
 */

export type Accent = "emerald" | "gold" | "violet" | "sky" | "cyan" | "orange" | "rose";

const ACCENT_CHIP: Record<Accent, string> = {
  emerald: "bg-primary-soft text-primary",
  gold: "bg-gold/18 text-gold-foreground",
  violet: "bg-violet-100 text-violet-700",
  sky: "bg-sky-100 text-sky-700",
  cyan: "bg-cyan-100 text-cyan-700",
  orange: "bg-orange-100 text-orange-700",
  rose: "bg-rose-100 text-rose-700",
};

const ACCENT_GLOW: Record<Accent, string> = {
  emerald: "before:bg-primary/18",
  gold: "before:bg-gold/22",
  violet: "before:bg-violet-400/20",
  sky: "before:bg-sky-400/20",
  cyan: "before:bg-cyan-400/20",
  orange: "before:bg-orange-400/20",
  rose: "before:bg-rose-400/20",
};

/* ------------------------------------------------------------------ *
 * Panel — the universal floating glass container
 * ------------------------------------------------------------------ */
export function Panel({
  title,
  subtitle,
  eyebrow,
  action,
  children,
  className = "",
  bodyClassName = "",
}: {
  title?: string;
  subtitle?: string;
  eyebrow?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      className={`glass-card rounded-[28px] p-5 shadow-[var(--shadow-soft)] sm:p-6 ${className}`}
    >
      {(title || action || eyebrow) && (
        <div className="mb-5 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
          <div className="min-w-0">
            {eyebrow}
            {title && (
              <h2 className="truncate text-[17px] font-semibold tracking-[-0.01em] text-foreground sm:text-lg">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="mt-1 text-xs font-light leading-relaxed text-muted-foreground">
                {subtitle}
              </p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

/** Small pill link used as a panel action. */
export function PanelLink({ to, params, children }: { to: string; params?: Record<string, string>; children: ReactNode }) {
  return (
    <Link
      to={to as never}
      params={params as never}
      className="inline-flex h-9 min-h-9 items-center gap-1 rounded-full border border-border/70 bg-surface px-3.5 text-[11px] font-semibold text-primary shadow-[var(--shadow-soft)] outline-none transition-all hover:-translate-y-0.5 hover:border-primary/30 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {children} <ChevronRight size={12} />
    </Link>
  );
}

/* ------------------------------------------------------------------ *
 * Greeting header
 * ------------------------------------------------------------------ */
export function GreetingHeader({
  eyebrow,
  greeting,
  name,
  caption,
  right,
}: {
  eyebrow: ReactNode;
  greeting: string;
  name: string;
  caption: string;
  right?: ReactNode;
}) {
  return (
    <header className="grid gap-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
      <div className="min-w-0">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
          {eyebrow}
        </div>
        <h1 className="mt-4 text-[2rem] font-semibold leading-[1.05] tracking-[-0.02em] text-foreground sm:text-[2.6rem]">
          {greeting},
          <br className="sm:hidden" />{" "}
          {name ? (
            <span
              data-testid="greeting-name"
              className="bg-gradient-to-br from-primary via-leaf to-primary bg-clip-text text-transparent"
            >
              {name}
            </span>
          ) : (
            <span
              data-testid="greeting-name-loading"
              aria-hidden="true"
              className="inline-block h-[1em] w-[6.5ch] translate-y-[0.12em] animate-pulse rounded-full bg-primary-soft align-middle"
            />
          )}
        </h1>
        <p className="mt-2 max-w-lg text-sm font-light leading-relaxed text-muted-foreground">
          {caption}
        </p>
      </div>
      {right && <div className="min-w-0 md:justify-self-end">{right}</div>}
    </header>
  );
}

/* ------------------------------------------------------------------ *
 * Wallet hero card — premium banking style
 * ------------------------------------------------------------------ */
export function WalletHeroCard({
  label,
  balance,
  footLeft,
  footRight,
  to,
  spark = [],
}: {
  label: string;
  balance: string;
  footLeft?: ReactNode;
  footRight?: ReactNode;
  to: string;
  spark?: number[];
}) {
  return (
    <div className="relative overflow-hidden rounded-[30px] bg-gradient-to-br from-primary via-primary to-leaf p-[1.5px] shadow-[var(--shadow-glow)]">
      <div className="relative overflow-hidden rounded-[28.5px] bg-gradient-to-br from-primary to-leaf p-5 sm:p-6">
        <div className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-white/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-8 h-44 w-44 rounded-full bg-gold/30 blur-3xl" />

        <div className="relative flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary-foreground/75">
              {label}
            </div>
            <div className="mt-1.5 text-[2.15rem] font-semibold leading-none tracking-[-0.02em] text-primary-foreground sm:text-[2.5rem]">
              {balance}
            </div>
          </div>
          <Link
            to={to as never}
            aria-label="Open wallet"
            className="grid h-11 w-11 min-h-11 min-w-11 shrink-0 place-items-center rounded-2xl bg-white/20 text-primary-foreground ring-1 ring-inset ring-white/35 backdrop-blur outline-none transition-transform will-change-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary active:scale-95"
          >
            <ArrowUpRight size={18} />
          </Link>
        </div>

        {spark.length > 1 && <Sparkline values={spark} className="relative mt-4 h-12 w-full" />}

        <div className="relative mt-4 flex items-center justify-between gap-3 border-t border-white/20 pt-3 text-[11px] font-light text-primary-foreground/85">
          <span className="truncate">{footLeft}</span>
          <span className="shrink-0 font-medium">{footRight}</span>
        </div>
      </div>
    </div>
  );
}

/** Tiny gradient-filled sparkline (SVG, GPU-friendly, no library). */
export function Sparkline({
  values,
  className = "h-12 w-full",
  stroke = "currentColor",
}: {
  values: number[];
  className?: string;
  stroke?: string;
}) {
  const w = 240;
  const h = 48;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - ((v - min) / span) * (h - 6) - 3;
    return [x, y] as const;
  });
  const line = pts
    .map(([x, y], i) => {
      if (i === 0) return `M${x},${y}`;
      const [px, py] = pts[i - 1];
      const cx = (px + x) / 2;
      return `C${cx},${py} ${cx},${y} ${x},${y}`;
    })
    .join(" ");
  const area = `${line} L${w},${h} L0,${h} Z`;
  const id = `spark-${values.length}-${Math.round(max)}`;

  return (
    <svg className={className} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity={0.4} />
          <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path
        d={line}
        fill="none"
        stroke={stroke}
        strokeWidth={2}
        strokeLinecap="round"
        className="motion-safe:animate-holo-draw"
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ *
 * Quick actions
 * ------------------------------------------------------------------ */
export function QuickActionGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-4 gap-2.5 sm:gap-3">{children}</div>;
}

export function QuickAction({
  icon,
  label,
  to,
  accent = "emerald",
  badge,
}: {
  icon: ReactNode;
  label: string;
  to: string;
  accent?: Accent;
  badge?: ReactNode;
}) {
  return (
    <Link
      to={to as never}
      aria-label={badge ? `${label} (${badge} new)` : label}
      className="group glass-card relative flex min-h-[84px] flex-col items-center justify-center gap-2 rounded-[22px] px-1.5 py-3.5 text-center shadow-[var(--shadow-soft)] outline-none transition-all duration-300 will-change-transform hover:-translate-y-1 hover:shadow-[var(--shadow-float)] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-95 md:min-h-[92px] md:gap-2.5"
    >
      <span
        className={`grid h-11 w-11 place-items-center rounded-2xl transition-transform duration-300 group-hover:scale-105 ${ACCENT_CHIP[accent]}`}
      >
        {icon}
      </span>
      <span className="line-clamp-2 text-[10.5px] font-semibold leading-tight text-foreground sm:text-[11px]">
        {label}
      </span>
      {badge && (
        <span className="absolute right-2 top-2 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
          {badge}
        </span>
      )}
    </Link>
  );
}

/* ------------------------------------------------------------------ *
 * Metric tile — compact premium stat with counter animation
 * ------------------------------------------------------------------ */
export function MetricTile({
  icon,
  label,
  value,
  hint,
  accent = "emerald",
  trend,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  hint?: string;
  accent?: Accent;
  trend?: { dir: "up" | "down" | "flat"; value: string };
}) {
  const display = useCountUpText(value);
  const trendClass =
    trend?.dir === "up"
      ? "text-emerald-600"
      : trend?.dir === "down"
        ? "text-rose-600"
        : "text-muted-foreground";

  return (
    <div
      className={`glass-card group relative overflow-hidden rounded-[24px] p-4 shadow-[var(--shadow-soft)] transition-all duration-300 will-change-transform hover:-translate-y-1 hover:shadow-[var(--shadow-float)] sm:p-5 before:pointer-events-none before:absolute before:-right-14 before:-top-14 before:h-36 before:w-36 before:rounded-full before:opacity-0 before:blur-3xl before:transition-opacity before:duration-500 hover:before:opacity-100 ${ACCENT_GLOW[accent]}`}
    >
      <div className="relative flex items-center justify-between gap-2">
        <span className={`grid h-9 w-9 place-items-center rounded-xl ${ACCENT_CHIP[accent]}`}>
          {icon}
        </span>
        {trend && (
          <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold ${trendClass}`}>
            <span aria-hidden>{trend.dir === "up" ? "▲" : trend.dir === "down" ? "▼" : "•"}</span>
            {trend.value}
          </span>
        )}
      </div>
      <div className="relative mt-3.5 truncate text-[1.55rem] font-semibold leading-none tracking-[-0.02em] text-foreground sm:text-[1.75rem]">
        {display}
      </div>
      <div className="relative mt-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      {hint && (
        <div className="relative mt-1 truncate text-[11px] font-light text-muted-foreground">{hint}</div>
      )}
    </div>
  );
}

/** Counts numbers up on first reveal while keeping any currency prefix/suffix. */
function useCountUpText(value: string | number) {
  const raw = String(value);
  const match = raw.match(/-?[\d,]*\.?\d+/);
  const numeric = match ? Number(match[0].replace(/,/g, "")) : NaN;
  const animate = Number.isFinite(numeric) && Math.abs(numeric) > 0;
  const [n, setN] = useState(animate ? 0 : numeric);
  const started = useRef(false);

  useEffect(() => {
    if (!animate) return;
    if (started.current) {
      setN(numeric);
      return;
    }
    started.current = true;
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / 850);
      setN(numeric * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
      else setN(numeric);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [animate, numeric]);

  if (!animate || !match) return raw;
  const decimals = (match[0].split(".")[1] ?? "").length;
  const shown = decimals
    ? n.toFixed(decimals)
    : Math.round(n).toLocaleString("en-IN");
  return raw.replace(match[0], shown);
}

/* ------------------------------------------------------------------ *
 * Horizontal snap rail
 * ------------------------------------------------------------------ */
export function Rail({
  children,
  className = "",
  "aria-label": ariaLabel,
}: {
  children: ReactNode;
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <div
      aria-label={ariaLabel}
      className={`-mx-5 flex snap-x snap-mandatory gap-3.5 overflow-x-auto px-5 pb-2 [scrollbar-width:none] sm:-mx-6 sm:px-6 [&::-webkit-scrollbar]:hidden ${className}`}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Avatar + rank
 * ------------------------------------------------------------------ */
export function Portrait({
  name,
  src,
  size = 40,
  online,
}: {
  name?: string | null;
  src?: string | null;
  size?: number;
  online?: boolean;
}) {
  const inits = (name || "AA")
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span className="relative inline-flex shrink-0">
      {src ? (
        <img
          src={src}
          alt={name ? `${name} avatar` : ""}
          loading="lazy"
          decoding="async"
          className="rounded-2xl object-cover ring-1 ring-border/70"
          style={{ height: size, width: size }}
        />
      ) : (
        <span
          className="grid place-items-center rounded-2xl bg-gradient-to-br from-primary to-leaf text-[11px] font-bold text-primary-foreground ring-1 ring-white/50"
          style={{ height: size, width: size }}
        >
          {inits}
        </span>
      )}
      {online && (
        <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-success ring-2 ring-background" />
      )}
    </span>
  );
}

export function RankChip({ rank, icon }: { rank: number; icon?: ReactNode }) {
  const styles =
    rank === 1
      ? "bg-gradient-to-br from-gold to-gold/60 text-gold-foreground"
      : rank === 2
        ? "bg-gradient-to-br from-primary-soft to-leaf/40 text-primary"
        : rank === 3
          ? "bg-gradient-to-br from-orange-100 to-orange-50 text-orange-700"
          : "bg-muted text-muted-foreground";
  return (
    <span
      className={`grid h-9 w-9 shrink-0 place-items-center rounded-2xl text-xs font-bold ${styles}`}
    >
      {rank <= 3 && icon ? icon : rank}
    </span>
  );
}

/* ------------------------------------------------------------------ *
 * Progress bar
 * ------------------------------------------------------------------ */
export function Progress({ value, className = "" }: { value: number; className?: string }) {
  const { ref, revealed } = useReveal<HTMLDivElement>();
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
      ref={ref}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      className={`h-1.5 w-full overflow-hidden rounded-full bg-muted ${className}`}
    >
      <div
        className="h-full rounded-full bg-gradient-to-r from-primary to-leaf transition-[width] duration-[1200ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ width: `${revealed ? Math.max(0, Math.min(100, value)) : 0}%` }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Achievement card
 * ------------------------------------------------------------------ */
export function AchievementCard({
  icon,
  title,
  subtitle,
  level,
  xp,
  xpGoal,
  chips = [],
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  level: string;
  xp: number;
  xpGoal: number;
  chips?: string[];
}) {
  const pct = xpGoal > 0 ? Math.round((xp / xpGoal) * 100) : 0;
  return (
    <div className="relative overflow-hidden rounded-[28px] border border-gold/25 bg-gradient-to-br from-gold/12 via-surface to-primary-soft/40 p-5 shadow-[var(--shadow-soft)] sm:p-6">
      <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-gold/25 blur-3xl" />
      <div className="relative flex items-start gap-4">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-3xl bg-gradient-to-br from-gold to-gold/60 text-gold-foreground shadow-[var(--shadow-soft)]">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-semibold tracking-[-0.01em] text-foreground">
              {title}
            </h3>
            <span className="rounded-full bg-foreground/90 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.14em] text-background">
              {level}
            </span>
          </div>
          <p className="mt-1 text-xs font-light text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <div className="relative mt-5">
        <div className="mb-2 flex items-center justify-between text-[11px] font-medium text-muted-foreground">
          <span>{xp.toLocaleString("en-IN")} XP</span>
          <span>{pct}% to next tier</span>
        </div>
        <Progress value={pct} />
      </div>
      {chips.length > 0 && (
        <div className="relative mt-4 flex flex-wrap gap-2">
          {chips.map((c) => (
            <span
              key={c}
              className="rounded-full border border-border/70 bg-surface/80 px-2.5 py-1 text-[10px] font-semibold text-foreground/80 backdrop-blur"
            >
              {c}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Loading skeletons — shape-matched to their live counterparts
 * ------------------------------------------------------------------ */
function Shimmer({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-muted/70 ${className}`} aria-hidden />;
}

export function WalletHeroSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading wallet balance"
      className="glass-card overflow-hidden rounded-[30px] p-5 shadow-[var(--shadow-soft)] sm:p-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <Shimmer className="h-3 w-28 rounded-full" />
          <Shimmer className="mt-3 h-9 w-44" />
        </div>
        <Shimmer className="h-11 w-11 shrink-0" />
      </div>
      <Shimmer className="mt-5 h-12 w-full" />
      <div className="mt-4 flex items-center justify-between gap-3">
        <Shimmer className="h-3 w-24 rounded-full" />
        <Shimmer className="h-3 w-28 rounded-full" />
      </div>
    </div>
  );
}

export function MetricTileSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading metric"
      className="glass-card rounded-[24px] p-4 shadow-[var(--shadow-soft)] sm:p-5"
    >
      <Shimmer className="h-9 w-9 rounded-xl" />
      <Shimmer className="mt-4 h-7 w-24" />
      <Shimmer className="mt-2.5 h-2.5 w-20 rounded-full" />
      <Shimmer className="mt-2 h-2.5 w-16 rounded-full" />
    </div>
  );
}

export function MetricRowSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <MetricTileSkeleton key={i} />
      ))}
    </div>
  );
}

export function ChartSkeleton({ className = "h-56 sm:h-64" }: { className?: string }) {
  return (
    <div role="status" aria-label="Loading chart" className={`flex w-full items-end gap-2.5 ${className}`}>
      {["h-[42%]", "h-[68%]", "h-[54%]", "h-[82%]", "h-[60%]", "h-[92%]"].map((h, i) => (
        <Shimmer key={i} className={`flex-1 rounded-xl ${h}`} />
      ))}
    </div>
  );
}

export function ListRowSkeleton({ rows = 4, height = "h-16" }: { rows?: number; height?: string }) {
  return (
    <div role="status" aria-label="Loading list" className="flex flex-col gap-2.5">
      {Array.from({ length: rows }).map((_, i) => (
        <Shimmer key={i} className={`w-full ${height} rounded-[22px]`} />
      ))}
    </div>
  );
}

export function CardGridSkeleton({
  count = 3,
  height = "h-44",
  className = "grid gap-3 sm:grid-cols-2 lg:grid-cols-3",
}: {
  count?: number;
  height?: string;
  className?: string;
}) {
  return (
    <div role="status" aria-label="Loading cards" className={className}>
      {Array.from({ length: count }).map((_, i) => (
        <Shimmer key={i} className={`w-full ${height} rounded-[24px]`} />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Zero-state — polished, illustrated empty state with optional CTA
 * ------------------------------------------------------------------ */
export function ZeroState({
  icon,
  title,
  body,
  cta,
  accent = "emerald",
}: {
  icon: ReactNode;
  title: string;
  body: string;
  cta?: { label: string; to: string };
  accent?: Accent;
}) {
  return (
    <div className="relative flex flex-col items-center overflow-hidden rounded-[24px] border border-dashed border-border/80 bg-gradient-to-b from-surface-warm/60 to-surface px-5 py-10 text-center">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-16 mx-auto h-40 w-40 rounded-full bg-primary/10 blur-3xl"
      />
      <span
        className={`relative grid h-16 w-16 place-items-center rounded-[22px] shadow-[var(--shadow-soft)] ${ACCENT_CHIP[accent]}`}
      >
        {icon}
      </span>
      <h3 className="relative mt-4 text-sm font-semibold tracking-[-0.01em] text-foreground">{title}</h3>
      <p className="relative mt-1.5 max-w-xs text-xs font-light leading-relaxed text-muted-foreground">{body}</p>
      {cta && (
        <Link
          to={cta.to as never}
          className="relative mt-5 inline-flex h-11 min-h-11 items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-br from-primary to-leaf px-5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] outline-none transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98]"
        >
          {cta.label} <ChevronRight size={14} />
        </Link>
      )}
    </div>
  );
}
