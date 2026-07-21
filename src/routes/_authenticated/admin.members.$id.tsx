import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Users,
  IndianRupee,
  Wallet,
  BadgeCheck,
  Save,
  KeyRound,
  Loader2,
  UserCog,
  ShieldOff,
  ShieldCheck,
  Activity,
  Gift,
  Receipt,
  ClipboardList,
} from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { RoleGuard } from "@/components/aawash/AuthGuard";
import { AdminShell } from "@/components/aawash/admin/AdminShell";
import { formatINR, initials, StatCard } from "@/components/aawash/dashboard-kit";
import {
  getMemberDetail,
  updateMember,
  changeMemberTeam,
  listAllMembers,
} from "@/lib/members-admin.functions";
import { adminResetPassword, setUserStatus } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/members/$id")({
  component: Page,
  head: () => ({ meta: [{ title: "Member Detail — Aawash Admin" }] }),
});

function Page() {
  return (
    <RoleGuard allow={["super_admin"]}>
      <Content />
    </RoleGuard>
  );
}

type TabKey = "overview" | "customers" | "sales" | "tips" | "commissions" | "wallet" | "activity";

function Content() {
  const { id } = Route.useParams();
  const { profile: me } = useSession();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const detailFn = useServerFn(getMemberDetail);
  const listFn = useServerFn(listAllMembers);
  const updateFn = useServerFn(updateMember);
  const teamFn = useServerFn(changeMemberTeam);
  const resetFn = useServerFn(adminResetPassword);
  const statusFn = useServerFn(setUserStatus);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin", "member", id],
    queryFn: () => detailFn({ data: { userId: id } }),
  });
  const { data: list } = useQuery({ queryKey: ["admin", "members"], queryFn: () => listFn() });

  const [tab, setTab] = useState<TabKey>("overview");
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [showReset, setShowReset] = useState(false);
  const [newPass, setNewPass] = useState("");
  const [resetting, setResetting] = useState(false);

  const [showTeam, setShowTeam] = useState(false);
  const [newTeamId, setNewTeamId] = useState("");
  const [movingTeam, setMovingTeam] = useState(false);

  const p = data?.profile;
  const team = data?.team;
  const leader = data?.leader;

  const availableTeams = useMemo(
    () => (list?.leaders ?? []).filter((t) => t.leader_id && t.team_id !== p?.team_id),
    [list, p],
  );

  function beginEdit() {
    if (!p) return;
    setForm({
      fullName: p.full_name ?? "",
      email: p.email ?? "",
      address: p.address ?? "",
      avatarUrl: p.avatar_url ?? "",
      joiningDate: p.joining_date ?? "",
      remarks: p.remarks ?? "",
    });
    setEditing(true);
    setMsg(null);
    setErr(null);
  }

  async function saveEdit() {
    setSaving(true);
    setErr(null);
    try {
      await updateFn({ data: { userId: id, ...form } });
      setMsg("Profile updated");
      setEditing(false);
      await refetch();
      qc.invalidateQueries({ queryKey: ["admin", "members"] });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  async function doReset() {
    setResetting(true);
    setErr(null);
    try {
      await resetFn({ data: { userId: id, password: newPass } });
      setMsg("Password reset");
      setShowReset(false);
      setNewPass("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Password reset failed");
    } finally {
      setResetting(false);
    }
  }

  async function doTeamChange() {
    if (!newTeamId) return;
    setMovingTeam(true);
    setErr(null);
    try {
      const res = await teamFn({ data: { userId: id, teamId: newTeamId } });
      setMsg(`Moved to Team ${res.teamLetter ?? ""} · Login ID ${res.loginId ?? ""}`);
      setShowTeam(false);
      setNewTeamId("");
      await refetch();
      qc.invalidateQueries({ queryKey: ["admin", "members"] });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Team change failed");
    } finally {
      setMovingTeam(false);
    }
  }

  async function toggleStatus(action: "activate" | "suspend") {
    setErr(null);
    try {
      await statusFn({ data: { userId: id, action } });
      setMsg(action === "activate" ? "Member activated" : "Member suspended");
      await refetch();
      qc.invalidateQueries({ queryKey: ["admin", "members"] });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Status change failed");
    }
  }

  if (isLoading || !p) {
    return (
      <AdminShell profile={me}>
        <div className="p-10 text-center text-sm text-muted-foreground">Loading member…</div>
      </AdminShell>
    );
  }

  const s = data.salesSummary;
  const c = data.commissionSummary;
  const w = data.withdrawalSummary;

  return (
    <AdminShell profile={me}>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <button
          onClick={() => navigate({ to: "/admin/members" })}
          className="glass-card grid h-10 w-10 place-items-center rounded-2xl text-foreground shadow-[var(--shadow-soft)]"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Member profile
          </div>
          <h1 className="mt-1 text-2xl font-extrabold text-foreground sm:text-3xl">{p.full_name}</h1>
        </div>
      </div>

      {/* Header card */}
      <section className="glass-card mb-6 rounded-4xl p-6 shadow-[var(--shadow-soft)]">
        <div className="flex flex-wrap items-center gap-5">
          <div className="grid h-16 w-16 place-items-center rounded-3xl bg-primary-soft text-lg font-bold text-primary">
            {p.avatar_url ? (
              <img src={p.avatar_url} alt="" className="h-full w-full rounded-3xl object-cover" />
            ) : (
              initials(p.full_name ?? "")
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-primary-soft px-2 py-0.5 font-bold text-primary">
                {p.display_code}
              </span>
              <span className="font-mono font-bold text-foreground">{p.login_id}</span>
              <span
                className={`rounded-full border px-2 py-0.5 font-semibold ${
                  p.is_active
                    ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-700"
                    : "border-amber-500/30 bg-amber-500/15 text-amber-700"
                }`}
              >
                {p.status ?? (p.is_active ? "active" : "suspended")}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted-foreground">
              <span>Mobile <span className="font-semibold text-foreground">{p.mobile_number}</span></span>
              <span>Team <span className="font-semibold text-foreground">{team?.letter ?? "—"} · {team?.name ?? "—"}</span></span>
              <span>Leader <span className="font-semibold text-foreground">{leader?.full_name ?? "—"}</span></span>
              {p.joining_date && <span>Joined <span className="font-semibold text-foreground">{new Date(p.joining_date).toLocaleDateString()}</span></span>}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={beginEdit}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-xs font-semibold text-foreground"
            >
              <Save size={14} />
              Edit profile
            </button>
            <button
              onClick={() => setShowTeam(true)}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-xs font-semibold text-foreground"
            >
              <UserCog size={14} />
              Change team
            </button>
            <button
              onClick={() => setShowReset(true)}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-xs font-semibold text-foreground"
            >
              <KeyRound size={14} />
              Reset password
            </button>
            {p.is_active ? (
              <button
                onClick={() => toggleStatus("suspend")}
                className="inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-xs font-semibold text-amber-800"
              >
                <ShieldOff size={14} />
                Suspend
              </button>
            ) : (
              <button
                onClick={() => toggleStatus("activate")}
                className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-800"
              >
                <ShieldCheck size={14} />
                Activate
              </button>
            )}
          </div>
        </div>

        {(msg || err) && (
          <div
            className={`mt-4 rounded-2xl border px-4 py-2 text-xs ${
              err
                ? "border-red-500/40 bg-red-500/10 text-red-800"
                : "border-emerald-500/40 bg-emerald-500/10 text-emerald-800"
            }`}
          >
            {err ?? msg}
          </div>
        )}
      </section>

      {/* KPI strip */}
      <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={<IndianRupee size={18} />} label="Revenue" value={formatINR(s.revenue, { compact: true })} accent="gold" />
        <StatCard icon={<BadgeCheck size={18} />} label="Approved sales" value={s.approved} accent="leaf" />
        <StatCard icon={<Wallet size={18} />} label="Wallet" value={formatINR(Number(p.wallet_balance ?? 0), { compact: true })} />
        <StatCard icon={<IndianRupee size={18} />} label="Commission" value={formatINR(c.total, { compact: true })} accent="gold" />
      </section>
      <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={<Users size={18} />} label="Customers" value={data.customerCount} />
        <StatCard icon={<Receipt size={18} />} label="Avg sale" value={formatINR(s.avgSale, { compact: true })} />
        <StatCard icon={<Receipt size={18} />} label="Highest sale" value={formatINR(s.highestSale, { compact: true })} />
        <StatCard icon={<Gift size={18} />} label="Tip earnings" value={formatINR(c.tips, { compact: true })} />
      </section>

      {/* Tabs */}
      <div className="glass-card mb-4 flex flex-wrap gap-1 rounded-2xl p-1 shadow-[var(--shadow-soft)]">
        {(
          [
            ["overview", "Overview"],
            ["customers", "Customers"],
            ["sales", "Sales"],
            ["tips", "Tip persons"],
            ["commissions", "Commissions"],
            ["wallet", "Wallet"],
            ["activity", "Activity"],
          ] as [TabKey, string][]
        ).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
              tab === k ? "bg-primary text-primary-foreground" : "text-foreground/70 hover:bg-surface"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <section className="grid gap-4 lg:grid-cols-3">
          <Panel title="Time windows" className="lg:col-span-2">
            <div className="grid grid-cols-3 gap-3 text-sm">
              <Row k="Today" v={formatINR(s.today, { compact: true })} />
              <Row k="This month" v={formatINR(s.month, { compact: true })} />
              <Row k="This year" v={formatINR(s.year, { compact: true })} />
              <Row k="Draft" v={s.draft} />
              <Row k="Pending" v={s.pending} />
              <Row k="Cancelled" v={s.cancelled} />
            </div>
          </Panel>
          <Panel title="Withdrawal summary">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Row k="Pending" v={w.pending} />
              <Row k="Approved" v={w.approved} />
              <Row k="Processing" v={w.processing} />
              <Row k="Completed" v={w.completed} />
              <Row k="Rejected" v={w.rejected} />
              <Row k="Cancelled" v={w.cancelled} />
            </div>
          </Panel>
          {p.address && (
            <Panel title="Address" className="lg:col-span-2">
              <div className="text-sm text-foreground">{p.address}</div>
            </Panel>
          )}
          {p.remarks && (
            <Panel title="Remarks">
              <div className="text-sm text-foreground">{p.remarks}</div>
            </Panel>
          )}
        </section>
      )}

      {tab === "customers" && (
        <Panel title={`Customers (${data.customers.length})`}>
          {data.customers.length === 0 ? (
            <Empty text="No customers assigned to this member yet." />
          ) : (
            <div className="divide-y divide-border">
              {data.customers.map((c) => (
                <Link
                  key={c.id}
                  to="/crm/$id"
                  params={{ id: c.id }}
                  className="flex items-center justify-between py-3 text-sm hover:opacity-80"
                >
                  <div>
                    <div className="font-semibold text-foreground">{c.full_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {c.mobile_number} · {new Date(c.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-semibold text-primary">
                    {c.status}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </Panel>
      )}

      {tab === "sales" && (
        <Panel title={`Sales (${data.sales.length})`}>
          {data.sales.length === 0 ? (
            <Empty text="No sales recorded yet." />
          ) : (
            <div className="divide-y divide-border">
              {data.sales.slice(0, 100).map((s) => (
                <Link
                  key={s.id}
                  to="/sales-workflow/$id"
                  params={{ id: s.id }}
                  className="grid grid-cols-[1fr_auto] items-center gap-3 py-3 text-sm hover:opacity-80"
                >
                  <div>
                    <div className="font-semibold text-foreground">
                      {s.sale_number} · {s.buyer_name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {s.unit_label} · {new Date(s.created_at).toLocaleDateString()} · {s.approval_status}
                    </div>
                  </div>
                  <div className="text-right font-bold text-foreground">
                    {formatINR(Number(s.deal_value ?? 0), { compact: true })}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Panel>
      )}

      {tab === "tips" && (
        <Panel title={`Tip persons (${data.tipPersons.length})`}>
          {data.tipPersons.length === 0 ? (
            <Empty text="No tip persons registered by this member." />
          ) : (
            <div className="divide-y divide-border">
              {data.tipPersons.map((t) => (
                <div key={t.id} className="grid grid-cols-[1fr_auto] items-center gap-3 py-3 text-sm">
                  <div>
                    <div className="font-semibold text-foreground">{t.tip_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {t.tip_mobile} · Customer {t.customer_name ?? "—"} · {t.interested_project ?? ""}
                    </div>
                  </div>
                  <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-semibold text-primary">
                    {t.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Panel>
      )}

      {tab === "commissions" && (
        <Panel title={`Commission transactions (${data.transactions.length})`}>
          <div className="mb-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <Row k="Total" v={formatINR(c.total, { compact: true })} />
            <Row k="Pending" v={formatINR(c.pending, { compact: true })} />
            <Row k="Approved" v={formatINR(c.approved, { compact: true })} />
            <Row k="Tips" v={formatINR(c.tips, { compact: true })} />
          </div>
          {data.transactions.length === 0 ? (
            <Empty text="No commissions yet." />
          ) : (
            <div className="divide-y divide-border">
              {data.transactions.slice(0, 100).map((t) => (
                <Link
                  key={t.id}
                  to="/commissions/$id"
                  params={{ id: t.id }}
                  className="grid grid-cols-[1fr_auto] items-center gap-3 py-3 text-sm hover:opacity-80"
                >
                  <div>
                    <div className="font-semibold text-foreground">{t.txn_number}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(t.created_at).toLocaleDateString()} · {t.status}
                    </div>
                  </div>
                  <div className="text-right font-bold text-foreground">
                    {formatINR(Number(t.member_amount ?? 0), { compact: true })}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Panel>
      )}

      {tab === "wallet" && (
        <Panel title={`Withdrawals (${data.withdrawals.length})`}>
          <div className="mb-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <Row k="Available" v={formatINR(Number(p.wallet_balance ?? 0), { compact: true })} />
            <Row k="Locked" v={formatINR(Number((p as any).locked_balance ?? 0), { compact: true })} />
            <Row k="Lifetime earned" v={formatINR(Number(p.total_earnings ?? 0), { compact: true })} />
            <Row k="Lifetime withdrawn" v={formatINR(Number((p as any).lifetime_withdrawals ?? 0), { compact: true })} />
          </div>
          {data.withdrawals.length === 0 ? (
            <Empty text="No withdrawal history." />
          ) : (
            <div className="divide-y divide-border">
              {data.withdrawals.map((w) => (
                <div key={w.id} className="grid grid-cols-[1fr_auto] items-center gap-3 py-3 text-sm">
                  <div>
                    <div className="font-semibold text-foreground">{w.reference_number}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(w.requested_at).toLocaleDateString()} · {w.status}
                    </div>
                  </div>
                  <div className="text-right font-bold text-foreground">
                    {formatINR(Number(w.amount ?? 0), { compact: true })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      )}

      {tab === "activity" && (
        <Panel title={`Audit trail (${data.audit.length})`}>
          {data.audit.length === 0 ? (
            <Empty text="No activity recorded yet." />
          ) : (
            <ul className="space-y-2">
              {data.audit.map((a) => (
                <li key={a.id} className="flex items-start gap-3 rounded-2xl border border-border/60 p-3 text-sm">
                  <Activity size={14} className="mt-0.5 text-primary" />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-foreground">{a.action}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {new Date(a.created_at).toLocaleString()} · {a.entity_type}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}

      {/* Edit modal */}
      {editing && (
        <Modal title="Edit member profile" onClose={() => setEditing(false)}>
          <div className="grid gap-3">
            {(
              [
                ["fullName", "Full name"],
                ["email", "Email"],
                ["avatarUrl", "Avatar URL"],
                ["joiningDate", "Joining date"],
              ] as const
            ).map(([k, label]) => (
              <FieldRow key={k} label={label}>
                <input
                  value={form[k] ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
                  type={k === "joiningDate" ? "date" : "text"}
                  className="w-full rounded-2xl border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                />
              </FieldRow>
            ))}
            <FieldRow label="Address">
              <textarea
                value={form.address ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                rows={2}
                className="w-full resize-none rounded-2xl border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
              />
            </FieldRow>
            <FieldRow label="Remarks">
              <textarea
                value={form.remarks ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))}
                rows={2}
                className="w-full resize-none rounded-2xl border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
              />
            </FieldRow>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button
              onClick={() => setEditing(false)}
              className="rounded-full border border-border bg-surface px-4 py-2 text-xs font-semibold text-foreground"
            >
              Cancel
            </button>
            <button
              onClick={saveEdit}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Save
            </button>
          </div>
        </Modal>
      )}

      {/* Reset password modal */}
      {showReset && (
        <Modal title="Reset password" onClose={() => setShowReset(false)}>
          <FieldRow label="New password">
            <input
              type="password"
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              className="w-full rounded-2xl border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            />
          </FieldRow>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Minimum 8 characters. Share with the member securely.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button
              onClick={() => setShowReset(false)}
              className="rounded-full border border-border bg-surface px-4 py-2 text-xs font-semibold text-foreground"
            >
              Cancel
            </button>
            <button
              onClick={doReset}
              disabled={resetting || newPass.length < 8}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50"
            >
              {resetting ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
              Reset
            </button>
          </div>
        </Modal>
      )}

      {/* Team change modal */}
      {showTeam && (
        <Modal title="Change team assignment" onClose={() => setShowTeam(false)}>
          <FieldRow label="New team">
            <select
              value={newTeamId}
              onChange={(e) => setNewTeamId(e.target.value)}
              className="w-full rounded-2xl border border-border bg-surface px-3 py-2 text-sm font-semibold text-foreground outline-none focus:border-primary"
            >
              <option value="">— Choose a team —</option>
              {availableTeams.map((t) => (
                <option key={t.team_id} value={t.team_id}>
                  Team {t.letter} · {t.name} ({t.member_count} members)
                </option>
              ))}
            </select>
          </FieldRow>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Login ID will automatically regenerate as TeamLetter + mobile.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button
              onClick={() => setShowTeam(false)}
              className="rounded-full border border-border bg-surface px-4 py-2 text-xs font-semibold text-foreground"
            >
              Cancel
            </button>
            <button
              onClick={doTeamChange}
              disabled={movingTeam || !newTeamId}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50"
            >
              {movingTeam ? <Loader2 size={14} className="animate-spin" /> : <UserCog size={14} />}
              Move
            </button>
          </div>
        </Modal>
      )}
    </AdminShell>
  );
}

function Panel({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`glass-card rounded-3xl p-5 shadow-[var(--shadow-soft)] ${className ?? ""}`}
    >
      <h3 className="mb-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-surface p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{k}</div>
      <div className="mt-1 text-sm font-bold text-foreground">{v}</div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border/60 p-6 text-center text-xs text-muted-foreground">
      <ClipboardList size={18} className="mx-auto mb-2 opacity-60" />
      {text}
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="glass-card w-full max-w-md rounded-3xl p-6 shadow-[var(--shadow-float)]">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-foreground">{title}</h3>
          <button onClick={onClose} className="text-sm text-muted-foreground hover:text-foreground">
            ✕
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
