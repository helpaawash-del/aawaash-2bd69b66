import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Check, Clock, PlayCircle, Truck, XCircle, Info } from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { RoleGuard } from "@/components/aawash/AuthGuard";
import { AdminShell as DashboardShell } from "@/components/aawash/admin/AdminShell";
import {
  SectionCard,
  EmptyState,
  SkeletonBlock,
  formatINR,
} from "@/components/aawash/dashboard-kit";
import {
  approveWithdrawal,
  cancelWithdrawalAdmin,
  completeWithdrawal,
  listAllWithdrawals,
  markWithdrawalProcessing,
  rejectWithdrawal,
} from "@/lib/wallet.functions";
import { WithdrawalStatusPill } from "@/components/aawash/wallet/WithdrawalRequestForm";

const STATUSES = ["all", "pending", "approved", "processing", "completed", "rejected", "cancelled"] as const;
type StatusFilter = (typeof STATUSES)[number];

export const Route = createFileRoute("/_authenticated/admin/withdrawals")({
  component: AdminWithdrawalsPage,
  head: () => ({ meta: [{ title: "Withdrawals — Admin" }] }),
});

function AdminWithdrawalsPage() {
  return (
    <RoleGuard allow={["super_admin"]}>
      <AdminWithdrawals />
    </RoleGuard>
  );
}

