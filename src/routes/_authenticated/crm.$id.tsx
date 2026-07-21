import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  Calendar,
  MessageSquare,
  Pin,
  Send,
  CalendarPlus,
  Sparkles,
  Building2,
  Wallet,
  Clock,
  Activity,
} from "lucide-react";
import { toast } from "sonner";
import { useSession } from "@/hooks/useSession";
import { RoleGuard } from "@/components/aawash/AuthGuard";
import { DashboardShell } from "@/components/aawash/DashboardShell";
import { SectionCard, SkeletonBlock, formatINR, initials } from "@/components/aawash/dashboard-kit";
import {
  getCustomer,
  updateCustomer,
  addNote,
  scheduleMeeting,
  updateMeetingStatus,
} from "@/lib/crm.functions";
import { CUSTOMER_STATUS_META, priorityStyle } from "@/components/aawash/crm/status";

export const Route = createFileRoute("/_authenticated/crm/$id")({
  component: CustomerProfile,
  head: () => ({ meta: [{ title: "Customer — Aawash CRM" }] }),
});

const STATUSES = Object.keys(CUSTOMER_STATUS_META);

function CustomerProfile() {
  return (
    <RoleGuard allow={["member", "team_leader", "super_admin"]}>
      <ProfileContent />
    </RoleGuard>
  );
}

