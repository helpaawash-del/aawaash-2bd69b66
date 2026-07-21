import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  Wallet,
  TrendingUp,
  Trophy,
  Building2,
  IndianRupee,
  ArrowUpRight,
  Bell,
  Sparkles,
  Activity,
  ChevronRight,
  MapPin,
  Loader2,
  Calendar,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

import { useSession } from "@/hooks/useSession";
import { RoleGuard } from "@/components/aawash/AuthGuard";
import { DashboardShell } from "@/components/aawash/DashboardShell";
import {
  SectionCard,
  StatCard,
  EmptyState,
  SkeletonBlock,
  formatINR,
  greeting,
  initials,
} from "@/components/aawash/dashboard-kit";
import {
  getLeaderOverview,
  getLeaderTrend,
  getTeamLeaderboard,
  listTeamSales,
  listTeamCommissions,
  listProjects,
  listMyNotifications,
} from "@/lib/leader.functions";
import { listMyTeamMembers } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/leader")({
  component: LeaderHome,
  head: () => ({ meta: [{ title: "Team Leader Dashboard — Aawash" }] }),
});

function LeaderHome() {
  return (
    <RoleGuard allow={["team_leader", "super_admin"]}>
      <LeaderContent />
    </RoleGuard>
  );
}

function LeaderContent() {
  const { profile } = useSession();

  const overviewFn = useServerFn(getLeaderOverview);
  const trendFn = useServerFn(getLeaderTrend);
  const membersFn = useServerFn(listMyTeamMembers);
  const boardFn = useServerFn(getTeamLeaderboard);
  const salesFn = useServerFn(listTeamSales);
  const commsFn = useServerFn(listTeamCommissions);
  const projectsFn = useServerFn(listProjects);
  const notifFn = useServerFn(listMyNotifications);

  const overview = useQuery({ queryKey: ["leader", "overview"], queryFn: () => overviewFn() });
  const trend = useQuery({ queryKey: ["leader", "trend"], queryFn: () => trendFn() });
  const members = useQuery({ queryKey: ["leader", "members"], queryFn: () => membersFn() });
  const board = useQuery({ queryKey: ["leader", "board"], queryFn: () => boardFn() });
  const sales = useQuery({ queryKey: ["leader", "sales"], queryFn: () => salesFn() });
  const comms = useQuery({ queryKey: ["leader", "commissions"], queryFn: () => commsFn() });
  const projects = useQuery({ queryKey: ["leader", "projects"], queryFn: () => projectsFn() });
  const notifs = useQuery({ queryKey: ["leader", "notifications"], queryFn: () => notifFn() });

  const o = overview.data;
  const unread = (notifs.data ?? []).filter((n) => !n.is_read).length;
  const memberList = members.data ?? [];
  const topMembers = (board.data ?? []).slice(0, 5);
  const recentSales = (sales.data ?? []).slice(0, 5);
  const recentComms = (comms.data ?? []).slice(0, 5);
  const projectList = (projects.data ?? []).slice(0, 3);

  return (
    <DashboardShell role="team_leader" profile={profile}>
      {/* Welcome hero */}
      <section className="glass-card relative overflow-hidden rounded-4xl p-5 shadow-[var(--shadow-float)] sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-primary/12 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-gold/15 blur-3xl" />
        <div className="relative grid gap-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
              <Sparkles size={12} /> Team {o?.teamLetter ?? "—"}
            </div>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              {greeting()},{" "}
              <span className="bg-gradient-to-br from-primary to-leaf bg-clip-text text-transparent">
                {profile?.full_name?.split(" ")[0] || "Leader"}.
              </span>
            </h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground sm:text-base">
              Here's how Team {o?.teamLetter ?? "—"} is performing this month.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <Link
                to="/leader/withdrawals"
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-br from-primary to-leaf px-4 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition-all hover:-translate-y-0.5"
              >
                <Wallet size={14} /> Withdraw
              </Link>
              <Link
                to="/leader/members"
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-2xl border border-border bg-surface px-4 text-sm font-semibold text-foreground shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5"
              >
                <Users size={14} /> Members
              </Link>
              <Link
                to="/leader/notifications"
                className="relative inline-flex h-10 items-center justify-center gap-1.5 rounded-2xl border border-border bg-surface px-4 text-sm font-semibold text-foreground shadow-[var(--shadow-soft)]"
              >
                <Bell size={14} /> Alerts
                {unread > 0 && (
                  <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">
                    {unread}
                  </span>
                )}
              </Link>
            </div>
          </div>
          <div className="flex sm:justify-end">
            <div className="glass-card w-full max-w-xs rounded-3xl p-4 shadow-[var(--shadow-soft)] sm:w-[240px]">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Wallet balance
              </div>
              <div className="mt-1 text-3xl font-extrabold tracking-tight text-foreground">
                {formatINR(profile?.wallet_balance)}
              </div>
              <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>This month</span>
                <span className="inline-flex items-center gap-1 font-semibold text-success">
                  <ArrowUpRight size={12} /> {formatINR(o?.monthlyCommission ?? 0, { compact: true })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={<Users size={18} />}
          label="Members"
          value={o?.memberCount ?? 0}
          hint="Active on your team"
        />
        <StatCard
          icon={<TrendingUp size={18} />}
          label="Team revenue"
          value={formatINR(o?.totalRevenue ?? 0, { compact: true })}
          hint={`${o?.salesCount ?? 0} sales`}
          accent="leaf"
        />
        <StatCard
          icon={<IndianRupee size={18} />}
          label="Total commission"
          value={formatINR(o?.totalCommission ?? 0, { compact: true })}
          hint={`Pending ${formatINR(o?.pendingCommission ?? 0, { compact: true })}`}
          accent="gold"
        />
        <StatCard
          icon={<Building2 size={18} />}
          label="Projects"
          value={o?.projectCount ?? 0}
          hint="Available to sell"
        />
      </section>

      {/* Analytics + Wallet detail */}
      <section className="mt-6 grid gap-5 lg:grid-cols-[2fr_1fr]">
        <SectionCard
          title="Performance trend"
          subtitle="Team revenue and commission across the last 6 months."
          action={
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
              <Calendar size={10} /> 6M
            </span>
          }
        >
          <div className="h-56 w-full sm:h-64">
            {trend.isLoading ? (
              <SkeletonBlock className="h-full" />
            ) : (trend.data?.months ?? []).every((m) => m.revenue === 0 && m.commission === 0) ? (
              <EmptyState
                icon={<TrendingUp size={22} />}
                title="No performance data yet"
                body="Once your team's first sales roll in, you'll see trends here."
              />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend.data?.months ?? []} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="grad-rev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.42 0.09 155)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="oklch(0.42 0.09 155)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="grad-com" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.78 0.12 85)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="oklch(0.78 0.12 85)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.93 0.008 150)" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} stroke="oklch(0.48 0.02 155)" />
                  <YAxis tickLine={false} axisLine={false} fontSize={11} stroke="oklch(0.48 0.02 155)" tickFormatter={(v) => (v >= 1e5 ? `${(v / 1e5).toFixed(0)}L` : String(v))} />
                  <Tooltip
                    contentStyle={{
                      background: "oklch(1 0 0)",
                      border: "1px solid oklch(0.93 0.008 150)",
                      borderRadius: 16,
                      fontSize: 12,
                    }}
                    formatter={(v: number, name: string) => [formatINR(v, { compact: true }), name === "revenue" ? "Revenue" : "Commission"]}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="oklch(0.42 0.09 155)" strokeWidth={2} fill="url(#grad-rev)" />
                  <Area type="monotone" dataKey="commission" stroke="oklch(0.78 0.12 85)" strokeWidth={2} fill="url(#grad-com)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </SectionCard>

        <SectionCard title="Wallet & payouts" subtitle="Snapshot of your earnings.">
          <div className="grid grid-cols-2 gap-3">
            <MiniKV label="Available" value={formatINR(profile?.wallet_balance)} />
            <MiniKV label="Pending" value={formatINR(o?.pendingCommission ?? 0, { compact: true })} />
            <MiniKV label="Approved" value={formatINR(o?.approvedWithdrawals ?? 0, { compact: true })} />
            <MiniKV label="Pending WD" value={formatINR(o?.pendingWithdrawals ?? 0, { compact: true })} />
            <MiniKV label="Lifetime" value={formatINR(profile?.total_earnings ?? 0, { compact: true })} />
            <MiniKV label="This month" value={formatINR(o?.monthlyCommission ?? 0, { compact: true })} />
          </div>
          <Link
            to="/leader/withdrawals"
            className="mt-4 inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-br from-primary to-leaf text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)]"
          >
            <Wallet size={14} /> Request withdrawal
          </Link>
        </SectionCard>
      </section>

      {/* Leaderboard + Recent activity */}
      <section className="mt-6 grid gap-5 lg:grid-cols-2">
        <SectionCard
          title="Team leaderboard"
          subtitle="Top performers this cycle."
          action={
            <Link to="/leader/leaderboard" className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
              View all <ChevronRight size={12} />
            </Link>
          }
        >
          {board.isLoading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonBlock key={i} className="h-14" />
              ))}
            </div>
          ) : topMembers.length === 0 ? (
            <EmptyState
              icon={<Trophy size={22} />}
              title="No rankings yet"
              body="Members appear here as soon as they close their first sale."
            />
          ) : (
            <ol className="flex flex-col gap-2">
              {topMembers.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center gap-3 rounded-2xl border border-border/50 bg-surface p-3"
                >
                  <RankBadge rank={m.rank} />
                  <Avatar name={m.full_name} src={m.avatar_url} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-foreground">{m.full_name}</div>
                    <div className="text-[11px] text-muted-foreground">{m.login_id}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-foreground">
                      {formatINR(m.total_sales, { compact: true })}
                    </div>
                    <div className="text-[10px] text-muted-foreground">Sales</div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </SectionCard>

        <SectionCard
          title="Recent team activity"
          subtitle="Newest sales and commissions."
          action={
            <Link to="/leader/members" className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
              Team <ChevronRight size={12} />
            </Link>
          }
        >
          {recentSales.length === 0 && recentComms.length === 0 ? (
            <EmptyState
              icon={<Activity size={22} />}
              title="Nothing here yet"
              body="Sales and commissions will show up here automatically."
            />
          ) : (
            <ul className="flex flex-col gap-2">
              {recentSales.map((s) => (
                <li
                  key={`s-${s.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-border/50 bg-surface p-3"
                >
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary-soft text-primary">
                    <TrendingUp size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-foreground">
                      Sale to {s.buyer_name}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {new Date(s.sale_date).toLocaleDateString("en-IN")} · {s.unit_label || "Unit"}
                    </div>
                  </div>
                  <div className="text-sm font-bold text-foreground">
                    {formatINR(s.deal_value, { compact: true })}
                  </div>
                </li>
              ))}
              {recentComms.map((c) => (
                <li
                  key={`c-${c.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-border/50 bg-surface p-3"
                >
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-gold/20 text-gold-foreground">
                    <IndianRupee size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-foreground">
                      Commission · Tier {c.tier}
                    </div>
                    <div className="text-[11px] text-muted-foreground capitalize">{c.status}</div>
                  </div>
                  <div className="text-sm font-bold text-foreground">
                    {formatINR(c.amount, { compact: true })}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </section>

      {/* Members preview */}
      <section className="mt-6">
        <SectionCard
          title="Your members"
          subtitle="Tap a member to view their profile."
          action={
            <Link to="/leader/members" className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
              View all <ChevronRight size={12} />
            </Link>
          }
        >
          {members.isLoading ? (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonBlock key={i} className="h-20" />
              ))}
            </div>
          ) : memberList.length === 0 ? (
            <EmptyState
              icon={<Users size={22} />}
              title="No members yet"
              body="Ask your Super Admin to add members to your team."
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {memberList.slice(0, 6).map((m) => (
                <Link
                  key={m.id}
                  to="/leader/members/$id"
                  params={{ id: m.id }}
                  className="glass-card flex items-center gap-3 rounded-2xl p-3 transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-float)]"
                >
                  <Avatar name={m.full_name} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-foreground">{m.full_name}</div>
                    <div className="text-[11px] text-muted-foreground">{m.login_id}</div>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                      m.status === "active" ? "bg-success/15 text-success" : "bg-destructive/10 text-destructive"
                    }`}
                  >
                    {m.status}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </SectionCard>
      </section>

      {/* Projects */}
      <section className="mt-6">
        <SectionCard
          title="Projects quick access"
          subtitle="Live inventory across your regions."
          action={
            <Link to="/leader/projects" className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
              All projects <ChevronRight size={12} />
            </Link>
          }
        >
          {projects.isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonBlock key={i} className="h-40" />
              ))}
            </div>
          ) : projectList.length === 0 ? (
            <EmptyState
              icon={<Building2 size={22} />}
              title="No projects yet"
              body="Once Admin publishes projects they will appear here."
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {projectList.map((p) => (
                <ProjectMiniCard key={p.id} project={p} />
              ))}
            </div>
          )}
        </SectionCard>
      </section>

      {overview.isLoading && (
        <div className="fixed bottom-24 right-6 hidden items-center gap-2 rounded-full bg-surface px-3 py-1.5 text-xs text-muted-foreground shadow md:inline-flex">
          <Loader2 size={12} className="animate-spin" /> Refreshing
        </div>
      )}
    </DashboardShell>
  );
}

function MiniKV({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/50 bg-surface p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-sm font-extrabold tracking-tight text-foreground sm:text-base">
        {value}
      </div>
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  const styles =
    rank === 1
      ? "bg-gradient-to-br from-gold to-primary-soft text-gold-foreground"
      : rank === 2
        ? "bg-gradient-to-br from-primary-soft to-leaf/40 text-primary"
        : rank === 3
          ? "bg-gradient-to-br from-leaf/30 to-primary-soft/40 text-primary"
          : "bg-muted text-muted-foreground";
  return (
    <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-xs font-bold ${styles}`}>
      {rank <= 3 ? <Trophy size={16} /> : rank}
    </div>
  );
}

function Avatar({ name, src }: { name?: string | null; src?: string | null }) {
  if (src) {
    return <img src={src} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />;
  }
  return (
    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-leaf text-xs font-bold text-primary-foreground">
      {initials(name)}
    </div>
  );
}

function ProjectMiniCard({
  project,
}: {
  project: {
    id: string;
    name: string;
    location: string;
    price_from: number;
    total_units: number;
    sold_units: number;
    hero_hue: string;
    tag: string | null;
  };
}) {
  const pct = project.total_units ? Math.min(100, Math.round((project.sold_units / project.total_units) * 100)) : 0;
  return (
    <article className="glass-card overflow-hidden rounded-3xl shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-float)]">
      <div className={`relative aspect-[16/9] w-full bg-gradient-to-br ${project.hero_hue}`}>
        {project.tag && (
          <span className="glass-card absolute left-3 top-3 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
            {project.tag}
          </span>
        )}
      </div>
      <div className="p-4">
        <h3 className="truncate text-sm font-bold text-foreground">{project.name}</h3>
        <div className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
          <MapPin size={11} /> {project.location}
        </div>
        <div className="mt-3 flex items-end justify-between">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">From</div>
            <div className="text-sm font-extrabold text-foreground">
              {formatINR(project.price_from, { compact: true })}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Sold</div>
            <div className="text-sm font-extrabold text-foreground">
              {project.sold_units}/{project.total_units}
            </div>
          </div>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-leaf transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </article>
  );
}
