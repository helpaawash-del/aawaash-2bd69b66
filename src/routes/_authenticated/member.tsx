import { createFileRoute } from "@tanstack/react-router";
import { Sparkles, TrendingUp, Users, Wallet } from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { RoleGuard } from "@/components/aawash/AuthGuard";
import { DashboardShell } from "@/components/aawash/DashboardShell";

export const Route = createFileRoute("/_authenticated/member")({
  component: MemberHome,
  head: () => ({ meta: [{ title: "Member — Aawash" }] }),
});

function MemberHome() {
  return (
    <RoleGuard allow={["member"]}>
      <MemberContent />
    </RoleGuard>
  );
}

function MemberContent() {
  const { profile } = useSession();
  return (
    <DashboardShell role="member" profile={profile}>
      <section>
        <div className="glass-card inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium text-foreground shadow-[var(--shadow-soft)]">
          <Sparkles size={14} className="text-gold" /> Member
        </div>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          Hello {profile?.full_name?.split(" ")[0] || "there"}.
        </h1>
        <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
          Track your sales, referrals, wallet, and earnings — all beautifully
          organised.
        </p>
      </section>

      <section className="mt-10 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MiniStat icon={<TrendingUp size={18} />} label="Sales" value="0" />
        <MiniStat icon={<Users size={18} />} label="Referrals" value="0" />
        <MiniStat icon={<Wallet size={18} />} label="Wallet" value="₹0" accent="gold" />
        <MiniStat icon={<Sparkles size={18} />} label="Streak" value="—" />
      </section>

      <section className="mt-10 rounded-4xl border border-border bg-surface p-6 shadow-[var(--shadow-soft)] sm:p-8">
        <h2 className="text-lg font-bold text-foreground sm:text-xl">More arriving soon</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Referral submissions, leaderboards, withdrawals and detailed earnings
          land in the next parts of the build.
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
