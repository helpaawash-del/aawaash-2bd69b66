import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { X, Loader2, UserPlus, Trash2, Sliders } from "lucide-react";
import {
  createTeamLeaderFull,
  setLeaderMetrics,
  deleteTeamLeader,
} from "@/lib/team-leaders.functions";
import { invalidateAdmin } from "@/lib/admin-cache";

type Team = { id: string; letter: string; name: string; leader_id: string | null };

function Shell({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-[120] grid place-items-center bg-slate-900/45 p-4 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg overflow-hidden rounded-3xl border border-border bg-surface p-6 shadow-[var(--shadow-float)] animate-scale-in"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-extrabold tracking-tight text-foreground">{title}</h2>
            {subtitle ? <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-9 w-9 place-items-center rounded-full bg-muted/50 text-muted-foreground transition-colors hover:bg-muted"
          >
            <X size={16} />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto pr-1">{children}</div>
      </div>
    </div>
  );
}

const field =
  "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-shadow focus:ring-2 focus:ring-primary/40";
const labelCls = "text-[11px] font-semibold uppercase tracking-wider text-muted-foreground";

/* ------------------------------ Add leader ------------------------------ */

export function AddLeaderDialog({ teams, onClose }: { teams: Team[]; onClose: () => void }) {
  const qc = useQueryClient();
  const create = useServerFn(createTeamLeaderFull);
  const openTeams = teams.filter((t) => !t.leader_id);
  const [form, setForm] = useState({
    fullName: "",
    mobile: "",
    password: "",
    teamId: openTeams[0]?.id ?? "",
    teamName: "",
    email: "",
  });
  const [busy, setBusy] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.fullName.trim().length < 2) return toast.error("Enter the leader's full name");
    if (!/^\d{10}$/.test(form.mobile)) return toast.error("Mobile must be exactly 10 digits");
    if (form.password.length < 8) return toast.error("Password must be at least 8 characters");
    if (!form.teamId) return toast.error("Select an available team");
    setBusy(true);
    const t = toast.loading("Creating Team Leader…");
    try {
      const res = await create({
        data: {
          fullName: form.fullName.trim(),
          mobile: form.mobile,
          password: form.password,
          teamId: form.teamId,
          teamName: form.teamName.trim() || undefined,
          email: form.email.trim(),
        },
      });
      toast.success(`Team Leader created — login ID ${res.loginId}`, { id: t });
      await invalidateAdmin(qc, "leader");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create Team Leader", { id: t });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell title="Add Team Leader" subtitle="Creates the login, the role, and the team assignment." onClose={onClose}>
      <fieldset disabled={busy} className="contents"><form onSubmit={submit} className="grid gap-3">
        <label className="grid gap-1">
          <span className={labelCls}>Full name</span>
          <input className={field} value={form.fullName} onChange={set("fullName")} placeholder="Ravi Kumar" />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1">
            <span className={labelCls}>Mobile (login ID)</span>
            <input className={field} value={form.mobile} onChange={set("mobile")} inputMode="numeric" maxLength={10} placeholder="9876543210" />
          </label>
          <label className="grid gap-1">
            <span className={labelCls}>Password</span>
            <input className={field} type="text" value={form.password} onChange={set("password")} placeholder="min 8 characters" />
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1">
            <span className={labelCls}>Team</span>
            <select className={field} value={form.teamId} onChange={set("teamId")}>
              {openTeams.length === 0 ? <option value="">No team slots free</option> : null}
              {openTeams.map((t) => (
                <option key={t.id} value={t.id}>
                  Team {t.letter} — {t.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1">
            <span className={labelCls}>Rename team (optional)</span>
            <input className={field} value={form.teamName} onChange={set("teamName")} placeholder="Team name" />
          </label>
        </div>
        <label className="grid gap-1">
          <span className={labelCls}>Email (optional)</span>
          <input className={field} value={form.email} onChange={set("email")} placeholder="leader@example.com" />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-[var(--shadow-glow)] disabled:opacity-60"
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
          {busy ? "Creating…" : "Create Team Leader"}
        </button>
      </form>
      </fieldset>
    </Shell>
  );
}

/* --------------------------- Manage / metrics --------------------------- */

export type LeaderMetrics = {
  id: string;
  full_name: string;
  sales_count: number;
  wallet_balance: number;
  total_commission: number;
  total_revenue: number;
  member_count: number;
};

export function LeaderMetricsDialog({ leader, onClose }: { leader: LeaderMetrics; onClose: () => void }) {
  const qc = useQueryClient();
  const save = useServerFn(setLeaderMetrics);
  const [form, setForm] = useState({
    salesCount: String(leader.sales_count ?? 0),
    walletBalance: String(Number(leader.wallet_balance ?? 0)),
    totalCommission: String(Number(leader.total_commission ?? 0)),
    totalRevenue: String(Number(leader.total_revenue ?? 0)),
    memberCount: String(leader.member_count ?? 0),
  });
  const [busy, setBusy] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const num = (v: string) => {
    const n = Number(v);
    return Number.isFinite(n) && v.trim() !== "" ? n : null;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const t = toast.loading("Saving leader analytics…");
    try {
      await save({
        data: {
          userId: leader.id,
          salesCount: num(form.salesCount),
          walletBalance: num(form.walletBalance),
          totalCommission: num(form.totalCommission),
          totalRevenue: num(form.totalRevenue),
          memberCount: num(form.memberCount),
        },
      });
      toast.success("Leader analytics updated — live on their dashboard", { id: t });
      await invalidateAdmin(qc, "leader");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save changes", { id: t });
    } finally {
      setBusy(false);
    }
  };

  const rows: Array<[keyof typeof form, string]> = [
    ["salesCount", "Sales"],
    ["walletBalance", "Wallet balance (₹)"],
    ["totalCommission", "Commission (₹)"],
    ["totalRevenue", "Team revenue (₹)"],
    ["memberCount", "Total members"],
  ];

  return (
    <Shell
      title={`Manage ${leader.full_name}`}
      subtitle="Edit the headline analytics. Leave a field blank to fall back to the computed value."
      onClose={onClose}
    >
      <fieldset disabled={busy} className="contents"><form onSubmit={submit} className="grid gap-3">
        {rows.map(([k, label]) => (
          <label key={k} className="grid gap-1">
            <span className={labelCls}>{label}</span>
            <input className={field} value={form[k]} onChange={set(k)} inputMode="decimal" />
          </label>
        ))}
        <button
          type="submit"
          disabled={busy}
          className="mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-[var(--shadow-glow)] disabled:opacity-60"
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Sliders size={16} />}
          {busy ? "Saving…" : "Save changes"}
        </button>
      </form>
      </fieldset>
    </Shell>
  );
}

/* ------------------------------- Delete -------------------------------- */

export function DeleteLeaderDialog({
  leader,
  onClose,
}: {
  leader: { id: string; full_name: string };
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const del = useServerFn(deleteTeamLeader);
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setBusy(true);
    const t = toast.loading("Deleting Team Leader…");
    try {
      await del({ data: { userId: leader.id } });
      toast.success(`${leader.full_name} removed`, { id: t });
      await invalidateAdmin(qc, "leader");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete Team Leader", { id: t });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell title="Delete Team Leader" subtitle="The login is revoked and the team slot is freed. Sales history is kept." onClose={onClose}>
      <p className="text-sm text-muted-foreground">
        Are you sure you want to delete <strong className="text-foreground">{leader.full_name}</strong>?
      </p>
      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-muted px-4 py-2 text-sm font-semibold text-foreground"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={confirm}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-full bg-destructive px-4 py-2 text-sm font-bold text-destructive-foreground disabled:opacity-60"
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
          {busy ? "Deleting…" : "Delete leader"}
        </button>
      </div>
    </Shell>
  );
}
