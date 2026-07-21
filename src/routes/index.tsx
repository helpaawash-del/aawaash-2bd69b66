import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  ArrowRight,
  Building2,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
  ShieldCheck,
} from "lucide-react";
import { AmbientBackground } from "@/components/aawash/AmbientBackground";
import { BrandMark } from "@/components/aawash/BrandMark";
import { useSession } from "@/hooks/useSession";
import { homePathForRole } from "@/lib/auth";

export const Route = createFileRoute("/")({
  component: Welcome,
});

function Welcome() {
  const navigate = useNavigate();
  const { loading, user, role } = useSession();

  // Signed-in users go straight to their role home.
  useEffect(() => {
    if (!loading && user) {
      navigate({ to: homePathForRole(role), replace: true });
    }
  }, [loading, user, role, navigate]);

  return (
    <div className="relative min-h-screen">
      <AmbientBackground />

      {/* Mobile-first shell — behaves like a native app on phones, expands elegantly on desktop */}
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-10 pt-6 sm:max-w-lg md:max-w-2xl md:px-8 lg:max-w-5xl lg:px-12">
        {/* Top bar */}
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
          <BrandMark size="md" />
          <div className="glass-card flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-medium text-muted-foreground shadow-[var(--shadow-soft)]">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-success animate-shimmer" />
            <span className="hidden sm:inline">Foundation ready</span>
            <span className="sm:hidden">Ready</span>
          </div>
        </header>

        {/* Hero */}
        <section className="mt-10 flex flex-col items-start lg:mt-16">
          <span className="glass-card inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium text-foreground shadow-[var(--shadow-soft)]">
            <Sparkles size={14} className="text-gold" />
            Premium real estate ecosystem
          </span>

          <h1 className="mt-6 text-balance text-4xl font-extrabold leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            A calmer way to sell{" "}
            <span className="bg-gradient-to-r from-primary via-leaf to-primary bg-clip-text text-transparent">
              luxury homes.
            </span>
          </h1>

          <p className="mt-5 max-w-xl text-balance text-base leading-relaxed text-muted-foreground sm:text-lg">
            Aawash gives real estate team leaders and members one elegant space to
            track projects, sales, commissions, referrals and withdrawals — designed
            to feel like a native app in your pocket.
          </p>

          <div className="mt-8 flex w-full flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              to="/"
              className="group inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[var(--shadow-float)] active:translate-y-0"
            >
              Enter dashboard
              <ArrowRight
                size={16}
                className="transition-transform duration-300 group-hover:translate-x-0.5"
              />
            </Link>
            <Link
              to="/"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-border bg-surface px-6 text-sm font-semibold text-foreground shadow-[var(--shadow-soft)] transition-all duration-300 hover:border-primary/30 hover:bg-primary-soft"
            >
              Explore projects
            </Link>
          </div>
        </section>

        {/* Preview stat cards — establish card design language for the whole platform */}
        <section className="mt-12 grid grid-cols-2 gap-3 sm:gap-4 lg:mt-16 lg:grid-cols-4">
          <StatCard
            icon={<Building2 size={18} />}
            label="Active projects"
            value="24"
            trend="+3 this month"
          />
          <StatCard
            icon={<TrendingUp size={18} />}
            label="Sales volume"
            value="$12.4M"
            trend="+18.2%"
            accent="gold"
          />
          <StatCard
            icon={<Users size={18} />}
            label="Team members"
            value="86"
            trend="+7 new"
          />
          <StatCard
            icon={<Wallet size={18} />}
            label="Commissions"
            value="$284K"
            trend="Ready to withdraw"
          />
        </section>

        {/* Foundation callout */}
        <section className="mt-12 lg:mt-16">
          <div className="relative overflow-hidden rounded-4xl border border-border bg-surface p-6 shadow-[var(--shadow-float)] sm:p-8 lg:p-10">
            <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
            <div className="absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-gold/10 blur-3xl" />

            <div className="relative grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
                  <ShieldCheck size={12} /> Part 1 complete
                </div>
                <h2 className="mt-4 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  Design foundation, established.
                </h2>
                <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
                  Typography, color, spacing, cards, buttons, and ambient motion are
                  now unified into a single Aawash design system. Every future page
                  — dashboards, projects, commissions, referrals, admin — will
                  inherit these rules automatically.
                </p>
              </div>

              <ul className="grid grid-cols-2 gap-3 text-sm">
                {[
                  "Forest & gold palette",
                  "Plus Jakarta Sans",
                  "Glass + soft shadows",
                  "Mobile-first shell",
                  "Ambient motion",
                  "Semantic tokens",
                ].map((item) => (
                  <li
                    key={item}
                    className="rounded-2xl border border-border bg-surface-warm px-3 py-2.5 text-xs font-medium text-foreground/80 sm:text-sm"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <footer className="mt-auto pt-12 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Aawash · Crafted with intention
        </footer>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  trend,
  accent = "primary",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  trend: string;
  accent?: "primary" | "gold";
}) {
  return (
    <div className="group relative overflow-hidden rounded-3xl border border-border bg-surface p-4 shadow-[var(--shadow-soft)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-float)] sm:p-5">
      <div className="flex items-center justify-between">
        <div
          className={`grid h-9 w-9 place-items-center rounded-xl ${
            accent === "gold"
              ? "bg-gold/15 text-gold-foreground"
              : "bg-primary-soft text-primary"
          }`}
        >
          {icon}
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Live
        </span>
      </div>
      <div className="mt-4 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        {value}
      </div>
      <div className="mt-1 text-[11px] font-medium text-muted-foreground sm:text-xs">
        {label}
      </div>
      <div className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-success">
        <TrendingUp size={12} />
        {trend}
      </div>
    </div>
  );
}
