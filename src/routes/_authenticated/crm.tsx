import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import {
  Users,
  UserPlus,
  Calendar,
  Search,
  ChevronRight,
  Phone,
  MapPin,
  Sparkles,
  Flame,
  Clock,
  CheckCircle2,
  XCircle,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { RoleGuard } from "@/components/aawash/AuthGuard";
import { DashboardShell } from "@/components/aawash/DashboardShell";
import {
  SectionCard,
  StatCard,
  EmptyState,
  SkeletonBlock,
  initials,
} from "@/components/aawash/dashboard-kit";
import { getCrmOverview, listCustomers, listFollowups } from "@/lib/crm.functions";
import { CUSTOMER_STATUS_META, priorityStyle } from "@/components/aawash/crm/status";

export const Route = createFileRoute("/_authenticated/crm")({
  component: CrmHome,
  head: () => ({ meta: [{ title: "Customer CRM — Aawash" }] }),
});

function CrmHome() {
  return (
    <RoleGuard allow={["member", "team_leader", "super_admin"]}>
      <CrmContent />
    </RoleGuard>
  );
}

function CrmContent() {
  const { profile, role } = useSession();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");

  const overviewFn = useServerFn(getCrmOverview);
  const listFn = useServerFn(listCustomers);
  const followFn = useServerFn(listFollowups);

  const overview = useQuery({ queryKey: ["crm", "overview"], queryFn: () => overviewFn() });
  const customers = useQuery({
    queryKey: ["crm", "customers", status],
    queryFn: () => listFn({ data: { status } }),
  });
  const followups = useQuery({ queryKey: ["crm", "followups"], queryFn: () => followFn() });

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return customers.data ?? [];
    return (customers.data ?? []).filter(
      (c) =>
        c.full_name.toLowerCase().includes(s) ||
        c.mobile_number.includes(s) ||
        c.customer_code.toLowerCase().includes(s) ||
        (c.email ?? "").toLowerCase().includes(s),
    );
  }, [customers.data, search]);

  const s = overview.data?.stats;

  return (
    <DashboardShell role={role ?? "member"} profile={profile}>
      {/* Hero */}
      <section className="glass-card relative overflow-hidden rounded-4xl p-5 shadow-[var(--shadow-float)] sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-primary/12 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-14 h-56 w-56 rounded-full bg-gold/15 blur-3xl" />
        <div className="relative grid gap-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
              <Sparkles size={12} /> Customer CRM
            </div>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Every relationship,{" "}
              <span className="bg-gradient-to-br from-primary to-leaf bg-clip-text text-transparent">
                one place.
              </span>
            </h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground sm:text-base">
              Track every lead from first hello to the day they get the keys.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              <Link
                to="/crm/new"
                className="inline-flex h-11 items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-br from-primary to-leaf px-4 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)]"
              >
                <UserPlus size={14} /> New lead
              </Link>
              <Link
                to="/crm/followups"
                className="inline-flex h-11 items-center justify-center gap-1.5 rounded-2xl border border-border bg-surface px-4 text-sm font-semibold text-foreground shadow-[var(--shadow-soft)]"
              >
                <Calendar size={14} /> Follow-ups
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={<Users size={18} />} label="Total leads" value={s?.total ?? 0} />
        <StatCard icon={<Flame size={18} />} label="Interested" value={s?.interested ?? 0} accent="gold" />
        <StatCard icon={<Calendar size={18} />} label="Today's follow-ups" value={s?.today_followups ?? 0} accent="leaf" />
        <StatCard icon={<TrendingUp size={18} />} label="Conversion" value={`${s?.conversion ?? 0}%`} accent="gold" />
      </section>
      <section className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={<Clock size={18} />} label="Pending follow-ups" value={s?.pending_followups ?? 0} accent="destructive" />
        <StatCard icon={<CheckCircle2 size={18} />} label="Bookings" value={s?.bookings ?? 0} />
        <StatCard icon={<CheckCircle2 size={18} />} label="Sales" value={s?.sales_completed ?? 0} accent="leaf" />
        <StatCard icon={<XCircle size={18} />} label="Lost" value={s?.lost ?? 0} accent="destructive" />
      </section>

      {/* Customer list */}
      <section className="mt-6">
        <SectionCard
          title="Customers"
          subtitle="Search, filter, and dive into any customer's story."
          action={
            <Link
              to="/crm/followups"
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary"
            >
              Follow-ups ({followups.data?.length ?? 0}) <ChevronRight size={12} />
            </Link>
          }
        >
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, phone, code, email…"
                className="w-full rounded-2xl border border-border bg-surface py-2.5 pl-9 pr-3 text-sm text-foreground shadow-[var(--shadow-soft)] outline-none transition-all focus:border-primary/50"
              />
            </div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="rounded-2xl border border-border bg-surface px-3 py-2.5 text-sm font-medium text-foreground shadow-[var(--shadow-soft)] outline-none"
            >
              <option value="all">All statuses</option>
              {Object.entries(CUSTOMER_STATUS_META).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4">
            {customers.isLoading ? (
              <div className="flex flex-col gap-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <SkeletonBlock key={i} className="h-16" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={<Users size={22} />}
                title="No customers yet"
                body="Add your first lead to start tracking every conversation."
                action={
                  <Link
                    to="/crm/new"
                    className="inline-flex h-10 items-center gap-1.5 rounded-2xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
                  >
                    <UserPlus size={14} /> New lead
                  </Link>
                }
              />
            ) : (
              <ul className="flex flex-col gap-2">
                {filtered.map((c) => {
                  const st = CUSTOMER_STATUS_META[c.status] ?? {
                    label: c.status,
                    tone: "bg-muted text-muted-foreground",
                  };
                  const pri = priorityStyle(c.priority);
                  return (
                    <li key={c.id}>
                      <button
                        onClick={() => navigate({ to: "/crm/$id", params: { id: c.id } })}
                        className="group flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-surface p-3 text-left shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5 hover:border-primary/30"
                      >
                        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary to-leaf text-xs font-bold text-primary-foreground">
                          {initials(c.full_name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <div className="truncate text-sm font-bold text-foreground">
                              {c.full_name}
                            </div>
                            {pri && (
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${pri.className}`}>
                                {pri.label}
                              </span>
                            )}
                          </div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                            <span className="font-mono">{c.customer_code}</span>
                            <span className="inline-flex items-center gap-1">
                              <Phone size={10} /> {c.mobile_number}
                            </span>
                            {c.city && (
                              <span className="inline-flex items-center gap-1">
                                <MapPin size={10} /> {c.city}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${st.tone}`}>
                            {st.label}
                          </span>
                          <ArrowRight
                            size={14}
                            className="text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                          />
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </SectionCard>
      </section>
    </DashboardShell>
  );
}
