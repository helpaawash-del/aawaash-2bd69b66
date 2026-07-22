import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  IndianRupee,
  Building2,
  Users,
  Wallet,
  Trophy,
  TrendingUp,
  Home,
  Printer,
  FileSpreadsheet,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { RoleGuard } from "@/components/aawash/AuthGuard";
import { AdminShell } from "@/components/aawash/admin/AdminShell";
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
import { getAdminOverview } from "@/lib/admin-overview.functions";

export const Route = createFileRoute("/_authenticated/admin/reports")({
  component: Page,
  head: () => ({
    meta: [
      { title: "Reports & Executive Command Center — Aawash" },
      { name: "description", content: "Executive KPIs, leaderboards, financial and operational reports for Aawash." },
    ],
  }),
});

const REPORT_TABS = [
  { key: "executive", label: "Executive" },
  { key: "sales", label: "Sales" },
  { key: "financial", label: "Financial" },
  { key: "commission", label: "Commission" },
  { key: "projects", label: "Projects" },
  { key: "inventory", label: "Inventory" },
  { key: "leaders", label: "Team Leaders" },
  { key: "members", label: "Members" },
  { key: "crm", label: "CRM" },
  { key: "activity", label: "Activity" },
] as const;

type TabKey = (typeof REPORT_TABS)[number]["key"];

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
  const [tab, setTab] = useState<TabKey>("executive");

  const analyticsFn = useServerFn(getAdminAnalytics);
  const boardsFn = useServerFn(getLeaderboards);
  const overviewFn = useServerFn(getAdminOverview);

  const { data, isLoading } = useQuery({
    queryKey: ["reports", "admin", range.from, range.to],
    queryFn: () => analyticsFn({ data: range }),
    refetchOnWindowFocus: true,
  });
  const { data: boards } = useQuery({
    queryKey: ["reports", "boards", range.from, range.to],
    queryFn: () => boardsFn({ data: range }),
  });
  const { data: overview } = useQuery({
    queryKey: ["reports", "overview"],
    queryFn: () => overviewFn(),
  });

  const k = data?.kpi;

  const topLeader = boards?.leaders?.[0];
  const topMember = boards?.members?.[0];
  const topProject = boards?.projects?.[0];

  const handlePrint = () => window.print();

  const handleExportCurrent = () => {
    switch (tab) {
      case "sales":
        downloadCSV(`sales-report-${range.from.slice(0, 10)}.csv`, (data?.salesSeries ?? []).map((r) => ({
          date: r.date, sales_count: r.count, revenue: r.value,
        })));
        break;
      case "projects":
        downloadCSV(`projects-report.csv`, (data?.salesByProject ?? []).map((r) => ({
          project: r.name, sales: r.count, revenue: r.value,
        })));
        break;
      case "leaders":
        downloadCSV(`leaders-report.csv`, (boards?.leaders ?? []).map((r) => ({
          name: r.name, team: r.team ?? "", sales: r.sales, revenue: r.revenue,
        })));
        break;
      case "members":
        downloadCSV(`members-report.csv`, (boards?.members ?? []).map((r) => ({
          name: r.name, sales: r.sales, revenue: r.revenue,
        })));
        break;
      case "inventory":
        downloadCSV(`inventory-report.csv`, [
          { metric: "Total Flats", value: k?.totalFlats ?? 0 },
          { metric: "Available", value: k?.availableFlats ?? 0 },
          { metric: "Reserved", value: k?.reservedFlats ?? 0 },
          { metric: "Sold", value: k?.soldFlats ?? 0 },
        ]);
        break;
      case "financial":
        downloadCSV(`financial-report-${range.from.slice(0, 10)}.csv`, [
          { metric: "Total Revenue", value: k?.totalRevenue ?? 0 },
          { metric: "Range Revenue", value: k?.rangeRevenue ?? 0 },
          { metric: "Commission Paid", value: k?.totalCommissionPaid ?? 0 },
          { metric: "Pending Commission", value: k?.pendingCommission ?? 0 },
          { metric: "Wallet Balance", value: k?.totalWalletBalance ?? 0 },
          { metric: "Withdrawals Paid", value: k?.totalWithdrawals ?? 0 },
          { metric: "Pending Withdrawals", value: k?.pendingWithdrawals ?? 0 },
        ]);
        break;
      case "commission":
        downloadCSV(`commission-report.csv`, [
          { metric: "Total Paid", value: k?.totalCommissionPaid ?? 0 },
          { metric: "Pending", value: k?.pendingCommission ?? 0 },
        ]);
        break;
      case "crm":
        downloadCSV(`crm-report.csv`, [
          { stage: "New Leads", count: data?.funnel.newLeads ?? 0 },
          { stage: "Qualified", count: data?.funnel.qualified ?? 0 },
          { stage: "Meetings", count: data?.funnel.meetingStage ?? 0 },
          { stage: "Closed", count: data?.funnel.closed ?? 0 },
          { stage: "Lost", count: data?.funnel.lost ?? 0 },
        ]);
        break;
      case "activity":
        downloadCSV(`activity-report.csv`, (overview?.activity ?? []).map((a) => ({
          action: a.action, resource: a.entity_type, at: a.created_at,
        })));
        break;
      default:
        downloadCSV(`executive-summary.csv`, [
          { kpi: "Total Revenue", value: k?.totalRevenue ?? 0 },
          { kpi: "Range Revenue", value: k?.rangeRevenue ?? 0 },
          { kpi: "Revenue Growth %", value: (k?.revenueGrowth ?? 0).toFixed(2) },
          { kpi: "Total Sales", value: k?.totalSales ?? 0 },
          { kpi: "Range Sales", value: k?.rangeSales ?? 0 },
          { kpi: "Avg Sale", value: k?.avgSaleValue ?? 0 },
          { kpi: "Approval Rate %", value: (k?.approvalRate ?? 0).toFixed(2) },
          { kpi: "Cancellation Rate %", value: (k?.cancellationRate ?? 0).toFixed(2) },
          { kpi: "Total Projects", value: k?.totalProjects ?? 0 },
          { kpi: "Total Flats", value: k?.totalFlats ?? 0 },
          { kpi: "Sold Flats", value: k?.soldFlats ?? 0 },
          { kpi: "Customers", value: k?.totalCustomers ?? 0 },
          { kpi: "Team Leaders", value: k?.totalLeaders ?? 0 },
          { kpi: "Members", value: k?.totalMembers ?? 0 },
        ]);
    }
  };

  const funnelDonut = useMemo(
    () => [
      { name: "New", value: data?.funnel.newLeads ?? 0 },
      { name: "Qualified", value: data?.funnel.qualified ?? 0 },
      { name: "Meetings", value: data?.funnel.meetingStage ?? 0 },
      { name: "Closed", value: data?.funnel.closed ?? 0 },
      { name: "Lost", value: data?.funnel.lost ?? 0 },
    ],
    [data],
  );

  const inventoryDonut = useMemo(
    () => [
      { name: "Available", value: k?.availableFlats ?? 0 },
      { name: "Reserved", value: k?.reservedFlats ?? 0 },
      { name: "Sold", value: k?.soldFlats ?? 0 },
    ],
    [k],
  );

  return (
    <AdminShell role="super_admin" profile={profile}>
      <header className="flex flex-wrap items-end justify-between gap-3 print:hidden">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
            <Sparkles size={12} /> Executive Command Center
          </div>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">Reports & Business Intelligence</h1>
          <p className="mt-1 text-sm text-muted-foreground">Every insight sourced live from the platform — no duplicated calculations.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/admin/analytics" className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-surface px-3 text-xs font-semibold text-foreground shadow-[var(--shadow-soft)] hover:bg-surface-warm">
            Analytics <ArrowRight size={14} />
          </Link>
          <button onClick={handlePrint} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-surface px-3 text-xs font-semibold text-foreground shadow-[var(--shadow-soft)] hover:bg-surface-warm">
            <Printer size={14} /> Print / PDF
          </button>
        </div>
      </header>

      <div className="print:hidden">
        <AnalyticsFilterBar days={days} setDays={setDays} onExport={handleExportCurrent} />
      </div>

      <nav className="glass-card flex flex-wrap gap-1 rounded-3xl p-2 print:hidden">
        {REPORT_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`h-9 rounded-xl px-3 text-xs font-semibold transition-colors ${
              tab === t.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {isLoading || !k ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonBlock key={i} className="h-28" />)}
        </div>
      ) : (
        <>
          {tab === "executive" && (
            <section className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard icon={<IndianRupee size={18} />} label="Revenue (range)" value={formatINR(k.rangeRevenue, { compact: true })} hint={`Lifetime ${formatINR(k.totalRevenue, { compact: true })}`} accent="primary" />
                <StatCard icon={<TrendingUp size={18} />} label="Growth" value={`${k.revenueGrowth.toFixed(1)}%`} hint="vs previous window" accent="leaf" />
                <StatCard icon={<Home size={18} />} label="Sales (range)" value={k.rangeSales} hint={`Lifetime ${k.totalSales}`} accent="gold" />
                <StatCard icon={<Wallet size={18} />} label="Wallet balance" value={formatINR(k.totalWalletBalance, { compact: true })} hint={`Pending ${formatINR(k.pendingWithdrawals, { compact: true })}`} accent="primary" />
                <StatCard icon={<Building2 size={18} />} label="Projects" value={k.totalProjects} hint={`${k.availableFlats} flats available`} />
                <StatCard icon={<Users size={18} />} label="Customers" value={k.totalCustomers} hint={`${k.totalLeaders} leaders · ${k.totalMembers} members`} />
                <StatCard icon={<Trophy size={18} />} label="Approval rate" value={`${k.approvalRate.toFixed(0)}%`} hint={`Cancel ${k.cancellationRate.toFixed(0)}%`} accent="leaf" />
                <StatCard icon={<IndianRupee size={18} />} label="Commission paid" value={formatINR(k.totalCommissionPaid, { compact: true })} hint={`Pending ${formatINR(k.pendingCommission, { compact: true })}`} accent="gold" />
              </div>
              <div className="grid gap-3 lg:grid-cols-2">
                <AreaTrendChart data={data!.salesSeries.map((s) => ({ date: s.date.slice(5), value: s.value }))} title="Revenue trend" />
                <BarCompareChart data={(data!.salesByProject).slice(0, 8).map((p) => ({ name: p.name, value: p.value }))} title="Revenue by project" />
              </div>
              <div className="grid gap-3 lg:grid-cols-3">
                <SectionCard title="Top Team Leader">
                  {topLeader ? (
                    <div>
                      <p className="text-lg font-bold">{topLeader.name}</p>
                      <p className="text-xs text-muted-foreground">{topLeader.team ?? "—"}</p>
                      <p className="mt-2 text-2xl font-extrabold text-primary">{formatINR(topLeader.revenue, { compact: true })}</p>
                      <p className="text-xs text-muted-foreground">{topLeader.sales} sales</p>
                    </div>
                  ) : <p className="text-sm text-muted-foreground">No data.</p>}
                </SectionCard>
                <SectionCard title="Top Member">
                  {topMember ? (
                    <div>
                      <p className="text-lg font-bold">{topMember.name}</p>
                      <p className="mt-2 text-2xl font-extrabold text-primary">{formatINR(topMember.revenue, { compact: true })}</p>
                      <p className="text-xs text-muted-foreground">{topMember.sales} sales</p>
                    </div>
                  ) : <p className="text-sm text-muted-foreground">No data.</p>}
                </SectionCard>
                <SectionCard title="Top Project">
                  {topProject ? (
                    <div>
                      <p className="text-lg font-bold">{topProject.name}</p>
                      <p className="mt-2 text-2xl font-extrabold text-primary">{formatINR(topProject.revenue, { compact: true })}</p>
                      <p className="text-xs text-muted-foreground">{topProject.sales} sales · {topProject.occupancy.toFixed(0)}% occupied</p>
                    </div>
                  ) : <p className="text-sm text-muted-foreground">No data.</p>}
                </SectionCard>
              </div>
            </section>
          )}

          {tab === "sales" && (
            <section className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard icon={<Home size={18} />} label="Total sales" value={k.totalSales} />
                <StatCard icon={<Home size={18} />} label="In range" value={k.rangeSales} hint={`${k.revenueGrowth.toFixed(1)}% vs prev`} />
                <StatCard icon={<IndianRupee size={18} />} label="Avg sale" value={formatINR(k.avgSaleValue, { compact: true })} />
                <StatCard icon={<TrendingUp size={18} />} label="Highest" value={formatINR(k.highestSale, { compact: true })} />
              </div>
              <AreaTrendChart data={data!.salesSeries.map((s) => ({ date: s.date.slice(5), value: s.value }))} title="Sales trend" />
              <BarCompareChart data={(data!.salesByProject).slice(0, 10).map((p) => ({ name: p.name, value: p.count }))} title="Sales count by project" />
            </section>
          )}

          {tab === "financial" && (
            <section className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard icon={<IndianRupee size={18} />} label="Gross revenue" value={formatINR(k.totalRevenue, { compact: true })} accent="primary" />
                <StatCard icon={<IndianRupee size={18} />} label="Range revenue" value={formatINR(k.rangeRevenue, { compact: true })} accent="leaf" />
                <StatCard icon={<Wallet size={18} />} label="Wallet balance" value={formatINR(k.totalWalletBalance, { compact: true })} />
                <StatCard icon={<Wallet size={18} />} label="Withdrawals paid" value={formatINR(k.totalWithdrawals, { compact: true })} />
                <StatCard icon={<Wallet size={18} />} label="Pending withdrawals" value={formatINR(k.pendingWithdrawals, { compact: true })} accent="destructive" />
                <StatCard icon={<IndianRupee size={18} />} label="Commission paid" value={formatINR(k.totalCommissionPaid, { compact: true })} accent="gold" />
                <StatCard icon={<IndianRupee size={18} />} label="Pending commission" value={formatINR(k.pendingCommission, { compact: true })} />
                <StatCard icon={<TrendingUp size={18} />} label="Growth" value={`${k.revenueGrowth.toFixed(1)}%`} accent="leaf" />
              </div>
              <AreaTrendChart data={data!.salesSeries.map((s) => ({ date: s.date.slice(5), value: s.value }))} title="Revenue trend" />
            </section>
          )}

          {tab === "commission" && (
            <section className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <StatCard icon={<IndianRupee size={18} />} label="Total paid" value={formatINR(k.totalCommissionPaid, { compact: true })} accent="gold" />
                <StatCard icon={<IndianRupee size={18} />} label="Pending" value={formatINR(k.pendingCommission, { compact: true })} />
                <StatCard icon={<Wallet size={18} />} label="In wallets" value={formatINR(k.totalWalletBalance, { compact: true })} />
              </div>
              <DonutBreakdown data={[{ name: "Paid", value: k.totalCommissionPaid }, { name: "Pending", value: k.pendingCommission }, { name: "Wallet", value: k.totalWalletBalance }]} title="Commission distribution" />
            </section>
          )}

          {tab === "projects" && (
            <section className="space-y-4">
              <BarCompareChart data={(data!.salesByProject).map((p) => ({ name: p.name, value: p.value }))} title="Revenue by project" />
              <SectionCard title="Project performance">
                <ReportTable
                  columns={["Project", "Sales", "Revenue", "Occupancy"]}
                  rows={(boards?.projects ?? []).map((p) => [p.name, p.sales, formatINR(p.revenue, { compact: true }), `${p.occupancy.toFixed(0)}%`])}
                />
              </SectionCard>
            </section>
          )}

          {tab === "inventory" && (
            <section className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard icon={<Building2 size={18} />} label="Total flats" value={k.totalFlats} />
                <StatCard icon={<Building2 size={18} />} label="Available" value={k.availableFlats} accent="leaf" />
                <StatCard icon={<Building2 size={18} />} label="Reserved" value={k.reservedFlats} accent="gold" />
                <StatCard icon={<Building2 size={18} />} label="Sold" value={k.soldFlats} accent="primary" />
              </div>
              <DonutBreakdown data={inventoryDonut} title="Inventory utilization" />
            </section>
          )}

          {tab === "leaders" && (
            <SectionCard title="Team Leader leaderboard">
              <ReportTable
                columns={["#", "Leader", "Team", "Sales", "Revenue"]}
                rows={(boards?.leaders ?? []).map((l, i) => [i + 1, l.name, l.team ?? "—", l.sales, formatINR(l.revenue, { compact: true })])}
              />
            </SectionCard>
          )}

          {tab === "members" && (
            <SectionCard title="Member leaderboard">
              <ReportTable
                columns={["#", "Member", "Sales", "Revenue"]}
                rows={(boards?.members ?? []).map((m, i) => [i + 1, m.name, m.sales, formatINR(m.revenue, { compact: true })])}
              />
            </SectionCard>
          )}

          {tab === "crm" && (
            <section className="space-y-4">
              <DonutBreakdown data={funnelDonut} title="Lead funnel" />
              <SectionCard title="Funnel breakdown">
                <ReportTable
                  columns={["Stage", "Count"]}
                  rows={funnelDonut.map((f) => [f.name, f.value])}
                />
              </SectionCard>
            </section>
          )}

          {tab === "activity" && (
            <SectionCard title="Recent platform activity">
              {overview?.activity?.length ? (
                <ul className="divide-y divide-border">
                  {overview.activity.map((a, i) => (
                    <li key={i} className="flex items-center justify-between gap-3 py-2 text-sm">
                      <div>
                        <p className="font-semibold text-foreground">{a.action}</p>
                        <p className="text-xs text-muted-foreground">{a.entity_type}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-muted-foreground">No recent activity.</p>}
            </SectionCard>
          )}
        </>
      )}

      <footer className="text-center text-[11px] text-muted-foreground print:mt-6">
        Generated {new Date().toLocaleString()} · Aawash Executive BI · Source: live platform data
      </footer>
    </AdminShell>
  );
}

function ReportTable({ columns, rows }: { columns: string[]; rows: Array<Array<string | number>> }) {
  if (!rows.length) return <p className="text-sm text-muted-foreground">No records.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
            {columns.map((c) => <th key={c} className="px-2 py-2 font-semibold">{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-border/50 hover:bg-surface-warm">
              {r.map((cell, j) => <td key={j} className="px-2 py-2">{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
