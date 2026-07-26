import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  Sparkles,
  TrendingUp,
  Wallet,
  IndianRupee,
  UserPlus,
  Trophy,
  Bell,
  Activity,
  Users,
  Building2,
  Handshake,
  Phone,
  Calendar,
  ChevronRight,
  BarChart3,
  Award,
} from "lucide-react";
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
  Portrait,
  RankChip,
  AchievementCard,
  WalletHeroSkeleton,
  MetricRowSkeleton,
  ListRowSkeleton,
  ZeroState,
} from "@/components/aawash/dashboard/PremiumKit";
import {
  getMemberOverview,
  getMyActivity,
  getMyTeamLeaderboard,
} from "@/lib/member.functions";
import { listMyNotifications } from "@/lib/leader.functions";

export const Route = createFileRoute("/_authenticated/member/")({
  component: MemberHome,
  head: () => ({
    meta: [
      { title: "Member Dashboard — Aawaash" },
      {
        name: "description",
        content:
          "Track your Aawaash sales, commissions, referrals, wallet balance and team rank from one calm, app-like dashboard.",
      },
      { property: "og:title", content: "Member Dashboard — Aawaash" },
      {
        property: "og:description",
        content: "Your sales, commissions, referrals, wallet and team rank in one place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function MemberHome() {
  return (
    <RoleGuard allow={["member", "team_leader", "super_admin"]}>
      <MemberContent />
    </RoleGuard>
  );
}

function MemberContent() {
  const { profile, loading } = useSession();
  const displayName = greetingName(profile?.full_name, loading || !profile);

  const overviewFn = useServerFn(getMemberOverview);
  const activityFn = useServerFn(getMyActivity);
  const boardFn = useServerFn(getMyTeamLeaderboard);
  const notifFn = useServerFn(listMyNotifications);

  const overview = useQuery({ queryKey: ["member", "overview"], queryFn: () => overviewFn() });
  const activity = useQuery({ queryKey: ["member", "activity"], queryFn: () => activityFn() });
  const board = useQuery({ queryKey: ["member", "board"], queryFn: () => boardFn() });
  const notifs = useQuery({ queryKey: ["member", "notifications"], queryFn: () => notifFn() });

  const o = overview.data;
  const stats = o?.stats;
  const team = o?.team as
    | { name?: string; letter?: string; leader?: { full_name?: string; mobile_number?: string } }
    | null
    | undefined;

  const unread = (notifs.data ?? []).filter((n) => !n.is_read).length;
  const myId = board.data?.meId;
  const rank = board.data?.members.find((m) => m.id === myId)?.rank ?? null;
  const myScore = board.data?.members.find((m) => m.id === myId)?.score ?? 0;
  const topBoard = (board.data?.members ?? []).slice(0, 5);
  const recent = (activity.data ?? []).slice(0, 6);

  return (
    <DashboardShell role="member" profile={profile}>
      {/* ---------------- Greeting ---------------- */}
      <GreetingHeader
        eyebrow={
          <span className="inline-flex items-center gap-1.5">
            <Sparkles size={11} /> Team {team?.letter ?? "—"}
          </span>
        }
        greeting={timeGreeting()}
        name={displayName}
        caption="A calm space to track every sale, referral, and rupee earned."
        right={
          <div className="glass-card flex items-center gap-3 rounded-[22px] p-3 shadow-[var(--shadow-soft)]">
            <Portrait name={profile?.full_name} src={profile?.avatar_url} size={44} online />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-foreground">
                {profile?.full_name || "—"}
              </div>
              <div className="truncate font-mono text-[10px] text-muted-foreground">
                {profile?.login_id}
              </div>
            </div>
            <span className="ml-1 shrink-0 rounded-full bg-gold/20 px-2.5 py-1 text-[9.5px] font-bold uppercase tracking-[0.14em] text-gold-foreground">
              Rank {rank ?? "—"}
            </span>
          </div>
        }
      />

      {/* ---------------- Wallet hero ---------------- */}
      <section className="mt-6">
        {overview.isLoading ? (
          <WalletHeroSkeleton />
        ) : (
        <WalletHeroCard
          label="Available balance"
          balance={formatINR(profile?.wallet_balance)}
          to="/member/wallet"
          footLeft={`Pending ${formatINR(stats?.pendingCommission ?? 0, { compact: true })}`}
          footRight={`+${formatINR(stats?.monthCommission ?? 0, { compact: true })} this month`}
        />
        )}
      </section>

      {/* ---------------- Quick actions ---------------- */}
      <section className="mt-4">
        <QuickActionGrid>
          <QuickAction icon={<UserPlus size={18} />} label="Referral" to="/member/referrals" />
          <QuickAction icon={<Handshake size={18} />} label="Tip lead" to="/member/tips" accent="cyan" />
          <QuickAction icon={<Wallet size={18} />} label="Withdraw" to="/member/withdrawals" accent="gold" />
          <QuickAction
            icon={<Bell size={18} />}
            label="Alerts"
            to="/member/notifications"
            accent="sky"
            badge={unread > 0 ? unread : undefined}
          />
        </QuickActionGrid>
      </section>

      {/* ---------------- Today ---------------- */}
      <section className="mt-4">
        {overview.isLoading ? (
          <MetricRowSkeleton />
        ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <MetricTile
          icon={<TrendingUp size={17} />}
          label="Today's sales"
          value={formatINR(stats?.todaySalesValue ?? 0, { compact: true })}
          hint={`${stats?.todaySalesCount ?? 0} deals`}
        />
        <MetricTile
          icon={<IndianRupee size={17} />}
          label="Today's comm."
          value={formatINR(stats?.todayCommission ?? 0, { compact: true })}
          accent="gold"
        />
        <MetricTile
          icon={<Wallet size={17} />}
          label="Wallet"
          value={formatINR(profile?.wallet_balance)}
          accent="cyan"
        />
        <MetricTile
          icon={<Trophy size={17} />}
          label="Rank"
          value={rank ? `#${rank}` : "—"}
          hint={team?.name || "—"}
          accent="violet"
        />
        </div>
        )}
      </section>

      {/* ---------------- Lifetime ---------------- */}
      <section className="mt-3">
        {overview.isLoading ? (
          <MetricRowSkeleton />
        ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <MetricTile
          icon={<TrendingUp size={17} />}
          label="Total sales"
          value={formatINR(stats?.totalSales ?? 0, { compact: true })}
          hint={`${stats?.salesCount ?? 0} deals`}
        />
        <MetricTile
          icon={<Calendar size={17} />}
          label="This month"
          value={formatINR(stats?.monthSalesValue ?? 0, { compact: true })}
          hint={`${stats?.monthSalesCount ?? 0} deals`}
          accent="sky"
        />
        <MetricTile
          icon={<IndianRupee size={17} />}
          label="Commission"
          value={formatINR(stats?.totalCommission ?? 0, { compact: true })}
          hint={`Pending ${formatINR(stats?.pendingCommission ?? 0, { compact: true })}`}
          accent="gold"
        />
        <MetricTile
          icon={<UserPlus size={17} />}
          label="Referrals & tips"
          value={String((stats?.referralCount ?? 0) + (stats?.tipCount ?? 0))}
          hint={`${stats?.referralCount ?? 0} referrals · ${stats?.tipCount ?? 0} tips`}
          accent="orange"
        />
        </div>
        )}
      </section>

      {/* ---------------- Achievement ---------------- */}
      <section className="mt-5">
        <AchievementCard
          icon={<Award size={26} />}
          title={rank ? `Rank #${rank} in ${team?.name || "your team"}` : "Your journey begins"}
          subtitle="Close sales, add referrals and tip leads to climb the ladder."
          level={rank === 1 ? "Champion" : rank && rank <= 3 ? "Elite" : "Riser"}
          xp={Math.round(Number(myScore) || 0)}
          xpGoal={Math.max(100, Math.round((Number(myScore) || 0) * 1.6) || 100)}
          chips={[
            `${stats?.salesCount ?? 0} deals closed`,
            `${stats?.referralCount ?? 0} referrals`,
            `${stats?.tipCount ?? 0} tips`,
          ]}
        />
      </section>

      {/* ---------------- Team + wallet detail ---------------- */}
      <section className="mt-5 grid gap-4 md:gap-5 lg:grid-cols-2 xl:gap-6">
        <Panel
          title="My team"
          subtitle="Your workspace at Aawaash."
          action={<PanelLink to="/member/leaderboard">Leaderboard</PanelLink>}
        >
          {overview.isLoading ? (
            <ListRowSkeleton rows={3} height="h-14" />
          ) : !team ? (
            <ZeroState
              icon={<Users size={26} />}
              title="No team yet"
              body="Ask your Super Admin to assign you to a team — your leader and rank appear here."
            />
          ) : (
            <div className="grid gap-3">
              <div className="flex items-center gap-3 rounded-[22px] border border-border/60 bg-surface/70 p-3">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary to-leaf text-sm font-bold text-primary-foreground">
                  {team.letter}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-foreground">{team.name || "—"}</div>
                  <div className="text-[11px] font-light text-muted-foreground">
                    Team code · {team.letter}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2.5 md:gap-3">
                <MiniKV icon={<Users size={11} />} label="Leader" value={team.leader?.full_name || o?.leaderName || "—"} />
                <MiniKV icon={<Phone size={11} />} label="Contact" value={team.leader?.mobile_number || "—"} mono />
                <MiniKV icon={<Trophy size={11} />} label="Rank" value={rank ? `#${rank}` : "—"} />
                <MiniKV
                  icon={<Calendar size={11} />}
                  label="Joined"
                  value={o?.profile?.created_at ? new Date(o.profile.created_at).toLocaleDateString("en-IN") : "—"}
                />
              </div>
            </div>
          )}
        </Panel>

        <Panel
          title="Wallet"
          subtitle="Snapshot of your earnings."
          action={<PanelLink to="/member/wallet">Open wallet</PanelLink>}
        >
          <div className="grid grid-cols-2 gap-2.5 md:gap-3">
            <MiniKV icon={<Wallet size={11} />} label="Available" value={formatINR(profile?.wallet_balance)} />
            <MiniKV
              icon={<IndianRupee size={11} />}
              label="Pending"
              value={formatINR(stats?.pendingCommission ?? 0, { compact: true })}
            />
            <MiniKV
              icon={<TrendingUp size={11} />}
              label="This month"
              value={formatINR(stats?.monthCommission ?? 0, { compact: true })}
            />
            <MiniKV
              icon={<Award size={11} />}
              label="Lifetime"
              value={formatINR(stats?.totalCommission ?? 0, { compact: true })}
            />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <Link
              to="/member/withdrawals"
              className="inline-flex h-12 items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-br from-primary to-leaf text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition-transform will-change-transform hover:-translate-y-0.5 active:scale-[0.98]"
            >
              <Wallet size={14} /> Withdraw
            </Link>
            <Link
              to="/member/commission"
              className="glass-card inline-flex h-12 items-center justify-center gap-1.5 rounded-2xl text-sm font-semibold text-foreground shadow-[var(--shadow-soft)] transition-transform will-change-transform hover:-translate-y-0.5 active:scale-[0.98]"
            >
              <IndianRupee size={14} /> Commissions
            </Link>
          </div>
        </Panel>
      </section>

      {/* ---------------- Leaderboard + activity ---------------- */}
      <section className="mt-5 grid gap-4 md:gap-5 lg:grid-cols-2 xl:gap-6">
        <Panel
          title="Team leaderboard"
          subtitle="Top performers in your team."
          action={<PanelLink to="/member/leaderboard">View all</PanelLink>}
        >
          {board.isLoading ? (
            <ListRowSkeleton rows={4} />
          ) : topBoard.length === 0 ? (
            <ZeroState
              icon={<Trophy size={26} />}
              title="No rankings yet"
              body="Rankings appear right after the first team sale. Add a referral to get moving."
              cta={{ label: "Add referral", to: "/member/referrals" }}
              accent="gold"
            />
          ) : (
            <ol className="flex flex-col gap-2.5">
              {topBoard.map((m) => {
                const me = m.id === myId;
                return (
                  <li
                    key={m.id}
                    className={`flex items-center gap-3 rounded-[22px] border p-3 transition-all ${
                      me
                        ? "border-primary/30 bg-primary-soft/50 shadow-[var(--shadow-soft)]"
                        : "border-border/60 bg-surface/70 hover:border-primary/20"
                    }`}
                  >
                    <RankChip rank={m.rank} icon={<Trophy size={15} />} />
                    <Portrait name={m.full_name} size={36} />
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <span className="truncate text-sm font-semibold text-foreground">{m.full_name}</span>
                        {me && (
                          <span className="shrink-0 rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-primary-foreground">
                            You
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] font-light text-muted-foreground">Score {m.score}</div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-sm font-semibold text-foreground">
                        {formatINR(m.total_sales, { compact: true })}
                      </div>
                      <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                        Sales
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </Panel>

        <Panel
          title="Recent activity"
          subtitle="Everything in one timeline."
          action={
            <Link
              to="/member/notifications"
              className="inline-flex h-8 items-center gap-1 rounded-full border border-border/70 bg-surface px-3 text-[11px] font-semibold text-primary shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5"
            >
              <Bell size={12} /> Alerts
              {unread > 0 && (
                <span className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
                  {unread}
                </span>
              )}
            </Link>
          }
        >
          {activity.isLoading ? (
            <ListRowSkeleton rows={4} height="h-14" />
          ) : recent.length === 0 ? (
            <ZeroState
              icon={<Activity size={26} />}
              title="Quiet for now"
              body="Sales, commissions, referrals and payouts land in this timeline in real time."
              cta={{ label: "Tip a lead", to: "/member/tips" }}
              accent="cyan"
            />
          ) : (
            <ol className="relative flex flex-col gap-3.5 border-l border-border/60 pl-5">
              {recent.map((a) => (
                <li key={a.id} className="relative">
                  <span
                    className={`absolute -left-[26px] top-1.5 grid h-4 w-4 place-items-center rounded-full ring-4 ring-background ${activityDot(a.kind)}`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-white" />
                  </span>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-foreground">{a.title}</div>
                      <div className="text-[11px] font-light text-muted-foreground">
                        {new Date(a.date).toLocaleString("en-IN")}
                      </div>
                    </div>
                    {a.amount !== 0 && (
                      <div
                        className={`shrink-0 text-sm font-semibold ${a.amount < 0 ? "text-destructive" : "text-success"}`}
                      >
                        {a.amount < 0 ? "" : "+"}
                        {formatINR(Math.abs(a.amount), { compact: true })}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </section>

      {/* ---------------- Footer CTAs ---------------- */}
      <section className="mt-5 grid gap-3 sm:grid-cols-2 md:gap-4">
        <Link
          to="/leader/projects"
          className="glass-card flex items-center gap-3 rounded-[24px] p-4 shadow-[var(--shadow-soft)] transition-all will-change-transform hover:-translate-y-0.5 hover:shadow-[var(--shadow-float)] active:scale-[0.99]"
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary">
            <Building2 size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-foreground">Explore projects</div>
            <div className="text-[11px] font-light text-muted-foreground">Live inventory available to sell.</div>
          </div>
          <ChevronRight size={16} className="shrink-0 text-muted-foreground" />
        </Link>
        <Link
          to="/member/analytics"
          className="glass-card flex items-center gap-3 rounded-[24px] p-4 shadow-[var(--shadow-soft)] transition-all will-change-transform hover:-translate-y-0.5 hover:shadow-[var(--shadow-float)] active:scale-[0.99]"
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-violet-100 text-violet-700">
            <BarChart3 size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-foreground">My analytics</div>
            <div className="text-[11px] font-light text-muted-foreground">Trends, funnel and earnings history.</div>
          </div>
          <ChevronRight size={16} className="shrink-0 text-muted-foreground" />
        </Link>
      </section>
    </DashboardShell>
  );
}

function activityDot(kind: string) {
  switch (kind) {
    case "sale":
      return "bg-primary";
    case "commission":
      return "bg-gold";
    case "referral":
      return "bg-leaf";
    case "tip":
      return "bg-success";
    case "withdrawal":
      return "bg-destructive";
    default:
      return "bg-muted";
  }
}

function MiniKV({
  icon,
  label,
  value,
  mono = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-[18px] border border-border/60 bg-surface/70 p-3">
      <div className="inline-flex items-center gap-1 text-[9.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {icon} {label}
      </div>
      <div
        className={`mt-1 truncate text-sm font-semibold tracking-[-0.01em] text-foreground ${mono ? "font-mono" : ""}`}
      >
        {value}
      </div>
    </div>
  );
}
