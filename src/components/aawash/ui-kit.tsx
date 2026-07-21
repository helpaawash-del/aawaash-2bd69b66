/**
 * Aawash Global UI Kit
 * ---------------------------------------------------------------
 * Single source of truth for shared visual primitives that were
 * missing from `dashboard-kit.tsx`. Existing components
 * (StatCard, SectionCard, EmptyState, SkeletonBlock, formatINR,
 * greeting, initials) continue to live in dashboard-kit and are
 * re-exported here so every future page can import from ONE place:
 *
 *     import { Button, Badge, StatusChip, ... } from "@/components/aawash/ui-kit";
 *
 * Do NOT duplicate these primitives elsewhere. Extend this file.
 */
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { forwardRef } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export {
  StatCard,
  SectionCard,
  EmptyState,
  SkeletonBlock,
  formatINR,
  greeting,
  initials,
} from "./dashboard-kit";

/* ------------------------------------------------------------------ */
/* Button                                                              */
/* ------------------------------------------------------------------ */

type Variant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger"
  | "success"
  | "gold";
type Size = "sm" | "md" | "lg" | "icon";

const variantClass: Record<Variant, string> = {
  primary:
    "bg-gradient-to-b from-primary to-[color-mix(in_oklab,var(--primary)_88%,black)] text-primary-foreground shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-glow)] hover:-translate-y-0.5 active:translate-y-0",
  secondary:
    "bg-surface text-foreground border border-border shadow-[var(--shadow-soft)] hover:-translate-y-0.5 hover:border-primary/30",
  outline:
    "bg-transparent text-foreground border border-border hover:bg-surface-warm hover:border-primary/40",
  ghost: "bg-transparent text-foreground hover:bg-surface-warm/70",
  danger:
    "bg-destructive text-destructive-foreground shadow-[var(--shadow-soft)] hover:-translate-y-0.5 hover:bg-destructive/90",
  success:
    "bg-success text-primary-foreground shadow-[var(--shadow-soft)] hover:-translate-y-0.5",
  gold: "bg-gradient-to-b from-gold to-[color-mix(in_oklab,var(--gold)_82%,black)] text-gold-foreground shadow-[var(--shadow-soft)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-glow)]",
};

const sizeClass: Record<Size, string> = {
  sm: "h-9 px-3.5 text-xs rounded-xl gap-1.5",
  md: "h-11 px-5 text-sm rounded-2xl gap-2",
  lg: "h-13 px-7 text-base rounded-2xl gap-2.5",
  icon: "h-11 w-11 rounded-2xl",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    loading,
    leadingIcon,
    trailingIcon,
    fullWidth,
    className,
    children,
    disabled,
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "relative inline-flex select-none items-center justify-center font-semibold outline-none transition-all duration-200",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:cursor-not-allowed disabled:opacity-60 disabled:translate-y-0",
        "active:scale-[0.98]",
        variantClass[variant],
        sizeClass[size],
        fullWidth && "w-full",
        className,
      )}
      {...rest}
    >
      {loading ? (
        <Loader2 size={size === "sm" ? 14 : 16} className="animate-spin" />
      ) : (
        leadingIcon
      )}
      {size !== "icon" && <span className="truncate">{children}</span>}
      {!loading && trailingIcon}
    </button>
  );
});

