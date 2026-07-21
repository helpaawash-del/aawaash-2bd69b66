import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  ArrowLeft,
  Check,
  Clock,
  FileText,
  IndianRupee,
  Loader2,
  Send,
  ShieldCheck,
  X,
} from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { RoleGuard } from "@/components/aawash/AuthGuard";
import { DashboardShell } from "@/components/aawash/DashboardShell";
import { SectionCard, formatINR } from "@/components/aawash/dashboard-kit";
import { saleMeta, APPROVAL_LABEL, type ApprovalStatus } from "@/components/aawash/sales/status";
import {
  addSaleDocument,
  approveSale,
  cancelSale,
  getSale,
  recordSalePayment,
  rejectSale,
  submitSaleForApproval,
  verifySaleDocument,
} from "@/lib/sales.functions";

export const Route = createFileRoute("/_authenticated/sales-workflow/$id")({
  component: SaleDetailGuarded,
  head: () => ({ meta: [{ title: "Sale — Aawash" }] }),
});

function SaleDetailGuarded() {
  return (
    <RoleGuard allow={["member", "team_leader", "super_admin"]}>
      <SaleDetailInner />
    </RoleGuard>
  );
}

const DOC_KINDS = [
  "identity_proof",
  "address_proof",
  "pan",
  "aadhaar",
  "income",
  "loan",
  "agreement",
  "registration",
  "receipt",
  "other",
] as const;

const PAYMENT_STAGES = [
  "booking",
  "first_installment",
  "second_installment",
  "third_installment",
  "final",
  "registration",
  "other",
] as const;

