import { createContext, useContext, useMemo, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Bell, LogOut, Loader2, Mic, Settings, Sparkles, ChevronRight } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { itemsForRole } from "@/components/aawash/BottomNav";
import type { AawashProfile } from "@/hooks/useSession";
import type { AppRole } from "@/lib/auth";
import { homePathForRole } from "@/lib/auth";
import { useDock, type DockState } from "@/hooks/useDock";
import { useWelcome, type WelcomeState } from "@/hooks/useWelcome";
import { EcoGreeting } from "@/components/aawash/dashboard/EcoGreeting";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

/* ------------------------------------------------------------------ *
 * EcoKit — "Living Canopy" dashboard system
 * A soft-pearl canvas with a deep-forest wave rail, glass stat pods,
 * ring progress and dark data panels. Used by the Team Leader and
 * Team Member dashboards.
 * ------------------------------------------------------------------ */

export function initialsOf(name?: string | null, fallback = "AA") {
  const src = (name || fallback).trim();
  return (
    src
      .split(/\s+/)
      .map((s) => s[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || fallback
  );
}

/* ---------------------------- Shell ---------------------------- */

const WelcomeContext = createContext<WelcomeState | null>(null);

/** Greeting-style preference chosen in the first-run welcome banner. */
export function useEcoWelcome() {
  const ctx = useContext(WelcomeContext);
  return ctx;
}

export function EcoShell({
  role,
  profile,
  children,
}: {
  role: AppRole;
  profile: AawashProfile | null;
  children: React.ReactNode;
}) {
  const dock = useDock();
  const welcome = useWelcome();

  return (
    <WelcomeContext.Provider value={welcome}>
      <div className="relative min-h-screen overflow-x-clip bg-surface-warm">
        {/* ambient light */}
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
          <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute right-0 top-1/3 h-80 w-80 rounded-full bg-leaf/10 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-gold/10 blur-3xl" />
        </div>

        <WaveRail role={role} dock={dock} />

        <div
          style={{ paddingLeft: dock.width + 10 }}
          data-testid="dock-content"
          className="mx-auto flex min-h-screen w-full max-w-md flex-col pr-4 pb-[calc(9rem+env(safe-area-inset-bottom))] pt-5 transition-[padding-left] duration-[420ms] ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none sm:max-w-xl sm:pr-6 md:max-w-3xl lg:max-w-6xl lg:pb-24 lg:pr-10 xl:max-w-7xl xl:pr-14"
        >
          <WelcomeHeader role={role} profile={profile} />
          <main id="main-content" className="mt-9 flex-1 sm:mt-11">
            {children}
          </main>
        </div>
      </div>
    </WelcomeContext.Provider>
  );
}

/** Hero greeting wired to the first-run customization choice. */
export function EcoHeroGreeting({ name }: { name: string }) {
  const welcome = useEcoWelcome();
  return <EcoGreeting name={name} style={welcome?.style ?? "time"} />;
}

function firstName(full?: string | null) {
  return (full || "there").trim().split(/\s+/)[0] || "there";
}

function WelcomeHeader({ role, profile }: { role: AppRole; profile: AawashProfile | null }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [signingOut, setSigningOut] = useState(false);
  const base = homePathForRole(role);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await qc.cancelQueries();
      qc.clear();
      await supabase.auth.signOut();
    } finally {
      navigate({ to: "/auth", replace: true });
    }
  }

  return (
    <header className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
      <Link
        to={`${base}/profile` as never}
        className="flex min-w-0 items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Open your profile"
      >
        <Avatar name={profile?.full_name} src={profile?.avatar_url} size={44} />
      </Link>
      <span aria-hidden />

      <div className="flex shrink-0 items-center gap-2">
        <Link
          to={`${base}/notifications` as never}
          aria-label="Notifications"
          className="relative grid h-11 w-11 min-h-11 min-w-11 place-items-center rounded-full text-foreground transition-transform hover:-translate-y-0.5 active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Bell size={21} />
          <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-success ring-2 ring-surface-warm" />
        </Link>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              disabled={signingOut}
              aria-label="Sign out"
              className="grid h-11 w-11 min-h-11 min-w-11 place-items-center rounded-full text-muted-foreground transition-all hover:-translate-y-0.5 hover:text-destructive disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {signingOut ? <Loader2 size={19} className="animate-spin" /> : <LogOut size={19} />}
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent className="rounded-3xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Sign out of Aawaash?</AlertDialogTitle>
              <AlertDialogDescription>
                Your session will end and you'll be returned to the sign-in screen.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-2xl">Stay signed in</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleSignOut}
                className="rounded-2xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Sign out
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </header>
  );
}

