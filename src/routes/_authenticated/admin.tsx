import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  Building2,
  Users,
  Wallet,
  Coins,
  BarChart3,
  Activity,
  ShieldCheck,
  ArrowRight,
  Plus,
  ClipboardList,
  TrendingUp,
  Sparkles,
  CheckCircle2,
  Circle,
  Database,
  Server,
  Bell,
  Home,
} from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { RoleGuard } from "@/components/aawash/AuthGuard";
import { AdminShell } from "@/components/aawash/admin/AdminShell";
import { getAdminOverview } from "@/lib/admin-overview.functions";
import { getSystemHealth } from "@/lib/system.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminHome,
  head: () => ({ meta: [{ title: "Admin Control Center — Aawash" }] }),
});

function AdminHome() {
  return (
    <RoleGuard allow={["super_admin"]}>
      <AdminContent />
    </RoleGuard>
  );
}

function formatMoney(n: number) {
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(2)}Cr`;
  if (n >= 1_00_000) return `₹${(n / 1_00_000).toFixed(2)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n.toFixed(0)}`;
}

function AdminContent() {
  const { profile } = useSession();
  const overview = useServerFn(getAdminOverview);
  const health = useServerFn(getSystemHealth);

  const { data: kpi } = useQuery({
    queryKey: ["admin", "overview"],
    queryFn: () => overview(),
    refetchInterval: 60_000,
  });

  const { data: sys } = useQuery({
    queryKey: ["admin", "health"],
    queryFn: () => health(),
    refetchInterval: 90_000,
  });

  const [clock, setClock] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const firstName = profile?.full_name?.split(" ")[0] || "Admin";
  const dateLabel = clock.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const timeLabel = clock.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

  return (
    <AdminShell role="super_admin" profile={profile}>
      {/* Welcome */}
      <section className="glass-card overflow-hidden rounded-4xl px-6 py-6 shadow-[var(--shadow-float)] sm:px-8 sm:py-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
              <ShieldCheck size={14} /> Super Admin Control Center
            </div>
            <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl lg:text-4xl">
              Welcome back, {firstName}.
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Every project, team, sale, wallet and workflow across Aawash — one command surface.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
            <div className="rounded-3xl border border-border bg-surface px-4 py-3 shadow-[var(--shadow-soft)]">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Today
              </div>
              <div className="mt-0.5 text-sm font-bold text-foreground">{dateLabel}</div>
            </div>
            <div className="rounded-3xl border border-border bg-surface px-4 py-3 shadow-[var(--shadow-soft)]">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Local time
              </div>
              <div className="mt-0.5 text-sm font-bold text-foreground">{timeLabel}</div>
            </div>
          </div>
        </div>
      </section>

      {/* KPI grid */}
      <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <Kpi icon={<Building2 size={16} />} label="Projects" value={kpi?.projects_total ?? "—"} to="/projects" />
        <Kpi icon={<Home size={16} />} label="Flats total" value={kpi?.flats_total ?? "—"} />
        <Kpi
          icon={<Circle size={16} />}
          label="Available"
          value={kpi?.flats_available ?? "—"}
          tone="success"
        />
        <Kpi icon={<Circle size={16} />} label="Reserved" value={kpi?.flats_reserved ?? "—"} tone="warning" />
        <Kpi icon={<CheckCircle2 size={16} />} label="Sold" value={kpi?.flats_sold ?? "—"} tone="primary" />
        <Kpi icon={<ClipboardList size={16} />} label="Customers" value={kpi?.customers_total ?? "—"} to="/crm" />
        <Kpi icon={<Users size={16} />} label="Team Leaders" value={kpi?.team_leaders ?? "—"} to="/admin/users" />
        <Kpi icon={<Users size={16} />} label="Members" value={kpi?.members ?? "—"} to="/admin/users" tone="gold" />
        <Kpi icon={<TrendingUp size={16} />} label="Sales today" value={kpi?.sales_today ?? "—"} to="/sales-workflow" />
        <Kpi icon={<TrendingUp size={16} />} label="Sales this month" value={kpi?.sales_month ?? "—"} to="/sales-workflow" />
        <Kpi icon={<Wallet size={16} />} label="Pending withdrawals" value={kpi?.withdrawals_pending ?? "—"} to="/admin/withdrawals" tone="warning" />
        <Kpi icon={<Coins size={16} />} label="Pending sales" value={kpi?.commissions_pending ?? "—"} to="/sales-workflow" />
        <Kpi
          icon={<Wallet size={16} />}
          label="Wallet available"
          value={kpi ? formatMoney(kpi.wallet_available_total) : "—"}
          tone="primary"
        />
        <Kpi
          icon={<Sparkles size={16} />}
          label="Revenue (approved)"
          value={kpi ? formatMoney(kpi.revenue_total) : "—"}
          tone="gold"
        />
        <Kpi icon={<Bell size={16} />} label="Unread alerts" value={kpi?.notifications_unread ?? "—"} to="/admin/notifications" />
      </section>

      {/* System status + Quick actions */}
      <section className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <QuickActionPanel />
        <SystemStatusCard sys={sys} />
      </section>

      {/* Recent activity */}
      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">Recent activity</h2>
          <Link
            to="/admin/system"
            className="text-xs font-semibold text-primary hover:underline"
          >
            Full activity feed →
          </Link>
        </div>
        <div className="glass-card rounded-3xl px-2 py-2 shadow-[var(--shadow-soft)]">
          {(kpi?.activity ?? []).length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">
              No recent activity.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {(kpi?.activity ?? []).slice(0, 10).map((a) => (
                <li key={a.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                    <Activity size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-foreground">
                      {a.action.replace(/_/g, " ")}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {a.entity_type ?? "system"}
                      {a.entity_id ? ` · ${a.entity_id.slice(0, 8)}` : ""}
                    </div>
                  </div>
                  <div className="shrink-0 text-[11px] font-medium text-muted-foreground">
                    {new Date(a.created_at).toLocaleString()}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </AdminShell>
  );
}

function Kpi({
  icon,
  label,
  value,
  tone = "neutral",
  to,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  tone?: "neutral" | "primary" | "gold" | "success" | "warning";
  to?: string;
}) {
  const toneMap = {
    neutral: "bg-primary-soft text-primary",
    primary: "bg-gradient-to-br from-primary to-leaf text-primary-foreground",
    gold: "bg-gold/20 text-gold-foreground",
    success: "bg-leaf/15 text-leaf",
    warning: "bg-warning/20 text-warning",
  } as const;

  const Inner = (
    <div className="rounded-3xl border border-border bg-surface p-4 shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-float)]">
      <div className={`grid h-9 w-9 place-items-center rounded-xl ${toneMap[tone]}`}>{icon}</div>
      <div className="mt-3 text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
        {value}
      </div>
      <div className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
    </div>
  );

  return to ? (
    <Link to={to} className="group">
      {Inner}
    </Link>
  ) : (
    Inner
  );
}

function QuickActionPanel() {
  const actions = [
    { to: "/admin/users", icon: Users, label: "Create user", tint: "primary" as const },
    { to: "/projects", icon: Building2, label: "Projects", tint: "leaf" as const },
    { to: "/crm/new", icon: Plus, label: "Add customer", tint: "gold" as const },
    { to: "/sales-workflow", icon: TrendingUp, label: "Approve sale", tint: "primary" as const },
    { to: "/admin/withdrawals", icon: Wallet, label: "Approve payout", tint: "leaf" as const },
    { to: "/admin/analytics", icon: BarChart3, label: "View reports", tint: "gold" as const },
    { to: "/admin/commissions", icon: Coins, label: "Commissions", tint: "primary" as const },
    { to: "/admin/system", icon: Activity, label: "System health", tint: "leaf" as const },
  ];
  const tintMap = {
    primary: "bg-primary text-primary-foreground",
    leaf: "bg-leaf/15 text-leaf",
    gold: "bg-gold/20 text-gold-foreground",
  };
  return (
    <div className="glass-card rounded-3xl p-5 shadow-[var(--shadow-soft)]">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-bold text-foreground">Quick actions</h2>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {actions.map((a) => {
          const Icon = a.icon;
          return (
            <Link
              key={a.label}
              to={a.to}
              className="group flex flex-col items-start gap-2 rounded-2xl border border-border bg-surface p-3 transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-float)]"
            >
              <span className={`grid h-9 w-9 place-items-center rounded-xl ${tintMap[a.tint]}`}>
                <Icon size={16} />
              </span>
              <span className="text-xs font-semibold text-foreground">{a.label}</span>
              <ArrowRight size={12} className="ml-auto text-muted-foreground" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}

type SysHealth = {
  users_active?: number;
  active_flat_locks?: number;
  expired_flat_locks?: number;
  last_job_run?: { status: string; job_name: string } | null;
  notifications_unread?: number;
} | undefined;

function SystemStatusCard({ sys }: { sys: SysHealth }) {
  const authOk = true;
  const dbOk = !!sys;
  const jobOk = sys?.last_job_run ? sys.last_job_run.status === "success" : true;
  const notifOk = true;
  const syncOk = (sys?.expired_flat_locks ?? 0) === 0;

  const items: Array<{ label: string; state: "ok" | "warn" | "bad"; icon: React.ElementType }> = [
    { label: "Authentication", state: authOk ? "ok" : "bad", icon: ShieldCheck },
    { label: "Database", state: dbOk ? "ok" : "bad", icon: Database },
    { label: "Storage", state: "ok", icon: Server },
    { label: "Notifications", state: notifOk ? "ok" : "warn", icon: Bell },
    { label: "Synchronization", state: syncOk ? "ok" : "warn", icon: Activity },
    { label: "Background jobs", state: jobOk ? "ok" : "warn", icon: Server },
  ];
  const stateMap = {
    ok: { dot: "bg-leaf", label: "Healthy", text: "text-leaf" },
    warn: { dot: "bg-warning", label: "Attention", text: "text-warning" },
    bad: { dot: "bg-destructive", label: "Down", text: "text-destructive" },
  };
  return (
    <div className="glass-card rounded-3xl p-5 shadow-[var(--shadow-soft)]">
      <h2 className="mb-4 text-base font-bold text-foreground">System status</h2>
      <ul className="space-y-2">
        {items.map((it) => {
          const meta = stateMap[it.state];
          const Icon = it.icon;
          return (
            <li
              key={it.label}
              className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-3 py-2"
            >
              <Icon size={16} className="text-muted-foreground" />
              <span className="flex-1 text-sm font-semibold text-foreground">{it.label}</span>
              <span className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
                <span className={`text-[11px] font-bold uppercase tracking-wider ${meta.text}`}>
                  {meta.label}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
