import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Cog,
  Database,
  RefreshCw,
  ShieldCheck,
  Timer,
  Users,
  Wallet,
  Building2,
} from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { RoleGuard } from "@/components/aawash/AuthGuard";
import { DashboardShell } from "@/components/aawash/DashboardShell";
import {
  SectionCard,
  StatCard,
  SkeletonBlock,
  formatINR,
} from "@/components/aawash/dashboard-kit";
import {
  getSystemHealth,
  runIntegrityChecks,
  runMaintenance,
  listJobRuns,
  getActivityFeed,
  getSystemSettings,
  updateSystemSettings,
  type IntegrityReport,
} from "@/lib/system.functions";

export const Route = createFileRoute("/_authenticated/admin/system")({
  component: Page,
  head: () => ({ meta: [{ title: "System Health — Aawash" }] }),
});

function Page() {
  return (
    <RoleGuard allow={["super_admin"]}>
      <Content />
    </RoleGuard>
  );
}

function Content() {
  const { profile } = useSession();
  const qc = useQueryClient();

  const fetchHealth = useServerFn(getSystemHealth);
  const fetchJobs = useServerFn(listJobRuns);
  const fetchFeed = useServerFn(getActivityFeed);
  const fetchSettings = useServerFn(getSystemSettings);
  const runChecks = useServerFn(runIntegrityChecks);
  const runMaint = useServerFn(runMaintenance);
  const saveSettings = useServerFn(updateSystemSettings);

  const health = useQuery({ queryKey: ["system", "health"], queryFn: () => fetchHealth() });
  const jobs = useQuery({ queryKey: ["system", "jobs"], queryFn: () => fetchJobs() });
  const feed = useQuery({ queryKey: ["system", "feed"], queryFn: () => fetchFeed() });
  const settings = useQuery({ queryKey: ["system", "settings"], queryFn: () => fetchSettings() });

  const [report, setReport] = useState<IntegrityReport | null>(null);
  const [maintOutput, setMaintOutput] = useState<string | null>(null);

  const integrity = useMutation({
    mutationFn: async () => runChecks({}),
    onSuccess: (r) => setReport(r),
  });
  const maintenance = useMutation({
    mutationFn: async () => runMaint({}),
    onSuccess: (r) => {
      setMaintOutput(JSON.stringify(r, null, 2));
      qc.invalidateQueries({ queryKey: ["system"] });
    },
  });

  const h = health.data;

  return (
    <DashboardShell role="super_admin" profile={profile}>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
            <ShieldCheck size={12} /> System Health
          </div>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Synchronization &amp; Operations
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Live health, integrity checks, background jobs and global settings.
          </p>
        </div>
        <Link to="/admin" className="text-xs font-semibold text-primary">← Admin home</Link>
      </header>

      {/* HEALTH KPIS */}
      {health.isLoading || !h ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-28" />
          ))}
        </div>
      ) : (
        <>
          <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard icon={<Users size={18} />} label="Active users" value={h.users_active} hint={`${h.users_total} total`} />
            <StatCard icon={<Building2 size={18} />} label="Projects" value={h.projects_total} accent="leaf" />
            <StatCard icon={<Database size={18} />} label="Flats sold" value={h.flats_sold} hint={`${h.flats_available} available · ${h.flats_reserved} reserved`} accent="gold" />
            <StatCard icon={<Users size={18} />} label="Customers" value={h.customers_total} />
          </section>
          <section className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard icon={<Timer size={18} />} label="Sales pending" value={h.sales_pending} hint={`${h.sales_approved_30d} approved (30d)`} accent={h.sales_pending > 0 ? "gold" : "primary"} />
            <StatCard icon={<Wallet size={18} />} label="Withdrawals pending" value={h.withdrawals_pending} accent={h.withdrawals_pending > 0 ? "gold" : "primary"} />
            <StatCard icon={<Wallet size={18} />} label="Wallet available" value={formatINR(h.wallet_available_total, { compact: true })} accent="leaf" />
            <StatCard icon={<AlertTriangle size={18} />} label="Expired locks" value={h.expired_flat_locks} accent={h.expired_flat_locks > 0 ? "destructive" : "primary"} hint={`${h.active_flat_locks} active`} />
          </section>
        </>
      )}

      {/* OPS */}
      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <SectionCard
          title="Data integrity"
          subtitle="Cross-checks flats, wallets and commissions."
          action={
            <button
              onClick={() => integrity.mutate()}
              disabled={integrity.isPending}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 disabled:opacity-60"
            >
              <RefreshCw size={14} className={integrity.isPending ? "animate-spin" : ""} />
              Run checks
            </button>
          }
        >
          {!report ? (
            <p className="text-sm text-muted-foreground">
              Run integrity checks to verify inventory counts, wallet ledger totals and commission math.
            </p>
          ) : (
            <div className="grid gap-2">
              <IntegrityRow label="Flat count mismatches" count={report.summary.flat_count_issues} />
              <IntegrityRow label="Wallet balance mismatches" count={report.summary.wallet_balance_issues} />
              <IntegrityRow label="Commission math mismatches" count={report.summary.commission_math_issues} />
              {(report.flat_count_issues.length + report.wallet_balance_issues.length + report.commission_math_issues.length) > 0 && (
                <details className="mt-2 rounded-2xl border border-border/60 bg-surface p-3 text-xs">
                  <summary className="cursor-pointer font-semibold text-foreground">View details</summary>
                  <pre className="mt-2 max-h-80 overflow-auto text-[11px] text-muted-foreground">{JSON.stringify(report, null, 2)}</pre>
                </details>
              )}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Maintenance"
          subtitle="Release expired flat locks and purge stale notifications."
          action={
            <button
              onClick={() => maintenance.mutate()}
              disabled={maintenance.isPending}
              className="inline-flex items-center gap-2 rounded-full bg-gold px-4 py-2 text-xs font-semibold text-gold-foreground shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 disabled:opacity-60"
            >
              <Cog size={14} className={maintenance.isPending ? "animate-spin" : ""} />
              Run now
            </button>
          }
        >
          {maintOutput ? (
            <pre className="max-h-60 overflow-auto rounded-2xl border border-border/60 bg-surface p-3 text-[11px] text-muted-foreground">{maintOutput}</pre>
          ) : (
            <p className="text-sm text-muted-foreground">
              Runs the same cleanup used by the scheduled job. Safe to invoke on demand.
            </p>
          )}
        </SectionCard>
      </section>

      {/* JOB RUNS */}
      <section className="mt-6">
        <SectionCard title="Background jobs" subtitle="Recent scheduled runs">
          {jobs.isLoading ? (
            <SkeletonBlock className="h-24" />
          ) : (jobs.data ?? []).length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
              No job runs recorded yet.
            </div>
          ) : (
            <ul className="flex flex-col divide-y divide-border/50">
              {(jobs.data ?? []).map((j) => (
                <li key={j.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-foreground">{j.job_name}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {new Date(j.started_at).toLocaleString()}
                      {j.duration_ms != null && ` · ${j.duration_ms} ms`}
                    </div>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                    j.status === "success" ? "bg-leaf/15 text-primary"
                    : j.status === "failed" ? "bg-destructive/10 text-destructive"
                    : "bg-gold/15 text-gold-foreground"}`}
                  >
                    {j.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </section>

      {/* ACTIVITY FEED */}
      <section className="mt-6">
        <SectionCard title="Activity feed" subtitle="Latest audited actions" action={<Activity size={16} className="text-primary" />}>
          {feed.isLoading ? (
            <SkeletonBlock className="h-40" />
          ) : (feed.data ?? []).length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
              No audit events yet.
            </div>
          ) : (
            <ul className="flex flex-col divide-y divide-border/50">
              {(feed.data ?? []).slice(0, 30).map((e) => (
                <li key={e.id} className="flex items-start gap-3 py-2.5">
                  <span className="mt-1 grid h-7 w-7 place-items-center rounded-lg bg-primary-soft text-primary">
                    <CheckCircle2 size={14} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-foreground">{e.action}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {e.entity_type ?? "—"}{e.entity_id ? ` · ${String(e.entity_id).slice(0, 8)}` : ""}
                      {" · "}{new Date(e.created_at).toLocaleString()}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </section>

      {/* SETTINGS */}
      <section className="mt-6">
        <SectionCard title="Global settings" subtitle="Company profile and maintenance mode">
          {settings.isLoading || !settings.data ? (
            <SkeletonBlock className="h-40" />
          ) : (
            <SettingsForm
              initial={settings.data}
              onSave={async (values) => {
                await saveSettings({ data: values });
                qc.invalidateQueries({ queryKey: ["system", "settings"] });
              }}
            />
          )}
        </SectionCard>
      </section>
    </DashboardShell>
  );
}

function IntegrityRow({ label, count }: { label: string; count: number }) {
  const ok = count === 0;
  return (
    <div className="flex items-center justify-between rounded-2xl border border-border/50 bg-surface p-3">
      <div className="text-sm font-medium text-foreground">{label}</div>
      <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${ok ? "bg-leaf/15 text-primary" : "bg-destructive/10 text-destructive"}`}>
        {ok ? "OK" : `${count} issue${count === 1 ? "" : "s"}`}
      </span>
    </div>
  );
}

type SettingsRow = {
  company_name: string;
  company_email: string | null;
  company_phone: string | null;
  company_address: string | null;
  maintenance_mode: boolean;
  maintenance_message: string | null;
  notifications_enabled: boolean;
};

function SettingsForm({
  initial,
  onSave,
}: {
  initial: SettingsRow;
  onSave: (v: SettingsRow) => Promise<void>;
}) {
  const [values, setValues] = useState<SettingsRow>({
    company_name: initial.company_name ?? "Aawash",
    company_email: initial.company_email ?? "",
    company_phone: initial.company_phone ?? "",
    company_address: initial.company_address ?? "",
    maintenance_mode: !!initial.maintenance_mode,
    maintenance_message: initial.maintenance_message ?? "",
    notifications_enabled: initial.notifications_enabled ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const bind = <K extends keyof SettingsRow>(k: K) => ({
    value: (values[k] ?? "") as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setValues((v) => ({ ...v, [k]: e.target.value })),
  });

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setSaving(true);
        setMsg(null);
        try {
          await onSave(values);
          setMsg("Saved.");
        } catch (err) {
          setMsg(err instanceof Error ? err.message : "Save failed");
        } finally {
          setSaving(false);
        }
      }}
      className="grid gap-3"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Company name">
          <input {...bind("company_name")} className="input" />
        </Field>
        <Field label="Company email">
          <input {...bind("company_email")} type="email" className="input" />
        </Field>
        <Field label="Company phone">
          <input {...bind("company_phone")} className="input" />
        </Field>
        <Field label="Company address">
          <input {...bind("company_address")} className="input" />
        </Field>
      </div>

      <div className="grid gap-3 rounded-2xl border border-border/50 bg-surface p-3 sm:grid-cols-2">
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={values.maintenance_mode}
            onChange={(e) => setValues((v) => ({ ...v, maintenance_mode: e.target.checked }))}
          />
          <span className="font-semibold text-foreground">Maintenance mode</span>
        </label>
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={values.notifications_enabled}
            onChange={(e) => setValues((v) => ({ ...v, notifications_enabled: e.target.checked }))}
          />
          <span className="font-semibold text-foreground">Notifications enabled</span>
        </label>
        <div className="sm:col-span-2">
          <Field label="Maintenance message">
            <textarea {...bind("maintenance_message")} rows={2} className="input" />
          </Field>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        {msg && <span className="text-xs text-muted-foreground">{msg}</span>}
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save settings"}
        </button>
      </div>

      <style>{`
        .input {
          width: 100%;
          border-radius: 0.9rem;
          border: 1px solid hsl(var(--border));
          background: hsl(var(--surface));
          padding: 0.6rem 0.85rem;
          font-size: 0.85rem;
          color: hsl(var(--foreground));
        }
        .input:focus { outline: 2px solid hsl(var(--primary) / 0.4); }
      `}</style>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
