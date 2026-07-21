import { createFileRoute } from "@tanstack/react-router";
import { Trophy, Users, Wallet, TrendingUp } from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { RoleGuard } from "@/components/aawash/AuthGuard";
import { DashboardShell } from "@/components/aawash/DashboardShell";

export const Route = createFileRoute("/_authenticated/leader")({
  component: LeaderHome,
  head: () => ({ meta: [{ title: "Team Leader — Aawash" }] }),
});

function LeaderHome() {
  return (
    <RoleGuard allow={["team_leader"]}>
      <LeaderContent />
    </RoleGuard>
  );
}

function LeaderContent() {
  const { profile } = useSession();
  return (
    <DashboardShell role="team_leader" profile={profile}>
      <section>
        <div className="glass-card inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium text-foreground shadow-[var(--shadow-soft)]">
          <Trophy size={14} className="text-gold" /> Team Leader
        </div>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          Hi {profile?.full_name?.split(" ")[0] || "Leader"}.
        </h1>
        <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
          Your team's performance, sales, and earnings all in one calm space.
        </p>
      </section>

      <section className="mt-10 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MiniStat icon={<TrendingUp size={18} />} label="This month" value="—" />
        <MiniStat icon={<Users size={18} />} label="Members" value="0" />
        <MiniStat icon={<Wallet size={18} />} label="Wallet" value="₹0" />
        <MiniStat icon={<Trophy size={18} />} label="Rank" value="—" accent="gold" />
      </section>

      <section className="mt-10 rounded-4xl border border-border bg-surface p-6 shadow-[var(--shadow-soft)] sm:p-8">
        <h2 className="text-lg font-bold text-foreground sm:text-xl">Your workspace, incoming</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Members, sales, referrals, leaderboards, withdrawals and commission
          breakdowns all arrive in the next parts.
        </p>
      </section>
    </DashboardShell>
  );
}

function MiniStat({
  icon,
  label,
  value,
  accent = "primary",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: "primary" | "gold";
}) {
  return (
    <div className="rounded-3xl border border-border bg-surface p-4 shadow-[var(--shadow-soft)] transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-float)] sm:p-5">
      <div
        className={`grid h-9 w-9 place-items-center rounded-xl ${accent === "gold" ? "bg-gold/15 text-gold-foreground" : "bg-primary-soft text-primary"}`}
      >
        {icon}
      </div>
      <div className="mt-4 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{value}</div>
      <div className="mt-1 text-[11px] font-medium text-muted-foreground">{label}</div>
    </div>
  );
}
