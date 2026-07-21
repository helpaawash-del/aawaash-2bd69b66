import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, UserPlus, AlertTriangle, Check } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "@/hooks/useSession";
import { RoleGuard } from "@/components/aawash/AuthGuard";
import { DashboardShell } from "@/components/aawash/DashboardShell";
import { SectionCard } from "@/components/aawash/dashboard-kit";
import { createCustomer } from "@/lib/crm.functions";
import { listProjects } from "@/lib/leader.functions";

export const Route = createFileRoute("/_authenticated/crm/new")({
  component: NewLead,
  head: () => ({ meta: [{ title: "New Lead — Aawash CRM" }] }),
});

function NewLead() {
  return (
    <RoleGuard allow={["member", "team_leader", "super_admin"]}>
      <NewLeadContent />
    </RoleGuard>
  );
}

type DupeRow = {
  id: string;
  customer_code: string;
  full_name: string;
  mobile_number: string;
};

function NewLeadContent() {
  const { profile, role } = useSession();
  const navigate = useNavigate();
  const createFn = useServerFn(createCustomer);
  const projectsFn = useServerFn(listProjects);
  const projects = useQuery({ queryKey: ["projects", "list-lite"], queryFn: () => projectsFn() });

  const [form, setForm] = useState({
    full_name: "",
    mobile_number: "",
    alt_mobile_number: "",
    email: "",
    address: "",
    city: "",
    state: "",
    pin_code: "",
    occupation: "",
    company: "",
    preferred_project_id: "",
    preferred_area: "",
    preferred_config: "",
    lead_source: "",
    priority: "normal" as "low" | "normal" | "high" | "vip",
    notes: "",
    budget_min: "",
    budget_max: "",
    next_followup_at: "",
  });
  const [saving, setSaving] = useState(false);
  const [dupes, setDupes] = useState<DupeRow[] | null>(null);
  const [force, setForce] = useState(false);

  function update<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        full_name: form.full_name.trim(),
        mobile_number: form.mobile_number.trim(),
        alt_mobile_number: form.alt_mobile_number.trim() || undefined,
        email: form.email.trim() || undefined,
        address: form.address.trim() || undefined,
        city: form.city.trim() || undefined,
        state: form.state.trim() || undefined,
        pin_code: form.pin_code.trim() || undefined,
        occupation: form.occupation.trim() || undefined,
        company: form.company.trim() || undefined,
        preferred_project_id: form.preferred_project_id || undefined,
        preferred_area: form.preferred_area.trim() || undefined,
        preferred_config: form.preferred_config.trim() || undefined,
        lead_source: form.lead_source.trim() || undefined,
        priority: form.priority,
        notes: form.notes.trim() || undefined,
        budget_min: form.budget_min ? Number(form.budget_min) : undefined,
        budget_max: form.budget_max ? Number(form.budget_max) : undefined,
        next_followup_at: form.next_followup_at || undefined,
      };
      const res = await createFn({ data: payload });
      if (res.ok) {
        toast.success(`Lead ${res.code} created`);
        navigate({ to: "/crm/$id", params: { id: res.id } });
      } else if (res.duplicates) {
        setDupes(res.duplicates as DupeRow[]);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create lead");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardShell role={role ?? "member"} profile={profile}>
      <div className="mb-4 flex items-center gap-3">
        <Link
          to="/crm"
          className="grid h-10 w-10 place-items-center rounded-2xl border border-border bg-surface text-foreground shadow-[var(--shadow-soft)]"
        >
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-lg font-extrabold tracking-tight text-foreground sm:text-2xl">
            New lead
          </h1>
          <p className="text-xs text-muted-foreground">
            Capture the essentials. You can refine details anytime.
          </p>
        </div>
      </div>

      {dupes && dupes.length > 0 && !force && (
        <div className="mb-4 rounded-3xl border border-gold/40 bg-gold/10 p-4 shadow-[var(--shadow-soft)]">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 text-gold-foreground" size={18} />
            <div className="flex-1">
              <div className="text-sm font-bold text-foreground">
                Possible duplicate customer{dupes.length > 1 ? "s" : ""}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                We already have {dupes.length} customer{dupes.length > 1 ? "s" : ""} with matching
                phone or email. Open the existing profile or continue anyway.
              </p>
              <ul className="mt-3 flex flex-col gap-2">
                {dupes.map((d) => (
                  <li
                    key={d.id}
                    className="flex items-center justify-between rounded-2xl border border-border/60 bg-surface p-3"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-foreground">
                        {d.full_name}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {d.customer_code} · {d.mobile_number}
                      </div>
                    </div>
                    <Link
                      to="/crm/$id"
                      params={{ id: d.id }}
                      className="rounded-2xl border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-primary"
                    >
                      Open
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => {
                    setForce(true);
                    setDupes(null);
                  }}
                  className="rounded-2xl border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-foreground"
                >
                  Continue anyway
                </button>
                <button
                  onClick={() => setDupes(null)}
                  className="rounded-2xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                >
                  Edit details
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={submit} className="grid gap-5">
        <SectionCard title="Basic information">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Full name *">
              <input
                required
                value={form.full_name}
                onChange={(e) => update("full_name", e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Mobile *">
              <input
                required
                inputMode="numeric"
                maxLength={10}
                pattern="\d{10}"
                value={form.mobile_number}
                onChange={(e) => update("mobile_number", e.target.value.replace(/\D/g, ""))}
                className={inputCls}
              />
            </Field>
            <Field label="Alternative mobile">
              <input
                inputMode="numeric"
                maxLength={10}
                value={form.alt_mobile_number}
                onChange={(e) => update("alt_mobile_number", e.target.value.replace(/\D/g, ""))}
                className={inputCls}
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>
        </SectionCard>

        <SectionCard title="Location & profession">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Address" wide>
              <input value={form.address} onChange={(e) => update("address", e.target.value)} className={inputCls} />
            </Field>
            <Field label="City">
              <input value={form.city} onChange={(e) => update("city", e.target.value)} className={inputCls} />
            </Field>
            <Field label="State">
              <input value={form.state} onChange={(e) => update("state", e.target.value)} className={inputCls} />
            </Field>
            <Field label="PIN code">
              <input
                inputMode="numeric"
                maxLength={6}
                value={form.pin_code}
                onChange={(e) => update("pin_code", e.target.value.replace(/\D/g, ""))}
                className={inputCls}
              />
            </Field>
            <Field label="Occupation">
              <input value={form.occupation} onChange={(e) => update("occupation", e.target.value)} className={inputCls} />
            </Field>
            <Field label="Company">
              <input value={form.company} onChange={(e) => update("company", e.target.value)} className={inputCls} />
            </Field>
          </div>
        </SectionCard>

        <SectionCard title="Project interest">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Preferred project">
              <select
                value={form.preferred_project_id}
                onChange={(e) => update("preferred_project_id", e.target.value)}
                className={inputCls}
              >
                <option value="">— select —</option>
                {(projects.data ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Preferred configuration">
              <input
                placeholder="e.g. 2BHK, 3BHK"
                value={form.preferred_config}
                onChange={(e) => update("preferred_config", e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Preferred area">
              <input value={form.preferred_area} onChange={(e) => update("preferred_area", e.target.value)} className={inputCls} />
            </Field>
            <Field label="Lead source">
              <input
                placeholder="Referral, Ad, Walk-in…"
                value={form.lead_source}
                onChange={(e) => update("lead_source", e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Budget min (₹)">
              <input
                inputMode="numeric"
                value={form.budget_min}
                onChange={(e) => update("budget_min", e.target.value.replace(/[^0-9]/g, ""))}
                className={inputCls}
              />
            </Field>
            <Field label="Budget max (₹)">
              <input
                inputMode="numeric"
                value={form.budget_max}
                onChange={(e) => update("budget_max", e.target.value.replace(/[^0-9]/g, ""))}
                className={inputCls}
              />
            </Field>
            <Field label="Priority">
              <select
                value={form.priority}
                onChange={(e) => update("priority", e.target.value as typeof form.priority)}
                className={inputCls}
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">Hot</option>
                <option value="vip">VIP</option>
              </select>
            </Field>
            <Field label="Next follow-up">
              <input
                type="datetime-local"
                value={form.next_followup_at}
                onChange={(e) => update("next_followup_at", e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Notes" wide>
              <textarea
                rows={3}
                value={form.notes}
                onChange={(e) => update("notes", e.target.value)}
                className={`${inputCls} resize-y`}
              />
            </Field>
          </div>
        </SectionCard>

        <div className="flex flex-wrap justify-end gap-2">
          <Link
            to="/crm"
            className="inline-flex h-11 items-center gap-1.5 rounded-2xl border border-border bg-surface px-4 text-sm font-semibold text-foreground"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex h-11 items-center gap-1.5 rounded-2xl bg-gradient-to-br from-primary to-leaf px-5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] disabled:opacity-60"
          >
            {saving ? <Check size={14} /> : <UserPlus size={14} />} {saving ? "Saving…" : "Create lead"}
          </button>
        </div>
      </form>
    </DashboardShell>
  );
}

const inputCls =
  "w-full rounded-2xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground shadow-[var(--shadow-soft)] outline-none transition-all focus:border-primary/50";

function Field({
  label,
  children,
  wide,
}: {
  label: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <label className={`flex flex-col gap-1.5 ${wide ? "sm:col-span-2" : ""}`}>
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}
