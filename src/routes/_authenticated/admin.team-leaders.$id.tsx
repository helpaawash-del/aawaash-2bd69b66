import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  UserCog,
  Users,
  TrendingUp,
  Wallet,
  Coins,
  ShieldCheck,
  Pencil,
  Save,
  X,
  Loader2,
  Building2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  BadgeCheck,
  Activity,
  Circle,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { RoleGuard } from "@/components/aawash/AuthGuard";
import { AdminShell } from "@/components/aawash/admin/AdminShell";
import { ConfirmDialog } from "@/components/aawash/admin/ConfirmDialog";
import { getTeamLeaderDetail, updateTeamLeader } from "@/lib/team-leaders.functions";
import { adminResetPassword, setUserStatus } from "@/lib/admin.functions";
import { formatINR, initials } from "@/components/aawash/dashboard-kit";
import { supabase } from "@/integrations/supabase/client";
import { invalidateAdmin } from "@/lib/admin-cache";


export const Route = createFileRoute("/_authenticated/admin/team-leaders/$id")({
  component: Page,
  head: () => ({ meta: [{ title: "Team Leader · Aawash Admin" }] }),
});

function Page() {
  return (
    <RoleGuard allow={["super_admin"]}>
      <Content />
    </RoleGuard>
  );
}

type Tab = "overview" | "members" | "sales" | "commissions" | "wallet" | "activity";

