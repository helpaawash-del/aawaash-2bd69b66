import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
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
  Leaf,
  Droplet,
  Zap,
} from "lucide-react";

import { EcoLivingScene } from "@/components/aawash/dashboard/EcoLivingScene";
import { useSession } from "@/hooks/useSession";
import { RoleGuard } from "@/components/aawash/AuthGuard";
import { formatINR } from "@/components/aawash/dashboard-kit";
import { greetingName } from "@/lib/greeting";
import {
  EcoShell,
  EcoHeroGreeting,
  LightPod,
  AskBar,
  DarkPanel,
  LightPanel,
  Orb,
  EcoRows,
  EcoZero,
  Avatar,
} from "@/components/aawash/dashboard/EcoKit";
import { getMemberOverview, getMyActivity, getMyTeamLeaderboard } from "@/lib/member.functions";
import { listMyNotifications, listProjects } from "@/lib/leader.functions";

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
  const projectsFn = useServerFn(listProjects);

  const overview = useQuery({ queryKey: ["member", "overview"], queryFn: () => overviewFn() });
  const activity = useQuery({ queryKey: ["member", "activity"], queryFn: () => activityFn() });
  const board = useQuery({ queryKey: ["member", "board"], queryFn: () => boardFn() });
  const notifs = useQuery({ queryKey: ["member", "notifications"], queryFn: () => notifFn() });
  const projects = useQuery({ queryKey: ["member", "projects"], queryFn: () => projectsFn() });

  const o = overview.data;
  const stats = o?.stats;
  const team = o?.team as
    | { name?: string; letter?: string; leader?: { full_name?: string; mobile_number?: string } }
    | null
    | undefined;

  const unread = (notifs.data ?? []).filter((n) => !n.is_read).length;
  const myId = board.data?.meId;
  const rank = board.data?.members.find((m) => m.id === myId)?.rank ?? null;
  const myScore = Number(board.data?.members.find((m) => m.id === myId)?.score ?? 0);
  const topBoard = (board.data?.members ?? []).slice(0, 5);

  const xpGoal = Math.max(100, Math.round(myScore * 1.6) || 100);

  return (
    <EcoShell role="member" profile={profile}>
      {/* ---------------- Focus hero ---------------- */}
      <section className="grid grid-cols-[minmax(0,1fr)_92px] gap-3 sm:grid-cols-[minmax(0,1fr)_112px] lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-5">
        <div className="min-w-0">
          <EcoHeroGreeting name={displayName} />

          <div className="mt-5 sm:mt-7">
            <EcoLivingScene />
          </div>
        </div>

        <div className="grid content-start gap-3">
          <LightPod
            icon={<TrendingUp size={15} />}
            label="Total sales"
            value={String(stats?.salesCount ?? 0)}
            to="/member/sales"
            loading={overview.isLoading}
          />

          <LightPod
            icon={<Droplet size={15} />}
            label="Wallet"
            value={formatINR(profile?.wallet_balance, { compact: true })}
            to="/member/wallet"
          />
          <LightPod
            icon={<Zap size={15} />}
            label="This month"
            value={formatINR(stats?.monthCommission ?? 0, { compact: true })}
            to="/member/commission"
            loading={overview.isLoading}
          />
        </div>
      </section>

      {/* ---------------- Command bar ---------------- */}
      <section className="mt-4 sm:mt-5">
        <AskBar to="/member/sales" placeholder="Search your sales, referrals or tips…" />
      </section>

      {/* ---------------- Quick pods ---------------- */}
      <section className="mt-4 sm:mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <LightPod
          icon={<UserPlus size={15} />}
          label="Referrals"
          value={String(stats?.referralCount ?? 0)}
          to="/member/referrals"
          loading={overview.isLoading}
        />
        <LightPod
          icon={<Handshake size={15} />}
          label="Tips"
          value={String(stats?.tipCount ?? 0)}
          to="/member/tips"
          loading={overview.isLoading}
        />
        <LightPod
          icon={<Wallet size={15} />}
          label="Withdraw"
          value={formatINR(stats?.pendingCommission ?? 0, { compact: true })}
          to="/member/withdrawals"
          loading={overview.isLoading}
        />
        <LightPod
          icon={<Bell size={15} />}
          label="Alerts"
          value={String(unread)}
          to="/member/notifications"
          loading={notifs.isLoading}
        />
      </section>

      {/* ---------------- Overview ---------------- */}
      <section className="mt-4 sm:mt-5">
        <DarkPanel
          title="My Overview"
          action={<Activity size={17} className="text-forest/70" />}
          stats={[
            { label: "Deals", value: String(stats?.salesCount ?? 0), hint: "Closed" },
            { label: "Referrals", value: String(stats?.referralCount ?? 0), hint: "Added" },
            { label: "Tips", value: String(stats?.tipCount ?? 0), hint: "Shared" },
          ]}
        >
          <Orb intensity={Math.min(1, (stats?.salesCount ?? 0) / 10)} />
        </DarkPanel>
      </section>

      {/* ---------------- Team + wallet ---------------- */}
      <section className="mt-4 sm:mt-5 grid gap-4 lg:grid-cols-2">
        <LightPanel
          title="My Team"
          action={
            <Link to="/member/leaderboard" className="text-[12px] font-semibold text-primary">
              Leaderboard
            </Link>
          }
        >
          {overview.isLoading ? (
            <EcoRows rows={3} />
          ) : !team ? (
            <EcoZero
              icon={<Users size={22} />}
              title="No team yet"
              body="Ask your Super Admin to assign you to a team — your leader and rank appear here."
            />
          ) : (
            <div className="grid gap-3">
              <div className="flex items-center gap-3 rounded-[22px] bg-surface-warm p-3">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-forest to-forest-deep text-sm font-bold text-forest-foreground">
                  {team.letter}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-bold text-foreground">
                    {team.name || "—"}
                  </div>
                  <div className="text-[11px] font-light text-muted-foreground">
                    Team code · {team.letter}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <KV
                  icon={<Users size={11} />}
                  label="Leader"
                  value={team.leader?.full_name || o?.leaderName || "—"}
                />
                <KV
                  icon={<Phone size={11} />}
                  label="Contact"
                  value={team.leader?.mobile_number || "—"}
                  mono
                />
                <KV icon={<Trophy size={11} />} label="Rank" value={rank ? `#${rank}` : "—"} />
                <KV
                  icon={<Calendar size={11} />}
                  label="Joined"
                  value={
                    o?.profile?.created_at
                      ? new Date(o.profile.created_at).toLocaleDateString("en-IN")
                      : "—"
                  }
                />
              </div>
            </div>
          )}
        </LightPanel>

        <LightPanel
          title="Wallet"
          action={
            <Link to="/member/wallet" className="text-[12px] font-semibold text-primary">
              Open wallet
            </Link>
          }
        >
          <div className="grid grid-cols-2 gap-2.5">
            <KV
              icon={<Wallet size={11} />}
              label="Available"
              value={formatINR(profile?.wallet_balance)}
            />
            <KV
              icon={<IndianRupee size={11} />}
              label="Pending"
              value={formatINR(stats?.pendingCommission ?? 0, { compact: true })}
            />
            <KV
              icon={<TrendingUp size={11} />}
              label="This month"
              value={formatINR(stats?.monthCommission ?? 0, { compact: true })}
            />
            <KV
              icon={<Award size={11} />}
              label="Lifetime"
              value={formatINR(stats?.totalCommission ?? 0, { compact: true })}
            />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <Link
              to="/member/withdrawals"
              className="inline-flex h-12 items-center justify-center gap-1.5 rounded-full bg-gradient-to-br from-forest to-forest-deep text-sm font-semibold text-forest-foreground shadow-[var(--shadow-glow)] transition-transform hover:-translate-y-0.5 active:scale-[0.98]"
            >
              <Wallet size={14} /> Withdraw
            </Link>
            <Link
              to="/member/commission"
              className="inline-flex h-12 items-center justify-center gap-1.5 rounded-full bg-surface-warm text-sm font-semibold text-foreground transition-transform hover:-translate-y-0.5 active:scale-[0.98]"
            >
              <IndianRupee size={14} /> Commissions
            </Link>
          </div>
        </LightPanel>
      </section>

      {/* ---------------- Leaderboard ---------------- */}
      <section className="mt-4 sm:mt-5">
        <LightPanel
          title="Team Leaderboard"
          action={
            <Link to="/member/leaderboard" className="text-[12px] font-semibold text-primary">
              View all
            </Link>
          }
        >
          {board.isLoading ? (
            <EcoRows rows={4} />
          ) : topBoard.length === 0 ? (
            <EcoZero
              icon={<Trophy size={22} />}
              title="No rankings yet"
              body="Rankings appear right after the first team sale. Add a referral to get moving."
              cta={{ label: "Add referral", to: "/member/referrals" }}
            />
          ) : (
            <ol className="grid gap-3.5 sm:grid-cols-2">
              {topBoard.map((m) => {
                const me = m.id === myId;
                return (
                  <li
                    key={m.id}
                    className={`flex items-center gap-3 rounded-[22px] p-2.5 ${me ? "bg-primary-soft" : "bg-surface-warm"}`}
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface text-[12px] font-bold text-primary">
                      {m.rank}
                    </span>
                    <Avatar name={m.full_name} size={34} />
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <span className="truncate text-[13px] font-semibold text-foreground">
                          {m.full_name}
                        </span>
                        {me && (
                          <span className="shrink-0 rounded-full bg-forest px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-forest-foreground">
                            You
                          </span>
                        )}
                      </div>
                      <div className="text-[10.5px] font-light text-muted-foreground">
                        Score {m.score}
                      </div>
                    </div>
                    <div className="shrink-0 text-[12.5px] font-bold text-foreground">
                      {formatINR(m.total_sales, { compact: true })}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </LightPanel>
      </section>

      {/* ---------------- Footer CTAs ---------------- */}
      <section className="mt-4 sm:mt-5 grid gap-3 sm:grid-cols-2">
        <Link
          to="/projects"
          className="flex items-center gap-3 rounded-[28px] bg-surface p-4 shadow-[var(--shadow-soft)] transition-transform hover:-translate-y-0.5 active:scale-[0.99]"
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary">
            <Building2 size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[13.5px] font-bold text-foreground">Explore projects</div>
            <div className="truncate text-[11px] font-light text-muted-foreground">
              Live inventory available to sell.
            </div>
          </div>
          <ChevronRight size={16} className="shrink-0 text-muted-foreground" />
        </Link>
        <Link
          to="/member/analytics"
          className="flex items-center gap-3 rounded-[28px] bg-surface p-4 shadow-[var(--shadow-soft)] transition-transform hover:-translate-y-0.5 active:scale-[0.99]"
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-forest to-forest-deep text-forest-foreground">
            <BarChart3 size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[13.5px] font-bold text-foreground">My analytics</div>
            <div className="truncate text-[11px] font-light text-muted-foreground">
              Trends, funnel and earnings history.
            </div>
          </div>
          <ChevronRight size={16} className="shrink-0 text-muted-foreground" />
        </Link>
      </section>
    </EcoShell>
  );
}

function KV({
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
    <div className="rounded-[18px] bg-surface-warm p-3">
      <div className="inline-flex items-center gap-1 text-[9.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {icon} {label}
      </div>
      <div
        className={`mt-1 truncate text-[14px] font-bold tracking-[-0.01em] text-foreground ${mono ? "font-mono" : ""}`}
      >
        {value}
      </div>
    </div>
  );
}
