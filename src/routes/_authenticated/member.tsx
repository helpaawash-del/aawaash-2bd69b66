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
  ArrowUpRight,
  ChevronRight,
  Users,
  Building2,
  Handshake,
  Leaf,
  Phone,
  Calendar,
} from "lucide-react";
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
  getMemberOverview,
  getMyActivity,
  getMyTeamLeaderboard,
} from "@/lib/member.functions";
import { listMyNotifications } from "@/lib/leader.functions";

export const Route = createFileRoute("/_authenticated/member")({
  component: MemberHome,
  head: () => ({ meta: [{ title: "Member Dashboard — Aawash" }] }),
});

function MemberHome() {
  return (
    <RoleGuard allow={["member", "team_leader", "super_admin"]}>
      <MemberContent />
    </RoleGuard>
  );
}

function MemberContent() {
  const { profile } = useSession();

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
  const team = o?.team as { name?: string; letter?: string; leader?: { full_name?: string; mobile_number?: string } } | null | undefined;

  const unread = (notifs.data ?? []).filter((n) => !n.is_read).length;
  const myId = board.data?.meId;
  const rank = board.data?.members.find((m) => m.id === myId)?.rank ?? null;
  const topBoard = (board.data?.members ?? []).slice(0, 5);
  const recent = (activity.data ?? []).slice(0, 6);

  return (
    <DashboardShell role="member" profile={profile}>
      {/* Welcome */}
      <section className="glass-card relative overflow-hidden rounded-4xl p-5 shadow-[var(--shadow-float)] sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-primary/12 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-14 h-56 w-56 rounded-full bg-gold/15 blur-3xl" />
        <div className="pointer-events-none absolute right-6 top-6 hidden sm:block">
          <Leaf size={36} className="text-primary/40" />
        </div>
        <div className="relative grid gap-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
              <Sparkles size={12} /> Team {team?.letter ?? "—"}
            </div>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              {greeting()},{" "}
              <span className="bg-gradient-to-br from-primary to-leaf bg-clip-text text-transparent">
                {profile?.full_name?.split(" ")[0] || "Member"}.
              </span>
            </h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground sm:text-base">
              A calm space to track every sale, referral, and rupee earned.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              <Link
                to="/member/referrals"
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-br from-primary to-leaf px-4 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)]"
              >
                <UserPlus size={14} /> Add referral
              </Link>
              <Link
                to="/member/tips"
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-2xl border border-border bg-surface px-4 text-sm font-semibold text-foreground shadow-[var(--shadow-soft)]"
              >
                <Handshake size={14} /> Tip lead
              </Link>
              <Link
                to="/member/withdrawals"
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-2xl border border-border bg-surface px-4 text-sm font-semibold text-foreground shadow-[var(--shadow-soft)]"
              >
                <Wallet size={14} /> Withdraw
              </Link>
            </div>
          </div>
          <div className="flex sm:justify-end">
            <div className="glass-card w-full rounded-3xl p-4 shadow-[var(--shadow-soft)] sm:w-[260px]">
              <div className="flex items-center gap-3">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="h-12 w-12 rounded-2xl object-cover" />
                ) : (
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-primary to-leaf text-sm font-bold text-primary-foreground">
                    {initials(profile?.full_name)}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold text-foreground">
                    {profile?.full_name || "—"}
                  </div>
                  <div className="font-mono text-[10px] text-muted-foreground">{profile?.login_id}</div>
                </div>
              </div>
              <div className="mt-3 flex items-end justify-between">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    This month
                  </div>
                  <div className="mt-0.5 text-2xl font-extrabold tracking-tight text-foreground">
                    {formatINR(stats?.monthCommission ?? 0, { compact: true })}
                  </div>
                </div>
                <div className="rounded-full bg-gold/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gold-foreground">
                  Rank {rank ?? "—"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Today's summary */}
      <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={<TrendingUp size={18} />}
          label="Today's sales"
          value={formatINR(stats?.todaySalesValue ?? 0, { compact: true })}
          hint={`${stats?.todaySalesCount ?? 0} deals`}
        />
        <StatCard
          icon={<IndianRupee size={18} />}
          label="Today's commission"
          value={formatINR(stats?.todayCommission ?? 0, { compact: true })}
          accent="gold"
        />
        <StatCard
          icon={<Wallet size={18} />}
          label="Wallet"
          value={formatINR(profile?.wallet_balance)}
        />
        <StatCard
          icon={<Trophy size={18} />}
          label="Rank"
          value={rank ? `#${rank}` : "—"}
          hint={team?.name || "—"}
          accent="leaf"
        />
      </section>

      {/* All stats */}
      <section className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={<TrendingUp size={18} />} label="Total sales" value={formatINR(stats?.totalSales ?? 0, { compact: true })} hint={`${stats?.salesCount ?? 0} deals`} />
        <StatCard icon={<TrendingUp size={18} />} label="This month" value={formatINR(stats?.monthSalesValue ?? 0, { compact: true })} hint={`${stats?.monthSalesCount ?? 0} deals`} />
        <StatCard icon={<IndianRupee size={18} />} label="Commission" value={formatINR(stats?.totalCommission ?? 0, { compact: true })} hint={`Pending ${formatINR(stats?.pendingCommission ?? 0, { compact: true })}`} accent="gold" />
        <StatCard icon={<UserPlus size={18} />} label="Referrals & tips" value={String((stats?.referralCount ?? 0) + (stats?.tipCount ?? 0))} hint={`${stats?.referralCount ?? 0} referrals · ${stats?.tipCount ?? 0} tips`} />
      </section>

      {/* Team + Wallet quick */}
      <section className="mt-6 grid gap-5 lg:grid-cols-2">
        <SectionCard
          title="My team"
          subtitle="Your workspace at Aawash."
          action={
            <Link to="/member/leaderboard" className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
              Leaderboard <ChevronRight size={12} />
            </Link>
          }
        >
          {overview.isLoading ? (
            <SkeletonBlock className="h-40" />
          ) : !team ? (
            <EmptyState
              icon={<Users size={22} />}
              title="No team yet"
              body="Ask your Super Admin to assign you to a team."
            />
          ) : (
            <div className="grid gap-3">
              <div className="flex items-center gap-3 rounded-2xl border border-border/50 bg-surface p-3">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-primary to-leaf text-sm font-extrabold text-primary-foreground">
                  {team.letter}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-foreground">{team.name || "—"}</div>
                  <div className="text-[11px] text-muted-foreground">Team code · {team.letter}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <MiniKV icon={<Users size={12} />} label="Leader" value={team.leader?.full_name || o?.leaderName || "—"} />
                <MiniKV icon={<Phone size={12} />} label="Contact" value={team.leader?.mobile_number || "—"} mono />
                <MiniKV icon={<Trophy size={12} />} label="Rank" value={rank ? `#${rank}` : "—"} />
                <MiniKV icon={<Calendar size={12} />} label="Joined" value={o?.profile?.created_at ? new Date(o.profile.created_at).toLocaleDateString("en-IN") : "—"} />
              </div>
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Wallet"
          subtitle="Snapshot of your earnings."
          action={
            <Link to="/member/wallet" className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
              Open wallet <ChevronRight size={12} />
            </Link>
          }
        >
          <div className="glass-card rounded-3xl border border-primary/20 bg-gradient-to-br from-primary-soft/60 to-gold/10 p-5 shadow-[var(--shadow-soft)]">
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
                Available balance
              </div>
              <Wallet size={16} className="text-primary" />
            </div>
            <div className="mt-2 text-4xl font-extrabold tracking-tight text-foreground">
              {formatINR(profile?.wallet_balance)}
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Pending {formatINR(stats?.pendingCommission ?? 0, { compact: true })}</span>
              <span className="inline-flex items-center gap-1 font-semibold text-success">
                <ArrowUpRight size={12} /> {formatINR(stats?.monthCommission ?? 0, { compact: true })} this month
              </span>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Link
              to="/member/withdrawals"
              className="inline-flex h-11 items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-br from-primary to-leaf text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)]"
            >
              <Wallet size={14} /> Withdraw
            </Link>
            <Link
              to="/member/commission"
              className="inline-flex h-11 items-center justify-center gap-1.5 rounded-2xl border border-border bg-surface text-sm font-semibold text-foreground shadow-[var(--shadow-soft)]"
            >
              <IndianRupee size={14} /> Commissions
            </Link>
          </div>
        </SectionCard>
      </section>

      {/* Leaderboard + Activity */}
      <section className="mt-6 grid gap-5 lg:grid-cols-2">
        <SectionCard
          title="Team leaderboard"
          subtitle="Top performers in your team."
          action={
            <Link to="/member/leaderboard" className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
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
          ) : topBoard.length === 0 ? (
            <EmptyState icon={<Trophy size={22} />} title="No rankings yet" body="Rankings appear after the first team sale." />
          ) : (
            <ol className="flex flex-col gap-2">
              {topBoard.map((m) => {
                const me = m.id === myId;
                return (
                  <li
                    key={m.id}
                    className={`flex items-center gap-3 rounded-2xl border p-3 ${
                      me ? "border-primary/30 bg-primary-soft/40" : "border-border/50 bg-surface"
                    }`}
                  >
                    <div
                      className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-xs font-bold ${
                        m.rank === 1
                          ? "bg-gradient-to-br from-gold to-primary-soft text-gold-foreground"
                          : m.rank <= 3
                            ? "bg-primary-soft text-primary"
                            : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {m.rank <= 3 ? <Trophy size={16} /> : m.rank}
                    </div>
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-leaf text-[10px] font-bold text-primary-foreground">
                      {initials(m.full_name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-foreground">
                        {m.full_name} {me && <span className="ml-1 rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary-foreground">You</span>}
                      </div>
                      <div className="text-[11px] text-muted-foreground">Score {m.score}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-foreground">{formatINR(m.total_sales, { compact: true })}</div>
                      <div className="text-[10px] text-muted-foreground">Sales</div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </SectionCard>

        <SectionCard
          title="Recent activity"
          subtitle="Everything in one timeline."
          action={
            <Link to="/member/notifications" className="relative inline-flex items-center gap-1 text-xs font-semibold text-primary">
              <Bell size={12} /> Alerts
              {unread > 0 && (
                <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                  {unread}
                </span>
              )}
            </Link>
          }
        >
          {activity.isLoading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonBlock key={i} className="h-14" />
              ))}
            </div>
          ) : recent.length === 0 ? (
            <EmptyState icon={<Activity size={22} />} title="Quiet for now" body="Your activity will appear here in real time." />
          ) : (
            <ol className="relative flex flex-col gap-3 border-l border-border/50 pl-5">
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
                      <div className="text-[11px] text-muted-foreground">
                        {new Date(a.date).toLocaleString("en-IN")}
                      </div>
                    </div>
                    {a.amount !== 0 && (
                      <div className={`shrink-0 text-sm font-bold ${a.amount < 0 ? "text-destructive" : "text-success"}`}>
                        {a.amount < 0 ? "" : "+"}
                        {formatINR(Math.abs(a.amount), { compact: true })}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </SectionCard>
      </section>

      <section className="mt-6">
        <Link
          to="/leader/projects"
          className="glass-card flex items-center gap-3 rounded-3xl p-4 shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-float)]"
        >
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary-soft text-primary">
            <Building2 size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold text-foreground">Explore projects</div>
            <div className="text-[11px] text-muted-foreground">Live inventory available to sell.</div>
          </div>
          <ChevronRight size={16} className="text-muted-foreground" />
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
    <div className="rounded-2xl border border-border/50 bg-surface p-3">
      <div className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {icon} {label}
      </div>
      <div className={`mt-1 truncate text-sm font-semibold text-foreground ${mono ? "font-mono" : ""}`}>
        {value}
      </div>
    </div>
  );
}
