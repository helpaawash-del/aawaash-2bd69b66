import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Trophy, TrendingUp } from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { RoleGuard } from "@/components/aawash/AuthGuard";
import { DashboardShell } from "@/components/aawash/DashboardShell";
import {
  SectionCard,
  EmptyState,
  SkeletonBlock,
  formatINR,
  initials,
} from "@/components/aawash/dashboard-kit";
import { getMyTeamLeaderboard } from "@/lib/member.functions";

export const Route = createFileRoute("/_authenticated/member/leaderboard")({
  component: LeaderboardPage,
  head: () => ({ meta: [{ title: "Team Leaderboard — Aawash" }] }),
});

function LeaderboardPage() {
  return (
    <RoleGuard allow={["member", "team_leader", "super_admin"]}>
      <LeaderboardContent />
    </RoleGuard>
  );
}

function LeaderboardContent() {
  const { profile } = useSession();
  const fn = useServerFn(getMyTeamLeaderboard);
  const { data, isLoading } = useQuery({ queryKey: ["member", "board"], queryFn: () => fn() });

  const list = data?.members ?? [];
  const meId = data?.meId;

  return (
    <DashboardShell role="member" profile={profile}>
      <header>
        <div className="inline-flex items-center gap-1.5 rounded-full bg-gold/20 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-gold-foreground">
          Ranking
        </div>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          Team leaderboard
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Only your team. Updates after every confirmed sale.</p>
      </header>

      {isLoading ? (
        <section className="mt-6 grid gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-16" />
          ))}
        </section>
      ) : list.length === 0 ? (
        <section className="mt-6">
          <EmptyState icon={<Trophy size={22} />} title="No rankings yet" body="Rankings appear once sales are logged." />
        </section>
      ) : (
        <>
          <section className="mt-6 grid grid-cols-3 gap-3">
            {[1, 0, 2].map((i) => {
              const m = list[i];
              if (!m) return <div key={i} />;
              const tier = i + 1;
              const heights = ["h-40", "h-32", "h-24"];
              const orderCls = i === 0 ? "" : i === 1 ? "mt-4" : "mt-8";
              return (
                <div
                  key={m.id}
                  className={`glass-card relative flex flex-col items-center rounded-3xl p-3 text-center shadow-[var(--shadow-soft)] ${orderCls} ${heights[i]} ${m.id === meId ? "ring-2 ring-primary" : ""}`}
                >
                  <Trophy size={20} className={tier === 1 ? "text-gold" : tier === 2 ? "text-primary" : "text-muted-foreground"} />
                  <div className="mt-2 grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-primary to-leaf text-xs font-bold text-primary-foreground">
                    {initials(m.full_name)}
                  </div>
                  <div className="mt-2 truncate text-xs font-bold text-foreground">{m.full_name.split(" ")[0]}</div>
                  <div className="text-[10px] text-muted-foreground">{formatINR(m.total_sales, { compact: true })}</div>
                </div>
              );
            })}
          </section>

          <section className="mt-6">
            <SectionCard title="Full ranking">
              <ol className="flex flex-col gap-2">
                {list.map((m) => {
                  const me = m.id === meId;
                  return (
                    <li
                      key={m.id}
                      className={`flex items-center gap-3 rounded-2xl border p-3 ${
                        me ? "border-primary/40 bg-primary-soft/40" : "border-border/50 bg-surface"
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
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-leaf text-xs font-bold text-primary-foreground">
                        {initials(m.full_name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-foreground">
                          {m.full_name} {me && <span className="ml-1 rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary-foreground">You</span>}
                        </div>
                        <div className="font-mono text-[11px] text-muted-foreground">{m.login_id}</div>
                      </div>
                      <div className="hidden text-right sm:block">
                        <div className="text-sm font-bold text-foreground">
                          {formatINR(m.total_earnings, { compact: true })}
                        </div>
                        <div className="text-[10px] text-muted-foreground">Earnings</div>
                      </div>
                      <div className="text-right">
                        <div className="inline-flex items-center gap-1 text-sm font-bold text-foreground">
                          <TrendingUp size={12} className="text-success" /> {formatINR(m.total_sales, { compact: true })}
                        </div>
                        <div className="text-[10px] text-muted-foreground">Score {m.score}</div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </SectionCard>
          </section>
        </>
      )}
    </DashboardShell>
  );
}
