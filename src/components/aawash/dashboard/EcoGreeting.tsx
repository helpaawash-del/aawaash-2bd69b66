import { timeGreeting } from "@/lib/greeting";
import type { GreetingStyle } from "@/hooks/useWelcome";

/* ------------------------------------------------------------------ *
 * EcoGreeting — hero greeting for the Leader / Member dashboards.
 * Editorial lockup: a pill eyebrow (time of day) above a large
 * brand-serif name, with a hairline rule and the date on one baseline.
 * ------------------------------------------------------------------ */

function todayLabel() {
  try {
    return new Intl.DateTimeFormat(undefined, {
      weekday: "long",
      day: "numeric",
      month: "long",
    }).format(new Date());
  } catch {
    return "";
  }
}

export function EcoGreeting({ name, style }: { name: string; style: GreetingStyle }) {
  const eyebrow = style === "minimal" ? "Overview" : timeGreeting();

  return (
    <div className="min-w-0">
      <span className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-[10px] font-semibold uppercase leading-none tracking-[0.22em] text-primary">
        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-primary/70" />
        {eyebrow}
      </span>

      <h1 className="mt-3.5 font-brand text-[clamp(1.75rem,6vw,2.75rem)] font-normal italic leading-[1.08] tracking-[-0.018em] text-balance text-foreground">
        {style === "minimal" ? "Dashboard" : name}
      </h1>

      <div className="mt-3 flex items-center gap-3">
        <span
          aria-hidden
          className="h-px w-10 shrink-0 rounded-full bg-gradient-to-r from-primary/70 to-transparent"
        />
        <p className="truncate text-[11px] font-medium uppercase leading-[1.4] tracking-[0.16em] text-muted-foreground sm:text-[11.5px]">
          {todayLabel()}
        </p>
      </div>
    </div>
  );

}
