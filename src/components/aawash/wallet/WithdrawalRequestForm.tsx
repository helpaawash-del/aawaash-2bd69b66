import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { IndianRupee, Lock, Wallet } from "lucide-react";
import { requestWithdrawal, isWithinWithdrawalWindow, nextWindowLabel } from "@/lib/wallet.functions";
import { formatINR } from "@/components/aawash/dashboard-kit";

type Props = {
  withdrawable: number;
  invalidateKeys: (string | number)[][];
};

export function WithdrawalRequestForm({ withdrawable, invalidateKeys }: Props) {
  const qc = useQueryClient();
  const fn = useServerFn(requestWithdrawal);
  const [form, setForm] = useState({
    amount: "",
    bank_holder: "",
    bank_account_number: "",
    bank_ifsc: "",
    bank_name: "",
    bank_branch: "",
    upi_id: "",
    remarks: "",
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const submit = useMutation({
    mutationFn: (payload: Parameters<typeof fn>[0]) => fn(payload),
    onSuccess: () => {
      setSuccessMsg("Withdrawal request submitted.");
      setErrorMsg(null);
      setForm((f) => ({ ...f, amount: "", remarks: "" }));
      invalidateKeys.forEach((k) => qc.invalidateQueries({ queryKey: k }));
    },
    onError: (e) => {
      setSuccessMsg(null);
      setErrorMsg((e as Error).message);
    },
  });

  const withinWindow = isWithinWithdrawalWindow();

  if (!withinWindow) {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-warning/40 bg-warning/10 p-4 text-sm">
        <Lock size={18} className="mt-0.5 shrink-0 text-warning" />
        <div>
          <div className="font-semibold text-foreground">Withdrawal window is closed.</div>
          <p className="mt-1 text-xs text-muted-foreground">{nextWindowLabel()}</p>
        </div>
      </div>
    );
  }

  const disabled = submit.isPending;

  function handle(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    const amt = Number(form.amount);
    if (!Number.isFinite(amt) || amt <= 0) return setErrorMsg("Enter a valid amount.");
    if (amt > withdrawable) return setErrorMsg("Amount exceeds withdrawable balance.");
    submit.mutate({
      data: {
        amount: amt,
        bank_holder: form.bank_holder.trim(),
        bank_account_number: form.bank_account_number.trim(),
        bank_ifsc: form.bank_ifsc.trim().toUpperCase(),
        bank_name: form.bank_name.trim(),
        bank_branch: form.bank_branch.trim() || null,
        upi_id: form.upi_id.trim() || null,
        remarks: form.remarks.trim() || null,
      },
    });
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value });

  return (
    <form onSubmit={handle} className="flex flex-col gap-4">
      <div>
        <Label>Amount (₹)</Label>
        <div className="relative mt-1.5">
          <IndianRupee size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            inputMode="numeric"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value.replace(/[^0-9.]/g, "") })}
            placeholder="0"
            className="h-12 w-full rounded-2xl border border-input bg-surface pl-10 pr-4 text-base font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="mt-1.5 text-[11px] text-muted-foreground">Withdrawable: {formatINR(withdrawable)}</div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Account holder" value={form.bank_holder} onChange={set("bank_holder")} required />
        <Field label="Bank name" value={form.bank_name} onChange={set("bank_name")} required />
        <Field label="Account number" value={form.bank_account_number} onChange={set("bank_account_number")} required inputMode="numeric" />
        <Field label="IFSC code" value={form.bank_ifsc} onChange={set("bank_ifsc")} required />
        <Field label="Branch (optional)" value={form.bank_branch} onChange={set("bank_branch")} />
        <Field label="UPI ID (optional)" value={form.upi_id} onChange={set("upi_id")} />
      </div>

      <div>
        <Label>Remarks (optional)</Label>
        <input
          value={form.remarks}
          onChange={set("remarks")}
          maxLength={500}
          className="mt-1.5 h-12 w-full rounded-2xl border border-input bg-surface px-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {errorMsg && <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{errorMsg}</div>}
      {successMsg && <div className="rounded-xl border border-success/30 bg-success/10 px-3 py-2 text-xs text-success">{successMsg}</div>}

      <button
        type="submit"
        disabled={disabled}
        className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-primary to-leaf text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] disabled:opacity-50"
      >
        <Wallet size={14} /> {disabled ? "Submitting…" : "Request withdrawal"}
      </button>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  required = false,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <div>
      <Label>{label}</Label>
      <input
        required={required}
        inputMode={inputMode}
        value={value}
        onChange={onChange}
        className="mt-1.5 h-11 w-full rounded-2xl border border-input bg-surface px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{children}</label>
  );
}

export function WithdrawalStatusPill({ status }: { status: string }) {
  const cls =
    status === "completed"
      ? "bg-success/15 text-success"
      : status === "approved" || status === "processing"
        ? "bg-primary/15 text-primary"
        : status === "rejected" || status === "expired" || status === "returned"
          ? "bg-destructive/10 text-destructive"
          : status === "cancelled"
            ? "bg-muted text-muted-foreground"
            : "bg-warning/15 text-warning";
  return (
    <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${cls}`}>
      {status}
    </span>
  );
}