function ProfileContent() {
  const { profile, role } = useSession();
  const { id } = Route.useParams();
  const qc = useQueryClient();

  const getFn = useServerFn(getCustomer);
  const updateFn = useServerFn(updateCustomer);
  const noteFn = useServerFn(addNote);
  const meetFn = useServerFn(scheduleMeeting);
  const meetStatusFn = useServerFn(updateMeetingStatus);

  const q = useQuery({
    queryKey: ["crm", "customer", id],
    queryFn: () => getFn({ data: { id } }),
  });

  const [savingStatus, setSavingStatus] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [pinned, setPinned] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [meetForm, setMeetForm] = useState({
    scheduled_at: "",
    location: "",
    meeting_type: "call" as const,
    remarks: "",
  });
  const [savingMeet, setSavingMeet] = useState(false);

  async function changeStatus(newStatus: string) {
    setSavingStatus(true);
    try {
      await updateFn({ data: { id, status: newStatus as never } });
      toast.success("Status updated");
      qc.invalidateQueries({ queryKey: ["crm"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update");
    } finally {
      setSavingStatus(false);
    }
  }

  async function submitNote(e: React.FormEvent) {
    e.preventDefault();
    if (!noteText.trim()) return;
    setSavingNote(true);
    try {
      await noteFn({ data: { customer_id: id, content: noteText.trim(), is_pinned: pinned } });
      setNoteText("");
      setPinned(false);
      qc.invalidateQueries({ queryKey: ["crm", "customer", id] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save note");
    } finally {
      setSavingNote(false);
    }
  }

  async function submitMeeting(e: React.FormEvent) {
    e.preventDefault();
    if (!meetForm.scheduled_at) return;
    setSavingMeet(true);
    try {
      await meetFn({
        data: {
          customer_id: id,
          scheduled_at: new Date(meetForm.scheduled_at).toISOString(),
          location: meetForm.location,
          meeting_type: meetForm.meeting_type,
          remarks: meetForm.remarks,
        },
      });
      toast.success("Meeting scheduled");
      setMeetForm({ scheduled_at: "", location: "", meeting_type: "call", remarks: "" });
      qc.invalidateQueries({ queryKey: ["crm", "customer", id] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to schedule");
    } finally {
      setSavingMeet(false);
    }
  }

  async function markMeeting(mid: string, status: "completed" | "cancelled" | "missed") {
    try {
      await meetStatusFn({ data: { id: mid, status } });
      qc.invalidateQueries({ queryKey: ["crm", "customer", id] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  if (q.isLoading) {
    return (
      <DashboardShell role={role ?? "member"} profile={profile}>
        <SkeletonBlock className="h-32" />
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <SkeletonBlock className="h-48" />
          <SkeletonBlock className="h-48" />
        </div>
      </DashboardShell>
    );
  }

  if (q.isError || !q.data) {
    return (
      <DashboardShell role={role ?? "member"} profile={profile}>
        <div className="glass-card rounded-3xl p-6 text-center">
          <div className="text-sm font-bold text-foreground">Customer not available</div>
          <p className="mt-1 text-xs text-muted-foreground">
            You may not have access, or this record no longer exists.
          </p>
          <Link
            to="/crm"
            className="mt-4 inline-flex h-10 items-center gap-1.5 rounded-2xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
          >
            <ArrowLeft size={14} /> Back to CRM
          </Link>
        </div>
      </DashboardShell>
    );
  }

  const { customer, meetings, notes, timeline, member, project } = q.data;
  const st = CUSTOMER_STATUS_META[customer.status] ?? {
    label: customer.status,
    tone: "bg-muted text-muted-foreground",
  };
  const pri = priorityStyle(customer.priority);

  return (
    <DashboardShell role={role ?? "member"} profile={profile}>
      <div className="mb-4 flex items-center gap-3">
        <Link
          to="/crm"
          className="grid h-10 w-10 place-items-center rounded-2xl border border-border bg-surface text-foreground shadow-[var(--shadow-soft)]"
        >
          <ArrowLeft size={16} />
        </Link>
        <div className="min-w-0">
          <div className="font-mono text-[11px] text-muted-foreground">{customer.customer_code}</div>
          <h1 className="truncate text-lg font-extrabold tracking-tight text-foreground sm:text-2xl">
            {customer.full_name}
          </h1>
        </div>
      </div>

      {/* Hero */}
      <section className="glass-card relative overflow-hidden rounded-4xl p-5 shadow-[var(--shadow-float)] sm:p-6">
        <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-primary to-leaf text-sm font-bold text-primary-foreground">
                {initials(customer.full_name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${st.tone}`}>
                    {st.label}
                  </span>
                  {pri && (
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${pri.className}`}>
                      {pri.label}
                    </span>
                  )}
                  {(customer.tags ?? []).slice(0, 3).map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-primary-soft/60 px-2 py-0.5 text-[10px] font-semibold text-primary"
                    >
                      {t}
                    </span>
                  ))}
                </div>
                <div className="mt-2 grid grid-cols-1 gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                  <span className="inline-flex items-center gap-1.5">
                    <Phone size={12} /> {customer.mobile_number}
                  </span>
                  {customer.email && (
                    <span className="inline-flex items-center gap-1.5">
                      <Mail size={12} /> {customer.email}
                    </span>
                  )}
                  {(customer.city || customer.state) && (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin size={12} /> {[customer.city, customer.state].filter(Boolean).join(", ")}
                    </span>
                  )}
                  {customer.occupation && (
                    <span className="inline-flex items-center gap-1.5">
                      <Briefcase size={12} /> {customer.occupation}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:min-w-[220px]">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Move status
            </label>
            <select
              disabled={savingStatus}
              value={customer.status}
              onChange={(e) => changeStatus(e.target.value)}
              className="rounded-2xl border border-border bg-surface px-3 py-2.5 text-sm font-semibold text-foreground shadow-[var(--shadow-soft)]"
            >
              {STATUSES.map((k) => (
                <option key={k} value={k}>
                  {CUSTOMER_STATUS_META[k].label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Key details + preferences */}
      <section className="mt-5 grid gap-5 lg:grid-cols-2">
        <SectionCard title="Contact & profile">
          <dl className="grid grid-cols-2 gap-3 text-xs">
            <KV label="Alt mobile" value={customer.alt_mobile_number ?? "—"} />
            <KV label="Address" value={customer.address ?? "—"} />
            <KV label="PIN" value={customer.pin_code ?? "—"} />
            <KV label="Company" value={customer.company ?? "—"} />
            <KV label="Assigned to" value={member?.full_name ?? "—"} />
            <KV
              label="Last contact"
              value={customer.last_contact_at ? new Date(customer.last_contact_at).toLocaleString("en-IN") : "—"}
            />
            <KV
              label="Next follow-up"
              value={customer.next_followup_at ? new Date(customer.next_followup_at).toLocaleString("en-IN") : "—"}
            />
            <KV label="Meetings" value={String(customer.meeting_count ?? 0)} />
          </dl>
        </SectionCard>

        <SectionCard title="Project & budget">
          <dl className="grid grid-cols-2 gap-3 text-xs">
            <KV
              label="Preferred project"
              value={project ? (
                <Link to="/projects/$slug" params={{ slug: project.slug }} className="font-semibold text-primary">
                  {project.name}
                </Link>
              ) : "—"}
            />
            <KV label="Configuration" value={customer.preferred_config ?? "—"} />
            <KV label="Preferred area" value={customer.preferred_area ?? "—"} />
            <KV label="Lead source" value={customer.lead_source ?? "—"} />
            <KV
              label="Budget"
              value={
                customer.budget_min || customer.budget_max
                  ? `${formatINR(customer.budget_min ?? 0, { compact: true })} – ${formatINR(customer.budget_max ?? 0, { compact: true })}`
                  : "—"
              }
            />
            <KV
              label="Purchase probability"
              value={customer.purchase_probability != null ? `${customer.purchase_probability}%` : "—"}
            />
            <KV
              label="Expected purchase"
              value={customer.expected_purchase_date ? new Date(customer.expected_purchase_date).toLocaleDateString("en-IN") : "—"}
            />
            <KV label="Monthly income" value={customer.monthly_income ? formatINR(customer.monthly_income, { compact: true }) : "—"} />
          </dl>
        </SectionCard>
      </section>

      {/* Meetings + notes */}
      <section className="mt-5 grid gap-5 lg:grid-cols-2">
        <SectionCard title="Meetings" subtitle="Schedule visits, calls, and site tours.">
          <form onSubmit={submitMeeting} className="grid gap-2 rounded-2xl border border-border/60 bg-surface p-3">
            <div className="grid grid-cols-2 gap-2">
              <input
                required
                type="datetime-local"
                value={meetForm.scheduled_at}
                onChange={(e) => setMeetForm((f) => ({ ...f, scheduled_at: e.target.value }))}
                className="rounded-xl border border-border bg-background px-3 py-2 text-xs"
              />
              <select
                value={meetForm.meeting_type}
                onChange={(e) => setMeetForm((f) => ({ ...f, meeting_type: e.target.value as typeof meetForm.meeting_type }))}
                className="rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium"
              >
                <option value="call">Call</option>
                <option value="in_person">In person</option>
                <option value="site_visit">Site visit</option>
                <option value="virtual">Virtual</option>
                <option value="other">Other</option>
              </select>
            </div>
            <input
              placeholder="Location (optional)"
              value={meetForm.location}
              onChange={(e) => setMeetForm((f) => ({ ...f, location: e.target.value }))}
              className="rounded-xl border border-border bg-background px-3 py-2 text-xs"
            />
            <textarea
              rows={2}
              placeholder="Remarks (optional)"
              value={meetForm.remarks}
              onChange={(e) => setMeetForm((f) => ({ ...f, remarks: e.target.value }))}
              className="rounded-xl border border-border bg-background px-3 py-2 text-xs"
            />
            <button
              type="submit"
              disabled={savingMeet}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-br from-primary to-leaf text-xs font-semibold text-primary-foreground disabled:opacity-60"
            >
              <CalendarPlus size={12} /> Schedule
            </button>
          </form>

          <ul className="mt-3 flex flex-col gap-2">
            {meetings.length === 0 && (
              <li className="rounded-2xl border border-dashed border-border/60 p-3 text-center text-[11px] text-muted-foreground">
                No meetings yet.
              </li>
            )}
            {meetings.map((m) => (
              <li key={m.id} className="rounded-2xl border border-border/60 bg-surface p-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-foreground">
                    {new Date(m.scheduled_at).toLocaleString("en-IN")}
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${meetStatusTone(m.status)}`}>
                    {m.status.replace("_", " ")}
                  </span>
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  {m.meeting_type.replace("_", " ")}
                  {m.location ? ` · ${m.location}` : ""}
                </div>
                {m.remarks && <div className="mt-1 text-[11px] text-foreground">{m.remarks}</div>}
                {m.status === "scheduled" && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      onClick={() => markMeeting(m.id, "completed")}
                      className="rounded-xl bg-primary px-2.5 py-1 text-[10px] font-semibold text-primary-foreground"
                    >
                      Mark completed
                    </button>
                    <button
                      onClick={() => markMeeting(m.id, "cancelled")}
                      className="rounded-xl border border-border bg-surface px-2.5 py-1 text-[10px] font-semibold text-foreground"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => markMeeting(m.id, "missed")}
                      className="rounded-xl border border-border bg-surface px-2.5 py-1 text-[10px] font-semibold text-destructive"
                    >
                      Missed
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard title="Notes" subtitle="Share context with your team.">
          <form onSubmit={submitNote} className="grid gap-2 rounded-2xl border border-border/60 bg-surface p-3">
            <textarea
              rows={3}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Add a note — what did the customer say?"
              className="rounded-xl border border-border bg-background px-3 py-2 text-xs"
            />
            <div className="flex items-center justify-between">
              <label className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
                <Pin size={11} /> Pin to top
              </label>
              <button
                type="submit"
                disabled={savingNote || !noteText.trim()}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-br from-primary to-leaf px-3 text-xs font-semibold text-primary-foreground disabled:opacity-60"
              >
                <Send size={12} /> Save note
              </button>
            </div>
          </form>

          <ul className="mt-3 flex flex-col gap-2">
            {notes.length === 0 && (
              <li className="rounded-2xl border border-dashed border-border/60 p-3 text-center text-[11px] text-muted-foreground">
                No notes yet.
              </li>
            )}
            {notes.map((n) => (
              <li
                key={n.id}
                className={`rounded-2xl border p-3 ${
                  n.is_pinned ? "border-primary/40 bg-primary-soft/40" : "border-border/60 bg-surface"
                }`}
              >
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                  {n.is_pinned && <Pin size={10} className="text-primary" />}
                  <span>{new Date(n.created_at).toLocaleString("en-IN")}</span>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-xs text-foreground">{n.content}</p>
              </li>
            ))}
          </ul>
        </SectionCard>
      </section>

      {/* Timeline */}
      <section className="mt-5">
        <SectionCard title="Timeline" subtitle="Every event, automatically recorded.">
          {timeline.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/60 p-4 text-center text-[11px] text-muted-foreground">
              The timeline will populate as you take actions.
            </div>
          ) : (
            <ol className="relative flex flex-col gap-3 border-l border-border/50 pl-5">
              {timeline.map((e) => (
                <li key={e.id} className="relative">
                  <span className={`absolute -left-[26px] top-1.5 grid h-4 w-4 place-items-center rounded-full ring-4 ring-background ${timelineDot(e.event)}`}>
                    <span className="h-1.5 w-1.5 rounded-full bg-white" />
                  </span>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-xs font-semibold text-foreground">
                        {e.detail ?? e.event.replace(/_/g, " ")}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {new Date(e.created_at).toLocaleString("en-IN")}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </SectionCard>
      </section>

      {customer.notes && (
        <section className="mt-5">
          <SectionCard title="Original remarks">
            <p className="whitespace-pre-wrap text-xs text-foreground">{customer.notes}</p>
          </SectionCard>
        </section>
      )}
    </DashboardShell>
  );
}

function KV({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/50 bg-surface p-2.5">
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 text-xs font-medium text-foreground">{value}</dd>
    </div>
  );
}

function meetStatusTone(status: string) {
  if (status === "completed") return "bg-success/15 text-success";
  if (status === "cancelled") return "bg-destructive/10 text-destructive";
  if (status === "missed") return "bg-destructive/10 text-destructive";
  if (status === "rescheduled") return "bg-gold/15 text-gold-foreground";
  return "bg-primary-soft text-primary";
}

function timelineDot(event: string) {
  if (event.startsWith("meeting_completed")) return "bg-success";
  if (event.startsWith("meeting_cancelled") || event.startsWith("meeting_missed")) return "bg-destructive";
  if (event.startsWith("meeting_")) return "bg-gold";
  if (event === "status_changed") return "bg-primary";
  if (event === "note_added") return "bg-leaf";
  return "bg-primary";
}
