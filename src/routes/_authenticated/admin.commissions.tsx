import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  Coins,
  Layers,
  Percent,
  Plus,
  Save,
  Sparkles,
  Trash2,
  ArrowUpRight,
} from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { RoleGuard } from "@/components/aawash/AuthGuard";
import { DashboardShell } from "@/components/aawash/DashboardShell";
import { SectionCard, StatCard, formatINR, EmptyState, SkeletonBlock } from "@/components/aawash/dashboard-kit";
import {
  listCommissionSlabs,
  upsertCommissionSlab,
  deleteCommissionSlab,
  updateCommissionSettings,
  listCommissionTransactions,
  commissionDashboard,
} from "@/lib/commissions.functions";

export const Route = createFileRoute("/_authenticated/admin/commissions")({
  component: Page,
  head: () => ({ meta: [{ title: "Commissions — Admin — Aawash" }] }),
});

function Page() {
  return (
    <RoleGuard allow={["super_admin"]}>
      <Content />
    </RoleGuard>
  );
}

type SlabForm = {
  id?: string;
  label: string;
  min_amount: number;
  max_amount: number | null;
  percent: number;
  bonus_enabled: boolean;
  active: boolean;
  sort_order: number;
};

function Content() {
  const { profile } = useSession();
  const qc = useQueryClient();
  const slabsFn = useServerFn(listCommissionSlabs);
  const dashFn = useServerFn(commissionDashboard);
  const txnFn = useServerFn(listCommissionTransactions);
  const upsertFn = useServerFn(upsertCommissionSlab);
  const deleteFn = useServerFn(deleteCommissionSlab);
  const settingsFn = useServerFn(updateCommissionSettings);

  const { data: slabsData, isLoading: slabsLoading } = useQuery({
    queryKey: ["commissions", "slabs"],
    queryFn: () => slabsFn(),
  });
  const { data: dash } = useQuery({ queryKey: ["commissions", "dashboard"], queryFn: () => dashFn() });
  const { data: txns } = useQuery({
    queryKey: ["commissions", "txns", "all"],
    queryFn: () => txnFn({ data: { scope: "all", limit: 25 } }),
  });

  const [editing, setEditing] = useState<SlabForm | null>(null);
  const [settings, setSettings] = useState<{ member_share_pct: number; tip_share_pct: number; bonus_threshold: number } | null>(null);

  const currentSettings = settings ??
    (slabsData?.settings
      ? {
          member_share_pct: Number(slabsData.settings.member_share_pct),
          tip_share_pct: Number(slabsData.settings.tip_share_pct),
          bonus_threshold: Number(slabsData.settings.bonus_threshold),
        }
      : { member_share_pct: 30, tip_share_pct: 0.5, bonus_threshold: 100000000 });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["commissions"] });

  const upsertMut = useMutation({
    mutationFn: (data: SlabForm) => upsertFn({ data }),
    onSuccess: () => {
      toast.success("Slab saved");
      setEditing(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Slab removed");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const settingsMut = useMutation({
    mutationFn: (data: typeof currentSettings) => settingsFn({ data }),
    onSuccess: () => {
      toast.success("Settings updated");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <DashboardShell role="super_admin" profile={profile}>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="glass-card inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium text-foreground">
            <Coins size={14} className="text-gold" />
            Commission Engine
          </div>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Commissions
          </h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Central financial authority — configure slabs, review every transaction, and audit the ledger.
          </p>
        </div>
        <button
          onClick={() =>
            setEditing({
              label: "",
              min_amount: 0,
              max_amount: null,
              percent: 3,
              bonus_enabled: false,
              active: true,
              sort_order: (slabsData?.slabs.length ?? 0) * 10 + 10,
            })
          }
          className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition hover:-translate-y-0.5"
        >
          <Plus size={16} /> New slab
        </button>
      </header>

      <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={<Layers size={18} />} label="Transactions" value={String(dash?.totals.transactions ?? 0)} />
        <StatCard
          icon={<Sparkles size={18} />}
          label="Approved sale value"
          value={formatINR(dash?.totals.activeValue ?? 0, { compact: true })}
          accent="gold"
        />
        <StatCard
          icon={<Percent size={18} />}
          label="Leader payout"
          value={formatINR(dash?.totals.payoutLeader ?? 0, { compact: true })}
        />
        <StatCard
          icon={<Percent size={18} />}
          label="Member payout"
          value={formatINR(dash?.totals.payoutMember ?? 0, { compact: true })}
        />
      </section>

      <section className="mt-6 grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SectionCard title="Commission slabs" subtitle="Slab picked by sale amount at approval time.">
            {slabsLoading ? (
              <div className="grid gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <SkeletonBlock key={i} className="h-14" />
                ))}
              </div>
            ) : (slabsData?.slabs.length ?? 0) === 0 ? (
              <EmptyState icon={<Layers size={20} />} title="No slabs" body="Create the first slab to enable commissions." />
            ) : (
              <ul className="flex flex-col gap-2">
                {(slabsData?.slabs ?? []).map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center gap-3 rounded-2xl border border-border/60 bg-surface p-3"
                  >
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary font-bold">
                      {Number(s.percent).toFixed(2)}%
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">{s.label}</span>
                        {s.bonus_enabled && (
                          <span className="rounded-full bg-gold/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gold-foreground">
                            Bonus
                          </span>
                        )}
                        {!s.active && (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">
                            Inactive
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {formatINR(Number(s.min_amount), { compact: true })}
                        {" – "}
                        {s.max_amount == null ? "∞" : formatINR(Number(s.max_amount), { compact: true })}
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        setEditing({
                          id: s.id,
                          label: s.label,
                          min_amount: Number(s.min_amount),
                          max_amount: s.max_amount == null ? null : Number(s.max_amount),
                          percent: Number(s.percent),
                          bonus_enabled: s.bonus_enabled,
                          active: s.active,
                          sort_order: s.sort_order,
                        })
                      }
                      className="rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete slab "${s.label}"?`)) deleteMut.mutate(s.id);
                      }}
                      className="grid h-8 w-8 place-items-center rounded-xl text-destructive hover:bg-destructive/10"
                      aria-label="Delete slab"
                    >
                      <Trash2 size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>

        <SectionCard title="Engine settings" subtitle="Applied to every commission.">
          <div className="flex flex-col gap-3">
            <LabeledNumber
              label="Member share (% of leader)"
              value={currentSettings.member_share_pct}
              onChange={(v) => setSettings({ ...currentSettings, member_share_pct: v })}
              suffix="%"
            />
            <LabeledNumber
              label="Tip share (% of member)"
              value={currentSettings.tip_share_pct}
              onChange={(v) => setSettings({ ...currentSettings, tip_share_pct: v })}
              suffix="%"
              step={0.01}
            />
            <LabeledNumber
              label="Bonus threshold (₹)"
              value={currentSettings.bonus_threshold}
              onChange={(v) => setSettings({ ...currentSettings, bonus_threshold: v })}
              step={1000000}
            />
            <button
              disabled={settingsMut.isPending}
              onClick={() => settingsMut.mutate(currentSettings)}
              className="mt-2 inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] disabled:opacity-60"
            >
              <Save size={16} /> Save settings
            </button>
          </div>
        </SectionCard>
      </section>

      <section className="mt-6">
        <SectionCard title="Recent transactions" subtitle={`Last ${txns?.rows.length ?? 0} commission transactions`}>
          {(txns?.rows.length ?? 0) === 0 ? (
            <EmptyState
              icon={<Coins size={20} />}
              title="No commission transactions yet"
              body="Approve a sale to generate the first commission."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="pb-2 font-medium">Txn</th>
                    <th className="pb-2 font-medium">Project</th>
                    <th className="pb-2 font-medium">Member</th>
                    <th className="pb-2 font-medium">Sale</th>
                    <th className="pb-2 font-medium">Slab</th>
                    <th className="pb-2 font-medium">Net leader</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2" />
                  </tr>
                </thead>
                <tbody>
                  {(txns?.rows ?? []).map((r) => (
                    <tr key={r.id} className="border-t border-border/50">
                      <td className="py-3 font-mono text-xs text-foreground">{r.txn_number}</td>
                      <td className="py-3 text-foreground">{r.project?.name ?? "—"}</td>
                      <td className="py-3 text-muted-foreground">{r.member?.full_name ?? "—"}</td>
                      <td className="py-3 text-foreground">{formatINR(Number(r.sale_amount), { compact: true })}</td>
                      <td className="py-3 text-muted-foreground">{Number(r.slab_pct).toFixed(2)}%</td>
                      <td className="py-3 font-semibold text-foreground">
                        {formatINR(Number(r.net_leader), { compact: true })}
                      </td>
                      <td className="py-3">
                        <StatusPill status={r.status} />
                      </td>
                      <td className="py-3 text-right">
                        <Link
                          to="/commissions/$id"
                          params={{ id: r.id }}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                        >
                          Open <ArrowUpRight size={12} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </section>

      {editing && (
        <SlabEditor
          form={editing}
          onCancel={() => setEditing(null)}
          onSave={(f) => upsertMut.mutate(f)}
          saving={upsertMut.isPending}
        />
      )}
    </DashboardShell>
  );
}

function StatusPill({ status }: { status: string }) {
  const tint =
    status === "reversed"
      ? "bg-rose-500/15 text-rose-600 dark:text-rose-300"
      : status === "settled"
        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
        : "bg-primary-soft text-primary";
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${tint}`}>
      {status}
    </span>
  );
}

function LabeledNumber({
  label,
  value,
  onChange,
  suffix,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
  step?: number;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2 rounded-2xl border border-border bg-surface px-3 py-2">
        <input
          type="number"
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full bg-transparent text-sm font-semibold text-foreground outline-none"
        />
        {suffix && <span className="text-xs text-muted-foreground">{suffix}</span>}
      </div>
    </label>
  );
}

function SlabEditor({
  form,
  onCancel,
  onSave,
  saving,
}: {
  form: SlabForm;
  onCancel: () => void;
  onSave: (f: SlabForm) => void;
  saving: boolean;
}) {
  const [state, setState] = useState<SlabForm>(form);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-4xl border border-border bg-surface p-6 shadow-[var(--shadow-float)]">
        <h2 className="text-lg font-bold text-foreground">{form.id ? "Edit slab" : "New slab"}</h2>
        <div className="mt-4 grid gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Label</span>
            <input
              value={state.label}
              onChange={(e) => setState({ ...state, label: e.target.value })}
              className="rounded-2xl border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
              placeholder="e.g. 1 – 3 Cr"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <LabeledNumber
              label="Min amount (₹)"
              value={state.min_amount}
              onChange={(v) => setState({ ...state, min_amount: v })}
              step={100000}
            />
            <LabeledNumber
              label="Max amount (₹, blank = ∞)"
              value={state.max_amount ?? 0}
              onChange={(v) => setState({ ...state, max_amount: v > 0 ? v : null })}
              step={100000}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <LabeledNumber
              label="Percent"
              value={state.percent}
              onChange={(v) => setState({ ...state, percent: v })}
              suffix="%"
              step={0.01}
            />
            <LabeledNumber
              label="Sort order"
              value={state.sort_order}
              onChange={(v) => setState({ ...state, sort_order: v })}
            />
          </div>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={state.bonus_enabled}
                onChange={(e) => setState({ ...state, bonus_enabled: e.target.checked })}
              />
              Bonus eligible
            </label>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={state.active}
                onChange={(e) => setState({ ...state, active: e.target.checked })}
              />
              Active
            </label>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-2xl border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted"
          >
            Cancel
          </button>
          <button
            disabled={saving || !state.label.trim()}
            onClick={() => onSave(state)}
            className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] disabled:opacity-60"
          >
            <Save size={14} /> Save
          </button>
        </div>
      </div>
    </div>
  );
}
