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
  Bell,
  Sparkles,
  MapPin,
  Loader2,
  Calendar,
  BarChart3,
  ArrowDownToLine,
  UserRound,
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
import { formatINR } from "@/components/aawash/dashboard-kit";
import { greetingName, timeGreeting } from "@/lib/greeting";
import {
  Panel,
  PanelLink,
  GreetingHeader,
  WalletHeroCard,
  QuickActionGrid,
  QuickAction,
  MetricTile,
  Rail,
  Portrait,
  RankChip,
  Progress,
  WalletHeroSkeleton,
  MetricRowSkeleton,
  ChartSkeleton,
  ListRowSkeleton,
  CardGridSkeleton,
  ZeroState,
  ZeroChart,
  ZeroRanking,
  ZeroActivity,
} from "@/components/aawash/dashboard/PremiumKit";
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
  head: () => ({
    meta: [
      { title: "Team Leader Dashboard — Aawaash" },
      {
        name: "description",
        content:
          "Lead your Aawaash sales team: live team revenue, commissions, member leaderboard and project inventory in one command centre.",
      },
      { property: "og:title", content: "Team Leader Dashboard — Aawaash" },
      {
        property: "og:description",
        content: "Live team revenue, commissions, leaderboard and inventory for Aawaash team leaders.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function LeaderHome() {
  return (
    <RoleGuard allow={["team_leader", "super_admin"]}>
      <LeaderContent />
    </RoleGuard>
  );
}

function LeaderContent() {
  const { profile, loading } = useSession();
  const displayName = greetingName(profile?.full_name, loading || !profile);

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
  const months = trend.data?.months ?? [];
  const spark = months.map((m) => Number(m.revenue) || 0);

  return (
    <DashboardShell role="team_leader" profile={profile}>
      {/* ---------------- Greeting ---------------- */}
      <GreetingHeader
        eyebrow={
          <span className="inline-flex items-center gap-1.5">
            <Sparkles size={11} /> Team {o?.teamLetter ?? "—"}
          </span>
        }
        greeting={timeGreeting()}
        name={displayName}
        caption={`Here's how Team ${o?.teamLetter ?? "—"} is performing this month.`}
      />

      {/* ---------------- Wallet hero ---------------- */}
      <Rise delay={40}>
      <section className="mt-6">
        {overview.isLoading ? (
          <WalletHeroSkeleton />
        ) : (
        <WalletHeroCard
          label="Wallet balance"
          balance={formatINR(profile?.wallet_balance)}
          to="/leader/withdrawals"
          spark={spark.length > 1 ? spark : []}
          footLeft={`Lifetime ${formatINR(profile?.total_earnings ?? 0, { compact: true })}`}
          footRight={`+${formatINR(o?.monthlyCommission ?? 0, { compact: true })} this month`}
        />
        )}
      </section>
      </Rise>

      {/* ---------------- Quick actions ---------------- */}
      <Rise delay={100}>
      <section className="mt-4">
        <QuickActionGrid>
          <QuickAction icon={<Users size={18} />} label="Members" to="/leader/members" />
          <QuickAction icon={<Wallet size={18} />} label="Withdraw" to="/leader/withdrawals" accent="gold" />
          <QuickAction icon={<BarChart3 size={18} />} label="Analytics" to="/leader/analytics" accent="violet" />
          <QuickAction
            icon={<Bell size={18} />}
            label="Alerts"
            to="/leader/notifications"
            accent="sky"
            badge={unread > 0 ? unread : undefined}
          />
        </QuickActionGrid>
      </section>
      </Rise>

      {/* ---------------- Metrics ---------------- */}
      <Rise delay={160}>
      <section className="mt-4">
        {overview.isLoading ? (
          <MetricRowSkeleton />
        ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <MetricTile icon={<Users size={17} />} label="Members" value={o?.memberCount ?? 0} hint="Active on your team" />
        <MetricTile
          icon={<TrendingUp size={17} />}
          label="Team revenue"
          value={formatINR(o?.totalRevenue ?? 0, { compact: true })}
          hint={`${o?.salesCount ?? 0} sales`}
          accent="cyan"
        />
        <MetricTile
          icon={<IndianRupee size={17} />}
          label="Commission"
          value={formatINR(o?.totalCommission ?? 0, { compact: true })}
          hint={`Pending ${formatINR(o?.pendingCommission ?? 0, { compact: true })}`}
          accent="gold"
        />
        <MetricTile
          icon={<Building2 size={17} />}
          label="Projects"
          value={o?.projectCount ?? 0}
          hint="Available to sell"
          accent="violet"
        />
        </div>
        )}
      </section>
      </Rise>

      {/* ---------------- Trend + payouts ---------------- */}
      <Rise delay={220}>
      <section className="mt-5 grid gap-4 md:gap-5 lg:grid-cols-[1.65fr_1fr] xl:gap-6">
        <Panel
          title="Performance trend"
          subtitle="Team revenue and commission across the last 6 months."
          action={
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
              <Calendar size={10} /> 6M
            </span>
          }
        >
          <div className="h-56 w-full sm:h-64">
            {trend.isLoading ? (
              <ChartSkeleton className="h-full" />
            ) : months.length === 0 || months.every((m) => m.revenue === 0 && m.commission === 0) ? (
              <ZeroChart
                labels={months.length ? months.map((m) => m.label) : ["", "", "", "", "", ""]}
                caption="Baseline at ₹0 — your trend line starts with the first approved sale."
                className="h-full w-full text-primary"
              />

            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={months} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
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
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                    stroke="oklch(0.48 0.02 155)"
                    tickFormatter={(v) => (v >= 1e5 ? `${(v / 1e5).toFixed(0)}L` : String(v))}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "oklch(1 0 0)",
                      border: "1px solid oklch(0.93 0.008 150)",
                      borderRadius: 18,
                      fontSize: 12,
                      boxShadow: "var(--shadow-float)",
                    }}
                    formatter={(v: number, name: string) => [
                      formatINR(v, { compact: true }),
                      name === "revenue" ? "Revenue" : "Commission",
                    ]}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="oklch(0.42 0.09 155)" strokeWidth={2} fill="url(#grad-rev)" />
                  <Area type="monotone" dataKey="commission" stroke="oklch(0.78 0.12 85)" strokeWidth={2} fill="url(#grad-com)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Panel>

        <Panel title="Wallet & payouts" subtitle="Snapshot of your earnings.">
          <div className="grid grid-cols-2 gap-2.5 md:gap-3">
            <MiniKV label="Available" value={formatINR(profile?.wallet_balance)} />
            <MiniKV label="Pending" value={formatINR(o?.pendingCommission ?? 0, { compact: true })} />
            <MiniKV label="Approved" value={formatINR(o?.approvedWithdrawals ?? 0, { compact: true })} />
            <MiniKV label="Pending WD" value={formatINR(o?.pendingWithdrawals ?? 0, { compact: true })} />
            <MiniKV label="Lifetime" value={formatINR(profile?.total_earnings ?? 0, { compact: true })} />
            <MiniKV label="This month" value={formatINR(o?.monthlyCommission ?? 0, { compact: true })} />
          </div>
          <Link
            to="/leader/withdrawals"
            className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-primary to-leaf text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition-transform will-change-transform hover:-translate-y-0.5 active:scale-[0.98]"
          >
            <ArrowDownToLine size={15} /> Request withdrawal
          </Link>
        </Panel>
      </section>
      </Rise>

      {/* ---------------- Leaderboard + activity ---------------- */}
      <Rise delay={280}>
      <section className="mt-5 grid gap-4 md:gap-5 lg:grid-cols-2 xl:gap-6">
        <Panel
          title="Team leaderboard"
          subtitle="Top performers this cycle."
          action={<PanelLink to="/leader/leaderboard">View all</PanelLink>}
        >
          {board.isLoading ? (
            <ListRowSkeleton rows={4} />
          ) : topMembers.length === 0 ? (
            <ZeroRanking rows={4} caption="Ranking slots are live — they fill as members close sales." />

          ) : (
            <ol className="flex flex-col gap-2.5">
              {topMembers.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center gap-3 rounded-[22px] border border-border/60 bg-surface/70 p-3 transition-all hover:border-primary/25 hover:shadow-[var(--shadow-soft)]"
                >
                  <RankChip rank={m.rank} icon={<Trophy size={15} />} />
                  <Portrait name={m.full_name} src={m.avatar_url} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-foreground">{m.full_name}</div>
                    <div className="truncate text-[11px] font-light text-muted-foreground">{m.login_id}</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-sm font-semibold tracking-[-0.01em] text-foreground">
                      {formatINR(m.total_sales, { compact: true })}
                    </div>
                    <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                      Sales
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Panel>

        <Panel
          title="Recent team activity"
          subtitle="Newest sales and commissions."
          action={<PanelLink to="/leader/members">Team</PanelLink>}
        >
          {sales.isLoading || comms.isLoading ? (
            <ListRowSkeleton rows={4} />
          ) : recentSales.length === 0 && recentComms.length === 0 ? (
            <ZeroActivity rows={3} caption="Activity streams in live — currently ₹0 across the last 12 days." />

          ) : (
            <ul className="flex flex-col gap-2.5">
              {recentSales.map((s) => (
                <li
                  key={`s-${s.id}`}
                  className="flex items-center gap-3 rounded-[22px] border border-border/60 bg-surface/70 p-3"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                    <TrendingUp size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-foreground">Sale to {s.buyer_name}</div>
                    <div className="truncate text-[11px] font-light text-muted-foreground">
                      {new Date(s.sale_date).toLocaleDateString("en-IN")} · {s.unit_label || "Unit"}
                    </div>
                  </div>
                  <div className="shrink-0 text-sm font-semibold text-foreground">
                    {formatINR(s.deal_value, { compact: true })}
                  </div>
                </li>
              ))}
              {recentComms.map((c) => (
                <li
                  key={`c-${c.id}`}
                  className="flex items-center gap-3 rounded-[22px] border border-border/60 bg-surface/70 p-3"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gold/20 text-gold-foreground">
                    <IndianRupee size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-foreground">Commission · Tier {c.tier}</div>
                    <div className="text-[11px] font-light capitalize text-muted-foreground">{c.status}</div>
                  </div>
                  <div className="shrink-0 text-sm font-semibold text-foreground">
                    {formatINR(c.amount, { compact: true })}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </section>
      </Rise>

      {/* ---------------- Members ---------------- */}
      <Rise delay={340}>
      <section className="mt-5">
        <Panel
          title="Your members"
          subtitle="Tap a member to view their profile."
          action={<PanelLink to="/leader/members">View all</PanelLink>}
        >
          {members.isLoading ? (
            <CardGridSkeleton count={6} height="h-[68px]" className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3" />
          ) : memberList.length === 0 ? (
            <ZeroState
              icon={<Users size={26} />}
              title="No members yet"
              body="Ask your Super Admin to add members to your team — they'll show up here instantly."
              cta={{ label: "Team page", to: "/leader/members" }}
            />
          ) : (
            <div className="grid gap-2.5 sm:grid-cols-2 md:gap-3 lg:grid-cols-3">
              {memberList.slice(0, 6).map((m) => (
                <Link
                  key={m.id}
                  to="/leader/members/$id"
                  params={{ id: m.id }}
                  className="group glass-card flex items-center gap-3 rounded-[22px] p-3 shadow-[var(--shadow-soft)] transition-all duration-300 will-change-transform hover:-translate-y-1 hover:shadow-[var(--shadow-float)] active:scale-[0.98]"
                >
                  <Portrait name={m.full_name} online={m.status === "active"} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-foreground">{m.full_name}</div>
                    <div className="truncate text-[11px] font-light text-muted-foreground">{m.login_id}</div>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.12em] ${
                      m.status === "active" ? "bg-success/15 text-success" : "bg-destructive/10 text-destructive"
                    }`}
                  >
                    {m.status}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </Panel>
      </section>
      </Rise>

      {/* ---------------- Projects rail ---------------- */}
      <Rise delay={400}>
      <section className="mt-5">
        <Panel
          title="Projects quick access"
          subtitle="Live inventory across your regions."
          action={<PanelLink to="/leader/projects">All projects</PanelLink>}
        >
          {projects.isLoading ? (
            <CardGridSkeleton count={3} height="h-56" />
          ) : projectList.length === 0 ? (
            <ZeroState
              icon={<Building2 size={26} />}
              title="No projects yet"
              body="Once Admin publishes projects, live inventory will appear here for your team to sell."
              cta={{ label: "All projects", to: "/leader/projects" }}
              accent="sky"
            />
          ) : (
            <>
              <Rail className="md:hidden" aria-label="Project quick access">
                {projectList.map((p) => (
                  <div key={p.id} className="w-[78%] shrink-0 snap-start sm:w-[48%]">
                    <ProjectMiniCard project={p} />
                  </div>
                ))}
              </Rail>
              <div className="hidden gap-4 md:grid md:grid-cols-2 lg:grid-cols-3">
                {projectList.map((p) => (
                  <ProjectMiniCard key={p.id} project={p} />
                ))}
              </div>
            </>
          )}
        </Panel>
      </section>
      </Rise>

      {/* ---------------- Member spotlight CTA ---------------- */}
      <Rise delay={460}>
      <section className="mt-5">
        <Link
          to="/leader/analytics"
          className="glass-card flex items-center gap-3 rounded-[24px] p-4 shadow-[var(--shadow-soft)] transition-all will-change-transform hover:-translate-y-0.5 hover:shadow-[var(--shadow-float)] active:scale-[0.99]"
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-violet-100 text-violet-700">
            <UserRound size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-foreground">Deep-dive team analytics</div>
            <div className="text-[11px] font-light text-muted-foreground">
              Conversion, funnel and member-by-member performance.
            </div>
          </div>
          <BarChart3 size={16} className="shrink-0 text-muted-foreground" />
        </Link>
      </section>
      </Rise>

      {overview.isLoading && (
        <div role="status" className="glass-card fixed bottom-28 right-6 hidden items-center gap-2 rounded-full px-3 py-1.5 text-xs text-muted-foreground shadow-[var(--shadow-soft)] md:inline-flex">
          <Loader2 size={12} className="animate-spin" /> Refreshing
        </div>
      )}
    </DashboardShell>
  );
}

function MiniKV({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-border/60 bg-surface/70 p-3">
      <div className="text-[9.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      <div className="mt-1 truncate text-sm font-semibold tracking-[-0.01em] text-foreground sm:text-[15px]">
        {value}
      </div>
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
  const pct = project.total_units
    ? Math.min(100, Math.round((project.sold_units / project.total_units) * 100))
    : 0;
  return (
    <article className="glass-card h-full overflow-hidden rounded-[24px] shadow-[var(--shadow-soft)] transition-all duration-300 will-change-transform hover:-translate-y-1 hover:shadow-[var(--shadow-float)]">
      <div className={`relative aspect-[16/10] w-full bg-gradient-to-br ${project.hero_hue}`}>
        <div className="absolute inset-0 bg-gradient-to-t from-black/15 to-transparent" />
        {project.tag && (
          <span className="glass-card absolute left-3 top-3 rounded-full px-2.5 py-1 text-[9.5px] font-bold uppercase tracking-[0.14em] text-primary">
            {project.tag}
          </span>
        )}
      </div>
      <div className="p-4">
        <h3 className="truncate text-sm font-semibold tracking-[-0.01em] text-foreground">{project.name}</h3>
        <div className="mt-1 inline-flex items-center gap-1 text-[11px] font-light text-muted-foreground">
          <MapPin size={11} /> {project.location}
        </div>
        <div className="mt-3.5 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[9.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">From</div>
            <div className="truncate text-sm font-semibold text-foreground">
              {formatINR(project.price_from, { compact: true })}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-[9.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Sold</div>
            <div className="text-sm font-semibold text-foreground">
              {project.sold_units}/{project.total_units}
            </div>
          </div>
        </div>
        <Progress value={pct} className="mt-2.5" />
      </div>
    </article>
  );
}