function Content() {
  const { profile: me } = useSession();
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const detailFn = useServerFn(getTeamLeaderDetail);
  const updateFn = useServerFn(updateTeamLeader);
  const resetFn = useServerFn(adminResetPassword);
  const statusFn = useServerFn(setUserStatus);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["admin", "team-leader", id],
    queryFn: () => detailFn({ data: { userId: id } }),
    // Poll every 8s so leaders' members list stays visibly current
    // even without realtime, and always refresh on window focus.
    refetchInterval: 8000,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const [tab, setTab] = useState<Tab>("members");
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState<"reset" | "suspend" | "activate" | "delete" | null>(null);
  const [confirmKind, setConfirmKind] = useState<"suspend" | "activate" | "delete" | null>(null);

  // Realtime member-roster subscription for the leader's team.
  // Falls back gracefully to the 8s poll above if realtime isn't wired up
  // for the profiles table; either way the list stays fresh and we surface
  // a toast whenever a member is added, updated, or removed.
  const teamId = data?.team?.id ?? data?.profile?.team_id ?? null;
  const prevMemberCountRef = useRef<number | null>(null);
  useEffect(() => {
    const count = data?.members.length ?? null;
    if (count === null) return;
    const prev = prevMemberCountRef.current;
    if (prev !== null && count !== prev) {
      if (count > prev) toast.success(`Team roster updated · ${count - prev} member added`);
      else if (count < prev) toast.info(`Team roster updated · ${prev - count} member removed`);
    }
    prevMemberCountRef.current = count;
  }, [data?.members.length]);

  useEffect(() => {
    if (!teamId) return;
    const channel = supabase
      .channel(`leader-members-${teamId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles", filter: `team_id=eq.${teamId}` },
        () => {
          refetch();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [teamId, refetch]);

  async function onResetPassword() {
    const pw = window.prompt("New temporary password (min 8 chars):");
    if (!pw) return;
    if (pw.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    setBusy("reset");
    try {
      await resetFn({ data: { userId: id, password: pw } });
      toast.success("Password reset. Share it securely with the team leader.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Password reset failed");
    } finally {
      setBusy(null);
    }
  }

  async function confirmChangeStatus(action: "suspend" | "activate") {
    setBusy(action);
    try {
      await statusFn({ data: { userId: id, action } });
      toast.success(action === "suspend" ? "Team leader suspended." : "Team leader activated.");
      await invalidateAdmin(qc, "leader");
      await refetch();
    } finally {
      setBusy(null);
    }
  }

  async function confirmDelete() {
    setBusy("delete");
    try {
      await statusFn({ data: { userId: id, action: "delete" } });
      toast.success("Team leader archived.");
      await invalidateAdmin(qc, "leader");
      navigate({ to: "/admin/team-leaders" });
    } finally {
      setBusy(null);
    }
  }


  if (isLoading || !data) {
    return (
      <AdminShell profile={me}>
        <div className="grid place-items-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminShell>
    );
  }

  const p = data.profile;
  const s = data.salesSummary;
  const c = data.commissionSummary;

  return (
    <AdminShell profile={me}>
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={() => navigate({ to: "/admin/team-leaders" })}
          className="glass-card grid h-10 w-10 place-items-center rounded-2xl text-foreground shadow-[var(--shadow-soft)]"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="glass-card inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-foreground">
          <ShieldCheck size={12} className="text-gold" /> Team Leader Console
        </div>
      </div>

      {/* Hero card */}
      <section className="glass-card mb-6 overflow-hidden rounded-4xl p-6 shadow-[var(--shadow-float)]">
        <div className="flex flex-wrap items-start gap-5">
          <div className="grid h-20 w-20 flex-shrink-0 place-items-center overflow-hidden rounded-3xl bg-gradient-to-br from-primary/25 via-leaf/20 to-gold/25 text-2xl font-bold text-primary">
            {p.avatar_url ? (
              <img src={p.avatar_url} alt={p.full_name} className="h-full w-full object-cover" />
            ) : (
              initials(p.full_name)
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-2xl font-extrabold text-foreground sm:text-3xl">
                {p.full_name}
              </h1>
              <StatusBadge status={p.status ?? "active"} />
              <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                <BadgeCheck size={10} /> Team Leader
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Building2 size={12} />
                {data.team ? `Team ${data.team.letter} · ${data.team.name}` : "Unassigned"}
              </span>
              <span className="inline-flex items-center gap-1.5 font-mono">
                <UserCog size={12} /> {p.login_id}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Phone size={12} /> {p.mobile_number}
              </span>
              {p.email && (
                <span className="inline-flex items-center gap-1.5">
                  <Mail size={12} /> {p.email}
                </span>
              )}
              {p.joining_date && (
                <span className="inline-flex items-center gap-1.5">
                  <Calendar size={12} /> Joined {new Date(p.joining_date).toLocaleDateString()}
                </span>
              )}
              {p.address && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin size={12} /> {p.address}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onResetPassword}
              disabled={busy !== null}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-xs font-semibold text-foreground disabled:opacity-60"
            >
              {busy === "reset" ? <Loader2 size={14} className="animate-spin" /> : <UserCog size={14} />}
              Reset password
            </button>
            {(p.status ?? "active") === "suspended" ? (
              <button
                type="button"
                onClick={() => setConfirmKind("activate")}
                disabled={busy !== null}
                className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-700 disabled:opacity-60"
              >
                {busy === "activate" ? <Loader2 size={14} className="animate-spin" /> : <BadgeCheck size={14} />}
                Activate
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmKind("suspend")}
                disabled={busy !== null}
                className="inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-xs font-semibold text-amber-700 disabled:opacity-60"
              >
                {busy === "suspend" ? <Loader2 size={14} className="animate-spin" /> : <Activity size={14} />}
                Suspend
              </button>
            )}
            <button
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-[var(--shadow-soft)]"
            >
              <Pencil size={14} /> Edit profile
            </button>
            <button
              type="button"
              onClick={() => setConfirmKind("delete")}
              disabled={busy !== null}
              className="inline-flex items-center gap-2 rounded-full border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-xs font-semibold text-rose-700 disabled:opacity-60"
            >
              {busy === "delete" ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              Delete
            </button>
          </div>
        </div>

        <ConfirmDialog
          open={confirmKind !== null}
          onOpenChange={(next) => (!next ? setConfirmKind(null) : null)}
          destructive={confirmKind === "delete" || confirmKind === "suspend"}
          title={
            confirmKind === "delete"
              ? "Delete this Team Leader?"
              : confirmKind === "suspend"
                ? "Suspend this Team Leader?"
                : "Activate this Team Leader?"
          }
          description={
            confirmKind === "delete"
              ? "This bans their account and archives the profile. This cannot be undone from the UI."
              : confirmKind === "suspend"
                ? "They won't be able to sign in until you reactivate the account."
                : "They will regain full access to the leader dashboard immediately."
          }
          confirmLabel={
            confirmKind === "delete"
              ? "Delete leader"
              : confirmKind === "suspend"
                ? "Suspend"
                : "Activate"
          }
          onConfirm={async () => {
            if (confirmKind === "delete") await confirmDelete();
            else if (confirmKind) await confirmChangeStatus(confirmKind);
          }}
        />



        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatMini icon={<Users size={14} />} label="Members" value={String(data.members.length)} />
          <StatMini
            icon={<TrendingUp size={14} />}
            label="Team Revenue"
            value={formatINR(s.revenue, { compact: true })}
          />
          <StatMini
            icon={<Coins size={14} />}
            label="Commissions"
            value={formatINR(c.total, { compact: true })}
          />
          <StatMini
            icon={<Wallet size={14} />}
            label="Wallet"
            value={formatINR(Number(p.wallet_balance ?? 0), { compact: true })}
          />
        </div>
      </section>

      {/* Tabs */}
      <nav className="glass-card mb-5 flex items-center gap-1 overflow-x-auto rounded-2xl p-1">
        {(["members", "overview", "sales", "commissions", "wallet", "activity"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-shrink-0 rounded-xl px-4 py-2 text-xs font-semibold capitalize transition-colors ${
              tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </nav>

      {tab === "overview" && (
        <section className="grid gap-4 lg:grid-cols-3">
          <Card title="Sales performance">
            <Row k="Approved" v={String(s.approved)} />
            <Row k="Pending approval" v={String(s.pending)} />
            <Row k="Drafts" v={String(s.draft)} />
            <Row k="Cancelled/Rejected" v={String(s.cancelled)} />
            <Divider />
            <Row k="Today" v={formatINR(s.today, { compact: true })} />
            <Row k="This month" v={formatINR(s.month, { compact: true })} />
            <Row k="This year" v={formatINR(s.year, { compact: true })} />
            <Row k="Highest sale" v={formatINR(s.highestSale, { compact: true })} />
            <Row k="Avg sale value" v={formatINR(s.avgSale, { compact: true })} />
          </Card>

          <Card title="Commissions">
            <Row k="Total earned" v={formatINR(c.total, { compact: true })} />
            <Row k="Credited/Approved" v={formatINR(c.approved, { compact: true })} />
            <Row k="Pending" v={formatINR(c.pending, { compact: true })} />
            <Row k="Member share" v={formatINR(c.memberShare, { compact: true })} />
            <Row k="Bonus" v={formatINR(c.bonus, { compact: true })} />
            <Divider />
            <Row k="Wallet balance" v={formatINR(Number(p.wallet_balance ?? 0), { compact: true })} />
            <Row k="Lifetime earnings" v={formatINR(Number(p.total_earnings ?? 0), { compact: true })} />
          </Card>

          <Card title="Team & CRM">
            <Row k="Team letter" v={data.team?.letter ?? "—"} />
            <Row k="Team name" v={data.team?.name ?? "Unassigned"} />
            <Row k="Members" v={String(data.members.length)} />
            <Row k="Customers" v={String(data.customerCount)} />
            <Divider />
            <Row
              k="Last login"
              v={p.last_login_at ? new Date(p.last_login_at).toLocaleString() : "Never"}
            />
            <Row
              k="Created"
              v={p.created_at ? new Date(p.created_at).toLocaleDateString() : "—"}
            />
          </Card>

          {p.remarks && (
            <Card title="Internal remarks" className="lg:col-span-3">
              <p className="whitespace-pre-wrap text-sm text-foreground">{p.remarks}</p>
            </Card>
          )}
        </section>
      )}

      {tab === "members" && (
        <Card title={`Team members (${data.members.length})`}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-4 py-3">
            <div>
              <div className="text-sm font-extrabold text-foreground">Members section</div>
              <div className="text-xs text-muted-foreground">Add new members and open any member account from this team.</div>
            </div>
            <Link
              to="/admin/members/new"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-extrabold uppercase tracking-wider text-primary-foreground shadow-[var(--shadow-glow)]"
            >
              <Users size={14} />
              Create member
            </Link>
          </div>
          {data.members.length === 0 ? (
            <Empty>No members yet — create the first member for this team.</Empty>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {data.members.map((m) => (
                <Link
                  key={m.id}
                  to="/admin/members/$id"
                  params={{ id: m.id }}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3"
                >
                  <div className="grid h-10 w-10 place-items-center overflow-hidden rounded-2xl bg-primary/15 text-sm font-bold text-primary">
                    {m.avatar_url ? (
                      <img src={m.avatar_url} alt={m.full_name} className="h-full w-full object-cover" />
                    ) : (
                      initials(m.full_name)
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="truncate text-sm font-bold text-foreground">{m.full_name}</div>
                      <StatusBadge status={m.status ?? "active"} small />
                    </div>
                    <div className="font-mono text-[11px] text-muted-foreground">
                      {m.login_id} · {m.mobile_number}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase text-muted-foreground">Sales</div>
                    <div className="text-sm font-bold text-foreground">
                      {formatINR(Number(m.total_sales ?? 0), { compact: true })}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      )}

      {tab === "sales" && (
        <Card title={`Recent sales (${data.sales.length})`}>
          {data.sales.length === 0 ? (
            <Empty>No sales recorded yet.</Empty>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="pb-2">Sale #</th>
                    <th className="pb-2">Buyer</th>
                    <th className="pb-2">Unit</th>
                    <th className="pb-2">Value</th>
                    <th className="pb-2">Status</th>
                    <th className="pb-2">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.sales.slice(0, 50).map((sale) => (
                    <tr key={sale.id} className="text-foreground">
                      <td className="py-2 font-mono text-xs">{sale.sale_number}</td>
                      <td className="py-2">{sale.buyer_name ?? "—"}</td>
                      <td className="py-2 font-mono text-xs">{sale.unit_label ?? "—"}</td>
                      <td className="py-2 font-bold">{formatINR(Number(sale.deal_value ?? 0))}</td>
                      <td className="py-2 text-xs capitalize">{sale.approval_status}</td>
                      <td className="py-2 text-xs text-muted-foreground">
                        {new Date(sale.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {tab === "commissions" && (
        <Card title={`Commission transactions (${data.transactions.length})`}>
          {data.transactions.length === 0 ? (
            <Empty>No commissions generated yet.</Empty>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="pb-2">Txn #</th>
                    <th className="pb-2">Gross</th>
                    <th className="pb-2">Net leader</th>
                    <th className="pb-2">Member</th>
                    <th className="pb-2">Bonus</th>
                    <th className="pb-2">Status</th>
                    <th className="pb-2">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.transactions.slice(0, 100).map((t) => (
                    <tr key={t.id}>
                      <td className="py-2 font-mono text-xs">{t.txn_number}</td>
                      <td className="py-2">{formatINR(Number(t.leader_gross ?? 0))}</td>
                      <td className="py-2 font-bold">{formatINR(Number(t.net_leader ?? 0))}</td>
                      <td className="py-2">{formatINR(Number(t.member_amount ?? 0))}</td>
                      <td className="py-2">{formatINR(Number(t.bonus_amount ?? 0))}</td>
                      <td className="py-2 text-xs capitalize">{t.status}</td>
                      <td className="py-2 text-xs text-muted-foreground">
                        {new Date(t.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {tab === "wallet" && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card title="Wallet snapshot">
            <Row
              k="Available"
              v={formatINR(Number(p.wallet_balance ?? 0), { compact: true })}
            />
            <Row
              k="Locked"
              v={formatINR(Number(p.locked_balance ?? 0), { compact: true })}
            />
            <Row
              k="Lifetime earnings"
              v={formatINR(Number(p.total_earnings ?? 0), { compact: true })}
            />
            <Row
              k="Lifetime withdrawals"
              v={formatINR(Number(p.lifetime_withdrawals ?? 0), { compact: true })}
            />
          </Card>
          <Card title={`Withdrawals (${data.withdrawals.length})`} className="lg:col-span-2">
            {data.withdrawals.length === 0 ? (
              <Empty>No withdrawal requests.</Empty>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      <th className="pb-2">Ref</th>
                      <th className="pb-2">Amount</th>
                      <th className="pb-2">Status</th>
                      <th className="pb-2">Requested</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.withdrawals.map((w) => (
                      <tr key={w.id}>
                        <td className="py-2 font-mono text-xs">{w.reference_number}</td>
                        <td className="py-2 font-bold">{formatINR(Number(w.amount))}</td>
                        <td className="py-2 text-xs capitalize">{w.status}</td>
                        <td className="py-2 text-xs text-muted-foreground">
                          {new Date(w.requested_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === "activity" && (
        <Card title="Recent activity">
          {data.audit.length === 0 ? (
            <Empty>No activity yet.</Empty>
          ) : (
            <ul className="space-y-2">
              {data.audit.slice(0, 30).map((a) => (
                <li
                  key={a.id}
                  className="flex items-start gap-3 rounded-2xl border border-border bg-surface p-3"
                >
                  <div className="grid h-8 w-8 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Activity size={14} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-foreground">{a.action}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {new Date(a.created_at).toLocaleString()}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {editing && (
        <EditDialog
          initial={{
            fullName: p.full_name,
            email: p.email ?? "",
            address: p.address ?? "",
            avatarUrl: p.avatar_url ?? "",
            joiningDate: p.joining_date ?? "",
            remarks: p.remarks ?? "",
            teamName: data.team?.name ?? "",
          }}
          onClose={() => setEditing(false)}
          onSave={async (payload) => {
            await updateFn({ data: { userId: id, ...payload } });
            await Promise.all([
              qc.invalidateQueries({ queryKey: ["admin", "team-leaders"] }),
              qc.invalidateQueries({ queryKey: ["admin", "team-limits"] }),
              qc.invalidateQueries({ queryKey: ["admin", "members"] }),
              qc.invalidateQueries({ queryKey: ["admin", "overview"] }),
            ]);
            await refetch();
            setEditing(false);
          }}
        />
      )}
    </AdminShell>
  );
}

/* ------- helpers ------- */

function StatusBadge({ status, small }: { status: string; small?: boolean }) {
  const tints: Record<string, string> = {
    active: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
    suspended: "bg-amber-500/15 text-amber-700 border-amber-500/30",
    inactive: "bg-slate-500/15 text-slate-700 border-slate-500/30",
    archived: "bg-slate-900/10 text-slate-700 border-slate-500/30",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border ${
        tints[status] ?? tints.inactive
      } ${small ? "px-1.5 py-0 text-[9px]" : "px-2 py-0.5 text-[10px]"} font-bold uppercase tracking-wider`}
    >
      <Circle size={small ? 5 : 6} className="fill-current" />
      {status}
    </span>
  );
}

function StatMini({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface px-3 py-2.5 shadow-[var(--shadow-soft)]">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-lg font-extrabold text-foreground">{value}</div>
    </div>
  );
}

function Card({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`glass-card rounded-4xl p-5 shadow-[var(--shadow-soft)] ${className}`}
    >
      <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-bold text-foreground">{v}</span>
    </div>
  );
}

