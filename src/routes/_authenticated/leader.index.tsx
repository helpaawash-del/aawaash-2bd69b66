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
  Leaf,
  Droplet,
  Zap,
  Activity,
  BarChart3,
  ArrowDownToLine,
  MapPin,
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
import { formatINR } from "@/components/aawash/dashboard-kit";
import { greetingName, timeGreeting } from "@/lib/greeting";
import {
  EcoShell,
  ProgressRing,
  DarkPod,
  LightPod,
  AskBar,
  SectionHead,
  DarkPanel,
  LightPanel,
  Orb,
  TimelineRow,
  EcoProjectCard,
  EcoSkeleton,
  EcoRows,
  EcoZero,
  EcoZeroChart,
  Avatar,
} from "@/components/aawash/dashboard/EcoKit";
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

export const Route = createFileRoute("/_authenticated/leader/")({
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
  const recentSales = (sales.data ?? []).slice(0, 4);
  const recentComms = (comms.data ?? []).slice(0, 3);
  const projectList = (projects.data ?? []).slice(0, 3);
  const months = trend.data?.months ?? [];

  const target = Math.max(1, Number(o?.totalRevenue ?? 0) * 1.4 || 1);
  const progressPct = o?.totalRevenue ? Math.round((Number(o.totalRevenue) / target) * 100) : 0;
  const activePct = o?.memberCount
    ? Math.round((memberList.filter((m) => m.status === "active").length / o.memberCount) * 100)
    : 0;

  const zeroTrend = months.length === 0 || months.every((m) => m.revenue === 0 && m.commission === 0);

  return (
    <EcoShell role="team_leader" profile={profile}>
      {/* ---------------- Focus hero ---------------- */}
      <section className="grid grid-cols-[minmax(0,1fr)_92px] gap-3 sm:grid-cols-[minmax(0,1fr)_112px] lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-5">
        <div className="min-w-0">
          <p className="text-[12px] font-light text-muted-foreground">Today's Focus</p>
          <h1 className="mt-0.5 text-[26px] font-extrabold leading-[1.08] tracking-[-0.03em] text-foreground sm:text-[32px]">
            {timeGreeting()}, {displayName}.
            <span className="block text-primary">Lead Team {o?.teamLetter ?? "—"}.</span>
          </h1>

          <div className="mt-5 flex items-center gap-4">
            {overview.isLoading ? (
              <EcoSkeleton className="h-[132px] w-[132px] rounded-full" />
            ) : (
              <ProgressRing
                value={progressPct}
                label="Progress"
                caption={`${o?.salesCount ?? 0} sales closed`}
              />
            )}
            <div className="hidden min-w-0 flex-1 sm:block">
              <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Team revenue
              </div>
              <div className="truncate text-[24px] font-extrabold tracking-[-0.03em] text-foreground">
                {formatINR(o?.totalRevenue ?? 0, { compact: true })}
              </div>
              <div className="mt-1 text-[11.5px] font-light text-muted-foreground">
                Commission {formatINR(o?.totalCommission ?? 0, { compact: true })} · Pending{" "}
                {formatINR(o?.pendingCommission ?? 0, { compact: true })}
              </div>
            </div>
          </div>
        </div>

        <div className="grid content-start gap-3">
          <DarkPod
            icon={<Leaf size={17} />}
            label="Team health"
            value={`${activePct}%`}
            hint={activePct >= 70 ? "Excellent" : activePct > 0 ? "Building" : "—"}
            to="/leader/members"
          />
          <LightPod
            icon={<Droplet size={15} />}
            label="Wallet"
            value={formatINR(profile?.wallet_balance, { compact: true })}
            to="/leader/withdrawals"
          />
          <LightPod
            icon={<Zap size={15} />}
            label="This month"
            value={formatINR(o?.monthlyCommission ?? 0, { compact: true })}
            to="/leader/analytics"
          />
        </div>
      </section>

      {/* ---------------- Command bar ---------------- */}
      <section className="mt-5">
        <AskBar to="/leader/members" placeholder="Search members, sales or projects…" />
      </section>

      {/* ---------------- Quick pods ---------------- */}
      <section className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <LightPod icon={<Users size={15} />} label="Members" value={String(o?.memberCount ?? 0)} to="/leader/members" />
        <LightPod
          icon={<Wallet size={15} />}
          label="Withdraw"
          value={formatINR(o?.pendingWithdrawals ?? 0, { compact: true })}
          to="/leader/withdrawals"
        />
        <LightPod icon={<BarChart3 size={15} />} label="Analytics" value="Open" to="/leader/analytics" />
        <LightPod icon={<Bell size={15} />} label="Alerts" value={String(unread)} to="/leader/notifications" />
      </section>




      {/* ---------------- Overview + schedule ---------------- */}
      <section className="mt-5 grid gap-4 lg:grid-cols-[1.05fr_1fr]">
        <DarkPanel
          title="Team Overview"
          action={<Activity size={17} className="text-forest-foreground/70" />}
          stats={[
            { label: "Members", value: String(o?.memberCount ?? 0), hint: "Active" },
            { label: "Sales", value: String(o?.salesCount ?? 0), hint: "Closed" },
            {
              label: "Payouts",
              value: formatINR(o?.approvedWithdrawals ?? 0, { compact: true }),
              hint: "Approved",
            },
          ]}
        >
          <Orb intensity={Math.min(1, (o?.salesCount ?? 0) / 10)} />
        </DarkPanel>

        <LightPanel
          title="Recent Activity"
          action={
            <Link
              to="/leader/notifications"
              className="text-[12px] font-semibold text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Alerts{unread > 0 ? ` (${unread})` : ""}
            </Link>
          }
          footer={{ label: "View team", to: "/leader/members" }}
        >
          {sales.isLoading || comms.isLoading ? (
            <EcoRows rows={4} />
          ) : recentSales.length === 0 && recentComms.length === 0 ? (
            <EcoZero
              icon={<Activity size={22} />}
              title="Quiet for now"
              body="Team sales and commissions stream into this timeline the moment they're approved."
            />
          ) : (
            <ul className="flex flex-col gap-4">
              {recentSales.map((s) => (
                <TimelineRow
                  key={`s-${s.id}`}
                  icon={<TrendingUp size={15} />}
                  title={`Sale to ${s.buyer_name}`}
                  subtitle={`${new Date(s.sale_date).toLocaleDateString("en-IN")} · ${s.unit_label || "Unit"}`}
                  right={formatINR(s.deal_value, { compact: true })}
                />
              ))}
              {recentComms.map((c) => (
                <TimelineRow
                  key={`c-${c.id}`}
                  icon={<IndianRupee size={15} />}
                  tone="gold"
                  title={`Commission · Tier ${c.tier}`}
                  subtitle={c.status}
                  right={formatINR(c.amount, { compact: true })}
                />
              ))}
            </ul>
          )}
        </LightPanel>
      </section>

      {/* ---------------- Trend + wallet ---------------- */}
      <section className="mt-5 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <LightPanel title="Performance Trend" action={<span className="text-[11px] font-semibold text-primary">6M</span>}>
          <div className="h-56 w-full">
            {trend.isLoading ? (
              <EcoSkeleton className="h-full w-full" />
            ) : zeroTrend ? (
              <EcoZeroChart
                labels={months.length ? months.map((m) => m.label) : ["", "", "", "", "", ""]}
                caption="Baseline at ₹0 — your trend line starts with the first approved sale."
              />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={months} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="eco-rev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--forest)" stopOpacity={0.42} />
                      <stop offset="100%" stopColor="var(--forest)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="eco-com" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--leaf)" stopOpacity={0.42} />
                      <stop offset="100%" stopColor="var(--leaf)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                    stroke="var(--muted-foreground)"
                    tickFormatter={(v) => (v >= 1e5 ? `${(v / 1e5).toFixed(0)}L` : String(v))}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: 18,
                      fontSize: 12,
                      boxShadow: "var(--shadow-float)",
                    }}
                    formatter={(v: number, name: string) => [
                      formatINR(v, { compact: true }),
                      name === "revenue" ? "Revenue" : "Commission",
                    ]}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="var(--forest)" strokeWidth={2} fill="url(#eco-rev)" />
                  <Area type="monotone" dataKey="commission" stroke="var(--leaf)" strokeWidth={2} fill="url(#eco-com)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </LightPanel>

        <LightPanel title="Wallet & Payouts" footer={{ label: "Open wallet", to: "/leader/withdrawals" }}>
          <div className="grid grid-cols-2 gap-2.5">
            <KV label="Available" value={formatINR(profile?.wallet_balance)} />
            <KV label="Pending" value={formatINR(o?.pendingCommission ?? 0, { compact: true })} />
            <KV label="Approved" value={formatINR(o?.approvedWithdrawals ?? 0, { compact: true })} />
            <KV label="Pending WD" value={formatINR(o?.pendingWithdrawals ?? 0, { compact: true })} />
            <KV label="Lifetime" value={formatINR(profile?.total_earnings ?? 0, { compact: true })} />
            <KV label="This month" value={formatINR(o?.monthlyCommission ?? 0, { compact: true })} />
          </div>
          <Link
            to="/leader/withdrawals"
            className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-br from-forest to-forest-deep text-sm font-semibold text-forest-foreground shadow-[var(--shadow-glow)] transition-transform hover:-translate-y-0.5 active:scale-[0.98]"
          >
            <ArrowDownToLine size={15} /> Request withdrawal
          </Link>
        </LightPanel>
      </section>

      {/* ---------------- Leaderboard + members ---------------- */}
      <section className="mt-5 grid gap-4 lg:grid-cols-2">
        <LightPanel
          title="Team Leaderboard"
          action={
            <Link to="/leader/leaderboard" className="text-[12px] font-semibold text-primary">
              View all
            </Link>
          }
        >
          {board.isLoading ? (
            <EcoRows rows={4} />
          ) : topMembers.length === 0 ? (
            <EcoZero
              icon={<Trophy size={22} />}
              title="Ranking slots are live"
              body="They fill the moment your members close their first sale."
              cta={{ label: "Your members", to: "/leader/members" }}
            />
          ) : (
            <ol className="flex flex-col gap-3.5">
              {topMembers.map((m) => (
                <li key={m.id} className="flex items-center gap-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary-soft text-[12px] font-bold text-primary">
                    {m.rank}
                  </span>
                  <Avatar name={m.full_name} src={m.avatar_url} size={36} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13.5px] font-semibold text-foreground">{m.full_name}</div>
                    <div className="truncate text-[11px] font-light text-muted-foreground">{m.login_id}</div>
                  </div>
                  <div className="shrink-0 text-[13px] font-bold text-foreground">
                    {formatINR(m.total_sales, { compact: true })}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </LightPanel>

        <LightPanel
          title="Your Members"
          action={
            <Link to="/leader/members" className="text-[12px] font-semibold text-primary">
              View all
            </Link>
          }
        >
          {members.isLoading ? (
            <EcoRows rows={4} />
          ) : memberList.length === 0 ? (
            <EcoZero
              icon={<Users size={22} />}
              title="No members yet"
              body="Ask your Super Admin to add members to your team — they show up here instantly."
              cta={{ label: "Team page", to: "/leader/members" }}
            />
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {memberList.slice(0, 6).map((m) => (
                <li key={m.id}>
                  <Link
                    to="/leader/members/$id"
                    params={{ id: m.id }}
                    className="flex items-center gap-3 rounded-[22px] bg-surface-warm p-2.5 transition-transform hover:-translate-y-0.5 active:scale-[0.98]"
                  >
                    <Avatar name={m.full_name} size={34} online={m.status === "active"} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-semibold text-foreground">{m.full_name}</div>
                      <div className="truncate text-[10.5px] font-light text-muted-foreground">{m.login_id}</div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </LightPanel>
      </section>

      {/* ---------------- Footer CTA ---------------- */}
      <section className="mt-5">
        <Link
          to="/leader/analytics"
          className="flex items-center gap-3 rounded-[28px] bg-surface p-4 shadow-[var(--shadow-soft)] transition-transform hover:-translate-y-0.5 active:scale-[0.99]"
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-forest to-forest-deep text-forest-foreground">
            <BarChart3 size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[13.5px] font-bold text-foreground">Deep-dive team analytics</div>
            <div className="truncate text-[11px] font-light text-muted-foreground">
              Conversion, funnel and member-by-member performance.
            </div>
          </div>
          <MapPin size={16} className="shrink-0 text-muted-foreground" />
        </Link>
      </section>
    </EcoShell>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] bg-surface-warm p-3">
      <div className="text-[9.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      <div className="mt-1 truncate text-[14px] font-bold tracking-[-0.01em] text-foreground">{value}</div>
    </div>
  );
}
