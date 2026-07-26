import { Sparkles, X, Check } from "lucide-react";

import { timeGreeting } from "@/lib/greeting";
import type { GreetingStyle, WelcomeState } from "@/hooks/useWelcome";
import { DOCK_DURATION_MS, DOCK_EASE } from "@/components/aawash/dashboard/dock-motion";

/* ------------------------------------------------------------------ *
 * WelcomeBanner — one-time customization step for first-time users.
 * Explains the streamlined header (profile icon only) and lets the
 * member pick how the hero greeting should read. Never shown again
 * once completed.
 * ------------------------------------------------------------------ */

const OPTIONS: { key: GreetingStyle; label: string; hint: string }[] = [
  { key: "time", label: "Time of day", hint: "Good morning, Riya" },
  { key: "name", label: "Just my name", hint: "Riya" },
  { key: "minimal", label: "Minimal", hint: "Dashboard" },
];

export function WelcomeBanner({ name, welcome }: { name: string; welcome: WelcomeState }) {
  if (!welcome.show) return null;

  return (
    <section
      data-testid="welcome-banner"
      aria-label="Welcome customization"
      style={{ animationDuration: `${DOCK_DURATION_MS}ms`, animationTimingFunction: DOCK_EASE }}
      className="mt-4 animate-fade-in rounded-[28px] bg-gradient-to-br from-forest to-forest-deep p-4 text-forest-foreground shadow-[var(--shadow-glow)] motion-reduce:animate-none sm:p-5"
    >
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white/12">
          <Sparkles size={18} />
        </span>
        <div className="min-w-0">
          <h2 className="text-[15px] font-bold tracking-[-0.01em]">Welcome to Aawaash, {name}</h2>
          <p className="mt-1 text-[12px] font-light leading-relaxed text-forest-foreground/75">
            Your header now keeps only your profile icon so the workspace stays calm. Pick how your
            hero greeting should read — you can always change it from Settings.
          </p>
        </div>
        <button
          type="button"
          onClick={welcome.complete}
          aria-label="Dismiss welcome"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-forest-foreground/70 transition-transform hover:-translate-y-0.5 hover:text-forest-foreground active:scale-95"
        >
          <X size={16} />
        </button>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {OPTIONS.map((o) => {
          const active = welcome.style === o.key;
          return (
            <button
              key={o.key}
              type="button"
              onClick={() => welcome.setStyle(o.key)}
              aria-pressed={active}
              data-greeting-style={o.key}
              className={`flex items-center gap-2 rounded-[20px] px-3 py-2.5 text-left transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none ${
                active
                  ? "bg-surface text-foreground shadow-[var(--shadow-float)]"
                  : "bg-white/10 text-forest-foreground/85 hover:bg-white/16"
              }`}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12.5px] font-semibold">{o.label}</span>
                <span
                  className={`block truncate text-[10.5px] font-light ${active ? "text-muted-foreground" : "text-forest-foreground/60"}`}
                >
                  {o.hint}
                </span>
              </span>
              {active && <Check size={14} className="shrink-0 text-primary" />}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={welcome.complete}
        className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-full bg-surface text-[13px] font-semibold text-foreground transition-transform hover:-translate-y-0.5 active:scale-[0.98] sm:w-auto sm:px-6"
      >
        Looks good
      </button>
    </section>
  );
}

/** Hero greeting that respects the first-run customization choice. */
export function EcoGreeting({ name, style }: { name: string; style: GreetingStyle }) {
  if (style === "minimal") {
    return (
      <h1 className="font-brand text-[20px] font-semibold leading-[1.15] tracking-[-0.015em] text-foreground sm:text-[24px]">
        Dashboard
      </h1>
    );
  }
  return (
    <h1 className="font-brand text-[20px] font-semibold leading-[1.15] tracking-[-0.015em] text-foreground sm:text-[24px]">
      {style === "time" ? (
        <>
          {timeGreeting()}, <span className="text-primary">{name}</span>
        </>
      ) : (
        <span className="text-primary">{name}</span>
      )}
    </h1>
  );
}