function Divider() {
  return <div className="my-2 border-t border-border" />;
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-8 text-center text-sm text-muted-foreground">{children}</p>;
}

function EditDialog({
  initial,
  onClose,
  onSave,
}: {
  initial: {
    fullName: string;
    email: string;
    address: string;
    avatarUrl: string;
    joiningDate: string;
    remarks: string;
    teamName: string;
  };
  onClose: () => void;
  onSave: (payload: {
    fullName: string;
    email: string;
    address: string;
    avatarUrl: string;
    joiningDate: string;
    remarks: string;
    teamName: string;
  }) => Promise<void>;
}) {
  const [f, setF] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof f>(k: K, v: (typeof f)[K]) {
    setF((prev) => ({ ...prev, [k]: v }));
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass-card w-full max-w-lg rounded-3xl p-6 shadow-[var(--shadow-float)]"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-foreground">Edit Team Leader</h3>
          <button onClick={onClose} className="rounded-full p-1 text-muted-foreground">
            <X size={16} />
          </button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <TF label="Full name" value={f.fullName} onChange={(v) => set("fullName", v)} />
          <TF label="Team name" value={f.teamName} onChange={(v) => set("teamName", v)} />
          <TF label="Email" value={f.email} onChange={(v) => set("email", v)} />
          <TF label="Joining date" type="date" value={f.joiningDate} onChange={(v) => set("joiningDate", v)} />
          <TF label="Avatar URL" value={f.avatarUrl} onChange={(v) => set("avatarUrl", v)} className="sm:col-span-2" />
          <TF label="Address" value={f.address} onChange={(v) => set("address", v)} multiline className="sm:col-span-2" />
          <TF label="Remarks" value={f.remarks} onChange={(v) => set("remarks", v)} multiline className="sm:col-span-2" />
        </div>
        {error && (
          <div className="mt-3 rounded-2xl border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-800">
            {error}
          </div>
        )}
        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-full border border-border bg-surface px-4 py-2 text-xs font-semibold text-foreground"
          >
            Cancel
          </button>
          <button
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              setError(null);
              try {
                await onSave(f);
              } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to save");
              } finally {
                setSaving(false);
              }
            }}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-xs font-bold text-primary-foreground shadow-[var(--shadow-glow)] disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function TF({
  label,
  value,
  onChange,
  type = "text",
  multiline,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  multiline?: boolean;
  className?: string;
}) {
  return (
    <label className={`block text-sm ${className}`}>
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="mt-1 block w-full resize-none rounded-2xl border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 block w-full rounded-2xl border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
        />
      )}
    </label>
  );
}
