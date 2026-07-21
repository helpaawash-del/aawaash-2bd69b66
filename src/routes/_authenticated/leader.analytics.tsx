import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Users, IndianRupee, TrendingUp, Trophy } from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { RoleGuard } from "@/components/aawash/AuthGuard";
import { DashboardShell } from "@/components/aawash/DashboardShell";
import { SectionCard, StatCard, SkeletonBlock, formatINR } from "@/components/aawash/dashboard-kit";
import {
  AnalyticsFilterBar,
  AreaTrendChart,
  DonutBreakdown,
  downloadCSV,
  useDateRange,
} from "@/components/aawash/analytics/AnalyticsKit";
import { getLeaderAnalytics } from "@/lib/analytics.functions";

export const Route = createFileRoute("/_authenticated/leader/analytics")({
  component: Page,
  head: () => ({ meta: [{ title: "Team Analytics — Aawash" }] }),
});

function Page() {
  return (
    <RoleGuard allow={["team_leader", "super_admin"]}>
      <Content />
    </RoleGuard>
  );
}

function Content() {
  const { profile, role } = useSession();
  const { range, days, setDays } = useDateRange(30);
  const fn = useServerFn(getLeaderAnalytics);
  const { data, isLoading } = useQuery({
    queryKey: ["analytics", "leader", range.from, range.to],
    queryFn: () => fn({ data: range }),
  });

  const k = data?.kpi;

  return (
    <DashboardShell role={role || "team_leader"} profile={profile}>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
            Team analytics
          </div>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            {data?.team?.name ?? "My team"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Live performance across your team’s pipeline.</p>
        </div>
        <Link to="/leader" className="text-xs font-semibold text-primary">← Leader home</Link>
      </header>

      <div className="mt-6">
        <AnalyticsFilterBar
          days={days}
          setDays={setDays}
          onExport={() => data && downloadCSV(`aawash-team-${range.from.slice(0, 10)}.csv`, data.leaderboard)}
        />
      </div>

      {isLoading || !k ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-28" />
          ))}
        </div>
      ) : (
        <>
          <section className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard icon={<IndianRupee size={18} />} label="Team revenue" value={formatINR(k.revenue, { compact: true })} accent="gold" />
            <StatCard icon={<TrendingUp size={18} />} label="Approved sales" value={k.salesCount} hint={`${k.approvalRate.toFixed(1)}% approval`} accent="leaf" />
            <StatCard icon={<Users size={18} />} label="Members" value={k.totalMembers} />
            <StatCard icon={<Users size={18} />} label="Customers" value={k.customers} />
          </section>

          <section className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard icon={<IndianRupee size={18} />} label="My commission" value={formatINR(k.leaderCommission, { compact: true })} accent="gold" />
            <StatCard icon={<IndianRupee size={18} />} label="Member commission" value={formatINR(k.memberCommission, { compact: true })} />
            <StatCard icon={<IndianRupee size={18} />} label="Avg sale value" value={formatINR(k.avgSaleValue, { compact: true })} accent="leaf" />
            <StatCard icon={<BarChart3 size={18} />} label="Team letter" value={data?.team?.letter ?? "—"} />
          </section>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <AreaTrendChart data={data.salesSeries} yKey="value" title="Team sales trend" />
            <DonutBreakdown
              title="Customer funnel"
              data={[
                { name: "New leads", value: data.funnel.newLeads },
                { name: "Qualified", value: data.funnel.qualified },
                { name: "Closed", value: data.funnel.closed },
                { name: "Lost", value: data.funnel.lost },
              ]}
            />
          </div>

          <section className="mt-6">
            <SectionCard title="Member leaderboard" subtitle="Sales and revenue in this range" action={<Trophy size={16} className="text-gold" />}>
              {data.leaderboard.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">No sales in this range yet.</div>
              ) : (
                <ol className="flex flex-col gap-2">
                  {data.leaderboard.map((m, i) => (
                    <li key={m.id} className="flex items-center gap-3 rounded-2xl border border-border/50 bg-surface p-3">
                      <span className={`grid h-8 w-8 place-items-center rounded-lg text-xs font-bold ${i === 0 ? "bg-gold/20 text-gold-foreground" : "bg-primary-soft text-primary"}`}>{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-foreground">{m.name}</div>
                        <div className="text-[11px] text-muted-foreground">{m.sales} sales · Comm {formatINR(m.commission, { compact: true })}</div>
                      </div>
                      <div className="text-right text-sm font-bold text-foreground">{formatINR(m.revenue, { compact: true })}</div>
                    </li>
                  ))}
                </ol>
              )}
            </SectionCard>
          </section>
        </>
      )}
    </DashboardShell>
  );
}
