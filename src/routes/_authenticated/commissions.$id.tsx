import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Coins,
  IndianRupee,
  Percent,
  ScrollText,
  Sparkles,
  User2,
  Gift,
} from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { RoleGuard } from "@/components/aawash/AuthGuard";
import { DashboardShell } from "@/components/aawash/DashboardShell";
import { SectionCard, formatINR, EmptyState, SkeletonBlock } from "@/components/aawash/dashboard-kit";
import { getCommissionTransaction, grantManualBonus } from "@/lib/commissions.functions";

export const Route = createFileRoute("/_authenticated/commissions/$id")({
  component: Page,
  head: () => ({ meta: [{ title: "Commission — Aawash" }] }),
});

function Page() {
  return (
    <RoleGuard allow={["super_admin", "team_leader", "member"]}>
      <Content />
    </RoleGuard>
  );
}

function Content() {
  const { id } = Route.useParams();
  const { profile } = useSession();
  const qc = useQueryClient();
  const getFn = useServerFn(getCommissionTransaction);
  const bonusFn = useServerFn(grantManualBonus);

  const { data, isLoading } = useQuery({
    queryKey: ["commission", id],
    queryFn: () => getFn({ data: { id } }),
  });

  const bonus = useMutation({
    mutationFn: (payload: { amount: number; reason: string }) =>
      bonusFn({ data: { transaction_id: id, amount: payload.amount, reason: payload.reason } }),
    onSuccess: () => {
      toast.success("Bonus applied");
      setBonusOpen(false);
      qc.invalidateQueries({ queryKey: ["commission", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [bonusOpen, setBonusOpen] = useState(false);
  const [bonusAmt, setBonusAmt] = useState(0);
  const [bonusReason, setBonusReason] = useState("");

  const role = data?.role ?? "member";

  if (isLoading || !data) {
    return (
      <DashboardShell role={role} profile={profile}>
        <SkeletonBlock className="h-40" />
      </DashboardShell>
    );
  }

  const t = data.txn;

  return (
    <DashboardShell role={role} profile={profile}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/admin/commissions"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={14} /> Back
        </Link>
        {role === "super_admin" && t.status !== "reversed" && (
          <button
            onClick={() => setBonusOpen(true)}
            className="inline-flex items-center gap-2 rounded-2xl bg-gold px-4 py-2 text-sm font-semibold text-gold-foreground shadow-[var(--shadow-glow)]"
          >
            <Gift size={14} /> Grant bonus
          </button>
        )}
      </div>

      <header className="mt-4">
        <div className="glass-card inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium text-foreground">
          <Coins size={14} className="text-gold" />
          Commission transaction
        </div>
        <h1 className="mt-3 font-mono text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          {t.txn_number}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Generated {new Date(t.created_at).toLocaleString("en-IN")} · Status{" "}
          <span className="font-semibold text-foreground">{t.status}</span>
          {t.reversed_at && <> · Reversed {new Date(t.reversed_at).toLocaleDateString("en-IN")}</>}
        </p>
      </header>

      <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricTile icon={<IndianRupee size={18} />} label="Sale value" value={formatINR(Number(t.sale_amount))} />
        <MetricTile
          icon={<Percent size={18} />}
          label={`Leader gross (${Number(t.slab_pct).toFixed(2)}%)`}
          value={formatINR(Number(t.leader_gross))}
        />
        <MetricTile icon={<User2 size={18} />} label="Member share" value={formatINR(Number(t.member_amount))} />
        <MetricTile
          icon={<Sparkles size={18} />}
          label="Net to leader"
          value={formatINR(Number(t.net_leader))}
          accent="gold"
        />
      </section>

      <section className="mt-6 grid gap-5 lg:grid-cols-3">
        <SectionCard title="Sale & project">
          <div className="grid gap-2 text-sm">
            <KV label="Sale" value={data.sale?.sale_number ?? "—"} />
            <KV label="Buyer" value={data.sale?.buyer_name ?? "—"} />
            <KV label="Project" value={data.project?.name ?? "—"} />
            <KV label="Slab" value={`${Number(t.slab_pct).toFixed(2)}%`} />
            {t.bonus_flag && <KV label="Bonus" value="Eligible" />}
          </div>
        </SectionCard>

        <SectionCard title="Recipients">
          <div className="grid gap-2 text-sm">
            <KV label="Leader" value={data.leader?.full_name ?? "—"} />
            <KV label="Member" value={data.member?.full_name ?? "—"} />
            <KV label="Tip person" value={data.tip?.tip_name ?? "—"} />
            <KV label="Tip amount" value={formatINR(Number(t.tip_amount))} />
            <KV label="Bonus" value={formatINR(Number(t.bonus_amount))} />
          </div>
        </SectionCard>

        <SectionCard title="Wallet split">
          <div className="grid gap-2 text-sm">
            {data.recipients.length === 0 ? (
              <EmptyState icon={<Coins size={20} />} title="No recipients" body="This transaction has no allocations." />
            ) : (
              data.recipients.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-2xl border border-border/50 bg-surface p-3"
                >
                  <div>
                    <div className="text-sm font-semibold capitalize text-foreground">{r.recipient_kind ?? `tier ${r.tier}`}</div>
                    <div className="text-[11px] capitalize text-muted-foreground">{r.wallet_status}</div>
                  </div>
                  <div className="text-sm font-bold text-foreground">{formatINR(Number(r.amount))}</div>
                </div>
              ))
            )}
          </div>
        </SectionCard>
      </section>

      <section className="mt-6 grid gap-5 lg:grid-cols-2">
        <SectionCard title="Ledger" subtitle="Immutable — every credit and debit.">
          {data.ledger.length === 0 ? (
            <EmptyState icon={<ScrollText size={20} />} title="No entries yet" body="Ledger entries appear once wallets are credited." />
          ) : (
            <ul className="flex flex-col gap-2">
              {data.ledger.map((l) => (
                <li key={l.id} className="rounded-2xl border border-border/50 bg-surface p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] text-muted-foreground">{l.ref_number}</span>
                    <span
                      className={`text-sm font-bold ${Number(l.credit) > 0 ? "text-success" : "text-destructive"}`}
                    >
                      {Number(l.credit) > 0 ? "+" : "−"}
                      {formatINR(Number(l.credit) > 0 ? Number(l.credit) : Number(l.debit))}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-foreground">{l.remarks}</div>
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    {l.source} · {new Date(l.created_at).toLocaleString("en-IN")} · balance {formatINR(Number(l.running_balance))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        {role === "super_admin" && (
          <SectionCard title="Audit trail" subtitle="Admin only.">
            {data.audit.length === 0 ? (
              <EmptyState icon={<ScrollText size={20} />} title="No audit events" body="No changes recorded yet." />
            ) : (
              <ul className="flex flex-col gap-2">
                {data.audit.map((a) => (
                  <li key={a.id} className="rounded-2xl border border-border/50 bg-surface p-3">
                    <div className="text-sm font-semibold text-foreground">{a.action}</div>
                    {a.reason && <div className="mt-0.5 text-xs text-muted-foreground">{a.reason}</div>}
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      {new Date(a.created_at).toLocaleString("en-IN")}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        )}
      </section>

      {bonusOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-4xl border border-border bg-surface p-6 shadow-[var(--shadow-float)]">
            <h2 className="text-lg font-bold text-foreground">Grant manual bonus</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Adds a credit to the leader's wallet and appends a ledger + audit entry.
            </p>
            <div className="mt-4 grid gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Amount (₹)</span>
                <input
                  type="number"
                  value={bonusAmt}
                  onChange={(e) => setBonusAmt(Number(e.target.value))}
                  className="rounded-2xl border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Reason</span>
                <textarea
                  value={bonusReason}
                  onChange={(e) => setBonusReason(e.target.value)}
                  rows={3}
                  className="rounded-2xl border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                />
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setBonusOpen(false)}
                className="rounded-2xl border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                disabled={bonus.isPending || bonusAmt <= 0 || bonusReason.trim().length < 3}
                onClick={() => bonus.mutate({ amount: bonusAmt, reason: bonusReason.trim() })}
                className="inline-flex items-center gap-2 rounded-2xl bg-gold px-4 py-2 text-sm font-semibold text-gold-foreground shadow-[var(--shadow-glow)] disabled:opacity-60"
              >
                <Gift size={14} /> Grant bonus
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}

function MetricTile({
  icon,
  label,
  value,
  accent = "primary",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: "primary" | "gold";
}) {
  return (
    <div className="rounded-3xl border border-border bg-surface p-4 shadow-[var(--shadow-soft)]">
      <div
        className={`grid h-9 w-9 place-items-center rounded-xl ${accent === "gold" ? "bg-gold/15 text-gold-foreground" : "bg-primary-soft text-primary"}`}
      >
        {icon}
      </div>
      <div className="mt-3 text-xl font-bold tracking-tight text-foreground sm:text-2xl">{value}</div>
      <div className="mt-1 text-[11px] font-medium text-muted-foreground">{label}</div>
    </div>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border/40 pb-2 last:border-0 last:pb-0">
      <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold text-foreground">{value}</span>
    </div>
  );
}
