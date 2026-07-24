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
import { useRealtimeInvalidate } from "@/hooks/useRealtimeInvalidate";

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

  useRealtimeInvalidate(
    "crm-live",
    ["customers", "customer_timeline"],
    [["crm", "overview"], ["crm", "customers"], ["crm", "followups"]],
  );

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

  const now = new Date();
  const hh = now.getHours();
  const daypart = hh < 5 ? "Night" : hh < 12 ? "Morning" : hh < 17 ? "Afternoon" : hh < 21 ? "Evening" : "Night";
  const firstName = (profile?.full_name || profile?.login_id || "Operator").split(" ")[0];
  const dateStr = now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });

  return (
    <DashboardShell role={role ?? "member"} profile={profile}>
      {/* ─── Ambient futuristic layers (behind everything in this view) ─── */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[560px] overflow-hidden">
        {/* Layer 1 — soft wash */}
        <div className="absolute inset-0 bg-gradient-to-b from-[color:var(--surface-warm)] via-background to-transparent" />
        {/* Layer 2 — architectural blueprint vectors */}
        <svg className="absolute inset-x-0 bottom-0 h-72 w-full opacity-[0.08]" viewBox="0 0 1200 300" fill="none" preserveAspectRatio="xMidYMax slice">
          <g stroke="currentColor" className="text-primary" strokeWidth="0.75">
            <path d="M0 260 L1200 260" />
            <path d="M60 260 L60 90 L180 90 L180 260" />
            <path d="M80 240 L80 110 M100 240 L100 110 M120 240 L120 110 M140 240 L140 110 M160 240 L160 110" />
            <path d="M220 260 L220 40 L360 40 L360 260" />
            <path d="M240 240 L340 240 M240 210 L340 210 M240 180 L340 180 M240 150 L340 150 M240 120 L340 120 M240 90 L340 90 M240 60 L340 60" />
            <path d="M400 260 L400 140 L520 140 L520 260" />
            <path d="M560 260 L560 20 L720 20 L720 260" />
            <path d="M580 240 L700 240 M580 200 L700 200 M580 160 L700 160 M580 120 L700 120 M580 80 L700 80 M580 40 L700 40" />
            <path d="M760 260 L760 110 L880 110 L880 260" />
            <path d="M920 260 L920 60 L1080 60 L1080 260" />
            <path d="M940 240 L1060 240 M940 200 L1060 200 M940 160 L1060 160 M940 120 L1060 120 M940 80 L1060 80" />
          </g>
        </svg>
        {/* Layer 3 — floating orbs */}
        <div className="animate-drift absolute -right-20 top-6 h-64 w-64 rounded-full bg-primary/12 blur-3xl" />
        <div className="animate-drift absolute -left-16 top-24 h-56 w-56 rounded-full bg-leaf/15 blur-3xl" style={{ animationDelay: "-8s" }} />
        <div className="animate-drift absolute right-1/3 top-40 h-40 w-40 rounded-full bg-gold/12 blur-3xl" style={{ animationDelay: "-4s" }} />
        {/* Layer 4 — grid */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            color: "hsl(var(--primary))",
            maskImage: "radial-gradient(ellipse at top, black 30%, transparent 75%)",
          }}
        />
      </div>

      {/* ─── Hero — futuristic control panel ─── */}
      <section className="relative">
        <div className="glass-card relative overflow-hidden rounded-[32px] p-6 shadow-[var(--shadow-float)] sm:p-9">
          {/* inner ambient */}
          <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
          <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-primary/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-14 h-56 w-56 rounded-full bg-gold/15 blur-3xl" />

          <div className="relative flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-surface/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              Live · Aawash CRM
            </div>
            <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              {dateStr}
            </div>
          </div>

          <div className="relative mt-6 grid gap-8 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <div className="min-w-0">
              <p className="text-sm font-medium text-muted-foreground">
                Good {daypart}, <span className="text-foreground">{firstName}</span>
              </p>
              <h1 className="mt-2 font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-foreground sm:text-5xl">
                Every relationship,
                <br />
                <span className="bg-gradient-to-br from-primary via-primary to-leaf bg-clip-text text-transparent">
                  one calm surface.
                </span>
              </h1>
              <p className="mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
                Your operating layer for every lead — from first hello to key handover.
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                <Link
                  to="/crm/new"
                  className="group inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-primary to-leaf px-5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-float)]"
                >
                  <UserPlus size={15} className="transition-transform group-hover:rotate-6" /> New lead
                </Link>
                <Link
                  to="/crm/followups"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-border/70 bg-surface/80 px-5 text-sm font-semibold text-foreground shadow-[var(--shadow-soft)] backdrop-blur transition-all hover:-translate-y-0.5 hover:border-primary/40"
                >
                  <Calendar size={15} /> Follow-ups
                </Link>
              </div>
            </div>

            {/* Right — floating micro control tile */}
            <div className="relative hidden shrink-0 sm:block">
              <div className="relative w-56 rounded-3xl border border-border/60 bg-gradient-to-br from-white/80 to-surface-warm/60 p-4 shadow-[var(--shadow-soft)] backdrop-blur-xl">
                <div className="absolute -inset-px rounded-3xl bg-gradient-to-br from-primary/25 via-transparent to-leaf/25 opacity-40 blur-xl" />
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                      Pipeline
                    </span>
                    <TrendingUp size={14} className="text-primary" />
                  </div>
                  <div className="mt-3 font-display text-4xl font-extrabold tracking-tight text-foreground">
                    {s?.conversion ?? 0}
                    <span className="text-base text-muted-foreground">%</span>
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground">Conversion rate</div>
                  <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-primary-soft">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-leaf transition-all duration-700"
                      style={{ width: `${Math.min(100, Number(s?.conversion ?? 0))}%` }}
                    />
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-sm font-bold text-foreground">{s?.total ?? 0}</div>
                      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Leads</div>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-foreground">{s?.bookings ?? 0}</div>
                      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Book</div>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-foreground">{s?.sales_completed ?? 0}</div>
                      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Sold</div>
                    </div>
                  </div>
                </div>
              </div>
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