/** Deep-forest wave rail — full dock with brand, labelled nav and footer. */
function WaveRail({ role, dock }: { role: AppRole; dock: DockState }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const items = itemsForRole(role);
  const base = homePathForRole(role);
  const { open, canExpand, expanded, toggle, section, setSection } = dock;

  const pathMatch = items.find(
    (item) =>
      pathname === item.to || (item.activePrefix ? pathname.startsWith(item.activePrefix) : false),
  );
  const activeKey =
    pathMatch?.key ?? (section && items.some((i) => i.key === section) ? section : null);

  return (
    <aside
      aria-label="Primary navigation"
      data-testid="dock"
      data-dock-open={open ? "true" : "false"}
      style={{ width: dock.width }}
      className="pointer-events-none fixed inset-y-0 left-0 z-40 block transition-[width] duration-[420ms] ease-[cubic-bezier(0.32,0.72,0,1)] will-change-[width] motion-reduce:transition-none"
    >
      <div className="pointer-events-auto relative h-full">
        <svg
          aria-hidden
          viewBox="0 0 112 800"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full text-forest drop-shadow-[8px_0_24px_rgba(16,50,36,0.28)]"
        >
          <path
            fill="currentColor"
            d="M0,0 H72 C104,110 60,190 92,300 C118,392 66,470 88,570 C106,660 64,720 78,800 H0 Z"
          />
        </svg>

        <div
          className={`relative flex h-full flex-col items-center gap-3 py-5 transition-[padding] duration-[420ms] ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none ${
            open ? "pr-7" : "pr-3"
          }`}
        >
          <nav className="flex w-full flex-1 flex-col items-center justify-center gap-1.5">
            {items.map((item) => {
              const Icon = item.icon;
              const active = activeKey === item.key;
              return (
                <Link
                  key={item.key}
                  to={item.to}
                  hash={item.hash}
                  preload="render"
                  title={item.description}
                  aria-label={item.label}
                  aria-current={active ? "page" : undefined}
                  data-dock-item={item.key}
                  data-active={active ? "true" : "false"}
                  onClick={() => setSection(item.key)}
                  className={`group flex flex-col items-center gap-1 overflow-hidden rounded-[18px] px-1 py-2.5 text-[10px] font-semibold transition-[background-color,color,width,box-shadow,transform] duration-[420ms] ease-[cubic-bezier(0.32,0.72,0,1)] outline-none focus-visible:ring-2 focus-visible:ring-forest-foreground/60 motion-reduce:transition-none ${
                    open ? "w-[84px] rounded-[22px] py-3" : "w-[46px]"
                  } ${
                    active
                      ? "bg-surface text-primary shadow-[var(--shadow-float)]"
                      : "text-forest-foreground/70 hover:bg-white/10 hover:text-forest-foreground"
                  }`}
                >
                  <Icon
                    size={19}
                    className="shrink-0 transition-transform duration-[420ms] ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:-translate-y-0.5 motion-reduce:transition-none"
                  />
                  <span
                    className={`w-full origin-top truncate text-center transition-all duration-[420ms] ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none ${
                      open ? "max-h-5 scale-100 opacity-100" : "max-h-0 scale-95 opacity-0"
                    }`}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>

          {canExpand && (
            <button
              type="button"
              onClick={toggle}
              data-testid="dock-toggle"
              aria-expanded={expanded}
              aria-label={expanded ? "Collapse navigation" : "Expand navigation"}
              title={expanded ? "Collapse navigation" : "Expand navigation"}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-forest-foreground/70 transition-all duration-[420ms] ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-white/10 hover:text-forest-foreground outline-none focus-visible:ring-2 focus-visible:ring-forest-foreground/70 motion-reduce:transition-none"
            >
              <ChevronRight
                size={19}
                className={`transition-transform duration-[420ms] ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none ${
                  open ? "rotate-180" : ""
                }`}
              />
            </button>
          )}

          <Link
            to={`${base}/profile` as never}
            aria-label="Account settings"
            title="Account settings"
            className={`grid shrink-0 place-items-center rounded-2xl text-forest-foreground/70 transition-all duration-[420ms] ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-white/10 hover:text-forest-foreground outline-none focus-visible:ring-2 focus-visible:ring-forest-foreground/70 motion-reduce:transition-none ${
              open ? "h-12 w-12" : "h-10 w-10"
            }`}
          >
            <Settings size={19} />
          </Link>
        </div>
      </div>
    </aside>
  );
}

/* ---------------------------- Atoms ---------------------------- */

export function Avatar({
  name,
  src,
  size = 40,
  online = false,
}: {
  name?: string | null;
  src?: string | null;
  size?: number;
  online?: boolean;
}) {
  return (
    <span className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
      {src ? (
        <img
          src={src}
          alt={name || "Avatar"}
          loading="lazy"
          className="h-full w-full rounded-full object-cover ring-2 ring-white"
          style={{ width: size, height: size }}
        />
      ) : (
        <span
          className="grid h-full w-full place-items-center rounded-full bg-gradient-to-br from-primary to-leaf font-bold text-primary-foreground ring-2 ring-white"
          style={{ fontSize: Math.max(11, size * 0.32) }}
        >
          {initialsOf(name)}
        </span>
      )}
      {online && (
        <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-success ring-2 ring-surface-warm" />
      )}
    </span>
  );
}

/** Circular progress dial with a soft emerald sweep. */
export function ProgressRing({
  value,
  label,
  caption,
  size = 132,
}: {
  value: number;
  label: string;
  caption?: string;
  size?: number;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  const r = size / 2 - 9;
  const c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;

  return (
    <div
      className="relative grid shrink-0 place-items-center rounded-full bg-surface shadow-[var(--shadow-float)]"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${label}: ${pct}%`}
    >
      <svg width={size} height={size} className="absolute inset-0 -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--muted)"
          strokeWidth={8}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--forest)"
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          className="transition-[stroke-dasharray] duration-1000 ease-out"
        />
      </svg>
      <div className="relative text-center">
        <div className="text-[10px] font-medium text-muted-foreground">{label}</div>
        <div className="text-[26px] font-extrabold leading-none tracking-[-0.03em] text-foreground">
          {pct}%
        </div>
        {caption && <div className="mt-1 text-[10px] font-semibold text-primary">{caption}</div>}
      </div>
    </div>
  );
}

/** Small dark pod (top-right in the reference). */
export function DarkPod({
  icon,
  label,
  value,
  hint,
  to,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  to?: string;
}) {
  const inner = (
    <>
      <span className="grid place-items-center text-forest-foreground/80">{icon}</span>
      <span className="mt-1.5 text-[10.5px] font-medium text-forest-foreground/70">{label}</span>
      <span className="text-[20px] font-extrabold leading-tight tracking-[-0.02em] text-forest-foreground">
        {value}
      </span>
      {hint && <span className="text-[10px] font-semibold text-leaf">{hint}</span>}
    </>
  );
  const cls =
    "flex min-h-[112px] flex-col items-center justify-center rounded-[26px] bg-gradient-to-b from-forest to-forest-deep px-3 py-3 text-center shadow-[var(--shadow-float)] transition-transform will-change-transform hover:-translate-y-1 active:scale-[0.98]";
  return to ? (
    <Link to={to as never} className={cls} aria-label={`${label}: ${value}`}>
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  );
}

/** Small white pod (right column in the reference). */
export function LightPod({
  icon,
  label,
  value,
  to,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  to?: string;
}) {
  const inner = (
    <>
      <span className="grid h-8 w-8 place-items-center rounded-full bg-primary-soft text-primary">
        {icon}
      </span>
      <span className="mt-1 text-[10.5px] font-medium text-muted-foreground">{label}</span>
      <span className="text-[17px] font-extrabold leading-tight tracking-[-0.02em] text-foreground">
        {value}
      </span>
    </>
  );
  const cls =
    "flex min-h-[96px] flex-col items-center justify-center rounded-[24px] bg-surface px-2.5 py-3 text-center shadow-[var(--shadow-soft)] transition-transform will-change-transform hover:-translate-y-1 active:scale-[0.98]";
  return to ? (
    <Link to={to as never} className={cls} aria-label={`${label}: ${value}`}>
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  );
}

/** Full-width pill that behaves as the dashboard command bar. */
export function AskBar({ to, placeholder }: { to: string; placeholder: string }) {
  return (
    <Link
      to={to as never}
      className="flex h-[62px] w-full items-center gap-3 rounded-full bg-surface pl-5 pr-2 shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-float)] active:scale-[0.99] outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Sparkles size={18} className="shrink-0 text-primary" />
      <span className="min-w-0 flex-1 truncate text-sm font-light text-muted-foreground">
        {placeholder}
      </span>
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-forest to-forest-deep text-forest-foreground shadow-[var(--shadow-glow)]">
        <Mic size={18} />
      </span>
    </Link>
  );
}

export function SectionHead({
  title,
  to,
  actionLabel = "View all",
}: {
  title: string;
  to?: string;
  actionLabel?: string;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="truncate text-[15px] font-bold tracking-[-0.01em] text-foreground">{title}</h2>
      {to && (
        <Link
          to={to as never}
          className="shrink-0 text-[12px] font-semibold text-primary transition-colors hover:text-leaf outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full px-1"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}

/** Dark data panel with an orb visual and a stat trio. */
export function DarkPanel({
  title,
  action,
  children,
  stats,
}: {
  title: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
  stats?: { label: string; value: string; hint?: string }[];
}) {
  return (
    <section className="relative overflow-hidden rounded-[34px] bg-gradient-to-b from-forest to-forest-deep p-5 shadow-[var(--shadow-glow)]">
      <div className="flex items-center justify-between gap-3">
        <h2 className="truncate text-[15px] font-bold text-forest-foreground">{title}</h2>
        {action}
      </div>
      {children}
      {stats && (
        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/10 pt-4">
          {stats.map((s) => (
            <div key={s.label} className="min-w-0 text-center">
              <div className="truncate text-[19px] font-extrabold tracking-[-0.02em] text-forest-foreground">
                {s.value}
              </div>
              <div className="truncate text-[10px] font-medium text-forest-foreground/60">
                {s.label}
              </div>
              {s.hint && (
                <div className="truncate text-[10px] font-semibold text-leaf">{s.hint}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/** Animated constellation orb used inside DarkPanel. */
export function Orb({ intensity = 0.6 }: { intensity?: number }) {
  const dots = useMemo(() => {
    const out: { x: number; y: number; r: number; o: number }[] = [];
    for (let i = 0; i < 90; i++) {
      const a = (i / 90) * Math.PI * 2 * 5;
      const rad = 6 + (i / 90) * 74;
      out.push({
        x: 90 + Math.cos(a) * rad,
        y: 90 + Math.sin(a) * rad * 0.94,
        r: 0.8 + ((i * 7) % 5) * 0.32,
        o: 0.25 + ((i * 13) % 10) / 14,
      });
    }
    return out;
  }, []);

  return (
    <div className="relative mx-auto my-3 aspect-square w-[min(220px,72%)]">
      <div
        className="absolute inset-0 rounded-full bg-leaf/25 blur-2xl"
        style={{ opacity: 0.35 + intensity * 0.4 }}
      />
      <svg
        viewBox="0 0 180 180"
        className="relative h-full w-full motion-safe:animate-[aawash-float_9s_ease-in-out_infinite]"
      >
        <circle cx="90" cy="90" r="84" fill="none" stroke="oklch(1 0 0 / 0.08)" />
        <circle cx="90" cy="90" r="62" fill="none" stroke="oklch(1 0 0 / 0.06)" />
        <ellipse cx="90" cy="90" rx="84" ry="34" fill="none" stroke="oklch(1 0 0 / 0.07)" />
        <ellipse cx="90" cy="90" rx="34" ry="84" fill="none" stroke="oklch(1 0 0 / 0.07)" />
        {dots.map((d, i) => (
          <circle key={i} cx={d.x} cy={d.y} r={d.r} fill="var(--leaf)" opacity={d.o} />
        ))}
      </svg>
    </div>
  );
}

/** White card with title + rows, matching the "Upcoming Schedule" block. */
export function LightPanel({
  title,
  action,
  footer,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  footer?: { label: string; to: string };
  children: React.ReactNode;
}) {
  return (
    <section className="flex h-full flex-col rounded-[34px] bg-surface p-5 shadow-[var(--shadow-soft)]">
      <div className="flex items-center justify-between gap-3">
        <h2 className="truncate text-[15px] font-bold tracking-[-0.01em] text-foreground">
          {title}
        </h2>
        {action}
      </div>
      <div className="mt-4 flex-1">{children}</div>
      {footer && (
        <Link
          to={footer.to as never}
          className="mt-4 flex items-center justify-between gap-2 border-t border-border/70 pt-4 text-[13px] font-semibold text-foreground transition-colors hover:text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-b-2xl"
        >
          {footer.label} <ChevronRight size={16} />
        </Link>
      )}
    </section>
  );
}

/** Timeline row (schedule / activity). */
export function TimelineRow({
  icon,
  title,
  subtitle,
  right,
  tone = "primary",
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  tone?: "primary" | "gold" | "danger" | "muted";
}) {
  const tones: Record<string, string> = {
    primary: "bg-forest text-forest-foreground",
    gold: "bg-gold text-gold-foreground",
    danger: "bg-destructive text-destructive-foreground",
    muted: "bg-muted text-muted-foreground",
  };
  return (
    <li className="flex items-center gap-3">
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${tones[tone]}`}>
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13.5px] font-semibold text-foreground">{title}</div>
        {subtitle && (
          <div className="truncate text-[11px] font-light text-muted-foreground">{subtitle}</div>
        )}
      </div>
      {right && (
        <div className="shrink-0 text-[12px] font-semibold text-muted-foreground">{right}</div>
      )}
    </li>
  );
}

/** Compact project card with photo band + progress. */
export function EcoProjectCard({
  to,
  name,
  meta,
  pct,
  hue,
  image,
}: {
  to: string;
  name: string;
  meta: string;
  pct: number;
  hue?: string;
  image?: string | null;
}) {
  return (
    <Link
      to={to as never}
      className="group relative flex h-[188px] w-full flex-col justify-end overflow-hidden rounded-[26px] p-3.5 shadow-[var(--shadow-soft)] transition-transform will-change-transform hover:-translate-y-1 active:scale-[0.98] outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {image ? (
        <img
          src={image}
          alt=""
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background:
              hue && (hue.startsWith("#") || hue.startsWith("oklch") || hue.startsWith("rgb"))
                ? `linear-gradient(140deg, ${hue}, color-mix(in oklab, ${hue} 45%, black))`
                : `linear-gradient(140deg, color-mix(in oklab, var(--leaf) ${58 + (name.length % 5) * 8}%, var(--forest)), var(--forest-deep))`,
          }}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-forest-deep/90 via-forest-deep/35 to-transparent" />
      <div className="relative">
        <div className="truncate text-[13.5px] font-bold text-forest-foreground">{name}</div>
        <div className="truncate text-[11px] font-light text-forest-foreground/75">{meta}</div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/25">
          <span
            className="block h-full rounded-full bg-leaf transition-[width] duration-700"
            style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
          />
        </div>
      </div>
    </Link>
  );
}

/* --------------------------- Skeletons -------------------------- */

export function EcoSkeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-[24px] bg-muted ${className}`} />;
}

export function EcoRows({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: rows }).map((_, i) => (
        <EcoSkeleton key={i} className="h-12 rounded-2xl" />
      ))}
    </div>
  );
}

/** Calm zero-state used when a stream has no rows yet. */
export function EcoZero({
  icon,
  title,
  body,
  cta,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  cta?: { label: string; to: string };
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[26px] border border-dashed border-border bg-surface-warm/70 px-5 py-8 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary-soft text-primary">
        {icon}
      </span>
      <div className="mt-3 text-[13.5px] font-bold text-foreground">{title}</div>
      <p className="mt-1 max-w-[34ch] text-[11.5px] font-light text-muted-foreground">{body}</p>
      {cta && (
        <Link
          to={cta.to as never}
          className="mt-3 inline-flex h-10 items-center rounded-full bg-forest px-4 text-[12px] font-semibold text-forest-foreground transition-transform hover:-translate-y-0.5 active:scale-95"
        >
          {cta.label}
        </Link>
      )}
    </div>
  );
}

/** Zero-value line chart so empty panels still read as data. */
export function EcoZeroChart({ labels, caption }: { labels: string[]; caption: string }) {
  return (
    <div className="flex h-full w-full flex-col">
      <svg viewBox="0 0 300 110" preserveAspectRatio="none" className="h-full w-full text-primary">
        {[0, 1, 2, 3].map((i) => (
          <line
            key={i}
            x1="0"
            x2="300"
            y1={12 + i * 28}
            y2={12 + i * 28}
            stroke="var(--border)"
            strokeDasharray="4 5"
          />
        ))}
        <line
          x1="0"
          x2="300"
          y1="96"
          y2="96"
          stroke="currentColor"
          strokeWidth="2"
          opacity="0.55"
        />
        {labels.map((_, i) => (
          <circle
            key={i}
            cx={(i / Math.max(1, labels.length - 1)) * 296 + 2}
            cy="96"
            r="3"
            fill="currentColor"
          />
        ))}
      </svg>
      <div className="mt-1 flex justify-between text-[9.5px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {labels.map((l, i) => (
          <span key={i}>{l}</span>
        ))}
      </div>
      <p className="mt-2 text-[11px] font-light text-muted-foreground">{caption}</p>
    </div>
  );
}
