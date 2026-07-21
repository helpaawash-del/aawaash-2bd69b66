import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  UserCog,
  Plus,
  Search,
  ShieldCheck,
  Users,
  TrendingUp,
  Wallet,
  Settings2,
  ArrowRight,
  Circle,
} from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { RoleGuard } from "@/components/aawash/AuthGuard";
import { AdminShell } from "@/components/aawash/admin/AdminShell";
import { listTeamLeaders, getTeamLimits, updateTeamLimits } from "@/lib/team-leaders.functions";
import { formatINR, initials } from "@/components/aawash/dashboard-kit";

export const Route = createFileRoute("/_authenticated/admin/team-leaders")({
  component: Page,
  head: () => ({ meta: [{ title: "Team Leaders — Aawash Admin" }] }),
});

function Page() {
  return (
    <RoleGuard allow={["super_admin"]}>
      <Content />
    </RoleGuard>
  );
}

const STATUS_TINTS: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  suspended: "bg-amber-500/15 text-amber-700 border-amber-500/30",
  inactive: "bg-slate-500/15 text-slate-700 border-slate-500/30",
  archived: "bg-slate-900/10 text-slate-700 border-slate-500/30",
};

function Content() {
  const { profile } = useSession();
  const listFn = useServerFn(listTeamLeaders);
  const limitsFn = useServerFn(getTeamLimits);
  const updateLimitsFn = useServerFn(updateTeamLimits);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "suspended">("all");
  const [showLimits, setShowLimits] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin", "team-leaders"],
    queryFn: () => listFn(),
  });
  const { data: limits, refetch: refetchLimits } = useQuery({
    queryKey: ["admin", "team-limits"],
    queryFn: () => limitsFn(),
  });

  const filtered = useMemo(() => {
    const rows = data?.leaders ?? [];
    return rows.filter((r) => {
      if (status !== "all" && r.status !== status) return false;
      if (!q.trim()) return true;
      const t = q.trim().toLowerCase();
      return (
        r.full_name?.toLowerCase().includes(t) ||
        r.mobile_number?.toLowerCase().includes(t) ||
        r.login_id?.toLowerCase().includes(t) ||
        r.team_letter?.toLowerCase().includes(t) ||
        r.team_name?.toLowerCase().includes(t) ||
        r.display_code?.toLowerCase().includes(t)
      );
    });
  }, [data, q, status]);

  const cap = limits?.maxTeamLeaders ?? 3;
  const current = limits?.currentTeamLeaders ?? data?.leaders.length ?? 0;
  const canAdd = current < cap;

  return (
    <AdminShell profile={profile}>
      <section className="mb-8">
        <div className="glass-card inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium text-foreground shadow-[var(--shadow-soft)]">
          <ShieldCheck size={14} className="text-gold" />
          Team Leader Management Console
        </div>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Team Leaders
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Authority for creating, editing, and managing Team Leaders. Every leader here powers a
              dedicated team, its members, its CRM, and its commission flow.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowLimits(true)}
              className="glass-card inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold text-foreground shadow-[var(--shadow-soft)]"
            >
              <Settings2 size={14} />
              Limits
            </button>
            {canAdd ? (
              <Link
                to="/admin/team-leaders/new"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition-transform hover:-translate-y-0.5"
              >
                <Plus size={16} />
                Add Team Leader
              </Link>
            ) : (
              <span
                title={`Team Leader cap reached (${cap}). Raise the limit in Limits.`}
                className="inline-flex cursor-not-allowed items-center gap-2 rounded-full bg-muted px-5 py-2.5 text-sm font-semibold text-muted-foreground"
              >
                <Plus size={16} />
                Cap reached ({current}/{cap})
              </span>
            )}
          </div>
        </div>
      </section>

      <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MiniStat label="Team Leaders" value={`${current}/${cap}`} icon={<UserCog size={14} />} />
        <MiniStat
          label="Total Members"
          value={String(
            data?.leaders.reduce((a, l) => a + (l.member_count ?? 0), 0) ?? 0,
          )}
          icon={<Users size={14} />}
        />
        <MiniStat
          label="Team Revenue"
          value={formatINR(data?.leaders.reduce((a, l) => a + (l.total_revenue ?? 0), 0) ?? 0, {
            compact: true,
          })}
          icon={<TrendingUp size={14} />}
        />
        <MiniStat
          label="Leader Wallets"
          value={formatINR(
            data?.leaders.reduce((a, l) => a + Number(l.wallet_balance ?? 0), 0) ?? 0,
            { compact: true },
          )}
          icon={<Wallet size={14} />}
        />
      </section>

      <section className="mb-6 flex flex-wrap items-center gap-3">
        <div className="glass-card flex min-w-[240px] flex-1 items-center gap-2 rounded-2xl px-4 py-2.5">
          <Search size={16} className="text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, mobile, team, code…"
            className="w-full border-none bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="glass-card flex items-center gap-1 rounded-2xl p-1">
          {(["all", "active", "suspended"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
                status === s ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </section>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-56 animate-pulse rounded-4xl bg-muted/40" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card grid place-items-center rounded-4xl px-8 py-20 text-center">
          <UserCog size={40} className="text-muted-foreground" />
          <h3 className="mt-4 text-lg font-bold text-foreground">No Team Leaders yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Add the first Team Leader to activate a team and start selling.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((l) => (
            <Link
              key={l.id}
              to="/admin/team-leaders/$id"
              params={{ id: l.id }}
              className="group relative flex flex-col gap-4 overflow-hidden rounded-4xl border border-border bg-surface p-5 shadow-[var(--shadow-soft)] transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-float)]"
            >
              <div className="flex items-start gap-3">
                <div className="grid h-14 w-14 flex-shrink-0 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-primary/25 via-leaf/20 to-gold/20 text-lg font-bold text-primary">
                  {l.avatar_url ? (
                    <img src={l.avatar_url} alt={l.full_name} className="h-full w-full object-cover" />
                  ) : (
                    initials(l.full_name)
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-base font-bold text-foreground">{l.full_name}</h3>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        STATUS_TINTS[l.status] ?? STATUS_TINTS.inactive
                      }`}
                    >
                      <Circle size={6} className="fill-current" />
                      {l.status}
                    </span>
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {l.team_letter ? `Team ${l.team_letter} · ` : ""}
                    {l.team_name ?? "Unassigned"}
                  </div>
                  <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                    {l.login_id} · {l.mobile_number}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <StatBox label="Members" value={l.member_count ?? 0} />
                <StatBox label="Sales" value={l.sales_count ?? 0} />
                <StatBox label="Revenue" value={formatINR(l.total_revenue ?? 0, { compact: true })} />
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="rounded-xl bg-primary/10 px-3 py-2">
                  <div className="text-muted-foreground">Commission</div>
                  <div className="mt-0.5 font-bold text-foreground">
                    {formatINR(l.total_commission ?? 0, { compact: true })}
                  </div>
                </div>
                <div className="rounded-xl bg-gold/15 px-3 py-2">
                  <div className="text-muted-foreground">Wallet</div>
                  <div className="mt-0.5 font-bold text-foreground">
                    {formatINR(Number(l.wallet_balance ?? 0), { compact: true })}
                  </div>
                </div>
              </div>

              <div className="mt-auto inline-flex items-center gap-1 text-xs font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-100">
                Open profile <ArrowRight size={12} />
              </div>
            </Link>
          ))}
        </div>
      )}

      {showLimits && (
        <LimitsDialog
          initial={limits}
          onClose={() => setShowLimits(false)}
          onSave={async (payload) => {
            await updateLimitsFn({ data: payload });
            await Promise.all([refetch(), refetchLimits()]);
            setShowLimits(false);
          }}
        />
      )}
    </AdminShell>
  );
}

function MiniStat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="glass-card rounded-2xl px-4 py-3 shadow-[var(--shadow-soft)]">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-lg font-extrabold text-foreground">{value}</div>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl bg-muted/30 px-2 py-2">
      <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 text-sm font-bold text-foreground">{value}</div>
    </div>
  );
}

function LimitsDialog({
  initial,
  onClose,
  onSave,
}: {
  initial: { maxTeamLeaders: number; maxMembersPerTeam: number } | undefined;
  onClose: () => void;
  onSave: (p: { maxTeamLeaders: number; maxMembersPerTeam: number }) => Promise<void>;
}) {
  const [maxLeaders, setMaxLeaders] = useState(initial?.maxTeamLeaders ?? 3);
  const [maxMembers, setMaxMembers] = useState(initial?.maxMembersPerTeam ?? 10);
  const [saving, setSaving] = useState(false);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass-card w-[min(92vw,420px)] rounded-3xl p-6 shadow-[var(--shadow-float)]"
      >
        <h3 className="text-lg font-bold text-foreground">Team & Member limits</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Configurable business caps. Applied instantly across the platform.
        </p>
        <div className="mt-5 space-y-4">
          <label className="block text-sm">
            <span className="text-xs font-semibold text-muted-foreground">Max Team Leaders</span>
            <input
              type="number"
              min={1}
              max={200}
              value={maxLeaders}
              onChange={(e) => setMaxLeaders(Number(e.target.value))}
              className="mt-1 block w-full rounded-2xl border border-border bg-surface px-3 py-2 text-sm font-semibold outline-none focus:border-primary"
            />
          </label>
          <label className="block text-sm">
            <span className="text-xs font-semibold text-muted-foreground">Max Members per Team</span>
            <input
              type="number"
              min={0}
              max={500}
              value={maxMembers}
              onChange={(e) => setMaxMembers(Number(e.target.value))}
              className="mt-1 block w-full rounded-2xl border border-border bg-surface px-3 py-2 text-sm font-semibold outline-none focus:border-primary"
            />
          </label>
        </div>
        <div className="mt-6 flex items-center justify-end gap-2">
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
              try {
                await onSave({ maxTeamLeaders: maxLeaders, maxMembersPerTeam: maxMembers });
              } finally {
                setSaving(false);
              }
            }}
            className="rounded-full bg-primary px-5 py-2 text-xs font-bold text-primary-foreground shadow-[var(--shadow-glow)] disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save limits"}
          </button>
        </div>
      </div>
    </div>
  );
}
