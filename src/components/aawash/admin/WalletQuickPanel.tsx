import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Users, Wallet, X, Loader2, ArrowUpRight, ArrowDownRight, Search } from "lucide-react";
import { listTeamLeaders } from "@/lib/team-leaders.functions";
import { listAllMembers } from "@/lib/members-admin.functions";
import { adjustWallet } from "@/lib/finance-admin.functions";
import { formatINR, initials } from "@/components/aawash/dashboard-kit";

type Person = {
  id: string;
  full_name: string | null;
  login_id: string | null;
  mobile_number: string | null;
  avatar_url: string | null;
  wallet_balance: number | null;
  team_id?: string | null;
  team_letter?: string | null;
  team_name?: string | null;
};

export function WalletQuickPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const leadersFn = useServerFn(listTeamLeaders);
  const membersFn = useServerFn(listAllMembers);

  const leaders = useQuery({
    queryKey: ["admin", "team-leaders"],
    queryFn: () => leadersFn(),
    enabled: open,
    staleTime: 0,
  });
  const membersData = useQuery({
    queryKey: ["admin", "members"],
    queryFn: () => membersFn(),
    enabled: open,
    staleTime: 0,
  });

  const [membersOfTeam, setMembersOfTeam] = useState<{
    teamId: string;
    label: string;
  } | null>(null);
  const [q, setQ] = useState("");

  const leaderRows = useMemo<Person[]>(() => {
    const rows = leaders.data?.leaders ?? [];
    const needle = q.trim().toLowerCase();
    return rows
      .filter((r) => !r.is_deleted)
      .filter((r) =>
        !needle
          ? true
          : `${r.full_name ?? ""} ${r.login_id ?? ""} ${r.mobile_number ?? ""}`
              .toLowerCase()
              .includes(needle),
      );
  }, [leaders.data, q]);

  const refresh = async () => {
    await Promise.all([
      qc.refetchQueries({ queryKey: ["admin", "team-leaders"] }),
      qc.refetchQueries({ queryKey: ["admin", "members"] }),
      qc.invalidateQueries({ queryKey: ["admin", "overview"] }),
      qc.invalidateQueries({ queryKey: ["admin", "finance"] }),
    ]);
  };

  const applyOptimistic = (userId: string, delta: number) => {
    qc.setQueryData<typeof leaders.data>(["admin", "team-leaders"], (prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        leaders: prev.leaders.map((l) =>
          l.id === userId ? { ...l, wallet_balance: Number(l.wallet_balance ?? 0) + delta } : l,
        ),
      };
    });
    qc.setQueryData<typeof membersData.data>(["admin", "members"], (prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        members: prev.members.map((m) =>
          m.id === userId ? { ...m, wallet_balance: Number(m.wallet_balance ?? 0) + delta } : m,
        ),
      };
    });
  };

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[70] flex items-start justify-center p-3 pt-[6vh] sm:p-6"
        onClick={onClose}
      >
        <div className="absolute inset-0 bg-foreground/30 backdrop-blur-md" />
        <div
          className="relative flex w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-border bg-surface shadow-[var(--shadow-float)]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-3 border-b border-border px-5 py-4">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-primary to-leaf text-primary-foreground">
              <Wallet size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-extrabold text-foreground">Wallet Quick Edit</div>
              <div className="text-xs text-muted-foreground">
                Adjust Team Leader balances directly, or open a team to edit members.
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close wallet panel"
              className="grid h-9 w-9 place-items-center rounded-xl border border-border text-muted-foreground hover:text-foreground"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex items-center gap-2 border-b border-border px-5 py-3">
            <Search size={14} className="text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search leaders by name, login ID, mobile…"
              className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>

          <div className="max-h-[65vh] overflow-y-auto p-3 sm:p-4">
            {leaders.isLoading ? (
              <div className="grid place-items-center py-14 text-muted-foreground">
                <Loader2 size={20} className="animate-spin" />
              </div>
            ) : leaderRows.length === 0 ? (
              <div className="py-14 text-center text-sm text-muted-foreground">
                No team leaders yet. Create one from the dashboard.
              </div>
            ) : (
              <ul className="grid gap-2">
                {leaderRows.map((leader) => {
                  const memberCount =
                    membersData.data?.members.filter(
                      (m) => m.team_id && leader.team_id && m.team_id === leader.team_id && !m.is_deleted,
                    ).length ?? 0;
                  return (
                    <WalletRow
                      key={leader.id}
                      person={leader}
                      subLabel={
                        leader.team_letter
                          ? `Team ${leader.team_letter} • ${memberCount} members`
                          : "No team assigned"
                      }
                      onAdjusted={refresh}
                      onOptimistic={applyOptimistic}
                      extraAction={
                        leader.team_id ? (
                          <button
                            type="button"
                            onClick={() =>
                              setMembersOfTeam({
                                teamId: leader.team_id!,
                                label: `Team ${leader.team_letter ?? ""} · ${leader.full_name ?? ""}`,
                              })
                            }
                            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-2.5 py-1.5 text-[11px] font-bold text-foreground hover:border-primary/40 hover:text-primary"
                            aria-label="View team members"
                          >
                            <Users size={13} /> Members ({memberCount})
                          </button>
                        ) : null
                      }
                    />
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>

      {membersOfTeam && (
        <MembersWalletModal
          teamId={membersOfTeam.teamId}
          title={membersOfTeam.label}
          members={
            membersData.data?.members.filter(
              (m) => m.team_id === membersOfTeam.teamId && !m.is_deleted,
            ) ?? []
          }
          onClose={() => setMembersOfTeam(null)}
          onAdjusted={refresh}
          onOptimistic={applyOptimistic}
        />
      )}
    </>
  );
}

function MembersWalletModal({
  teamId,
  title,
  members,
  onClose,
  onAdjusted,
  onOptimistic,
}: {
  teamId: string;
  title: string;
  members: Person[];
  onClose: () => void;
  onAdjusted: () => Promise<void> | void;
  onOptimistic: (userId: string, delta: number) => void;
}) {
  void teamId;
  return (
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center p-2 pt-[4vh] sm:p-6"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-foreground/40 backdrop-blur-md" />
      <div
        className="relative flex h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-border bg-surface shadow-[var(--shadow-float)] sm:h-[86vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary-soft text-primary">
            <Users size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-extrabold text-foreground">{title}</div>
            <div className="text-xs text-muted-foreground">{members.length} members</div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close members panel"
            className="grid h-9 w-9 place-items-center rounded-xl border border-border text-muted-foreground hover:text-foreground"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 sm:p-4">
          {members.length === 0 ? (
            <div className="py-14 text-center text-sm text-muted-foreground">
              No members in this team yet.
            </div>
          ) : (
            <ul className="grid gap-2">
              {members.map((m) => (
                <WalletRow
                  key={m.id}
                  person={m}
                  subLabel={m.login_id ?? m.mobile_number ?? "Member"}
                  onAdjusted={onAdjusted}
                  onOptimistic={onOptimistic}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function WalletRow({
  person,
  subLabel,
  onAdjusted,
  onOptimistic,
  extraAction,
}: {
  person: Person;
  subLabel: string;
  onAdjusted: () => Promise<void> | void;
  onOptimistic?: (userId: string, delta: number) => void;
  extraAction?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <li className="glass-card overflow-hidden rounded-2xl border border-border/60 p-3 shadow-[var(--shadow-soft)]">
      <div className="flex items-center gap-3">
        <Avatar name={person.full_name ?? "?"} url={person.avatar_url} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold text-foreground">
            {person.full_name ?? "Unnamed"}
          </div>
          <div className="truncate text-[11px] text-muted-foreground">{subLabel}</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Wallet
          </div>
          <div className="text-sm font-extrabold text-primary">
            {formatINR(Number(person.wallet_balance ?? 0))}
          </div>
        </div>
        {extraAction}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-leaf px-3 py-2 text-[11px] font-bold text-primary-foreground shadow-[var(--shadow-glow)]"
        >
          <Wallet size={13} /> {open ? "Close" : "Edit"}
        </button>
      </div>
      {open && (
        <AdjustForm
          userId={person.id}
          onOptimistic={onOptimistic}
          onDone={async () => {
            setOpen(false);
            await onAdjusted();
          }}
        />
      )}
    </li>
  );
}

function AdjustForm({
  userId,
  onDone,
}: {
  userId: string;
  onDone: () => Promise<void> | void;
}) {
  const adjust = useServerFn(adjustWallet);
  const [amount, setAmount] = useState("");
  const [direction, setDirection] = useState<"credit" | "debit">("credit");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

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
      setAmount("");
      setReason("");
      await onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Adjustment failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-3 grid gap-2 rounded-2xl border border-border/70 bg-surface-warm/40 p-3 sm:grid-cols-[auto_1fr_auto]">
      <div className="flex gap-1 rounded-xl bg-surface p-1">
        <button
          type="button"
          onClick={() => setDirection("credit")}
          className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-[11px] font-bold ${
            direction === "credit"
              ? "bg-primary-soft text-primary"
              : "text-muted-foreground"
          }`}
        >
          <ArrowUpRight size={12} /> Credit
        </button>
        <button
          type="button"
          onClick={() => setDirection("debit")}
          className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-[11px] font-bold ${
            direction === "debit"
              ? "bg-destructive/10 text-destructive"
              : "text-muted-foreground"
          }`}
        >
          <ArrowDownRight size={12} /> Debit
        </button>
      </div>
      <div className="grid gap-2 sm:grid-cols-[140px_1fr]">
        <input
          type="number"
          min="1"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount ₹"
          className="rounded-xl border border-border bg-surface px-3 py-2 text-sm font-semibold text-foreground focus:border-primary focus:outline-none"
        />
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason (min 3 chars)"
          className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
        />
      </div>
      <button
        type="submit"
        disabled={busy}
        className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-foreground px-4 py-2 text-[11px] font-bold text-background disabled:opacity-60"
      >
        {busy ? <Loader2 size={13} className="animate-spin" /> : <Wallet size={13} />} Apply
      </button>
    </form>
  );
}

function Avatar({ name, url }: { name: string; url: string | null }) {
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className="h-10 w-10 shrink-0 rounded-full border border-border object-cover"
      />
    );
  }
  return (
    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-leaf text-xs font-bold text-primary-foreground">
      {initials(name)}
    </div>
  );
}
