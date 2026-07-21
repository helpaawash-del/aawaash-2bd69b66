import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Users, IndianRupee, Building2, Wallet, TrendingUp, Trophy, ArrowRight } from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { RoleGuard } from "@/components/aawash/AuthGuard";
import { DashboardShell } from "@/components/aawash/DashboardShell";
import { SectionCard, StatCard, SkeletonBlock, formatINR } from "@/components/aawash/dashboard-kit";
import {
  AnalyticsFilterBar,
  AreaTrendChart,
  BarCompareChart,
  DonutBreakdown,
  TrendPill,
  downloadCSV,
  useDateRange,
} from "@/components/aawash/analytics/AnalyticsKit";
import { getAdminAnalytics, getLeaderboards } from "@/lib/analytics.functions";

export const Route = createFileRoute("/_authenticated/admin/analytics")({
  component: Page,
  head: () => ({ meta: [{ title: "Analytics — Aawash" }] }),
});

function Page() {
  return (
    <RoleGuard allow={["super_admin"]}>
      <Content />
    </RoleGuard>
  );
}

function Content() {
  const { profile } = useSession();
  const { range, days, setDays } = useDateRange(30);
  const fn = useServerFn(getAdminAnalytics);
  const boardsFn = useServerFn(getLeaderboards);
  const { data, isLoading } = useQuery({
    queryKey: ["analytics", "admin", range.from, range.to],
    queryFn: () => fn({ data: range }),
  });
  const { data: boards } = useQuery({
    queryKey: ["analytics", "boards", range.from, range.to],
    queryFn: () => boardsFn({ data: range }),
  });

  const k = data?.kpi;

  return (
    <DashboardShell role="super_admin" profile={profile}>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
            Business Intelligence
          </div>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">Executive analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">Live figures from sales, commissions, wallet and inventory.</p>
        </div>
        <Link to="/admin" className="text-xs font-semibold text-primary">← Admin home</Link>
      </header>

      <div className="mt-6">
        <AnalyticsFilterBar
          days={days}
          setDays={setDays}
          onExport={() => data && downloadCSV(`aawash-admin-${range.from.slice(0, 10)}.csv`, data.salesSeries)}
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
            <StatCard
              icon={<IndianRupee size={18} />}
              label="Revenue (range)"
              value={formatINR(k.rangeRevenue, { compact: true })}
              hint={`Lifetime ${formatINR(k.totalRevenue, { compact: true })}`}
              accent="gold"
            />
            <StatCard icon={<TrendingUp size={18} />} label="Sales (range)" value={k.rangeSales} hint={`${k.approvalRate.toFixed(1)}% approval`} accent="leaf" />
            <StatCard icon={<Users size={18} />} label="Customers" value={k.totalCustomers} />
            <StatCard icon={<Building2 size={18} />} label="Projects" value={k.totalProjects} hint={`${k.availableFlats}/${k.totalFlats} available`} />
          </section>

          <section className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard icon={<IndianRupee size={18} />} label="Commission paid" value={formatINR(k.totalCommissionPaid, { compact: true })} accent="gold" />
            <StatCard icon={<IndianRupee size={18} />} label="Commission pending" value={formatINR(k.pendingCommission, { compact: true })} />
            <StatCard icon={<Wallet size={18} />} label="Wallet in system" value={formatINR(k.totalWalletBalance, { compact: true })} accent="leaf" />
            <StatCard icon={<Wallet size={18} />} label="Withdrawals paid" value={formatINR(k.totalWithdrawals, { compact: true })} hint={`Pending ${formatINR(k.pendingWithdrawals, { compact: true })}`} />
          </section>

          <section className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard icon={<Users size={18} />} label="Team Leaders" value={k.totalLeaders} />
            <StatCard icon={<Users size={18} />} label="Members" value={k.totalMembers} accent="gold" />
            <StatCard icon={<IndianRupee size={18} />} label="Avg sale value" value={formatINR(k.avgSaleValue, { compact: true })} />
            <StatCard icon={<TrendingUp size={18} />} label="Revenue growth" value={`${k.revenueGrowth.toFixed(1)}%`} />
          </section>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <AreaTrendChart data={data.salesSeries} yKey="value" title="Sales revenue trend" />
            <BarCompareChart data={data.salesByProject.slice(0, 8).map((p) => ({ name: p.name, value: p.value }))} title="Sales by project" />
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <DonutBreakdown
              title="Inventory status"
              data={[
                { name: "Available", value: k.availableFlats },
                { name: "Reserved", value: k.reservedFlats },
                { name: "Sold", value: k.soldFlats },
              ]}
            />
            <DonutBreakdown
              title="Customer funnel"
              data={[
                { name: "New leads", value: data.funnel.newLeads },
                { name: "Qualified", value: data.funnel.qualified },
                { name: "In meeting", value: data.funnel.meetingStage },
                { name: "Closed", value: data.funnel.closed },
                { name: "Lost", value: data.funnel.lost },
              ]}
            />
          </div>

          <section className="mt-6 grid gap-4 lg:grid-cols-3">
            <SectionCard title="Top members" subtitle="By approved revenue" action={<Trophy size={16} className="text-gold" />}>
              <BoardList rows={(boards?.members ?? []).slice(0, 10).map((r) => ({ id: r.id, primary: r.name, secondary: `${r.sales} sales`, value: formatINR(r.revenue, { compact: true }) }))} />
            </SectionCard>
            <SectionCard title="Top team leaders" subtitle="By approved revenue" action={<Trophy size={16} className="text-gold" />}>
              <BoardList rows={(boards?.leaders ?? []).slice(0, 10).map((r) => ({ id: r.id, primary: r.name, secondary: r.team ?? "—", value: formatINR(r.revenue, { compact: true }) }))} />
            </SectionCard>
            <SectionCard title="Top projects" subtitle="By approved revenue" action={<BarChart3 size={16} className="text-primary" />}>
              <BoardList rows={(boards?.projects ?? []).slice(0, 10).map((r) => ({ id: r.id, primary: r.name, secondary: `${r.occupancy.toFixed(0)}% occupancy`, value: formatINR(r.revenue, { compact: true }) }))} />
            </SectionCard>
          </section>

          <section className="mt-6">
            <SectionCard
              title="Quick jumps"
              action={
                <Link to="/admin" className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                  All admin <ArrowRight size={12} />
                </Link>
              }
            >
              <div className="grid gap-2 sm:grid-cols-3">
                <Link to="/admin/commissions" className="rounded-2xl border border-border/60 bg-surface p-3 text-sm font-semibold hover:bg-surface-warm">
                  Commission engine
                </Link>
                <Link to="/admin/withdrawals" className="rounded-2xl border border-border/60 bg-surface p-3 text-sm font-semibold hover:bg-surface-warm">
                  Withdrawals queue
                </Link>
                <Link to="/admin/users" className="rounded-2xl border border-border/60 bg-surface p-3 text-sm font-semibold hover:bg-surface-warm">
                  Users & teams
                </Link>
              </div>
            </SectionCard>
          </section>
        </>
      )}
    </DashboardShell>
  );
}

function BoardList({ rows }: { rows: Array<{ id: string; primary: string; secondary: string; value: string }> }) {
  if (!rows.length) return <div className="rounded-2xl border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">No data in this range</div>;
  return (
    <ol className="flex flex-col gap-2">
      {rows.map((r, i) => (
        <li key={r.id} className="flex items-center gap-3 rounded-2xl border border-border/50 bg-surface p-3">
          <span className={`grid h-8 w-8 place-items-center rounded-lg text-xs font-bold ${i === 0 ? "bg-gold/20 text-gold-foreground" : i < 3 ? "bg-primary-soft text-primary" : "bg-muted text-muted-foreground"}`}>
            {i + 1}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-foreground">{r.primary}</div>
            <div className="truncate text-[11px] text-muted-foreground">{r.secondary}</div>
          </div>
          <div className="text-right text-sm font-bold text-foreground">{r.value}</div>
        </li>
      ))}
    </ol>
  );
}

// Attach trend pill to StatCard hints where useful; exported for future reuse
export { TrendPill };
