import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Banknote,
  Coins,
  Wallet,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Gift,
  ScrollText,
  BarChart3,
  Download,
  Search,
  Sparkles,
  Landmark,
  Layers,
} from "lucide-react";
import { RoleGuard } from "@/components/aawash/AuthGuard";
import { AdminShell } from "@/components/aawash/admin/AdminShell";
import { useSession } from "@/hooks/useSession";
import { SectionCard, StatCard, formatINR, EmptyState, SkeletonBlock } from "@/components/aawash/dashboard-kit";
import {
  getFinancialDashboard,
  listAllWallets,
  getWalletLedger,
  adjustWallet,
  getRevenueBreakdown,
  listAllLedger,
  listBonusHistory,
} from "@/lib/finance-admin.functions";

export const Route = createFileRoute("/_authenticated/admin/finance")({
  component: () => (
    <RoleGuard allow={["super_admin"]}>
      <Content />
    </RoleGuard>
  ),
  head: () => ({
    meta: [
      { title: "Financial Console — Aawash" },
      { name: "description", content: "Executive financial control: revenue, commissions, wallets, withdrawals, bonuses and immutable ledger." },
      { property: "og:title", content: "Financial Console — Aawash" },
      { property: "og:description", content: "Enterprise Financial Management for Aawash." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Tab = "overview" | "wallets" | "ledger" | "bonuses" | "revenue" | "reports";

function Content() {
  const { profile } = useSession();
  const [tab, setTab] = useState<Tab>("overview");

  const dashFn = useServerFn(getFinancialDashboard);
  const dash = useQuery({ queryKey: ["fin-dashboard"], queryFn: () => dashFn() });

  return (
    <AdminShell profile={profile}>
      <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
        <header className="glass-card rounded-3xl p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
                <Landmark className="h-4 w-4" /> Financial Control Center
              </div>
              <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Enterprise Financial Console</h1>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Single source of truth for revenue, commissions, wallets, withdrawals, bonuses and the immutable ledger.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to="/admin/commissions" className="pill-btn"><Coins className="h-4 w-4" /> Commissions</Link>
              <Link to="/admin/withdrawals" className="pill-btn"><Wallet className="h-4 w-4" /> Withdrawals</Link>
            </div>
          </div>
        </header>

        <nav className="glass-card sticky top-16 z-30 flex flex-wrap gap-1 rounded-2xl p-1 text-sm">
          {([
            ["overview", "Overview", BarChart3],
            ["wallets", "Wallets", Wallet],
            ["ledger", "Ledger", ScrollText],
            ["bonuses", "Bonuses", Gift],
            ["revenue", "Revenue", TrendingUp],
            ["reports", "Reports", Download],
          ] as [Tab, string, typeof BarChart3][]).map(([k, label, Icon]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-semibold transition ${
                tab === k ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <Icon className="h-3.5 w-3.5" /> {label}
            </button>
          ))}
        </nav>

        {dash.isLoading && <SkeletonBlock className="h-40" />}
        {dash.data && tab === "overview" && <Overview data={dash.data} />}
        {tab === "wallets" && <WalletsTab />}
        {tab === "ledger" && <LedgerTab />}
        {tab === "bonuses" && <BonusesTab />}
        {tab === "revenue" && <RevenueTab />}
        {tab === "reports" && <ReportsTab />}
      </div>
    </AdminShell>
  );
}

/* ---------------- Overview ---------------- */

function Overview({ data }: { data: Awaited<ReturnType<typeof getFinancialDashboard>> }) {
  const { revenue, commission, wallet, withdrawals, net, flow } = data;
  return (
    <>
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard icon={<Banknote className="h-4 w-4" />} label="Total Revenue" value={formatINR(revenue.total)} hint={`${revenue.count} sales`} accent="gold" />
        <StatCard icon={<TrendingUp className="h-4 w-4" />} label="Today" value={formatINR(revenue.today)} />
        <StatCard icon={<TrendingUp className="h-4 w-4" />} label="This Month" value={formatINR(revenue.month)} />
        <StatCard icon={<TrendingUp className="h-4 w-4" />} label="This Year" value={formatINR(revenue.year)} />
        <StatCard icon={<Coins className="h-4 w-4" />} label="Commission — Total" value={formatINR(commission.total)} accent="leaf" />
        <StatCard icon={<Coins className="h-4 w-4" />} label="Pending" value={formatINR(commission.pending)} />
        <StatCard icon={<Coins className="h-4 w-4" />} label="Approved" value={formatINR(commission.approved)} />
        <StatCard icon={<Coins className="h-4 w-4" />} label="Paid" value={formatINR(commission.paid)} />
        <StatCard icon={<Wallet className="h-4 w-4" />} label="Wallet Balances" value={formatINR(wallet.balance)} accent="leaf" />
        <StatCard icon={<Wallet className="h-4 w-4" />} label="Pending Balances" value={formatINR(wallet.pending)} />
        <StatCard icon={<Wallet className="h-4 w-4" />} label="Locked Balances" value={formatINR(wallet.locked)} />
        <StatCard icon={<Sparkles className="h-4 w-4" />} label="Net Earnings" value={formatINR(net)} accent="gold" />
        <StatCard icon={<ArrowUpRight className="h-4 w-4" />} label="Withdrawals Pending" value={formatINR(withdrawals.pending)} hint={`${withdrawals.pendingCount} requests`} />
        <StatCard icon={<ArrowUpRight className="h-4 w-4" />} label="Withdrawals Completed" value={formatINR(withdrawals.completed)} hint={`${withdrawals.completedCount} paid`} />
        <StatCard icon={<ArrowDownRight className="h-4 w-4" />} label="Withdrawals Rejected" value={formatINR(withdrawals.rejected)} hint={`${withdrawals.rejectedCount} rejected`} accent="destructive" />
        <StatCard icon={<Gift className="h-4 w-4" />} label="Bonuses Paid" value={formatINR(commission.bonus)} accent="gold" />
      </section>

      <SectionCard title="Ledger flow — last 30 days">
        {flow.length === 0 ? (
          <EmptyState icon={null} title="No ledger activity yet" body="Commission credits and withdrawals will show here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr><th className="py-2">Date</th><th className="py-2 text-right">Credits</th><th className="py-2 text-right">Debits</th><th className="py-2 text-right">Net</th></tr>
              </thead>
              <tbody>
                {flow.slice(-14).reverse().map((f) => (
                  <tr key={f.day} className="border-t border-border/60">
                    <td className="py-2 font-medium">{f.day}</td>
                    <td className="py-2 text-right text-primary">{formatINR(f.credit)}</td>
                    <td className="py-2 text-right text-destructive">{formatINR(f.debit)}</td>
                    <td className="py-2 text-right font-semibold">{formatINR(f.credit - f.debit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </>
  );
}

/* ---------------- Wallets ---------------- */

function WalletsTab() {
  const [q, setQ] = useState("");
  const [role, setRole] = useState<"all" | "team_leader" | "member">("all");
  const [selected, setSelected] = useState<string | null>(null);
  const listFn = useServerFn(listAllWallets);
  const list = useQuery({ queryKey: ["fin-wallets", q, role], queryFn: () => listFn({ data: { q: q || undefined, role } as never }) });

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
      <SectionCard title="Wallets">
        <div className="mb-3 flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, login ID, mobile" className="w-full rounded-xl border border-border bg-background py-2 pl-9 pr-3 text-sm" />
          </div>
          <select value={role} onChange={(e) => setRole(e.target.value as "all" | "team_leader" | "member")} className="rounded-xl border border-border bg-background px-3 py-2 text-sm">
            <option value="all">All roles</option>
            <option value="team_leader">Team Leaders</option>
            <option value="member">Members</option>
          </select>
        </div>
        {list.isLoading ? (
          <SkeletonBlock />
        ) : !list.data?.length ? (
          <EmptyState icon={null} title="No wallets" body="Try a different filter." />
        ) : (
          <div className="max-h-[560px] overflow-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/60 text-left text-xs uppercase text-muted-foreground">
                <tr><th className="p-2">User</th><th className="p-2 text-right">Available</th><th className="p-2 text-right">Pending</th><th className="p-2 text-right">Lifetime</th></tr>
              </thead>
              <tbody>
                {list.data.map((w) => (
                  <tr
                    key={w.id}
                    onClick={() => setSelected(w.id)}
                    className={`cursor-pointer border-t border-border/60 hover:bg-muted/40 ${selected === w.id ? "bg-primary/5" : ""}`}
                  >
                    <td className="p-2">
                      <div className="font-semibold">{w.full_name}</div>
                      <div className="text-xs text-muted-foreground">{w.login_id}</div>
                    </td>
                    <td className="p-2 text-right font-semibold">{formatINR(w.wallet_balance)}</td>
                    <td className="p-2 text-right">{formatINR(w.pending_balance)}</td>
                    <td className="p-2 text-right">{formatINR(w.total_earnings)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
      <WalletDetail userId={selected} />
    </div>
  );
}

function WalletDetail({ userId }: { userId: string | null }) {
  const qc = useQueryClient();
  const ledgerFn = useServerFn(getWalletLedger);
  const adjustFn = useServerFn(adjustWallet);
  const q = useQuery({
    queryKey: ["fin-wallet-ledger", userId],
    queryFn: () => ledgerFn({ data: { user_id: userId!, limit: 100 } as never }),
    enabled: !!userId,
  });
  const [amount, setAmount] = useState("");
  const [direction, setDirection] = useState<"credit" | "debit">("credit");
  const [kind, setKind] = useState<"bonus" | "correction" | "refund" | "penalty" | "compensation" | "adjustment">("bonus");
  const [reason, setReason] = useState("");
  const mut = useMutation({
    mutationFn: () =>
      adjustFn({
        data: {
          user_id: userId!,
          amount: Number(amount),
          direction,
          kind,
          reason,
        } as never,
      }),
    onSuccess: () => {
      toast.success("Adjustment posted");
      setAmount("");
      setReason("");
      qc.invalidateQueries({ queryKey: ["fin-wallet-ledger", userId] });
      qc.invalidateQueries({ queryKey: ["fin-wallets"] });
      qc.invalidateQueries({ queryKey: ["fin-dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!userId) {
    return (
      <SectionCard title="Wallet detail">
        <EmptyState icon={null} title="Select a wallet" body="Pick a user from the list to inspect ledger and post adjustments." />
      </SectionCard>
    );
  }
  return (
    <div className="space-y-4">
      <SectionCard title="Wallet detail">
        {q.isLoading || !q.data ? (
          <SkeletonBlock />
        ) : (
          <>
            <div className="rounded-2xl bg-muted/40 p-3">
              <div className="text-sm font-semibold">{q.data.profile.full_name}</div>
              <div className="text-xs text-muted-foreground">{q.data.profile.login_id}</div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-muted-foreground">Available</span><div className="text-base font-bold">{formatINR(q.data.profile.wallet_balance)}</div></div>
                <div><span className="text-muted-foreground">Pending</span><div className="text-base font-bold">{formatINR(q.data.profile.pending_balance)}</div></div>
                <div><span className="text-muted-foreground">Lifetime</span><div className="text-base font-bold">{formatINR(q.data.profile.total_earnings)}</div></div>
                <div><span className="text-muted-foreground">Withdrawn</span><div className="text-base font-bold">{formatINR(q.data.profile.lifetime_withdrawals)}</div></div>
              </div>
            </div>
          </>
        )}
      </SectionCard>

      <SectionCard title="Post adjustment">
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <select value={direction} onChange={(e) => setDirection(e.target.value as "credit" | "debit")} className="rounded-xl border border-border bg-background px-3 py-2 text-sm">
              <option value="credit">Credit</option>
              <option value="debit">Debit</option>
            </select>
            <select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)} className="rounded-xl border border-border bg-background px-3 py-2 text-sm">
              <option value="bonus">Bonus</option>
              <option value="correction">Correction</option>
              <option value="refund">Refund</option>
              <option value="penalty">Penalty</option>
              <option value="compensation">Compensation</option>
              <option value="adjustment">Adjustment</option>
            </select>
          </div>
          <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="Amount (₹)" className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" />
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Reason (required)" className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" />
          <button
            disabled={!Number(amount) || reason.trim().length < 3 || mut.isPending}
            onClick={() => mut.mutate()}
            className="w-full rounded-xl bg-primary py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {mut.isPending ? "Posting…" : "Post adjustment"}
          </button>
        </div>
      </SectionCard>

      <SectionCard title="Recent ledger">
        {!q.data?.ledger.length ? (
          <EmptyState icon={null} title="No entries" body="This wallet has no ledger activity." />
        ) : (
          <div className="max-h-[360px] space-y-2 overflow-auto">
            {q.data.ledger.slice(0, 40).map((l) => (
              <div key={l.id} className="rounded-xl border border-border/60 p-2 text-xs">
                <div className="flex justify-between font-semibold">
                  <span>{l.source}</span>
                  <span className={Number(l.credit) > 0 ? "text-primary" : "text-destructive"}>
                    {Number(l.credit) > 0 ? "+" : "-"}{formatINR(Number(l.credit) || Number(l.debit))}
                  </span>
                </div>
                <div className="text-muted-foreground">{l.ref_number} • {new Date(l.created_at).toLocaleString()}</div>
                {l.remarks && <div className="mt-1">{l.remarks}</div>}
                <div className="mt-1 text-muted-foreground">Balance: {formatINR(l.running_balance)}</div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

/* ---------------- Ledger ---------------- */

function LedgerTab() {
  const [q, setQ] = useState("");
  const listFn = useServerFn(listAllLedger);
  const list = useQuery({ queryKey: ["fin-full-ledger", q], queryFn: () => listFn({ data: { q: q || undefined, limit: 300 } as never }) });
  return (
    <SectionCard title="Immutable ledger — all transactions">
      <div className="mb-3 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search ref, source or remarks" className="w-full rounded-xl border border-border bg-background py-2 pl-9 pr-3 text-sm" />
        </div>
        <button onClick={() => exportCSV("ledger", list.data ?? [])} className="pill-btn"><Download className="h-4 w-4" /> CSV</button>
      </div>
      {list.isLoading ? <SkeletonBlock /> : !list.data?.length ? <EmptyState icon={null} title="Empty ledger" body="No entries match." /> : (
        <div className="max-h-[600px] overflow-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted/60 text-left text-xs uppercase text-muted-foreground">
              <tr><th className="p-2">Ref</th><th className="p-2">User</th><th className="p-2">Source</th><th className="p-2 text-right">Credit</th><th className="p-2 text-right">Debit</th><th className="p-2 text-right">Balance</th><th className="p-2">When</th></tr>
            </thead>
            <tbody>
              {list.data.map((r) => (
                <tr key={r.id} className="border-t border-border/60">
                  <td className="p-2 font-mono text-xs">{r.ref_number}</td>
                  <td className="p-2">{r.user?.full_name ?? "—"}<div className="text-xs text-muted-foreground">{r.user?.login_id}</div></td>
                  <td className="p-2">{r.source}</td>
                  <td className="p-2 text-right text-primary">{Number(r.credit) > 0 ? formatINR(r.credit) : ""}</td>
                  <td className="p-2 text-right text-destructive">{Number(r.debit) > 0 ? formatINR(r.debit) : ""}</td>
                  <td className="p-2 text-right font-semibold">{formatINR(r.running_balance)}</td>
                  <td className="p-2 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}

/* ---------------- Bonuses ---------------- */

function BonusesTab() {
  const listFn = useServerFn(listBonusHistory);
  const list = useQuery({ queryKey: ["fin-bonuses"], queryFn: () => listFn() });
  return (
    <SectionCard title="Bonus history">
      {list.isLoading ? <SkeletonBlock /> : !list.data?.length ? <EmptyState icon={null} title="No bonuses yet" body="Bonuses awarded on sales will appear here." /> : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
              <tr><th className="p-2">Txn</th><th className="p-2">Project</th><th className="p-2">Leader</th><th className="p-2">Member</th><th className="p-2 text-right">Bonus</th><th className="p-2">Status</th><th className="p-2">When</th></tr>
            </thead>
            <tbody>
              {list.data.map((r) => (
                <tr key={r.id} className="border-t border-border/60">
                  <td className="p-2 font-mono text-xs">{r.txn_number}</td>
                  <td className="p-2">{r.project ?? "—"}</td>
                  <td className="p-2">{r.leader?.full_name ?? "—"}</td>
                  <td className="p-2">{r.member?.full_name ?? "—"}</td>
                  <td className="p-2 text-right font-semibold text-gold-foreground">{formatINR(r.bonus_amount)}</td>
                  <td className="p-2 capitalize">{r.approval_status}</td>
                  <td className="p-2 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}

/* ---------------- Revenue ---------------- */

function RevenueTab() {
  const fn = useServerFn(getRevenueBreakdown);
  const q = useQuery({ queryKey: ["fin-revenue"], queryFn: () => fn() });
  if (q.isLoading || !q.data) return <SkeletonBlock className="h-40" />;
  const { byProject, byTeam, byLeader, byMember, byMonth, highest, lowest, average } = q.data;
  return (
    <div className="space-y-4">
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard icon={<TrendingUp className="h-4 w-4" />} label="Average sale" value={formatINR(average)} />
        <StatCard icon={<ArrowUpRight className="h-4 w-4" />} label="Highest sale" value={formatINR(highest)} accent="gold" />
        <StatCard icon={<ArrowDownRight className="h-4 w-4" />} label="Lowest sale" value={formatINR(lowest)} />
      </section>
      <div className="grid gap-4 lg:grid-cols-2">
        <RevenueTable title="By Project" rows={byProject} />
        <RevenueTable title="By Team" rows={byTeam} />
        <RevenueTable title="By Leader" rows={byLeader} />
        <RevenueTable title="By Member" rows={byMember} />
      </div>
      <SectionCard title="By Month">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr><th className="py-2">Month</th><th className="py-2 text-right">Revenue</th></tr>
            </thead>
            <tbody>
              {byMonth.map((r) => (
                <tr key={r.month} className="border-t border-border/60"><td className="py-2 font-medium">{r.month}</td><td className="py-2 text-right font-semibold">{formatINR(r.total)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}

function RevenueTable({ title, rows }: { title: string; rows: { label: string; total: number; count: number }[] }) {
  return (
    <SectionCard title={title}>
      {!rows.length ? <EmptyState icon={null} title="No data" body="No revenue recorded." /> : (
        <div className="max-h-72 overflow-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground"><tr><th className="py-2">Name</th><th className="py-2 text-right">Sales</th><th className="py-2 text-right">Revenue</th></tr></thead>
            <tbody>
              {rows.slice(0, 20).map((r, i) => (
                <tr key={i} className="border-t border-border/60"><td className="py-2">{r.label}</td><td className="py-2 text-right">{r.count}</td><td className="py-2 text-right font-semibold">{formatINR(r.total)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}

/* ---------------- Reports ---------------- */

function ReportsTab() {
  const dashFn = useServerFn(getFinancialDashboard);
  const walletsFn = useServerFn(listAllWallets);
  const ledgerFn = useServerFn(listAllLedger);
  const bonusFn = useServerFn(listBonusHistory);
  const revFn = useServerFn(getRevenueBreakdown);

  const reports = useMemo(
    () => [
      { key: "summary", label: "Financial Summary", fn: async () => flatten([await dashFn()]) },
      { key: "wallets", label: "Wallet Report", fn: async () => walletsFn({ data: { role: "all", limit: 500 } as never }) },
      { key: "ledger", label: "Ledger Report", fn: async () => ledgerFn({ data: { limit: 500 } as never }) },
      { key: "bonuses", label: "Bonus Report", fn: async () => bonusFn() },
      { key: "revenue", label: "Revenue Report", fn: async () => (await revFn()).byProject },
    ],
    [dashFn, walletsFn, ledgerFn, bonusFn, revFn],
  );

  return (
    <SectionCard title="Financial reports">
      <div className="grid gap-2 sm:grid-cols-2">
        {reports.map((r) => (
          <button
            key={r.key}
            onClick={async () => {
              try {
                const rows = await r.fn();
                exportCSV(r.key, rows as Record<string, unknown>[]);
                toast.success(`${r.label} downloaded`);
              } catch (e) {
                toast.error((e as Error).message);
              }
            }}
            className="flex items-center justify-between rounded-2xl border border-border p-4 text-left hover:bg-muted/50"
          >
            <div>
              <div className="font-semibold">{r.label}</div>
              <div className="text-xs text-muted-foreground">Export as CSV</div>
            </div>
            <Download className="h-4 w-4 text-primary" />
          </button>
        ))}
      </div>
    </SectionCard>
  );
}

function flatten(items: unknown[]): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  for (const it of items) {
    const obj = it as Record<string, unknown>;
    for (const [k, v] of Object.entries(obj)) {
      if (v && typeof v === "object" && !Array.isArray(v)) {
        for (const [k2, v2] of Object.entries(v as Record<string, unknown>)) out.push({ section: k, key: k2, value: v2 });
      } else if (!Array.isArray(v)) {
        out.push({ section: "root", key: k, value: v });
      }
    }
  }
  return out;
}

function exportCSV(name: string, rows: Record<string, unknown>[]) {
  if (!rows?.length) {
    toast.error("Nothing to export");
    return;
  }
  const keys = Array.from(rows.reduce((s, r) => { Object.keys(r).forEach((k) => s.add(k)); return s; }, new Set<string>()));
  const esc = (v: unknown) => {
    if (v == null) return "";
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [keys.join(","), ...rows.map((r) => keys.map((k) => esc(r[k])).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `aawash-${name}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
