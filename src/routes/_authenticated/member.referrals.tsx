import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  UserPlus,
  User,
  Phone,
  Building2,
  IndianRupee,
  Calendar,
  MessageSquare,
  MapPin,
  Filter,
  Search,
  Handshake,
} from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { RoleGuard } from "@/components/aawash/AuthGuard";
import { DashboardShell } from "@/components/aawash/DashboardShell";
import {
  SectionCard,
  EmptyState,
  SkeletonBlock,
  formatINR,
} from "@/components/aawash/dashboard-kit";
import { submitReferral, listMyReferrals } from "@/lib/member.functions";
import { listProjects } from "@/lib/leader.functions";

export const Route = createFileRoute("/_authenticated/member/referrals")({
  component: ReferralsPage,
  head: () => ({ meta: [{ title: "Referrals — Aawash" }] }),
});

function ReferralsPage() {
  return (
    <RoleGuard allow={["member", "team_leader", "super_admin"]}>
      <ReferralsContent />
    </RoleGuard>
  );
}

const initialForm = {
  customer_name: "",
  mobile_number: "",
  alt_mobile: "",
  address: "",
  project_id: "",
  interested_project: "",
  preferred_budget: "",
  preferred_flat: "",
  meeting_notes: "",
  expected_timeline: "",
  remarks: "",
};

