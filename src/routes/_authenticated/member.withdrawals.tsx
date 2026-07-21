import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Wallet, Lock, Clock, CheckCircle2, XCircle, IndianRupee, Info } from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { RoleGuard } from "@/components/aawash/AuthGuard";
import { DashboardShell } from "@/components/aawash/DashboardShell";
import {
  SectionCard,
  EmptyState,
  SkeletonBlock,
  formatINR,
} from "@/components/aawash/dashboard-kit";
import { listMyWithdrawals, requestWithdrawal, isWithinWithdrawalWindow } from "@/lib/leader.functions";

export const Route = createFileRoute("/_authenticated/member/withdrawals")({
  component: WithdrawalsPage,
  head: () => ({ meta: [{ title: "Withdrawals — Aawash" }] }),
});

function WithdrawalsPage() {
  return (
    <RoleGuard allow={["member", "team_leader", "super_admin"]}>
      <WithdrawalsContent />
    </RoleGuard>
  );
}

function WithdrawalsContent() {
  const { profile } = useSession();
  const qc = useQueryClient();
  const listFn = useServerFn(listMyWithdrawals);
  const requestFn = useServerFn(requestWithdrawal);
  const [amount, setAmount] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["member", "withdrawals"],
    queryFn: () => listFn(),
  });

  const submit = useMutation({
    mutationFn: (amt: number) => requestFn({ data: { amount: amt } }),
    onSuccess: () => {
      setSuccessMsg("Withdrawal request submitted.");
      setErrorMsg(null);
      setAmount("");
      qc.invalidateQueries({ queryKey: ["member", "withdrawals"] });
      qc.invalidateQueries({ queryKey: ["member", "wallet"] });
    },
    onError: (e) => {
      setErrorMsg((e as Error).message);
      setSuccessMsg(null);
    },
  });

  const withinWindow = isWithinWithdrawalWindow();
  const balance = Number(profile?.wallet_balance ?? 0);
  const pending = (data ?? []).filter((w) => w.status === "pending").reduce((s, w) => s + Number(w.amount || 0), 0);
  const withdrawable = Math.max(0, balance - pending);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) return setErrorMsg("Enter a valid amount.");
    if (amt > withdrawable) return setErrorMsg("Amount exceeds withdrawable balance.");
    submit.mutate(amt);
  }

  return (
    <DashboardShell role="member" profile={profile}>
      <header>
        <div className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
          Payouts
        </div>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">Withdrawals</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Request a payout — available between the 25th and 30th every month.
        </p>
      </header>

      <section className="mt-6 grid gap-5 lg:grid-cols-2">
        <SectionCard title="Balance overview">
          <div className="grid grid-cols-2 gap-3">
            <KV label="Available" value={formatINR(balance)} highlight />
            <KV label="Withdrawable" value={formatINR(withdrawable)} />
            <KV label="Pending" value={formatINR(pending)} />
            <KV label="Requests" value={String((data ?? []).length)} />
          </div>
        </SectionCard>

        <SectionCard title="Request withdrawal" subtitle="Window: 25th – 30th every month.">
          {!withinWindow ? (
            <div className="flex items-start gap-3 rounded-2xl border border-warning/40 bg-warning/10 p-4 text-sm">
              <Lock size={18} className="mt-0.5 shrink-0 text-warning" />
              <div>
                <div className="font-semibold text-foreground">
                  Withdrawal requests are available from the 25th to the 30th of each month.
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Existing requests continue to be processed.
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Amount (₹)
                </label>
                <div className="relative mt-1.5">
                  <IndianRupee size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    inputMode="numeric"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                    placeholder="0"
                    className="h-12 w-full rounded-2xl border border-input bg-surface pl-10 pr-4 text-base font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="mt-1.5 text-[11px] text-muted-foreground">Max: {formatINR(withdrawable)}</div>
              </div>
              {errorMsg && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {errorMsg}
                </div>
              )}
              {successMsg && (
                <div className="rounded-xl border border-success/30 bg-success/10 px-3 py-2 text-xs text-success">
                  {successMsg}
                </div>
              )}
              <button
                type="submit"
                disabled={submit.isPending}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-primary to-leaf text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] disabled:opacity-50"
              >
                <Wallet size={14} /> {submit.isPending ? "Submitting…" : "Request withdrawal"}
              </button>
            </form>
          )}
        </SectionCard>
      </section>

      <section className="mt-6">
        <SectionCard title="Withdrawal history">
          {isLoading ? (
            <div className="grid gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonBlock key={i} className="h-16" />
              ))}
            </div>
          ) : (data ?? []).length === 0 ? (
            <EmptyState icon={<Info size={22} />} title="No withdrawals yet" body="Your requests will appear here." />
          ) : (
            <ul className="flex flex-col gap-2">
              {(data ?? []).map((w) => (
                <li key={w.id} className="flex items-center gap-3 rounded-2xl border border-border/50 bg-surface p-3">
                  <StatusIcon status={w.status} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-foreground">{formatINR(w.amount)}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {new Date(w.requested_at).toLocaleString("en-IN")}
                    </div>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${statusPill(w.status)}`}>
                    {w.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </section>
    </DashboardShell>
  );
}

function StatusIcon({ status }: { status: string }) {
  const map: Record<string, { Icon: typeof Clock; classes: string }> = {
    pending: { Icon: Clock, classes: "bg-warning/15 text-warning" },
    approved: { Icon: CheckCircle2, classes: "bg-success/15 text-success" },
    paid: { Icon: CheckCircle2, classes: "bg-success/20 text-success" },
    rejected: { Icon: XCircle, classes: "bg-destructive/10 text-destructive" },
  };
  const { Icon, classes } = map[status] ?? map.pending;
  return (
    <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${classes}`}>
      <Icon size={16} />
    </div>
  );
}

function statusPill(status: string) {
  switch (status) {
    case "approved":
    case "paid":
      return "bg-success/15 text-success";
    case "rejected":
      return "bg-destructive/10 text-destructive";
    default:
      return "bg-warning/15 text-warning";
  }
}

function KV({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl border border-border/50 p-3 ${highlight ? "bg-primary-soft/40" : "bg-surface"}`}>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-extrabold tracking-tight text-foreground">{value}</div>
    </div>
  );
}
