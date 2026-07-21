import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Users, Search, ChevronRight, TrendingUp } from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { RoleGuard } from "@/components/aawash/AuthGuard";
import { DashboardShell } from "@/components/aawash/DashboardShell";
import {
  SectionCard,
  EmptyState,
  SkeletonBlock,
  formatINR,
  initials,
} from "@/components/aawash/dashboard-kit";
import { listMyTeamMembers } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/leader/members")({
  component: MembersPage,
  head: () => ({ meta: [{ title: "Team Members — Aawash" }] }),
});

function MembersPage() {
  return (
    <RoleGuard allow={["team_leader", "super_admin"]}>
      <MembersContent />
    </RoleGuard>
  );
}

function MembersContent() {
  const { profile } = useSession();
  const fetchMembers = useServerFn(listMyTeamMembers);
  const [q, setQ] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["leader", "members"],
    queryFn: () => fetchMembers(),
  });

  const filtered = useMemo(() => {
    const list = data ?? [];
    if (!q.trim()) return list;
    const t = q.trim().toLowerCase();
    return list.filter(
      (m) =>
        m.full_name.toLowerCase().includes(t) ||
        m.login_id.toLowerCase().includes(t) ||
        (m.mobile_number || "").includes(t) ||
        m.display_code.toLowerCase().includes(t),
    );
  }, [data, q]);

  const list = data ?? [];
  const active = list.filter((m) => m.status === "active").length;
  type MemberItem = (typeof list)[number];
  const topPerformer = list.reduce<MemberItem | null>(
    (best, m) => (best === null || Number(m.total_sales) > Number(best.total_sales) ? m : best),
    null,
  );

  return (
    <DashboardShell role="team_leader" profile={profile}>
      <header>
        <div className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
          Team
        </div>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          Members
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Everyone on your team, at a glance.
        </p>
      </header>

      <section className="mt-6 grid grid-cols-3 gap-3">
        <MiniStat label="Total" value={data?.length ?? 0} />
        <MiniStat label="Active" value={active} />
        <MiniStat label="Top" value={topPerformer ? formatINR(topPerformer.total_sales, { compact: true }) : "—"} />
      </section>

      <section className="mt-6">
        <div className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            placeholder="Search by name, Login ID, or mobile…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-12 w-full rounded-2xl border border-input bg-surface pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </section>

      <section className="mt-4">
        <SectionCard title="All members" subtitle={`${filtered.length} shown`}>
          {isLoading ? (
            <div className="grid gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonBlock key={i} className="h-16" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<Users size={22} />}
              title={q ? "No matches" : "No members yet"}
              body={q ? "Try a different search." : "Ask your Super Admin to add members to your team."}
            />
          ) : (
            <ul className="flex flex-col gap-2">
              {filtered.map((m) => (
                <li key={m.id}>
                  <Link
                    to="/leader/members/$id"
                    params={{ id: m.id }}
                    className="flex items-center gap-3 rounded-2xl border border-border/50 bg-surface p-3 transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-soft)]"
                  >
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-leaf text-xs font-bold text-primary-foreground">
                      {initials(m.full_name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-foreground">{m.full_name}</div>
                      <div className="font-mono text-[11px] text-muted-foreground">
                        {m.login_id} · {m.display_code}
                      </div>
                    </div>
                    <div className="hidden text-right sm:block">
                      <div className="text-sm font-bold text-foreground">
                        {formatINR(m.total_sales, { compact: true })}
                      </div>
                      <div className="text-[10px] text-muted-foreground">Sales</div>
                    </div>
                    <span
                      className={`hidden rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider sm:inline-block ${
                        m.status === "active" ? "bg-success/15 text-success" : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      {m.status}
                    </span>
                    <ChevronRight size={16} className="text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </section>
    </DashboardShell>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="glass-card rounded-2xl p-3 text-center shadow-[var(--shadow-soft)] sm:p-4">
      <div className="grid h-8 w-8 place-items-center mx-auto rounded-xl bg-primary-soft text-primary">
        <TrendingUp size={14} />
      </div>
      <div className="mt-2 text-lg font-extrabold tracking-tight text-foreground sm:text-xl">{value}</div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
    </div>
  );
}
