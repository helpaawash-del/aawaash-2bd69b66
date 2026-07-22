import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Users, Plus, Search, ShieldCheck, TrendingUp, Wallet, ArrowRight, Circle } from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { RoleGuard } from "@/components/aawash/AuthGuard";
import { AdminShell } from "@/components/aawash/admin/AdminShell";
import { listAllMembers } from "@/lib/members-admin.functions";
import { getTeamLimits } from "@/lib/team-leaders.functions";
import { formatINR, initials } from "@/components/aawash/dashboard-kit";

export const Route = createFileRoute("/_authenticated/admin/members")({
  component: Page,
  head: () => ({ meta: [{ title: "Members — Aawash Admin" }] }),
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
  const listFn = useServerFn(listAllMembers);
  const limitsFn = useServerFn(getTeamLimits);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "suspended">("all");
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [grouped, setGrouped] = useState<boolean>(true);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "members"],
    queryFn: () => listFn(),
  });
  const { data: limits } = useQuery({
    queryKey: ["admin", "team-limits"],
    queryFn: () => limitsFn(),
  });

  const filtered = useMemo(() => {
    const rows = data?.members ?? [];
    return rows.filter((r) => {
      if (status !== "all" && r.status !== status) return false;
      if (teamFilter !== "all" && r.team_id !== teamFilter) return false;
      if (!q.trim()) return true;
      const t = q.trim().toLowerCase();
      return (
        r.full_name?.toLowerCase().includes(t) ||
        r.mobile_number?.toLowerCase().includes(t) ||
        r.login_id?.toLowerCase().includes(t) ||
        r.team_letter?.toLowerCase().includes(t) ||
        r.team_name?.toLowerCase().includes(t) ||
        r.leader_name?.toLowerCase().includes(t) ||
        r.display_code?.toLowerCase().includes(t)
      );
    });
  }, [data, q, status, teamFilter]);

  const cap = limits?.maxMembersPerTeam ?? 10;

  return (
    <AdminShell profile={profile}>
      <section className="mb-8">
        <div className="glass-card inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium text-foreground shadow-[var(--shadow-soft)]">
          <ShieldCheck size={14} className="text-gold" />
          Member Management Console
        </div>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">Members</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Authority for creating, editing, and managing Members. Each member powers CRM, sales, and
              commission flows for their assigned team.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/admin/members/new"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition-transform hover:-translate-y-0.5"
            >
              <Plus size={16} />
              Add Member
            </Link>
          </div>
        </div>
      </section>

      {/* Team capacity strip */}
      <section className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(data?.leaders ?? []).map((t) => {
          const pct = Math.min(100, Math.round((t.member_count / cap) * 100));
          return (
            <div key={t.team_id} className="glass-card rounded-3xl p-4 shadow-[var(--shadow-soft)]">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Team {t.letter}
                  </div>
                  <div className="text-sm font-bold text-foreground">{t.name}</div>
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    Leader: {t.leader_name ?? "—"}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-extrabold text-foreground">
                    {t.member_count}
                    <span className="ml-1 text-sm font-semibold text-muted-foreground">/{cap}</span>
                  </div>
                </div>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </section>

      {/* Filters */}
      <section className="glass-card mb-4 rounded-3xl p-4 shadow-[var(--shadow-soft)]">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name, mobile, login ID, team, or leader…"
              className="w-full rounded-2xl border border-border bg-surface py-2.5 pl-9 pr-3 text-sm text-foreground outline-none focus:border-primary"
            />
          </div>
          <select
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
            className="rounded-2xl border border-border bg-surface px-3 py-2.5 text-sm font-semibold text-foreground outline-none focus:border-primary"
          >
            <option value="all">All teams</option>
            {(data?.teams ?? []).map((t) => (
              <option key={t.id} value={t.id}>
                Team {t.letter} · {t.name}
              </option>
            ))}
          </select>
          <div className="inline-flex overflow-hidden rounded-full border border-border">
            {(["all", "active", "suspended"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`px-3 py-1.5 text-xs font-semibold capitalize ${
                  status === s ? "bg-primary text-primary-foreground" : "text-foreground"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="inline-flex overflow-hidden rounded-full border border-border">
            {([[true, "Group by team"], [false, "Flat list"]] as const).map(([v, l]) => (
              <button
                key={String(v)}
                onClick={() => setGrouped(v)}
                className={`px-3 py-1.5 text-xs font-semibold ${
                  grouped === v ? "bg-primary text-primary-foreground" : "text-foreground"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Table */}
      <section className="glass-card overflow-hidden rounded-3xl shadow-[var(--shadow-soft)]">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading members…</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary-soft text-primary">
              <Users size={22} />
            </div>
            <div className="mt-3 text-sm font-semibold text-foreground">No members match your filters</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Try clearing filters or adding a new member.
            </div>
          </div>
        ) : grouped ? (
          <div className="divide-y divide-border">
            {(data?.teams ?? []).map((t) => {
              const rows = filtered.filter((r) => r.team_id === t.id);
              if (rows.length === 0) return null;
              return (
                <div key={t.id}>
                  <div className="flex items-center justify-between bg-primary-soft/60 px-4 py-2 text-xs font-bold text-foreground">
                    <span>
                      Team {t.letter} · {t.name}
                      <span className="ml-2 text-muted-foreground font-semibold">
                        Leader {(data?.leaders ?? []).find((l) => l.team_id === t.id)?.leader_name ?? "—"}
                      </span>
                    </span>
                    <span className="text-[11px] font-semibold text-muted-foreground">{rows.length} member{rows.length === 1 ? "" : "s"}</span>
                  </div>
                  <div className="divide-y divide-border">
                    {rows.map((m) => (
                      <MemberRow key={m.id} m={m} />
                    ))}
                  </div>
                </div>
              );
            })}
            {(() => {
              const unassigned = filtered.filter((r) => !r.team_id);
              if (unassigned.length === 0) return null;
              return (
                <div>
                  <div className="bg-amber-500/10 px-4 py-2 text-xs font-bold text-amber-800">
                    Unassigned ({unassigned.length})
                  </div>
                  <div className="divide-y divide-border">
                    {unassigned.map((m) => <MemberRow key={m.id} m={m} />)}
                  </div>
                </div>
              );
            })()}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((m) => <MemberRow key={m.id} m={m} />)}
          </div>
        )}
      </section>
    </AdminShell>
  );
}

function MemberRow({ m }: { m: any }) {
  return (
    <Link
      to="/admin/members/$id"
      params={{ id: m.id }}
      className="grid grid-cols-[auto_1fr_auto] items-center gap-4 p-4 transition-colors hover:bg-surface"
    >
      <div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary-soft text-sm font-bold text-primary">
        {m.avatar_url ? (
          <img src={m.avatar_url} alt="" className="h-full w-full rounded-2xl object-cover" />
        ) : (
          initials(m.full_name ?? "")
        )}
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <div className="truncate text-sm font-bold text-foreground">{m.full_name}</div>
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
              STATUS_TINTS[m.status ?? "active"] ?? STATUS_TINTS.active
            }`}
          >
            <Circle size={6} className="fill-current" />
            {m.status ?? "active"}
          </span>
        </div>
        <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
          <span className="font-mono font-semibold text-foreground">{m.login_id}</span>
          <span className="mx-1.5">·</span>
          {m.mobile_number}
          <span className="mx-1.5">·</span>
          Team {m.team_letter ?? "—"}
          <span className="mx-1.5">·</span>
          Leader {m.leader_name ?? "—"}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <TrendingUp size={12} /> {m.sales_count} sales
          </span>
          <span className="inline-flex items-center gap-1">
            <Wallet size={12} /> {formatINR(Number(m.wallet_balance ?? 0), { compact: true })}
          </span>
          <span>Rev {formatINR(m.total_revenue, { compact: true })}</span>
          <span>Comm {formatINR(m.member_commission, { compact: true })}</span>
        </div>
      </div>
      <ArrowRight size={16} className="text-muted-foreground" />
    </Link>
  );
}
