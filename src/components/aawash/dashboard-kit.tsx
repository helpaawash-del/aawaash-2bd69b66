import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useReveal } from "@/hooks/useReveal";

/**
 * StatCard — premium animated statistic card used across leader/member views.
 */
export function StatCard({
  icon,
  label,
  value,
  hint,
  accent = "primary",
  animated = true,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  hint?: string;
  accent?: "primary" | "gold" | "leaf" | "destructive";
  animated?: boolean;
}) {
  const numeric = typeof value === "number" ? value : Number(String(value).replace(/[^0-9.-]/g, ""));
  const validNumeric = animated && Number.isFinite(numeric) && numeric > 0;
  const { ref, revealed } = useReveal<HTMLDivElement>();
  const [n, setN] = useState(validNumeric ? 0 : numeric);

  useEffect(() => {
    if (!validNumeric || !revealed) return;
    const start = performance.now();
    const dur = 900;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      setN(Math.floor(numeric * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
      else setN(numeric);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [validNumeric, revealed, numeric]);

  const accentClass =
    accent === "gold"
      ? "bg-gold/15 text-gold-foreground"
      : accent === "leaf"
        ? "bg-leaf/15 text-primary"
        : accent === "destructive"
          ? "bg-destructive/10 text-destructive"
          : "bg-primary-soft text-primary";

  const display =
    typeof value === "number"
      ? n.toLocaleString("en-IN")
      : validNumeric
        ? String(value).replace(String(numeric), n.toLocaleString("en-IN"))
        : String(value);

  return (
    <div
      ref={ref}
      className="glass-card rounded-3xl p-4 shadow-[var(--shadow-soft)] transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-float)] sm:p-5"
    >
      <div className={`grid h-9 w-9 place-items-center rounded-xl ${accentClass}`}>{icon}</div>
      <div className="mt-3 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
        {display}
      </div>
      <div className="mt-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      {hint && <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

/**
 * SectionCard — premium container for dashboard sections.
 */
export function SectionCard({
  title,
  subtitle,
  action,
  children,
  className = "",
}: {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`glass-card rounded-3xl p-5 shadow-[var(--shadow-soft)] sm:p-6 ${className}`}
    >
      {(title || action) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            {title && <h2 className="text-base font-bold text-foreground sm:text-lg">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-dashed border-border/70 bg-surface-warm/40 px-4 py-10 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary-soft text-primary">
        {icon}
      </div>
      <h3 className="mt-4 text-sm font-bold text-foreground">{title}</h3>
      <p className="mt-1 max-w-xs text-xs text-muted-foreground">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function SkeletonBlock({ className = "h-20" }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-muted/60 ${className}`} />;
}

export function formatINR(value: number | string | null | undefined, opts: { compact?: boolean } = {}) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return "₹0";
  if (opts.compact && Math.abs(n) >= 100000) {
    if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(2)} Cr`;
    if (n >= 1_00_000) return `₹${(n / 1_00_000).toFixed(2)} L`;
  }
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Good Night";
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  if (h < 21) return "Good Evening";
  return "Good Night";
}

export function initials(name?: string | null): string {
  if (!name) return "AA";
  return name
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
