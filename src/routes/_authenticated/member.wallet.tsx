import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Wallet, IndianRupee, ArrowUpRight, ArrowDownRight, Search, Filter } from "lucide-react";
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
import { getMyWallet } from "@/lib/member.functions";

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
  const { profile } = useSession();
  const fn = useServerFn(getMyWallet);
  const { data, isLoading } = useQuery({ queryKey: ["member", "wallet"], queryFn: () => fn() });

  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "commission" | "withdrawal">("all");

  const filtered = useMemo(() => {
    let list = data?.transactions ?? [];
    if (filter !== "all") list = list.filter((t) => t.type === filter);
    if (q.trim()) {
      const t = q.trim().toLowerCase();
      list = list.filter(
        (x) =>
          x.reference.toLowerCase().includes(t) ||
          x.source.toLowerCase().includes(t) ||
          String(x.amount).includes(t),
      );
    }
    return list;
  }, [data, q, filter]);

  return (
    <DashboardShell role="member" profile={profile}>
      <header>
        <div className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
          Wallet
        </div>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">My wallet</h1>
        <p className="mt-1 text-sm text-muted-foreground">Money in, money out — beautifully.</p>
      </header>

      <section className="mt-6">
        <div className="glass-card relative overflow-hidden rounded-4xl bg-gradient-to-br from-primary via-leaf to-primary p-6 text-primary-foreground shadow-[var(--shadow-float)] sm:p-8">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-gold/30 blur-3xl" />
          <div className="relative flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-[0.16em] opacity-80">
                Available balance
              </div>
              <div className="mt-2 text-4xl font-extrabold tracking-tight sm:text-5xl">
                {formatINR(data?.profile?.wallet_balance ?? profile?.wallet_balance ?? 0)}
              </div>
              <div className="mt-2 text-xs opacity-90">
                Pending {formatINR(data?.pending ?? 0)}
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
              <div className="opacity-70">Holder</div>
              <div className="font-semibold">{profile?.full_name}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={<IndianRupee size={18} />} label="Total earnings" value={formatINR(data?.profile?.total_earnings ?? profile?.total_earnings ?? 0, { compact: true })} accent="gold" />
        <StatCard icon={<IndianRupee size={18} />} label="Pending" value={formatINR(data?.pending ?? 0, { compact: true })} />
        <StatCard
          icon={<ArrowDownRight size={18} />}
          label="Last withdrawal"
          value={data?.lastWithdrawal ? formatINR(data.lastWithdrawal.amount, { compact: true }) : "—"}
          hint={data?.lastWithdrawal ? new Date(data.lastWithdrawal.requested_at).toLocaleDateString("en-IN") : "No requests yet"}
        />
        <StatCard
          icon={<ArrowUpRight size={18} />}
          label="Status"
          value={data?.lastWithdrawal?.status ?? "—"}
          accent="leaf"
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
          {(["all", "commission", "withdrawal"] as const).map((k) => (
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
          subtitle={`${filtered.length} entries`}
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
              {filtered.map((t) => (
                <li key={t.id} className="flex items-center gap-3 rounded-2xl border border-border/50 bg-surface p-3">
                  <div
                    className={`grid h-10 w-10 place-items-center rounded-xl ${
                      t.type === "commission" ? "bg-success/15 text-success" : "bg-destructive/10 text-destructive"
                    }`}
                  >
                    {t.type === "commission" ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-foreground">{t.source}</div>
                    <div className="font-mono text-[10px] text-muted-foreground">
                      {t.reference} · {new Date(t.date).toLocaleDateString("en-IN")}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-bold ${t.amount < 0 ? "text-destructive" : "text-success"}`}>
                      {t.amount < 0 ? "" : "+"}
                      {formatINR(Math.abs(t.amount), { compact: true })}
                    </div>
                    <div className="text-[10px] capitalize text-muted-foreground">{t.status}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </section>
    </DashboardShell>
  );
}