function SaleDetailInner() {
  const { role, profile } = useSession();
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const fetch = useServerFn(getSale);
  const submit = useServerFn(submitSaleForApproval);
  const approve = useServerFn(approveSale);
  const reject = useServerFn(rejectSale);
  const cancel = useServerFn(cancelSale);
  const addDoc = useServerFn(addSaleDocument);
  const verifyDoc = useServerFn(verifySaleDocument);
  const addPay = useServerFn(recordSalePayment);

  const saleQ = useQuery({
    queryKey: ["sale", id],
    queryFn: () => fetch({ data: { id } }),
  });

  const [reason, setReason] = useState("");
  const [docKind, setDocKind] = useState<(typeof DOC_KINDS)[number]>("identity_proof");
  const [docLabel, setDocLabel] = useState("");
  const [docUrl, setDocUrl] = useState("");
  const [payStage, setPayStage] = useState<(typeof PAYMENT_STAGES)[number]>("booking");
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("");
  const [payRef, setPayRef] = useState("");

  const invalidate = () => qc.invalidateQueries({ queryKey: ["sale", id] });

  const submitM = useMutation({ mutationFn: () => submit({ data: { id } }), onSuccess: invalidate });
  const approveM = useMutation({
    mutationFn: () => approve({ data: { id, notes: reason || undefined } }),
    onSuccess: () => {
      setReason("");
      invalidate();
      qc.invalidateQueries({ queryKey: ["sales-list"] });
      qc.invalidateQueries({ queryKey: ["sales-overview"] });
    },
  });
  const rejectM = useMutation({
    mutationFn: () => reject({ data: { id, reason: reason || "Rejected" } }),
    onSuccess: () => {
      setReason("");
      invalidate();
    },
  });
  const cancelM = useMutation({
    mutationFn: () => cancel({ data: { id, reason: reason || "Cancelled" } }),
    onSuccess: () => {
      setReason("");
      invalidate();
    },
  });
  const addDocM = useMutation({
    mutationFn: () =>
      addDoc({ data: { sale_id: id, kind: docKind, label: docLabel, file_url: docUrl } }),
    onSuccess: () => {
      setDocLabel("");
      setDocUrl("");
      invalidate();
    },
  });
  const verifyM = useMutation({
    mutationFn: (v: { id: string; status: "verified" | "rejected" }) => verifyDoc({ data: v }),
    onSuccess: invalidate,
  });
  const addPayM = useMutation({
    mutationFn: () =>
      addPay({
        data: {
          sale_id: id,
          stage: payStage,
          amount: Number(payAmount),
          method: payMethod,
          reference: payRef,
        },
      }),
    onSuccess: () => {
      setPayAmount("");
      setPayMethod("");
      setPayRef("");
      invalidate();
    },
  });

  if (saleQ.isLoading) {
    return (
      <DashboardShell role={role ?? "member"} profile={profile}>
        <div className="p-8 text-sm text-muted-foreground">Loading sale…</div>
      </DashboardShell>
    );
  }
  if (saleQ.error || !saleQ.data) {
    return (
      <DashboardShell role={role ?? "member"} profile={profile}>
        <div className="p-8 text-sm text-destructive">
          {(saleQ.error as Error)?.message ?? "Sale not found."}
        </div>
      </DashboardShell>
    );
  }

  const { sale, project, flat, customer, seller, leader, documents, payments, audit } = saleQ.data;
  const meta = saleMeta(sale.sale_status);
  const approvalLabel = APPROVAL_LABEL[(sale.approval_status ?? "pending") as ApprovalStatus] ?? sale.approval_status;
  const isAdmin = role === "super_admin";
  const canSubmit = sale.approval_status === "pending" && !["cancelled", "expired"].includes(sale.sale_status);
  const canApprove = isAdmin && sale.approval_status === "submitted";
  const canCancel = !["approved", "cancelled", "completed", "registered"].includes(sale.sale_status);

  return (
    <DashboardShell role={role ?? "member"} profile={profile}>
      <button
        type="button"
        onClick={() => navigate({ to: "/sales-workflow" })}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft size={16} /> Back to sales
      </button>

      <section className="glass-card relative overflow-hidden rounded-4xl p-5 shadow-[var(--shadow-float)] sm:p-8">
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="font-mono text-xs text-muted-foreground">{sale.sale_number}</div>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
              {customer?.full_name ?? "Buyer"}
              {flat?.unit_code ? <span className="text-muted-foreground"> · Flat {flat.unit_code}</span> : null}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${meta.tint}`}>
                <span className={`size-1.5 rounded-full ${meta.dot}`} />
                {meta.label}
              </span>
              <span className="rounded-full border border-border/60 bg-background/60 px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                {approvalLabel}
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Deal value</div>
            <div className="text-2xl font-extrabold text-foreground">{formatINR(sale.deal_value ?? 0)}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Booking {formatINR(sale.booking_amount ?? 0)} · Balance {formatINR(sale.remaining_amount ?? 0)}
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
          <div className="rounded-2xl border border-border/50 bg-card/60 p-3">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Project</div>
            <div className="font-semibold">{project?.name ?? "—"}</div>
            <div className="text-xs text-muted-foreground">{project?.location ?? ""}</div>
          </div>
          <div className="rounded-2xl border border-border/50 bg-card/60 p-3">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Seller</div>
            <div className="font-semibold">{seller?.full_name ?? "—"}</div>
            <div className="text-xs text-muted-foreground">{seller?.login_id ?? ""}</div>
          </div>
          <div className="rounded-2xl border border-border/50 bg-card/60 p-3">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Leader</div>
            <div className="font-semibold">{leader?.full_name ?? "—"}</div>
            <div className="text-xs text-muted-foreground">{leader?.login_id ?? ""}</div>
          </div>
        </div>
      </section>

      {(canSubmit || canApprove || canCancel) && (
        <SectionCard title="Actions" subtitle="Move this sale through its lifecycle." className="mt-6">
          <textarea
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Optional notes / reason (required for reject or cancel)"
            className="w-full rounded-2xl border border-border/60 bg-background/60 p-3 text-sm outline-none focus:border-primary/40"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {canSubmit && (
              <button
                type="button"
                onClick={() => submitM.mutate()}
                disabled={submitM.isPending}
                className="inline-flex h-10 items-center gap-1.5 rounded-2xl bg-gradient-to-br from-primary to-leaf px-4 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] disabled:opacity-50"
              >
                {submitM.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send size={14} />}
                Submit for approval
              </button>
            )}
            {canApprove && (
              <>
                <button
                  type="button"
                  onClick={() => approveM.mutate()}
                  disabled={approveM.isPending}
                  className="inline-flex h-10 items-center gap-1.5 rounded-2xl bg-emerald-600 px-4 text-sm font-semibold text-white shadow-[var(--shadow-glow)] disabled:opacity-50"
                >
                  {approveM.isPending ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck size={14} />}
                  Approve sale
                </button>
                <button
                  type="button"
                  onClick={() => rejectM.mutate()}
                  disabled={rejectM.isPending || !reason.trim()}
                  className="inline-flex h-10 items-center gap-1.5 rounded-2xl border border-destructive/40 bg-destructive/10 px-4 text-sm font-semibold text-destructive disabled:opacity-50"
                >
                  <X size={14} /> Reject
                </button>
              </>
            )}
            {canCancel && (
              <button
                type="button"
                onClick={() => cancelM.mutate()}
                disabled={cancelM.isPending || !reason.trim()}
                className="inline-flex h-10 items-center gap-1.5 rounded-2xl border border-border/60 bg-background/60 px-4 text-sm font-semibold text-muted-foreground disabled:opacity-50"
              >
                Cancel sale
              </button>
            )}
          </div>
          {(submitM.error || approveM.error || rejectM.error || cancelM.error) && (
            <div className="mt-3 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {((submitM.error || approveM.error || rejectM.error || cancelM.error) as Error).message}
            </div>
          )}
        </SectionCard>
      )}

      <SectionCard title="Documents" subtitle="Attach every proof required for admin verification." className="mt-6">
        <div className="grid gap-2 sm:grid-cols-[auto_1fr_1fr_auto]">
          <select
            value={docKind}
            onChange={(e) => setDocKind(e.target.value as (typeof DOC_KINDS)[number])}
            className="rounded-2xl border border-border/60 bg-background/60 px-3 py-2 text-sm"
          >
            {DOC_KINDS.map((k) => (
              <option key={k} value={k}>
                {k.replace(/_/g, " ")}
              </option>
            ))}
          </select>
          <input
            value={docLabel}
            onChange={(e) => setDocLabel(e.target.value)}
            placeholder="Label (optional)"
            className="rounded-2xl border border-border/60 bg-background/60 px-3 py-2 text-sm"
          />
          <input
            value={docUrl}
            onChange={(e) => setDocUrl(e.target.value)}
            placeholder="https://…"
            className="rounded-2xl border border-border/60 bg-background/60 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => addDocM.mutate()}
            disabled={addDocM.isPending}
            className="inline-flex h-10 items-center gap-1.5 rounded-2xl bg-foreground px-4 text-sm font-semibold text-background disabled:opacity-50"
          >
            <FileText size={14} /> Add
          </button>
        </div>
        <ul className="mt-3 space-y-2">
          {documents.length === 0 ? (
            <li className="rounded-xl border border-dashed border-border/50 p-3 text-sm text-muted-foreground">
              No documents yet.
            </li>
          ) : (
            documents.map((d) => (
              <li
                key={d.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border/50 bg-card/60 p-3 text-sm"
              >
                <div className="min-w-0">
                  <div className="font-semibold capitalize">
                    {d.kind.replace(/_/g, " ")}
                    {d.label ? <span className="text-muted-foreground"> · {d.label}</span> : null}
                  </div>
                  {d.file_url ? (
                    <a href={d.file_url} target="_blank" rel="noreferrer" className="truncate text-xs text-primary underline">
                      {d.file_url}
                    </a>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      d.status === "verified"
                        ? "bg-emerald-100 text-emerald-900"
                        : d.status === "rejected"
                        ? "bg-rose-100 text-rose-900"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {d.status ?? "pending"}
                  </span>
                  {isAdmin && d.status !== "verified" && (
                    <button
                      type="button"
                      onClick={() => verifyM.mutate({ id: d.id, status: "verified" })}
                      className="rounded-full border border-emerald-500/40 bg-emerald-500/10 p-1 text-emerald-700"
                      aria-label="Verify"
                    >
                      <Check size={12} />
                    </button>
                  )}
                  {isAdmin && d.status !== "rejected" && (
                    <button
                      type="button"
                      onClick={() => verifyM.mutate({ id: d.id, status: "rejected" })}
                      className="rounded-full border border-destructive/40 bg-destructive/10 p-1 text-destructive"
                      aria-label="Reject document"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </li>
            ))
          )}
        </ul>
      </SectionCard>

      <SectionCard title="Payments" subtitle="Log booking, installments, and final payments." className="mt-6">
        <div className="grid gap-2 sm:grid-cols-[auto_1fr_auto_auto_auto]">
          <select
            value={payStage}
            onChange={(e) => setPayStage(e.target.value as (typeof PAYMENT_STAGES)[number])}
            className="rounded-2xl border border-border/60 bg-background/60 px-3 py-2 text-sm"
          >
            {PAYMENT_STAGES.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, " ")}
              </option>
            ))}
          </select>
          <div className="relative">
            <IndianRupee className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="number"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              placeholder="Amount"
              className="w-full rounded-2xl border border-border/60 bg-background/60 py-2 pl-9 pr-3 text-sm"
            />
          </div>
          <input
            value={payMethod}
            onChange={(e) => setPayMethod(e.target.value)}
            placeholder="Method"
            className="rounded-2xl border border-border/60 bg-background/60 px-3 py-2 text-sm"
          />
          <input
            value={payRef}
            onChange={(e) => setPayRef(e.target.value)}
            placeholder="Reference"
            className="rounded-2xl border border-border/60 bg-background/60 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => addPayM.mutate()}
            disabled={addPayM.isPending || !payAmount}
            className="inline-flex h-10 items-center gap-1.5 rounded-2xl bg-foreground px-4 text-sm font-semibold text-background disabled:opacity-50"
          >
            <IndianRupee size={14} /> Log
          </button>
        </div>
        <ul className="mt-3 space-y-2">
          {payments.length === 0 ? (
            <li className="rounded-xl border border-dashed border-border/50 p-3 text-sm text-muted-foreground">
              No payments recorded.
            </li>
          ) : (
            payments.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border/50 bg-card/60 p-3 text-sm"
              >
                <div>
                  <div className="font-semibold capitalize">{p.stage.replace(/_/g, " ")}</div>
                  <div className="text-xs text-muted-foreground">
                    {p.received_on} {p.method ? `· ${p.method}` : ""} {p.reference ? `· ${p.reference}` : ""}
                  </div>
                </div>
                <div className="font-semibold">{formatINR(p.amount)}</div>
              </li>
            ))
          )}
        </ul>
      </SectionCard>

      <SectionCard title="Timeline" subtitle="Every action on this sale, immutable." className="mt-6">
        {audit.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/50 p-3 text-sm text-muted-foreground">
            No activity yet.
          </div>
        ) : (
          <ul className="space-y-2">
            {audit.map((a) => (
              <li key={a.id} className="flex items-start gap-3 rounded-2xl border border-border/50 bg-card/60 p-3">
                <Clock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold capitalize">{a.action.replace(/_/g, " ")}</div>
                  {a.reason ? <div className="text-xs text-muted-foreground">{a.reason}</div> : null}
                  <div className="text-[11px] text-muted-foreground">
                    {new Date(a.created_at).toLocaleString()} · {a.actor_role ?? "system"}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <div className="mt-4 text-xs text-muted-foreground">
        Need to update customer info?{" "}
        {customer ? (
          <Link to="/crm/$id" params={{ id: customer.id }} className="text-primary underline">
            Open customer profile
          </Link>
        ) : null}
      </div>
    </DashboardShell>
  );
}