function AdminWithdrawals() {
  const { profile, role } = useSession();
  const qc = useQueryClient();
  const listFn = useServerFn(listAllWithdrawals);
  const [status, setStatus] = useState<StatusFilter>("pending");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "withdrawals", status],
    queryFn: () => listFn({ data: { status } }),
  });

  const stats = useMemo(() => {
    const rows = (data ?? []) as Array<{ status: string; amount: number }>;
    const bucket = (s: string) => rows.filter((r) => r.status === s);
    return {
      pendingCount: bucket("pending").length,
      pendingAmount: bucket("pending").reduce((s, r) => s + Number(r.amount || 0), 0),
      approvedCount: bucket("approved").length,
      processingCount: bucket("processing").length,
      completedAmount: bucket("completed").reduce((s, r) => s + Number(r.amount || 0), 0),
    };
  }, [data]);

  return (
    <DashboardShell role={role || "super_admin"} profile={profile}>
      <header>
        <div className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
          Finance
        </div>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          Withdrawal management
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Approve, process, and complete payouts.</p>
      </header>

      <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Pending" value={String(stats.pendingCount)} />
        <Stat label="Pending amount" value={formatINR(stats.pendingAmount, { compact: true })} />
        <Stat label="In transit" value={String(stats.approvedCount + stats.processingCount)} />
        <Stat label="Completed (view)" value={formatINR(stats.completedAmount, { compact: true })} />
      </section>

      <section className="mt-6">
        <div className="glass-card flex flex-wrap items-center gap-1 rounded-2xl p-1">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`h-9 rounded-xl px-3 text-xs font-semibold capitalize transition-colors ${
                status === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-4">
        <SectionCard title={`Requests (${(data ?? []).length})`}>
          {isLoading ? (
            <div className="grid gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonBlock key={i} className="h-24" />
              ))}
            </div>
          ) : (data ?? []).length === 0 ? (
            <EmptyState icon={<Info size={22} />} title="No requests" body="Nothing matches this filter." />
          ) : (
            <ul className="flex flex-col gap-3">
              {(data ?? []).map((row) => (
                <AdminRow
                  key={(row as { id: string }).id}
                  row={row as never}
                  onDone={() => qc.invalidateQueries({ queryKey: ["admin", "withdrawals"] })}
                />
              ))}
            </ul>
          )}
        </SectionCard>
      </section>
    </DashboardShell>
  );
}

type AdminRowShape = {
  id: string;
  reference_number: string | null;
  amount: number;
  status: string;
  requested_at: string;
  bank_holder: string | null;
  bank_account_number: string | null;
  bank_ifsc: string | null;
  bank_name: string | null;
  bank_branch: string | null;
  upi_id: string | null;
  remarks: string | null;
  admin_notes: string | null;
  rejection_reason: string | null;
  user: { id: string; full_name: string; display_code: string; mobile_number: string; login_id: string } | null;
};

function AdminRow({ row, onDone }: { row: AdminRowShape; onDone: () => void }) {
  const approveFn = useServerFn(approveWithdrawal);
  const processFn = useServerFn(markWithdrawalProcessing);
  const completeFn = useServerFn(completeWithdrawal);
  const rejectFn = useServerFn(rejectWithdrawal);
  const cancelFn = useServerFn(cancelWithdrawalAdmin);

  const [notes, setNotes] = useState("");
  const [reason, setReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const wrap = <T,>(p: Promise<T>) =>
    p
      .then(() => {
        setErr(null);
        setNotes("");
        setReason("");
        setShowReject(false);
        onDone();
      })
      .catch((e: unknown) => setErr((e as Error).message));

  const approve = useMutation({ mutationFn: () => wrap(approveFn({ data: { id: row.id, notes: notes || null } })) });
  const process = useMutation({ mutationFn: () => wrap(processFn({ data: { id: row.id, notes: notes || null } })) });
  const complete = useMutation({ mutationFn: () => wrap(completeFn({ data: { id: row.id, notes: notes || null } })) });
  const reject = useMutation({
    mutationFn: () => wrap(rejectFn({ data: { id: row.id, reason: reason || "Rejected by admin" } })),
  });
  const cancel = useMutation({
    mutationFn: () => wrap(cancelFn({ data: { id: row.id, reason: reason || "Cancelled by admin" } })),
  });

  return (
    <li className="rounded-2xl border border-border/60 bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="text-base font-extrabold text-foreground">{formatINR(row.amount)}</div>
            <WithdrawalStatusPill status={row.status} />
          </div>
          <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">
            {row.reference_number} · {new Date(row.requested_at).toLocaleString("en-IN")}
          </div>
          <div className="mt-1 text-sm font-semibold text-foreground">
            {row.user?.full_name}{" "}
            <span className="font-normal text-muted-foreground">({row.user?.login_id})</span>
          </div>
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <div>{row.bank_holder}</div>
          <div className="font-mono">{row.bank_name} · {row.bank_ifsc}</div>
          <div className="font-mono">A/C {row.bank_account_number}</div>
          {row.upi_id && <div className="font-mono">UPI {row.upi_id}</div>}
        </div>
      </div>

      {(row.remarks || row.admin_notes || row.rejection_reason) && (
        <div className="mt-2 space-y-1 rounded-xl bg-muted/40 p-2 text-[11px] text-muted-foreground">
          {row.remarks && <div><b>User:</b> {row.remarks}</div>}
          {row.admin_notes && <div className="whitespace-pre-wrap"><b>Admin:</b> {row.admin_notes}</div>}
          {row.rejection_reason && <div className="text-destructive"><b>Reason:</b> {row.rejection_reason}</div>}
        </div>
      )}

      {err && (
        <div className="mt-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {err}
        </div>
      )}

      {["pending", "approved", "processing"].includes(row.status) && (
        <div className="mt-3 flex flex-col gap-2">
          <input
            value={showReject ? reason : notes}
            onChange={(e) => (showReject ? setReason(e.target.value) : setNotes(e.target.value))}
            placeholder={showReject ? "Rejection reason (required)" : "Add note (optional)"}
            className="h-10 w-full rounded-xl border border-input bg-background px-3 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="flex flex-wrap gap-2">
            {row.status === "pending" && (
              <Action onClick={() => approve.mutate()} pending={approve.isPending} icon={<Check size={14} />} label="Approve" tone="primary" />
            )}
            {row.status === "approved" && (
              <Action onClick={() => process.mutate()} pending={process.isPending} icon={<PlayCircle size={14} />} label="Mark processing" tone="primary" />
            )}
            {(row.status === "approved" || row.status === "processing") && (
              <Action onClick={() => complete.mutate()} pending={complete.isPending} icon={<Truck size={14} />} label="Mark completed" tone="success" />
            )}
            {!showReject && (
              <>
                <Action onClick={() => setShowReject(true)} icon={<XCircle size={14} />} label="Reject" tone="danger" />
                <Action onClick={() => cancel.mutate()} pending={cancel.isPending} icon={<Clock size={14} />} label="Cancel" tone="ghost" />
              </>
            )}
            {showReject && (
              <>
                <Action onClick={() => reject.mutate()} pending={reject.isPending} icon={<XCircle size={14} />} label="Confirm reject" tone="danger" />
                <Action onClick={() => setShowReject(false)} icon={<Clock size={14} />} label="Back" tone="ghost" />
              </>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

function Action({
  onClick,
  pending,
  icon,
  label,
  tone,
}: {
  onClick: () => void;
  pending?: boolean;
  icon: React.ReactNode;
  label: string;
  tone: "primary" | "danger" | "success" | "ghost";
}) {
  const cls =
    tone === "primary"
      ? "bg-primary text-primary-foreground"
      : tone === "danger"
        ? "bg-destructive text-destructive-foreground"
        : tone === "success"
          ? "bg-success text-success-foreground"
          : "border border-border text-muted-foreground hover:text-foreground";
  return (
    <button
      onClick={onClick}
      disabled={pending}
      className={`inline-flex h-9 items-center gap-1 rounded-xl px-3 text-xs font-semibold disabled:opacity-50 ${cls}`}
    >
      {icon} {pending ? "…" : label}
    </button>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-card rounded-2xl p-4">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-extrabold tracking-tight text-foreground">{value}</div>
    </div>
  );
}
