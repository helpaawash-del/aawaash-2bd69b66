import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Wallet, IndianRupee, ArrowUpRight, ArrowDownRight, Search, Filter, Lock, Clock, TrendingUp } from "lucide-react";
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
import { getWalletOverview } from "@/lib/wallet.functions";

export const Route = createFileRoute("/_authenticated/member/wallet")({
  component: WalletPage,
  head: () => ({ meta: [{ title: "Wallet — Aawash" }] }),
});

function WalletPage() {
  return (
    <RoleGuard allow={["member", "team_leader", "super_admin"]}>
      <WalletContent />
    </RoleGuard>
  );
}

function WalletContent() {
  const { profile, role } = useSession();
  const fn = useServerFn(getWalletOverview);
  const { data, isLoading } = useQuery({ queryKey: ["wallet", "overview"], queryFn: () => fn() });

  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "credit" | "debit">("all");

  const ledger = data?.ledger ?? [];
  const filtered = useMemo(() => {
    let list = ledger;
    if (filter === "credit") list = list.filter((t) => Number(t.credit) > 0);
    if (filter === "debit") list = list.filter((t) => Number(t.debit) > 0);
    if (q.trim()) {
      const t = q.trim().toLowerCase();
      list = list.filter(
        (x) =>
          x.ref_number.toLowerCase().includes(t) ||
          (x.source ?? "").toLowerCase().includes(t) ||
          (x.remarks ?? "").toLowerCase().includes(t),
      );
    }
    return list;
  }, [ledger, q, filter]);

  const p = data?.profile;
  const available = Number(p?.wallet_balance ?? 0);
  const locked = Number(p?.locked_balance ?? 0);
  const pending = Number(p?.pending_balance ?? 0);
  const lifetime = Number(p?.total_earnings ?? 0);
  const lifetimeWd = Number(p?.lifetime_withdrawals ?? 0);

  return (
    <DashboardShell role={role || "member"} profile={profile}>
      <header>
        <div className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
          Wallet
        </div>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">My wallet</h1>
        <p className="mt-1 text-sm text-muted-foreground">The single source of truth for your earnings.</p>
      </header>

      <section className="mt-6">
        <div className="glass-card relative overflow-hidden rounded-4xl bg-gradient-to-br from-primary via-leaf to-primary p-6 text-primary-foreground shadow-[var(--shadow-float)] sm:p-8">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-gold/30 blur-3xl" />
          <div className="relative flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-[0.16em] opacity-80">Available balance</div>
              <div className="mt-2 text-4xl font-extrabold tracking-tight sm:text-5xl">{formatINR(available)}</div>
              <div className="mt-2 text-xs opacity-90">
                Locked {formatINR(locked)} · Pending {formatINR(pending)}
              </div>
            </div>
            <div className="rounded-3xl bg-white/15 p-3 backdrop-blur">
              <Wallet size={22} />
            </div>
          </div>
          <div className="relative mt-6 flex items-center justify-between text-xs opacity-90">
            <div>
              <div className="opacity-70">Card</div>
              <div className="font-mono">AWSH • {profile?.display_code}</div>
            </div>
            <div>
              <div className="opacity-70">{data?.withinWindow ? "Withdrawals" : "Next window"}</div>
              <div className="font-semibold">{data?.windowLabel ?? "—"}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={<TrendingUp size={18} />} label="Lifetime earnings" value={formatINR(lifetime, { compact: true })} accent="gold" />
        <StatCard icon={<ArrowDownRight size={18} />} label="Lifetime withdrawn" value={formatINR(lifetimeWd, { compact: true })} />
        <StatCard icon={<IndianRupee size={18} />} label="This month" value={formatINR(data?.monthlyEarnings ?? 0, { compact: true })} accent="leaf" />
        <StatCard icon={<Clock size={18} />} label="Today" value={formatINR(data?.todayEarnings ?? 0, { compact: true })} />
      </section>

      <section className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={<Wallet size={18} />} label="Available" value={formatINR(available, { compact: true })} accent="leaf" />
        <StatCard icon={<Lock size={18} />} label="Locked" value={formatINR(locked, { compact: true })} />
        <StatCard icon={<Clock size={18} />} label="Pending" value={formatINR(pending, { compact: true })} />
        <StatCard
          icon={<ArrowUpRight size={18} />}
          label="Last withdrawal"
          value={data?.lastWithdrawal ? formatINR(Number(data.lastWithdrawal.amount), { compact: true }) : "—"}
          hint={data?.lastWithdrawal ? data.lastWithdrawal.status : "—"}
        />
      </section>

      <section className="mt-6 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="Search transactions…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-12 w-full rounded-2xl border border-input bg-surface pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="glass-card flex items-center gap-1 rounded-2xl p-1">
          <Filter size={14} className="ml-2 text-muted-foreground" />
          {(["all", "credit", "debit"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
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
        <SectionCard
          title="Transaction history"
          subtitle={`${filtered.length} entries · immutable ledger`}
          action={
            <Link to="/member/withdrawals" className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
              Withdrawals
            </Link>
          }
        >
          {isLoading ? (
            <div className="grid gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonBlock key={i} className="h-16" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState icon={<Wallet size={22} />} title="No transactions" body="You'll see credits and withdrawals here." />
          ) : (
            <ul className="flex flex-col gap-2">
              {filtered.map((t) => {
                const credit = Number(t.credit || 0);
                const debit = Number(t.debit || 0);
                const isCredit = credit > 0;
                return (
                  <li key={t.id} className="flex items-center gap-3 rounded-2xl border border-border/50 bg-surface p-3">
                    <div
                      className={`grid h-10 w-10 place-items-center rounded-xl ${
                        isCredit ? "bg-success/15 text-success" : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      {isCredit ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-foreground">{t.remarks || t.source}</div>
                      <div className="font-mono text-[10px] text-muted-foreground">
                        {t.ref_number} · {new Date(t.created_at).toLocaleString("en-IN")}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-bold ${isCredit ? "text-success" : "text-destructive"}`}>
                        {isCredit ? "+" : "−"}
                        {formatINR(isCredit ? credit : debit, { compact: true })}
                      </div>
                      <div className="text-[10px] text-muted-foreground">Bal {formatINR(Number(t.running_balance || 0), { compact: true })}</div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>
      </section>
    </DashboardShell>
  );
}
