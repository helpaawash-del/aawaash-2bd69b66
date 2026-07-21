import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { IndianRupee, TrendingUp, Users, Wallet, CalendarCheck } from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { RoleGuard } from "@/components/aawash/AuthGuard";
import { DashboardShell } from "@/components/aawash/DashboardShell";
import { StatCard, SkeletonBlock, formatINR } from "@/components/aawash/dashboard-kit";
import {
  AnalyticsFilterBar,
  AreaTrendChart,
  LineDualChart,
  downloadCSV,
  useDateRange,
} from "@/components/aawash/analytics/AnalyticsKit";
import { getMemberAnalytics } from "@/lib/analytics.functions";

export const Route = createFileRoute("/_authenticated/member/analytics")({
  component: Page,
  head: () => ({ meta: [{ title: "My Analytics — Aawash" }] }),
});

function Page() {
  return (
    <RoleGuard allow={["member", "team_leader", "super_admin"]}>
      <Content />
    </RoleGuard>
  );
}

function Content() {
  const { profile, role } = useSession();
  const { range, days, setDays } = useDateRange(30);
  const fn = useServerFn(getMemberAnalytics);
  const { data, isLoading } = useQuery({
    queryKey: ["analytics", "member", range.from, range.to],
    queryFn: () => fn({ data: range }),
  });

  const k = data?.kpi;

  // Merge sales + commission by date for dual line
  const merged = (() => {
    if (!data) return [];
    const map = new Map<string, { date: string; sales: number; commission: number }>();
    for (const s of data.salesSeries) map.set(s.date, { date: s.date, sales: s.value, commission: 0 });
    for (const c of data.commissionSeries) {
      const entry = map.get(c.date) ?? { date: c.date, sales: 0, commission: 0 };
      entry.commission = c.value;
      map.set(c.date, entry);
    }
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  })();

  return (
    <DashboardShell role={role || "member"} profile={profile}>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
            My performance
          </div>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">My analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">Track your sales, commissions and pipeline in one place.</p>
        </div>
        <Link to="/member" className="text-xs font-semibold text-primary">← Member home</Link>
      </header>

      <div className="mt-6">
        <AnalyticsFilterBar
          days={days}
          setDays={setDays}
          onExport={() => data && downloadCSV(`aawash-me-${range.from.slice(0, 10)}.csv`, merged)}
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
            <StatCard icon={<IndianRupee size={18} />} label="Revenue" value={formatINR(k.revenue, { compact: true })} hint={`${k.revenueGrowth.toFixed(1)}% vs prev`} accent="gold" />
            <StatCard icon={<TrendingUp size={18} />} label="Sales" value={k.salesCount} accent="leaf" />
            <StatCard icon={<IndianRupee size={18} />} label="Commission earned" value={formatINR(k.commissionEarned, { compact: true })} hint={`Pending ${formatINR(k.commissionPending, { compact: true })}`} />
            <StatCard icon={<IndianRupee size={18} />} label="Avg deal" value={formatINR(k.avgDealSize, { compact: true })} />
          </section>

          <section className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard icon={<Users size={18} />} label="Customers" value={k.customers} hint={`${k.newLeads} new · ${k.closed} closed`} />
            <StatCard icon={<CalendarCheck size={18} />} label="Meetings" value={k.meetingsScheduled} hint={`${k.meetingsCompleted} completed`} />
            <StatCard icon={<Wallet size={18} />} label="Wallet" value={formatINR(k.walletBalance, { compact: true })} accent="leaf" />
            <StatCard icon={<Wallet size={18} />} label="Lifetime earned" value={formatINR(k.lifetimeEarnings, { compact: true })} hint={`Withdrawn ${formatINR(k.lifetimeWithdrawn, { compact: true })}`} accent="gold" />
          </section>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <AreaTrendChart data={data.salesSeries} yKey="value" title="My sales trend" />
            <LineDualChart data={merged} series={[{ key: "sales", label: "Sales ₹" }, { key: "commission", label: "Commission ₹" }]} title="Sales vs commission" />
          </div>
        </>
      )}
    </DashboardShell>
  );
}
