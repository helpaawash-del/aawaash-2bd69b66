import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { IndianRupee, TrendingUp, Clock, Calendar, Sparkles } from "lucide-react";
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
import { getMyCommissionSummary } from "@/lib/member.functions";

export const Route = createFileRoute("/_authenticated/member/commission")({
  component: CommissionPage,
  head: () => ({ meta: [{ title: "Commission — Aawash" }] }),
});

function CommissionPage() {
  return (
    <RoleGuard allow={["member", "team_leader", "super_admin"]}>
      <CommissionContent />
    </RoleGuard>
  );
}

function CommissionContent() {
  const { profile } = useSession();
  const fn = useServerFn(getMyCommissionSummary);
  const { data, isLoading } = useQuery({ queryKey: ["member", "commission"], queryFn: () => fn() });

  return (
    <DashboardShell role="member" profile={profile}>
      <header>
        <div className="inline-flex items-center gap-1.5 rounded-full bg-gold/20 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-gold-foreground">
          Earnings
        </div>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          Commission
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">All the rupees you've earned, in one place.</p>
      </header>

      <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={<Sparkles size={18} />} label="Today" value={formatINR(data?.today ?? 0, { compact: true })} />
        <StatCard icon={<Calendar size={18} />} label="This week" value={formatINR(data?.week ?? 0, { compact: true })} />
        <StatCard icon={<Calendar size={18} />} label="This month" value={formatINR(data?.month ?? 0, { compact: true })} accent="leaf" />
        <StatCard icon={<IndianRupee size={18} />} label="Lifetime" value={formatINR(data?.lifetime ?? 0, { compact: true })} accent="gold" />
      </section>

      <section className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={<Clock size={18} />} label="Pending" value={formatINR(data?.pending ?? 0, { compact: true })} />
      </section>

      <section className="mt-6 grid gap-5 lg:grid-cols-2">
        <SectionCard title="Recently added">
          {isLoading ? (
            <div className="grid gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonBlock key={i} className="h-14" />
              ))}
            </div>
          ) : (data?.recent ?? []).length === 0 ? (
            <EmptyState icon={<IndianRupee size={22} />} title="Nothing yet" body="Newly credited commissions appear here." />
          ) : (
            <ul className="flex flex-col gap-2">
              {(data?.recent ?? []).map((c) => (
                <li key={c.id} className="flex items-center gap-3 rounded-2xl border border-border/50 bg-surface p-3">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-gold/20 text-gold-foreground">
                    <IndianRupee size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-foreground">Tier {c.tier}</div>
                    <div className="text-[11px] capitalize text-muted-foreground">
                      {c.status} · {new Date(c.created_at).toLocaleDateString("en-IN")}
                    </div>
                  </div>
                  <div className="text-sm font-bold text-foreground">{formatINR(c.amount, { compact: true })}</div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Full history" subtitle={`${(data?.history ?? []).length} entries`}>
          {isLoading ? (
            <div className="grid gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonBlock key={i} className="h-14" />
              ))}
            </div>
          ) : (data?.history ?? []).length === 0 ? (
            <EmptyState icon={<TrendingUp size={22} />} title="No commissions" body="Once you close sales, commissions appear here." />
          ) : (
            <ul className="flex max-h-96 flex-col gap-2 overflow-y-auto pr-1">
              {(data?.history ?? []).map((c) => (
                <li key={c.id} className="flex items-center gap-3 rounded-2xl border border-border/50 bg-surface p-3">
                  <div className={`grid h-9 w-9 place-items-center rounded-xl ${c.status === "pending" ? "bg-warning/15 text-warning" : "bg-success/15 text-success"}`}>
                    <IndianRupee size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-foreground">Tier {c.tier}</div>
                    <div className="text-[11px] capitalize text-muted-foreground">
                      {c.status} · {new Date(c.created_at).toLocaleDateString("en-IN")}
                    </div>
                  </div>
                  <div className="text-sm font-bold text-foreground">{formatINR(c.amount, { compact: true })}</div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </section>
    </DashboardShell>
  );
}
