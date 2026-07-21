import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Trophy, Users, Wallet, TrendingUp, Loader2 } from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { RoleGuard } from "@/components/aawash/AuthGuard";
import { DashboardShell } from "@/components/aawash/DashboardShell";
import { listMyTeamMembers } from "@/lib/admin.functions";

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
  const fetchMembers = useServerFn(listMyTeamMembers);
  const { data: members, isLoading } = useQuery({
    queryKey: ["leader", "team-members"],
    queryFn: () => fetchMembers(),
  });

  const memberCount = members?.length ?? 0;
  const totalSales = (members ?? []).reduce((sum, m) => sum + Number(m.total_sales || 0), 0);

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

      <section className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MiniStat
          icon={<Users size={18} />}
          label="Members"
          value={isLoading ? "…" : String(memberCount)}
        />
        <MiniStat
          icon={<TrendingUp size={18} />}
          label="Team sales"
          value={isLoading ? "…" : `₹${totalSales.toLocaleString("en-IN")}`}
        />
        <MiniStat icon={<Wallet size={18} />} label="Wallet" value={`₹${Number(profile?.wallet_balance ?? 0).toLocaleString("en-IN")}`} />
        <MiniStat icon={<Trophy size={18} />} label="Rank" value="—" accent="gold" />
      </section>

      <section className="mt-8 rounded-4xl border border-border bg-surface p-6 shadow-[var(--shadow-soft)] sm:p-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground">Your team</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Members appear here automatically the moment Admin creates them.
            </p>
          </div>
          <span className="rounded-full bg-primary-soft px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary">
            {isLoading ? "…" : `${memberCount} member${memberCount === 1 ? "" : "s"}`}
          </span>
        </div>

        {isLoading ? (
          <div className="mt-6 grid place-items-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : memberCount === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-border bg-surface-warm px-4 py-10 text-center">
            <div className="text-sm font-semibold text-foreground">No members yet</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Ask your Super Admin to add members to your team.
            </p>
          </div>
        ) : (
          <ul className="mt-6 grid gap-2">
            {(members ?? []).map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between rounded-2xl border border-border bg-surface-warm px-4 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-leaf text-xs font-bold text-primary-foreground">
                    {(m.full_name || m.login_id).slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-foreground">
                      {m.full_name}
                    </div>
                    <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                      {m.login_id} · {m.display_code}
                    </div>
                  </div>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${
                    m.status === "active"
                      ? "bg-success/15 text-success"
                      : "bg-destructive/10 text-destructive"
                  }`}
                >
                  {m.status}
                </span>
              </li>
            ))}
          </ul>
        )}
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
