import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Building2, Users, Wallet, Coins, ShieldCheck, ArrowRight, BarChart3, Activity } from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { RoleGuard } from "@/components/aawash/AuthGuard";
import { DashboardShell } from "@/components/aawash/DashboardShell";
import { listAllUsers, listTeamsWithLeaders } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminHome,
  head: () => ({ meta: [{ title: "Admin — Aawash" }] }),
});

function AdminHome() {
  return (
    <RoleGuard allow={["super_admin"]}>
      <AdminContent />
    </RoleGuard>
  );
}

function AdminContent() {
  const { profile } = useSession();
  const listUsers = useServerFn(listAllUsers);
  const listTeams = useServerFn(listTeamsWithLeaders);
  const { data: users } = useQuery({
    queryKey: ["admin", "all-users"],
    queryFn: () => listUsers(),
  });
  const { data: teams } = useQuery({
    queryKey: ["admin", "teams-with-leaders"],
    queryFn: () => listTeams(),
  });

  const leaders = (users ?? []).filter((u) => u.role === "team_leader").length;
  const members = (users ?? []).filter((u) => u.role === "member").length;
  const teamsWithLeaders = (teams ?? []).filter((t) => t.leader).length;

  return (
    <DashboardShell role="super_admin" profile={profile}>
      <section>
        <div className="glass-card inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium text-foreground shadow-[var(--shadow-soft)]">
          <ShieldCheck size={14} className="text-gold" />
          Super Admin
        </div>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          Welcome back, {profile?.full_name?.split(" ")[0] || "Admin"}.
        </h1>
        <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
          Every team, project, sale and withdrawal across Aawash lives here.
        </p>
      </section>

      <section className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={<Users size={18} />} label="Team Leaders" value={String(leaders)} />
        <StatCard icon={<Users size={18} />} label="Members" value={String(members)} accent="gold" />
        <StatCard
          icon={<Building2 size={18} />}
          label="Teams assigned"
          value={`${teamsWithLeaders}/${teams?.length ?? 0}`}
        />
        <StatCard icon={<Wallet size={18} />} label="Pending payouts" value="—" />
      </section>

      <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          to="/admin/users"
          className="group flex items-center justify-between rounded-4xl border border-border bg-surface p-6 shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-float)]"
        >
          <div>
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-[var(--shadow-glow)]">
              <Users size={20} />
            </div>
            <h2 className="mt-4 text-lg font-bold text-foreground">Team Leaders & Members</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Create accounts, reset passwords, and manage status.
            </p>
          </div>
          <ArrowRight
            size={20}
            className="text-muted-foreground transition-transform group-hover:translate-x-1"
          />
        </Link>

        <Link
          to="/admin/commissions"
          className="group flex items-center justify-between rounded-4xl border border-border bg-surface p-6 shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-float)]"
        >
          <div>
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gold/15 text-gold-foreground">
              <Coins size={20} />
            </div>
            <h2 className="mt-4 text-lg font-bold text-foreground">Commission Engine</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Configure slabs, review transactions, audit the ledger.
            </p>
          </div>
          <ArrowRight
            size={20}
            className="text-muted-foreground transition-transform group-hover:translate-x-1"
          />
        </Link>

        <Link
          to="/admin/withdrawals"
          className="group flex items-center justify-between rounded-4xl border border-border bg-surface p-6 shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-float)]"
        >
          <div>
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-leaf/15 text-leaf">
              <Wallet size={20} />
            </div>
            <h2 className="mt-4 text-lg font-bold text-foreground">Withdrawals</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Approve, process and settle payout requests.
            </p>
          </div>
          <ArrowRight
            size={20}
            className="text-muted-foreground transition-transform group-hover:translate-x-1"
          />
        </Link>

        <Link
          to="/admin/analytics"
          className="group flex items-center justify-between rounded-4xl border border-border bg-surface p-6 shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-float)]"
        >
          <div>
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-[var(--shadow-glow)]">
              <BarChart3 size={20} />
            </div>
            <h2 className="mt-4 text-lg font-bold text-foreground">Analytics & BI</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              KPIs, trends, leaderboards and export-ready reports.
            </p>
          </div>
          <ArrowRight
            size={20}
            className="text-muted-foreground transition-transform group-hover:translate-x-1"
          />
        </Link>
      </section>
    </DashboardShell>
  );
}

function StatCard({
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
