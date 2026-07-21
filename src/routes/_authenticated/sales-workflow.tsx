import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { FileText, Plus, Search, ChevronRight, ClipboardCheck, Clock, TrendingUp, XCircle } from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { RoleGuard } from "@/components/aawash/AuthGuard";
import { DashboardShell } from "@/components/aawash/DashboardShell";
import {
  SectionCard,
  StatCard,
  EmptyState,
  SkeletonBlock,
  formatINR,
} from "@/components/aawash/dashboard-kit";
import { listSales, salesDashboard } from "@/lib/sales.functions";
import { saleMeta } from "@/components/aawash/sales/status";

export const Route = createFileRoute("/_authenticated/sales-workflow")({
  component: SalesWorkflow,
  head: () => ({ meta: [{ title: "Sales Workflow — Aawash" }] }),
});

function SalesWorkflow() {
  return (
    <RoleGuard allow={["member", "team_leader", "super_admin"]}>
      <SalesWorkflowInner />
    </RoleGuard>
  );
}

function SalesWorkflowInner() {
  const { role, profile } = useSession();
  const fetchOverview = useServerFn(salesDashboard);
  const fetchList = useServerFn(listSales);
  const [scope, setScope] = useState<"mine" | "team" | "all" | "pending">("mine");
  const [q, setQ] = useState("");

  const overviewQ = useQuery({
    queryKey: ["sales-overview"],
    queryFn: () => fetchOverview(),
  });

  const listQ = useQuery({
    queryKey: ["sales-list", scope, q],
    queryFn: () => fetchList({ data: { scope, q: q || undefined, limit: 100 } }),
  });

  return (
    <DashboardShell role={role ?? "member"} profile={profile}>
      <section className="glass-card relative overflow-hidden rounded-4xl p-5 shadow-[var(--shadow-float)] sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-primary/12 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
              Sales Workflow
            </div>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Every sale, <span className="bg-gradient-to-br from-primary to-leaf bg-clip-text text-transparent">fully traceable.</span>
            </h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Draft, submit, approve — every step logged, every inventory update atomic.
            </p>
          </div>
          <Link
            to="/sales-workflow/new"
            className="inline-flex h-11 items-center gap-1.5 rounded-2xl bg-gradient-to-br from-primary to-leaf px-4 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)]"
          >
            <Plus size={14} /> New draft
          </Link>
        </div>
      </section>

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard icon={<FileText className="size-5" />} label="Total Sales" value={overviewQ.data?.totalSales ?? 0} accent="primary" />
        <StatCard icon={<Clock className="size-5" />} label="Awaiting Approval" value={overviewQ.data?.pendingCount ?? 0} accent="gold" />
        <StatCard icon={<ClipboardCheck className="size-5" />} label="Approved" value={overviewQ.data?.approvedCount ?? 0} accent="leaf" />
        <StatCard
          icon={<TrendingUp className="size-5" />}
          label="Booked Value"
          value={formatINR(overviewQ.data?.totalApprovedValue ?? 0, { compact: true })}
          accent="primary"
          animated={false}
        />
      </div>

      <div className="mt-6">
        <SectionCard title="Sales" subtitle="Filter, search, and open any sale to see its lifecycle.">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap gap-1 rounded-full bg-muted/50 p-1">
              {(role === "super_admin"
                ? (["all", "pending", "mine"] as const)
                : role === "team_leader"
                ? (["mine", "team"] as const)
                : (["mine"] as const)
              ).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setScope(s)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition ${
                    scope === s ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                  }`}
                >
                  {s === "all" ? "All" : s === "pending" ? "Approval Queue" : s}
                </button>
              ))}
            </div>
            <div className="relative ml-auto min-w-[220px] flex-1 max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search sale #, buyer, flat…"
                className="w-full rounded-full border border-border/60 bg-background/60 py-2 pl-9 pr-3 text-sm outline-none focus:border-primary/40"
              />
            </div>
          </div>

          {listQ.isLoading ? (
            <div className="mt-4 space-y-2">
              <SkeletonBlock />
              <SkeletonBlock />
              <SkeletonBlock />
            </div>
          ) : (listQ.data?.rows.length ?? 0) === 0 ? (
            <div className="mt-4">
              <EmptyState icon={<XCircle className="size-6" />} title="No sales yet" body="Draft a new sale to get started." />
            </div>
          ) : (
            <ul className="mt-4 space-y-2">
              {listQ.data!.rows.map((r) => {
                const meta = saleMeta(r.sale_status);
                return (
                  <li key={r.id}>
                    <Link
                      to="/sales-workflow/$id"
                      params={{ id: r.id }}
                      className="group flex items-center gap-3 rounded-2xl border border-border/50 bg-card/60 p-3 transition hover:border-primary/40 hover:bg-card"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs text-muted-foreground">{r.sale_number}</span>
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${meta.tint}`}>
                            <span className={`size-1.5 rounded-full ${meta.dot}`} />
                            {meta.label}
                          </span>
                        </div>
                        <div className="mt-1 truncate text-sm font-semibold text-foreground">
                          {r.buyer_name}
                          {r.unit_label ? <span className="text-muted-foreground"> · Flat {r.unit_label}</span> : null}
                        </div>
                        <div className="mt-0.5 truncate text-xs text-muted-foreground">
                          {r.project?.name ?? "—"} · {formatINR(r.deal_value)}
                        </div>
                      </div>
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>
      </div>
    </DashboardShell>
  );
}
