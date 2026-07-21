import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Info, X } from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { RoleGuard } from "@/components/aawash/AuthGuard";
import { DashboardShell } from "@/components/aawash/DashboardShell";
import {
  SectionCard,
  EmptyState,
  SkeletonBlock,
  formatINR,
} from "@/components/aawash/dashboard-kit";
import {
  cancelMyWithdrawal,
  getWalletOverview,
  listMyWithdrawals,
} from "@/lib/wallet.functions";
import {
  WithdrawalRequestForm,
  WithdrawalStatusPill,
} from "@/components/aawash/wallet/WithdrawalRequestForm";

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
  const { profile, role } = useSession();
  const qc = useQueryClient();
  const listFn = useServerFn(listMyWithdrawals);
  const walletFn = useServerFn(getWalletOverview);
  const cancelFn = useServerFn(cancelMyWithdrawal);

  const { data: wallet } = useQuery({ queryKey: ["wallet", "overview"], queryFn: () => walletFn() });
  const { data: withdrawals, isLoading } = useQuery({
    queryKey: ["wallet", "withdrawals"],
    queryFn: () => listFn(),
  });

  const cancel = useMutation({
    mutationFn: (id: string) => cancelFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wallet", "overview"] });
      qc.invalidateQueries({ queryKey: ["wallet", "withdrawals"] });
    },
  });

  const available = Number(wallet?.profile?.wallet_balance ?? profile?.wallet_balance ?? 0);
  const locked = Number(wallet?.profile?.locked_balance ?? 0);

  return (
    <DashboardShell role={role || "member"} profile={profile}>
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
            <KV label="Available" value={formatINR(available)} highlight />
            <KV label="Locked" value={formatINR(locked)} />
            <KV
              label="Lifetime withdrawn"
              value={formatINR(Number(wallet?.profile?.lifetime_withdrawals ?? 0))}
            />
            <KV label="Requests" value={String((withdrawals ?? []).length)} />
          </div>
        </SectionCard>

        <SectionCard title="Request withdrawal" subtitle="Window: 25th – 30th every month.">
          <WithdrawalRequestForm
            withdrawable={available}
            invalidateKeys={[
              ["wallet", "overview"],
              ["wallet", "withdrawals"],
              ["member", "wallet"],
            ]}
          />
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
          ) : (withdrawals ?? []).length === 0 ? (
            <EmptyState icon={<Info size={22} />} title="No withdrawals yet" body="Your requests will appear here." />
          ) : (
            <ul className="flex flex-col gap-2">
              {(withdrawals ?? []).map((w) => {
                const rec = w as unknown as {
                  id: string;
                  reference_number: string | null;
                  amount: number;
                  status: string;
                  requested_at: string;
                  bank_name: string | null;
                  rejection_reason: string | null;
                };
                const cancellable = rec.status === "pending" || rec.status === "approved";
                return (
                  <li key={rec.id} className="flex flex-col gap-2 rounded-2xl border border-border/50 bg-surface p-3 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-semibold text-foreground">{formatINR(rec.amount)}</div>
                        <WithdrawalStatusPill status={rec.status} />
                      </div>
                      <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                        {rec.reference_number} · {new Date(rec.requested_at).toLocaleString("en-IN")}
                      </div>
                      {rec.bank_name && (
                        <div className="mt-0.5 text-[11px] text-muted-foreground">To: {rec.bank_name}</div>
                      )}
                      {rec.rejection_reason && (
                        <div className="mt-0.5 text-[11px] text-destructive">Reason: {rec.rejection_reason}</div>
                      )}
                    </div>
                    {cancellable && (
                      <button
                        onClick={() => cancel.mutate(rec.id)}
                        disabled={cancel.isPending}
                        className="inline-flex h-9 items-center gap-1 rounded-xl border border-border px-3 text-xs font-semibold text-muted-foreground hover:text-foreground disabled:opacity-50"
                      >
                        <X size={12} /> Cancel
                      </button>
                    )}
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

function KV({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl border border-border/50 p-3 ${highlight ? "bg-primary-soft/40" : "bg-surface"}`}>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-extrabold tracking-tight text-foreground">{value}</div>
    </div>
  );
}
