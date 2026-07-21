import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Calendar, Phone } from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { RoleGuard } from "@/components/aawash/AuthGuard";
import { DashboardShell } from "@/components/aawash/DashboardShell";
import { SectionCard, EmptyState, SkeletonBlock, initials } from "@/components/aawash/dashboard-kit";
import { listFollowups } from "@/lib/crm.functions";
import { CUSTOMER_STATUS_META } from "@/components/aawash/crm/status";

export const Route = createFileRoute("/_authenticated/crm/followups")({
  component: Followups,
  head: () => ({ meta: [{ title: "Follow-ups — Aawash CRM" }] }),
});

function Followups() {
  return (
    <RoleGuard allow={["member", "team_leader", "super_admin"]}>
      <FollowupsContent />
    </RoleGuard>
  );
}

function FollowupsContent() {
  const { profile, role } = useSession();
  const followFn = useServerFn(listFollowups);
  const q = useQuery({ queryKey: ["crm", "followups"], queryFn: () => followFn() });

  const now = new Date();
  const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay); endOfDay.setDate(endOfDay.getDate() + 1);

  const rows = q.data ?? [];
  const overdue = rows.filter((r) => r.next_followup_at && new Date(r.next_followup_at) < startOfDay);
  const today = rows.filter((r) => {
    if (!r.next_followup_at) return false;
    const d = new Date(r.next_followup_at);
    return d >= startOfDay && d < endOfDay;
  });
  const upcoming = rows.filter((r) => r.next_followup_at && new Date(r.next_followup_at) >= endOfDay);

  return (
    <DashboardShell role={role ?? "member"} profile={profile}>
      <div className="mb-5 flex items-center gap-3">
        <Link to="/crm" className="grid h-10 w-10 place-items-center rounded-2xl border border-border bg-surface text-foreground shadow-[var(--shadow-soft)]">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-lg font-extrabold tracking-tight text-foreground sm:text-2xl">Follow-ups</h1>
          <p className="text-xs text-muted-foreground">Everyone you owe a call today, tomorrow, and every day after.</p>
        </div>
      </div>

      {q.isLoading ? (
        <div className="grid gap-3">
          {Array.from({ length: 5 }).map((_, i) => (<SkeletonBlock key={i} className="h-16" />))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState icon={<Calendar size={22} />} title="Inbox zero" body="You've reached out to everyone on schedule." />
      ) : (
        <div className="grid gap-5">
          <FollowupGroup title="Overdue" tone="destructive" rows={overdue} />
          <FollowupGroup title="Today" tone="gold" rows={today} />
          <FollowupGroup title="Upcoming" tone="primary" rows={upcoming} />
        </div>
      )}
    </DashboardShell>
  );
}

type Row = {
  id: string;
  customer_code: string;
  full_name: string;
  mobile_number: string;
  status: string;
  next_followup_at: string | null;
};

function FollowupGroup({
  title,
  tone,
  rows,
}: {
  title: string;
  tone: "primary" | "gold" | "destructive";
  rows: Row[];
}) {
  if (rows.length === 0) return null;
  const chip =
    tone === "destructive"
      ? "bg-destructive/10 text-destructive"
      : tone === "gold"
        ? "bg-gold/20 text-gold-foreground"
        : "bg-primary-soft text-primary";
  return (
    <SectionCard
      title={title}
      action={<span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${chip}`}>{rows.length}</span>}
    >
      <ul className="flex flex-col gap-2">
        {rows.map((c) => {
          const st = CUSTOMER_STATUS_META[c.status] ?? { label: c.status, tone: "bg-muted text-muted-foreground" };
          return (
            <li key={c.id}>
              <Link
                to="/crm/$id"
                params={{ id: c.id }}
                className="flex items-center gap-3 rounded-2xl border border-border/60 bg-surface p-3 shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5"
              >
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-primary to-leaf text-xs font-bold text-primary-foreground">
                  {initials(c.full_name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold text-foreground">{c.full_name}</div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="font-mono">{c.customer_code}</span>
                    <span className="inline-flex items-center gap-1"><Phone size={10} /> {c.mobile_number}</span>
                    {c.next_followup_at && (
                      <span className="inline-flex items-center gap-1"><Calendar size={10} /> {new Date(c.next_followup_at).toLocaleString("en-IN")}</span>
                    )}
                  </div>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${st.tone}`}>
                  {st.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </SectionCard>
  );
}
