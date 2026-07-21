import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Handshake, User, Phone, MapPin, Building2, Users, UserPlus } from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { RoleGuard } from "@/components/aawash/AuthGuard";
import { DashboardShell } from "@/components/aawash/DashboardShell";
import {
  SectionCard,
  EmptyState,
  SkeletonBlock,
} from "@/components/aawash/dashboard-kit";
import { submitTip, listMyTips } from "@/lib/member.functions";
import { listProjects } from "@/lib/leader.functions";

export const Route = createFileRoute("/_authenticated/member/tips")({
  component: TipsPage,
  head: () => ({ meta: [{ title: "Tip Person — Aawash" }] }),
});

function TipsPage() {
  return (
    <RoleGuard allow={["member", "team_leader", "super_admin"]}>
      <TipsContent />
    </RoleGuard>
  );
}

const initialForm = {
  tip_name: "",
  tip_mobile: "",
  tip_address: "",
  relationship: "",
  customer_name: "",
  customer_contact: "",
  project_id: "",
  interested_project: "",
  notes: "",
};

function TipsContent() {
  const { profile } = useSession();
  const qc = useQueryClient();
  const submitFn = useServerFn(submitTip);
  const listFn = useServerFn(listMyTips);
  const projectsFn = useServerFn(listProjects);

  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const tips = useQuery({ queryKey: ["member", "tips"], queryFn: () => listFn() });
  const projects = useQuery({ queryKey: ["projects", "all"], queryFn: () => projectsFn() });

  const submit = useMutation({
    mutationFn: () => submitFn({ data: form }),
    onSuccess: () => {
      setSuccess("Tip record saved. Admin and your Team Leader can now see it.");
      setError(null);
      setForm(initialForm);
      qc.invalidateQueries({ queryKey: ["member", "tips"] });
    },
    onError: (e) => {
      setError((e as Error).message);
      setSuccess(null);
    },
  });

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  return (
    <DashboardShell role="member" profile={profile}>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-gold/20 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-gold-foreground">
            Tip lead
          </div>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Tip person information
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Someone outside Aawash gave you a customer? Record their details — they stay linked to you.
          </p>
        </div>
        <Link
          to="/member/referrals"
          className="inline-flex h-10 items-center gap-1.5 rounded-2xl border border-border bg-surface px-3 text-xs font-semibold text-foreground shadow-[var(--shadow-soft)]"
        >
          <UserPlus size={14} /> Add referral
        </Link>
      </header>

      <section className="mt-6 grid gap-5 lg:grid-cols-[1fr_1fr]">
        <SectionCard title="New tip record">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setError(null);
              setSuccess(null);
              submit.mutate();
            }}
            className="flex flex-col gap-3"
          >
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Tip person</div>
            <Field label="Full name" required>
              <Input icon={<User size={14} />} value={form.tip_name} onChange={(v) => set("tip_name", v)} required />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Mobile number" required>
                <Input icon={<Phone size={14} />} value={form.tip_mobile} onChange={(v) => set("tip_mobile", v.replace(/[^0-9+]/g, ""))} required inputMode="numeric" />
              </Field>
              <Field label="Relationship">
                <Input value={form.relationship} onChange={(v) => set("relationship", v)} placeholder="Friend, colleague…" />
              </Field>
            </div>
            <Field label="Address">
              <Input icon={<MapPin size={14} />} value={form.tip_address} onChange={(v) => set("tip_address", v)} />
            </Field>

            <div className="mt-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Customer</div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Customer name" required>
                <Input icon={<User size={14} />} value={form.customer_name} onChange={(v) => set("customer_name", v)} required />
              </Field>
              <Field label="Customer contact">
                <Input icon={<Phone size={14} />} value={form.customer_contact} onChange={(v) => set("customer_contact", v.replace(/[^0-9+]/g, ""))} inputMode="numeric" />
              </Field>
            </div>
            <Field label="Interested project">
              <div className="relative">
                <Building2 size={14} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <select
                  value={form.project_id}
                  onChange={(e) => {
                    const id = e.target.value;
                    const proj = (projects.data ?? []).find((p) => p.id === id);
                    set("project_id", id);
                    if (proj) set("interested_project", proj.name);
                  }}
                  className="h-11 w-full appearance-none rounded-2xl border border-input bg-surface pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Select project…</option>
                  {(projects.data ?? []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} · {p.location}
                    </option>
                  ))}
                </select>
              </div>
            </Field>
            <Field label="Additional notes">
              <textarea
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                rows={3}
                maxLength={1000}
                className="w-full rounded-2xl border border-input bg-surface px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </Field>

            {error && <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</div>}
            {success && <div className="rounded-xl border border-success/30 bg-success/10 px-3 py-2 text-xs text-success">{success}</div>}

            <button
              type="submit"
              disabled={submit.isPending}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-primary to-leaf text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] disabled:opacity-50"
            >
              <Handshake size={14} /> {submit.isPending ? "Saving…" : "Save tip record"}
            </button>
          </form>
        </SectionCard>

        <SectionCard title="My tip records" subtitle={`${(tips.data ?? []).length} total`}>
          {tips.isLoading ? (
            <div className="grid gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonBlock key={i} className="h-20" />
              ))}
            </div>
          ) : (tips.data ?? []).length === 0 ? (
            <EmptyState icon={<Users size={22} />} title="No tips yet" body="Records will appear here after you save them." />
          ) : (
            <ul className="flex max-h-[520px] flex-col gap-2 overflow-y-auto pr-1">
              {(tips.data ?? []).map((t) => (
                <li key={t.id} className="rounded-2xl border border-border/50 bg-surface p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-foreground">{t.tip_name}</div>
                      <div className="font-mono text-[11px] text-muted-foreground">{t.tip_mobile}</div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        Customer <span className="font-semibold text-foreground">{t.customer_name}</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {t.interested_project || "No project"} · {new Date(t.created_at).toLocaleDateString("en-IN")}
                      </div>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                      t.status === "purchased" ? "bg-success/15 text-success" : t.status === "rejected" ? "bg-destructive/10 text-destructive" : "bg-warning/15 text-warning"
                    }`}>
                      {t.status}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </section>
    </DashboardShell>
  );
}

function Field({ label, children, required = false }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  icon,
  required,
  inputMode,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  icon?: React.ReactNode;
  required?: boolean;
  inputMode?: "numeric" | "text" | "email" | "tel";
}) {
  return (
    <div className="relative">
      {icon && <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">{icon}</span>}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        inputMode={inputMode}
        maxLength={200}
        className={`h-11 w-full rounded-2xl border border-input bg-surface ${icon ? "pl-10" : "pl-4"} pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring`}
      />
    </div>
  );
}