/** Floating Action Button */
export function FAB({
  icon,
  onClick,
  label,
  className,
}: {
  icon: ReactNode;
  onClick?: () => void;
  label: string;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={cn(
        "fixed bottom-24 right-5 z-30 grid h-14 w-14 place-items-center rounded-full",
        "bg-gradient-to-br from-primary to-leaf text-primary-foreground",
        "shadow-[var(--shadow-glow)] transition-all hover:-translate-y-1 active:scale-95",
        "md:bottom-8 md:right-8",
        className,
      )}
    >
      {icon}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Badge + StatusChip                                                  */
/* ------------------------------------------------------------------ */

type Tone =
  | "neutral"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "gold"
  | "primary";

const toneClass: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground border-border",
  success: "bg-success/12 text-success border-success/25",
  warning: "bg-warning/15 text-[color:var(--warning)] border-warning/30",
  danger: "bg-destructive/10 text-destructive border-destructive/25",
  info: "bg-info/12 text-info border-info/25",
  gold: "bg-gold/15 text-gold-foreground border-gold/30",
  primary: "bg-primary-soft text-primary border-primary/20",
};

export function Badge({
  tone = "neutral",
  children,
  icon,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider",
        toneClass[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}

/** Animated status chip with a pulsing dot. */
export function StatusChip({
  status,
  label,
  className,
}: {
  status: "online" | "offline" | "pending" | "approved" | "rejected" | "suspended" | "sold" | "available";
  label?: string;
  className?: string;
}) {
  const map = {
    online: { tone: "success" as Tone, dot: "bg-success", text: label ?? "Online", pulse: true },
    available: { tone: "success" as Tone, dot: "bg-success", text: label ?? "Available", pulse: true },
    approved: { tone: "success" as Tone, dot: "bg-success", text: label ?? "Approved", pulse: false },
    offline: { tone: "neutral" as Tone, dot: "bg-muted-foreground", text: label ?? "Offline", pulse: false },
    pending: { tone: "warning" as Tone, dot: "bg-[color:var(--warning)]", text: label ?? "Pending", pulse: true },
    rejected: { tone: "danger" as Tone, dot: "bg-destructive", text: label ?? "Rejected", pulse: false },
    suspended: { tone: "danger" as Tone, dot: "bg-destructive", text: label ?? "Suspended", pulse: false },
    sold: { tone: "gold" as Tone, dot: "bg-gold", text: label ?? "Sold", pulse: false },
  }[status];
  return (
    <Badge tone={map.tone} className={className}>
      <span className="relative flex h-1.5 w-1.5">
        {map.pulse && (
          <span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-60", map.dot)} />
        )}
        <span className={cn("relative inline-flex h-1.5 w-1.5 rounded-full", map.dot)} />
      </span>
      {map.text}
    </Badge>
  );
}

/* ------------------------------------------------------------------ */
/* Avatar                                                              */
/* ------------------------------------------------------------------ */

export function Avatar({
  name,
  src,
  size = 40,
  status,
  ring,
  className,
}: {
  name?: string | null;
  src?: string | null;
  size?: number;
  status?: "online" | "offline" | "busy";
  ring?: boolean;
  className?: string;
}) {
  const letters = (name || "AA")
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div
      className={cn("relative inline-block shrink-0", className)}
      style={{ width: size, height: size }}
    >
      <div
        className={cn(
          "grid h-full w-full place-items-center overflow-hidden rounded-full bg-gradient-to-br from-primary to-leaf font-bold text-primary-foreground",
          ring && "ring-2 ring-gold/60 ring-offset-2 ring-offset-background",
        )}
        style={{ fontSize: Math.max(10, size * 0.36) }}
      >
        {src ? <img src={src} alt={name ?? ""} className="h-full w-full object-cover" /> : letters}
      </div>
      {status && (
        <span
          className={cn(
            "absolute bottom-0 right-0 block rounded-full border-2 border-background",
            status === "online" && "bg-success",
            status === "offline" && "bg-muted-foreground",
            status === "busy" && "bg-destructive",
          )}
          style={{ width: size * 0.28, height: size * 0.28 }}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Progress                                                            */
/* ------------------------------------------------------------------ */

export function LinearProgress({
  value,
  max = 100,
  tone = "primary",
  label,
  className,
}: {
  value: number;
  max?: number;
  tone?: "primary" | "gold" | "success" | "danger";
  label?: string;
  className?: string;
}) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const bar =
    tone === "gold"
      ? "bg-gradient-to-r from-gold to-[color-mix(in_oklab,var(--gold)_70%,white)]"
      : tone === "success"
        ? "bg-success"
        : tone === "danger"
          ? "bg-destructive"
          : "bg-gradient-to-r from-primary to-leaf";
  return (
    <div className={cn("w-full", className)}>
      {label && (
        <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
          <span>{label}</span>
          <span className="tabular-nums text-foreground">{Math.round(pct)}%</span>
        </div>
      )}
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-[width] duration-700 ease-out", bar)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function ProgressRing({
  value,
  max = 100,
  size = 88,
  stroke = 8,
  tone = "primary",
  children,
}: {
  value: number;
  max?: number;
  size?: number;
  stroke?: number;
  tone?: "primary" | "gold" | "success";
  children?: ReactNode;
}) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;
  const color =
    tone === "gold" ? "var(--gold)" : tone === "success" ? "var(--success)" : "var(--primary)";
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          className="fill-none stroke-muted"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          strokeLinecap="round"
          stroke={color}
          strokeDasharray={`${dash} ${c}`}
          className="fill-none transition-[stroke-dasharray] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-sm font-bold text-foreground">
        {children ?? `${Math.round(pct)}%`}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Spinner + Skeletons                                                 */
/* ------------------------------------------------------------------ */

export function Spinner({ size = 20, className }: { size?: number; className?: string }) {
  return <Loader2 size={size} className={cn("animate-spin text-primary", className)} />;
}

export function SkeletonList({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="glass-card flex items-center gap-3 rounded-2xl p-3">
          <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-3/5 animate-pulse rounded-full bg-muted" />
            <div className="h-2.5 w-2/5 animate-pulse rounded-full bg-muted/70" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonChart({ className }: { className?: string }) {
  return (
    <div className={cn("glass-card rounded-3xl p-5", className)}>
      <div className="mb-4 h-3 w-1/3 animate-pulse rounded-full bg-muted" />
      <div className="flex h-40 items-end gap-2">
        {[40, 60, 35, 78, 52, 90, 68].map((h, i) => (
          <div
            key={i}
            className="flex-1 animate-pulse rounded-t-xl bg-muted"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* PageHeader — used at top of every dashboard subroute                */
/* ------------------------------------------------------------------ */

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
      <div className="min-w-0">
        {eyebrow && (
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            {eyebrow}
          </div>
        )}
        <h1 className="mt-1 truncate text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Field wrapper — floating label input                                */
/* ------------------------------------------------------------------ */

export function Field({
  label,
  hint,
  error,
  leading,
  trailing,
  children,
  className,
}: {
  label?: string;
  hint?: string;
  error?: string | null;
  leading?: ReactNode;
  trailing?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      {label && (
        <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
      )}
      <span
        className={cn(
          "flex items-center gap-2 rounded-2xl border bg-surface px-3.5 shadow-[var(--shadow-soft)] transition-all focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/20",
          error ? "border-destructive/50" : "border-border",
        )}
      >
        {leading && <span className="text-muted-foreground">{leading}</span>}
        <span className="flex-1">{children}</span>
        {trailing && <span className="text-muted-foreground">{trailing}</span>}
      </span>
      {(hint || error) && (
        <span
          className={cn(
            "mt-1 block text-[11px]",
            error ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {error ?? hint}
        </span>
      )}
    </label>
  );
}

/** Bare input styled to sit inside <Field/>. */
export const TextInput = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function TextInput({ className, ...rest }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        "w-full border-0 bg-transparent py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/70",
        className,
      )}
      {...rest}
    />
  );
});

/* ------------------------------------------------------------------ */
/* Divider                                                             */
/* ------------------------------------------------------------------ */

export function Divider({ label, className }: { label?: string; className?: string }) {
  if (!label)
    return <div className={cn("h-px w-full bg-border/70", className)} />;
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="h-px flex-1 bg-border/70" />
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div className="h-px flex-1 bg-border/70" />
    </div>
  );
}
