import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Wallet, X, Loader2, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { adjustWallet } from "@/lib/finance-admin.functions";
import { invalidateAdmin } from "@/lib/admin-cache";
import { formatINR } from "@/components/aawash/dashboard-kit";

/**
 * Compact per-user wallet adjust dialog. Reuses the audited
 * `adjustWallet` server function used by WalletQuickPanel and
 * optimistically updates the two admin caches so both the leader
 * and member consoles reflect the change immediately.
 */
export function WalletAdjustDialog({
  userId,
  userName,
  currentBalance,
  onClose,
}: {
  userId: string;
  userName: string;
  currentBalance: number;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const adjust = useServerFn(adjustWallet);
  const [amount, setAmount] = useState("");
  const [direction, setDirection] = useState<"credit" | "debit">("credit");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const applyOptimistic = (delta: number) => {
    qc.setQueryData<any>(["admin", "team-leaders"], (prev: any) => {
      if (!prev?.leaders) return prev;
      return {
        ...prev,
        leaders: prev.leaders.map((l: any) =>
          l.id === userId ? { ...l, wallet_balance: Number(l.wallet_balance ?? 0) + delta } : l,
        ),
      };
    });
    qc.setQueryData<any>(["admin", "members"], (prev: any) => {
      if (!prev?.members) return prev;
      return {
        ...prev,
        members: prev.members.map((m: any) =>
          m.id === userId ? { ...m, wallet_balance: Number(m.wallet_balance ?? 0) + delta } : m,
        ),
      };
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      toast.error("Enter a positive amount");
      return;
    }
    if (reason.trim().length < 3) {
      toast.error("Reason must be at least 3 characters");
      return;
    }
    setBusy(true);
    const delta = direction === "credit" ? amt : -amt;
    applyOptimistic(delta);
    try {
      await adjust({
        data: {
          user_id: userId,
          amount: amt,
          direction,
          kind: "adjustment",
          reason: reason.trim(),
        },
      });
      toast.success(`${direction === "credit" ? "Credited" : "Debited"} ${formatINR(amt)}`);
      await invalidateAdmin(qc, "wallet");
      onClose();
    } catch (err) {
      applyOptimistic(-delta);
      toast.error(err instanceof Error ? err.message : "Adjustment failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[90] grid place-items-center p-3 sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Adjust wallet for ${userName}`}
    >
      <div className="absolute inset-0 bg-foreground/40 backdrop-blur-md" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-border bg-surface shadow-[var(--shadow-float)]"
      >
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-primary to-leaf text-primary-foreground">
            <Wallet size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-extrabold text-foreground">{userName}</div>
            <div className="text-xs text-muted-foreground">
              Current wallet: <span className="font-bold text-primary">{formatINR(currentBalance)}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-9 w-9 place-items-center rounded-xl border border-border text-muted-foreground hover:text-foreground"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={submit} className="grid gap-3 p-5">
          <div className="flex gap-1 rounded-xl bg-muted/40 p-1">
            <button
              type="button"
              onClick={() => setDirection("credit")}
              className={`flex-1 inline-flex items-center justify-center gap-1 rounded-lg px-3 py-2 text-xs font-bold ${
                direction === "credit" ? "bg-primary-soft text-primary" : "text-muted-foreground"
              }`}
            >
              <ArrowUpRight size={13} /> Credit
            </button>
            <button
              type="button"
              onClick={() => setDirection("debit")}
              className={`flex-1 inline-flex items-center justify-center gap-1 rounded-lg px-3 py-2 text-xs font-bold ${
                direction === "debit" ? "bg-destructive/10 text-destructive" : "text-muted-foreground"
              }`}
            >
              <ArrowDownRight size={13} /> Debit
            </button>
          </div>
          <label className="block text-xs">
            <span className="font-semibold text-muted-foreground">Amount (₹)</span>
            <input
              type="number"
              min="1"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 500"
              className="mt-1 block w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm font-semibold text-foreground focus:border-primary focus:outline-none"
              autoFocus
            />
          </label>
          <label className="block text-xs">
            <span className="font-semibold text-muted-foreground">Reason</span>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason (min 3 chars)"
              className="mt-1 block w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </label>
          <div className="mt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-border bg-surface px-4 py-2 text-xs font-semibold text-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2 text-xs font-bold text-primary-foreground shadow-[var(--shadow-glow)] disabled:opacity-60"
            >
              {busy ? <Loader2 size={13} className="animate-spin" /> : <Wallet size={13} />} Apply
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/** Compact "Edit" pill button that opens a WalletAdjustDialog. */
export function WalletEditButton({
  userId,
  userName,
  currentBalance,
  className,
}: {
  userId: string;
  userName: string;
  currentBalance: number;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        aria-label={`Edit wallet for ${userName}`}
        className={
          className ??
          "inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary-soft px-2.5 py-1 text-[10px] font-bold text-primary hover:bg-primary hover:text-primary-foreground"
        }
      >
        <Wallet size={11} /> Edit
      </button>
      {open && (
        <WalletAdjustDialog
          userId={userId}
          userName={userName}
          currentBalance={currentBalance}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
