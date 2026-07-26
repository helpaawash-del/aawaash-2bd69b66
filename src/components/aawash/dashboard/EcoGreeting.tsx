import { timeGreeting } from "@/lib/greeting";
import type { GreetingStyle } from "@/hooks/useWelcome";

/* ------------------------------------------------------------------ *
 * EcoGreeting — hero greeting for the Leader / Member dashboards.
 * Editorial two-line lockup: a small tracked eyebrow above a large
 * brand-serif headline.
 * ------------------------------------------------------------------ */

function todayLabel() {
  try {
    return new Intl.DateTimeFormat(undefined, {
      weekday: "long",
      day: "numeric",
      month: "short",
    }).format(new Date());
  } catch {
    return "";
  }
}

export function EcoGreeting({ name, style }: { name: string; style: GreetingStyle }) {
  const eyebrow = style === "minimal" ? "Overview" : timeGreeting();

  return (
    <div className="min-w-0">
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.28em] text-primary/80">
        {eyebrow}
      </p>
      <h1 className="mt-1.5 font-brand text-[26px] font-semibold leading-[1.08] tracking-[-0.025em] text-foreground sm:text-[32px]">
        {style === "minimal" ? (
          "Dashboard"
        ) : (
          <span className="bg-gradient-to-r from-foreground via-foreground to-primary bg-clip-text text-transparent">
            {name}
          </span>
        )}
      </h1>
      <p className="mt-2 text-[11.5px] font-light tracking-[0.01em] text-muted-foreground">
        {todayLabel()}
      </p>
      <span
        aria-hidden
        className="mt-3 block h-px w-16 rounded-full bg-gradient-to-r from-primary/60 to-transparent"
      />
    </div>
  );
}
