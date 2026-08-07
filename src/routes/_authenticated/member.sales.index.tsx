import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search, TrendingUp, ChevronRight, Filter } from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { RoleGuard } from "@/components/aawash/AuthGuard";
import { DashboardShell } from "@/components/aawash/DashboardShell";
import {
  SectionCard,
  EmptyState,
  SkeletonBlock,
  formatINR,
} from "@/components/aawash/dashboard-kit";
import { listMySales } from "@/lib/member.functions";

export const Route = createFileRoute("/_authenticated/member/sales/")({
  component: SalesPage,
  head: () => ({ meta: [{ title: "My Sales — Aawash" }] }),
});

function SalesPage() {
  return (
    <RoleGuard allow={["member", "team_leader", "super_admin"]}>
      <SalesContent />
    </RoleGuard>
  );
}

function SalesContent() {
  const { profile } = useSession();
  const fn = useServerFn(listMySales);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "confirmed" | "pending" | "cancelled">("all");
  const [page, setPage] = useState(1);
  const perPage = 10;

  const { data, isLoading } = useQuery({
    queryKey: ["member", "sales"],
    queryFn: () => fn(),
  });

  const filtered = useMemo(() => {
    let list = data ?? [];
    if (filter !== "all") list = list.filter((s) => s.status === filter);
    if (q.trim()) {
      const t = q.trim().toLowerCase();
      list = list.filter(
        (s) =>
          s.buyer_name.toLowerCase().includes(t) ||
          (s.unit_label || "").toLowerCase().includes(t) ||
          (s.project?.name || "").toLowerCase().includes(t) ||
          s.id.toLowerCase().includes(t),
      );
    }
    return list;
  }, [data, q, filter]);

  const total = filtered.length;
  const pageCount = Math.max(1, Math.ceil(total / perPage));
  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  return (
    <DashboardShell role="member" profile={profile}>
      <header>
        <div className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
          Sales
        </div>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          My sales
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {total} {total === 1 ? "deal" : "deals"} · newest first
        </p>
      </header>

      <section className="mt-6 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="Search buyer, unit, or project…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            className="h-12 w-full rounded-2xl border border-input bg-surface pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="glass-card flex items-center gap-1 rounded-2xl p-1">
          <Filter size={14} className="ml-2 text-muted-foreground" />
          {(["all", "confirmed", "pending", "cancelled"] as const).map((k) => (
            <button
              key={k}
              onClick={() => {
                setFilter(k);
                setPage(1);
              }}
              className={`h-10 rounded-xl px-3 text-xs font-semibold capitalize transition-colors ${
                filter === k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {k}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-4">
        <SectionCard title="Sales history">
          {isLoading ? (
            <div className="grid gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonBlock key={i} className="h-20" />
              ))}
            </div>
          ) : paged.length === 0 ? (
            <EmptyState
              icon={<TrendingUp size={22} />}
              title={q || filter !== "all" ? "No matches" : "No sales yet"}
              body={
                q || filter !== "all"
                  ? "Try a different search or filter."
                  : "Your first sale will appear here."
              }
            />
          ) : (
            <>
              <ul className="flex flex-col gap-2">
                {paged.map((s) => (
                  <li key={s.id}>
                    <Link
                      to="/member/sales/$id"
                      params={{ id: s.id }}
                      className="flex items-center gap-3 rounded-2xl border border-border/50 bg-surface p-3 transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-soft)]"
                    >
                      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                        <TrendingUp size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-foreground">
                          {s.buyer_name}
                        </div>
                        <div className="truncate text-[11px] text-muted-foreground">
                          {s.project?.name || "Project"} · {s.unit_label || "Unit"}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px]">
                          <StatusPill label={s.status} kind="status" />
                          <StatusPill label={s.payment_status} kind="payment" />
                          <span className="text-muted-foreground">
                            {new Date(s.sale_date).toLocaleDateString("en-IN")}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-foreground">
                          {formatINR(s.deal_value, { compact: true })}
                        </div>
                        {s.commission && (
                          <div className="text-[10px] font-semibold text-gold-foreground">
                            +{formatINR(s.commission.amount, { compact: true })}
                          </div>
                        )}
                      </div>
                      <ChevronRight size={16} className="text-muted-foreground" />
                    </Link>
                  </li>
                ))}
              </ul>
              {pageCount > 1 && (
                <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="h-9 rounded-xl border border-border bg-surface px-3 font-semibold disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <span>
                    Page {page} of {pageCount}
                  </span>
                  <button
                    disabled={page === pageCount}
                    onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                    className="h-9 rounded-xl border border-border bg-surface px-3 font-semibold disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </SectionCard>
      </section>
    </DashboardShell>
  );
}

function StatusPill({ label, kind }: { label: string; kind: "status" | "payment" }) {
  const map: Record<string, string> =
    kind === "status"
      ? {
          confirmed: "bg-success/15 text-success",
          pending: "bg-warning/15 text-warning",
          cancelled: "bg-destructive/10 text-destructive",
        }
      : {
          paid: "bg-success/15 text-success",
          partial: "bg-warning/15 text-warning",
          pending: "bg-muted text-muted-foreground",
        };
  const cls = map[label] || "bg-muted text-muted-foreground";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${cls}`}>
      {label}
    </span>
  );
}