function ReferralsContent() {
  const { profile } = useSession();
  const qc = useQueryClient();
  const submitFn = useServerFn(submitReferral);
  const listFn = useServerFn(listMyReferrals);
  const projectsFn = useServerFn(listProjects);

  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "meeting_scheduled" | "purchased" | "rejected">("all");
  const [q, setQ] = useState("");

  const referrals = useQuery({ queryKey: ["member", "referrals"], queryFn: () => listFn() });
  const projects = useQuery({ queryKey: ["projects", "all"], queryFn: () => projectsFn() });

  const submit = useMutation({
    mutationFn: () => submitFn({ data: form }),
    onSuccess: () => {
      setSuccess("Referral submitted. Your Team Leader and Admin will follow up.");
      setError(null);
      setForm(initialForm);
      qc.invalidateQueries({ queryKey: ["member", "referrals"] });
    },
    onError: (e) => {
      setError((e as Error).message);
      setSuccess(null);
    },
  });

  const filtered = useMemo(() => {
    let list = referrals.data ?? [];
    if (filter !== "all") {
      list = list.filter((r) => {
        if (filter === "purchased") return r.purchase_status === "purchased";
        if (filter === "meeting_scheduled") return r.meeting_status === "scheduled";
        return r.status === filter;
      });
    }
    if (q.trim()) {
      const t = q.trim().toLowerCase();
      list = list.filter(
        (r) =>
          r.customer_name.toLowerCase().includes(t) ||
          r.mobile_number.includes(t) ||
          (r.project_name || "").toLowerCase().includes(t),
      );
    }
    return list;
  }, [referrals.data, filter, q]);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  return (
    <DashboardShell role="member" profile={profile}>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
            Leads
          </div>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">Referrals</h1>
          <p className="mt-1 text-sm text-muted-foreground">Bring us potential customers. Track their journey here.</p>
        </div>
        <Link
          to="/member/tips"
          className="inline-flex h-10 items-center gap-1.5 rounded-2xl border border-border bg-surface px-3 text-xs font-semibold text-foreground shadow-[var(--shadow-soft)]"
        >
          <Handshake size={14} /> Log tip lead
        </Link>
      </header>

      <section className="mt-6 grid gap-5 lg:grid-cols-[1fr_1fr]">
        <SectionCard title="New referral" subtitle="Fill in the customer details.">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setError(null);
              setSuccess(null);
              submit.mutate();
            }}
            className="flex flex-col gap-3"
          >
            <Field label="Customer name" required>
              <Input icon={<User size={14} />} value={form.customer_name} onChange={(v) => set("customer_name", v)} placeholder="Ramesh Kumar" required />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Mobile number" required>
                <Input icon={<Phone size={14} />} value={form.mobile_number} onChange={(v) => set("mobile_number", v.replace(/[^0-9+]/g, ""))} placeholder="9876543210" required inputMode="numeric" />
              </Field>
              <Field label="Alternative number">
                <Input icon={<Phone size={14} />} value={form.alt_mobile} onChange={(v) => set("alt_mobile", v.replace(/[^0-9+]/g, ""))} placeholder="Optional" inputMode="numeric" />
              </Field>
            </div>
            <Field label="Current address">
              <Input icon={<MapPin size={14} />} value={form.address} onChange={(v) => set("address", v)} placeholder="City, state" />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
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
              <Field label="Preferred budget">
                <Input icon={<IndianRupee size={14} />} value={form.preferred_budget} onChange={(v) => set("preferred_budget", v.replace(/[^0-9.]/g, ""))} placeholder="e.g. 4500000" inputMode="numeric" />
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Preferred flat">
                <Input value={form.preferred_flat} onChange={(v) => set("preferred_flat", v)} placeholder="2 BHK / 3 BHK" />
              </Field>
              <Field label="Expected timeline">
                <Input icon={<Calendar size={14} />} value={form.expected_timeline} onChange={(v) => set("expected_timeline", v)} placeholder="Within 3 months" />
              </Field>
            </div>
            <Field label="Meeting notes">
              <TextArea value={form.meeting_notes} onChange={(v) => set("meeting_notes", v)} placeholder="What did they say?" />
            </Field>
            <Field label="Additional remarks">
              <TextArea value={form.remarks} onChange={(v) => set("remarks", v)} placeholder="Anything else worth noting" />
            </Field>

            {error && <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</div>}
            {success && <div className="rounded-xl border border-success/30 bg-success/10 px-3 py-2 text-xs text-success">{success}</div>}

            <button
              type="submit"
              disabled={submit.isPending}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-primary to-leaf text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] disabled:opacity-50"
            >
              <UserPlus size={14} /> {submit.isPending ? "Submitting…" : "Submit referral"}
            </button>
          </form>
        </SectionCard>

        <SectionCard
          title="Referral history"
          subtitle={`${(referrals.data ?? []).length} total`}
          action={
            <div className="glass-card flex items-center gap-1 rounded-2xl p-1">
              <Filter size={12} className="ml-2 text-muted-foreground" />
              {(["all", "pending", "meeting_scheduled", "purchased", "rejected"] as const).map((k) => (
                <button
                  key={k}
                  onClick={() => setFilter(k)}
                  className={`h-8 rounded-lg px-2 text-[10px] font-semibold uppercase tracking-wider transition-colors ${
                    filter === k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {k.replace("_", " ")}
                </button>
              ))}
            </div>
          }
        >
          <div className="relative mb-3">
            <Search size={14} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search customer, mobile, project…"
              className="h-11 w-full rounded-2xl border border-input bg-surface pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {referrals.isLoading ? (
            <div className="grid gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonBlock key={i} className="h-20" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<MessageSquare size={22} />}
              title="No referrals"
              body={q || filter !== "all" ? "Try a different filter or search." : "Submit your first customer lead to see it here."}
            />
          ) : (
            <ul className="flex max-h-[520px] flex-col gap-2 overflow-y-auto pr-1">
              {filtered.map((r) => (
                <li key={r.id} className="rounded-2xl border border-border/50 bg-surface p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-foreground">{r.customer_name}</div>
                      <div className="font-mono text-[11px] text-muted-foreground">{r.mobile_number}</div>
                      <div className="mt-1 text-[11px] text-muted-foreground">
                        {r.project_name || "Not linked"} · {new Date(r.created_at).toLocaleDateString("en-IN")}
                      </div>
                    </div>
                    <div className="text-right text-[10px] uppercase tracking-wider">
                      <div className={`rounded-full px-2 py-0.5 font-semibold ${statusPill(r.status)}`}>{r.status}</div>
                      {r.potential_commission > 0 && (
                        <div className="mt-1 text-xs font-bold text-gold-foreground">
                          +{formatINR(r.potential_commission, { compact: true })}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
                    <Chip label={`Meeting: ${r.meeting_status}`} />
                    <Chip label={`Purchase: ${r.purchase_status}`} />
                    {r.preferred_budget && <Chip label={`Budget: ${formatINR(r.preferred_budget, { compact: true })}`} />}
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

function TextArea({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={1000}
      rows={3}
      className="w-full rounded-2xl border border-input bg-surface px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
    />
  );
}

function Chip({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-muted px-2 py-0.5 font-semibold uppercase tracking-wider text-muted-foreground">
      {label}
    </span>
  );
}

function statusPill(status: string) {
  switch (status) {
    case "purchased":
    case "approved":
      return "bg-success/15 text-success";
    case "rejected":
      return "bg-destructive/10 text-destructive";
    case "meeting_scheduled":
      return "bg-primary-soft text-primary";
    default:
      return "bg-warning/15 text-warning";
  }
}
