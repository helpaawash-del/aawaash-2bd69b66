import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  ShieldCheck,
  Phone,
  Mail,
  MapPin,
  Building2,
  Users,
  FileText,
  Upload,
  Trash2,
  Download,
  History,
  StickyNote,
  Calendar,
  UserCog,
  Archive,
  ArchiveRestore,
} from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { RoleGuard } from "@/components/aawash/AuthGuard";
import { AdminShell } from "@/components/aawash/admin/AdminShell";
import { formatINR, initials } from "@/components/aawash/dashboard-kit";
import { CUSTOMER_STATUS_META, priorityStyle } from "@/components/aawash/crm/status";
import {
  adminGetCustomerDetail,
  adminGetCustomerFilters,
  adminBulkReassign,
  adminCreateDocumentSignedUpload,
  adminRegisterDocument,
  adminGetDocumentUrl,
  adminDeleteDocument,
} from "@/lib/customers-admin.functions";
import { updateCustomer, addNote, scheduleMeeting, updateMeetingStatus } from "@/lib/crm.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/customers/$id")({
  component: Page,
  head: () => ({ meta: [{ title: "Customer — Aawash Admin" }] }),
});

function Page() {
  return (
    <RoleGuard allow={["super_admin"]}>
      <Content />
    </RoleGuard>
  );
}

type Tab = "overview" | "sales" | "documents" | "meetings" | "notes" | "timeline";

function Content() {
  const { id } = Route.useParams();
  const { profile } = useSession();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const detailFn = useServerFn(adminGetCustomerDetail);
  const filtersFn = useServerFn(adminGetCustomerFilters);
  const reassignFn = useServerFn(adminBulkReassign);
  const updateFn = useServerFn(updateCustomer);

  const [tab, setTab] = useState<Tab>("overview");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "customer", id],
    queryFn: () => detailFn({ data: { id } }),
  });
  const filters = useQuery({
    queryKey: ["admin", "customers", "filters"],
    queryFn: () => filtersFn(),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin", "customer", id] });

  async function toggleArchive() {
    if (!data) return;
    try {
      await updateFn({
        data: { id, is_archived: !data.customer.is_archived },
      });
      toast.success(data.customer.is_archived ? "Restored" : "Archived");
      invalidate();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  if (isLoading || !data) {
    return (
      <AdminShell profile={profile}>
        <div className="p-8 text-center text-sm text-muted-foreground">Loading customer…</div>
      </AdminShell>
    );
  }

  const c = data.customer;
  const st = CUSTOMER_STATUS_META[c.status] ?? {
    label: c.status,
    tone: "bg-muted text-muted-foreground",
  };
  const pri = priorityStyle(c.priority);

  return (
    <AdminShell profile={profile}>
      <div className="mb-4 flex items-center gap-2">
        <button
          onClick={() => navigate({ to: "/admin/customers" })}
          className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-foreground"
        >
          <ArrowLeft size={12} /> Back
        </button>
        <div className="glass-card inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium text-foreground shadow-[var(--shadow-soft)]">
          <ShieldCheck size={14} className="text-gold" />
          Admin Customer Profile
        </div>
      </div>

      {/* Hero */}
      <section className="glass-card mb-6 rounded-3xl p-6 shadow-[var(--shadow-soft)]">
        <div className="flex flex-wrap items-start gap-4">
          <div className="grid h-16 w-16 place-items-center rounded-3xl bg-gradient-to-br from-primary to-leaf text-lg font-bold text-primary-foreground">
            {initials(c.full_name)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-2xl font-extrabold text-foreground sm:text-3xl">
                {c.full_name}
              </h1>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${st.tone}`}>
                {st.label}
              </span>
              {pri && (
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${pri.className}`}>
                  {pri.label}
                </span>
              )}
              {c.is_archived && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                  archived
                </span>
              )}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              <span className="font-mono">{c.customer_code}</span>
              <span className="mx-1.5">·</span>
              Created {new Date(c.created_at).toLocaleDateString()}
            </div>
            <div className="mt-3 flex flex-wrap gap-4 text-sm text-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Phone size={14} className="text-muted-foreground" /> {c.mobile_number}
              </span>
              {c.email && (
                <span className="inline-flex items-center gap-1.5">
                  <Mail size={14} className="text-muted-foreground" /> {c.email}
                </span>
              )}
              {c.city && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin size={14} className="text-muted-foreground" /> {c.city}
                  {c.state ? `, ${c.state}` : ""}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <button
              onClick={toggleArchive}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-foreground"
            >
              {c.is_archived ? (
                <>
                  <ArchiveRestore size={12} /> Restore
                </>
              ) : (
                <>
                  <Archive size={12} /> Archive
                </>
              )}
            </button>
            <Link
              to="/crm/$id"
              params={{ id: c.id }}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
            >
              Open in CRM
            </Link>
          </div>
        </div>

        {/* Assignment strip */}
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <AssignmentPill
            label="Team"
            value={data.team ? `${data.team.letter} · ${data.team.name}` : "Unassigned"}
          />
          <AssignmentPill label="Leader" value={data.leader?.full_name ?? "Unassigned"} />
          <AssignmentPill label="Member" value={data.member?.full_name ?? "Unassigned"} />
        </div>
        <AssignmentEditor
          filters={filters.data}
          current={{
            team_id: c.team_id,
            leader_id: c.assigned_leader_id,
            member_id: c.assigned_member_id,
          }}
          onSave={async (payload) => {
            try {
              await reassignFn({
                data: {
                  customer_ids: [c.id],
                  team_id: payload.team_id ?? undefined,
                  leader_id: payload.leader_id ?? undefined,
                  member_id: payload.member_id ?? undefined,
                },
              });
              toast.success("Reassigned");
              invalidate();
            } catch (e: unknown) {
              toast.error(e instanceof Error ? e.message : "Failed");
            }
          }}
        />
      </section>

      {/* Tabs */}
      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            ["overview", "Overview"],
            ["sales", `Sales (${data.sales.length})`],
            ["documents", `Documents (${data.documents.filter((d) => d.is_current).length})`],
            ["meetings", `Meetings (${data.meetings.length})`],
            ["notes", `Notes (${data.notes.length})`],
            ["timeline", "Timeline"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold ${
              tab === key
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-surface text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "overview" && <OverviewTab data={data} />}
      {tab === "sales" && <SalesTab data={data} />}
      {tab === "documents" && <DocumentsTab customerId={c.id} documents={data.documents} onChange={invalidate} />}
      {tab === "meetings" && <MeetingsTab customerId={c.id} meetings={data.meetings} onChanged={invalidate} />}
      {tab === "notes" && <NotesTab customerId={c.id} notes={data.notes} onChanged={invalidate} />}
      {tab === "timeline" && <TimelineTab timeline={data.timeline} />}
    </AdminShell>
  );
}

function AssignmentPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-3">
      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-foreground">{value}</div>
    </div>
  );
}

function AssignmentEditor({
  filters,
  current,
  onSave,
}: {
  filters:
    | {
        teams: Array<{ id: string; letter: string; name: string }>;
        leaders: Array<{ id: string; full_name: string; team_id: string | null }>;
        members: Array<{ id: string; full_name: string; team_id: string | null }>;
      }
    | undefined;
  current: { team_id: string | null; leader_id: string | null; member_id: string | null };
  onSave: (p: {
    team_id: string | null;
    leader_id: string | null;
    member_id: string | null;
  }) => void;
}) {
  const [team, setTeam] = useState(current.team_id ?? "");
  const [leader, setLeader] = useState(current.leader_id ?? "");
  const [member, setMember] = useState(current.member_id ?? "");
  const dirty =
    team !== (current.team_id ?? "") ||
    leader !== (current.leader_id ?? "") ||
    member !== (current.member_id ?? "");

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <UserCog size={14} className="text-muted-foreground" />
      <span className="text-xs font-semibold text-muted-foreground">Reassign:</span>
      <select
        value={team}
        onChange={(e) => setTeam(e.target.value)}
        className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold outline-none focus:border-primary"
      >
        <option value="">No team</option>
        {(filters?.teams ?? []).map((t) => (
          <option key={t.id} value={t.id}>
            Team {t.letter}
          </option>
        ))}
      </select>
      <select
        value={leader}
        onChange={(e) => setLeader(e.target.value)}
        className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold outline-none focus:border-primary"
      >
        <option value="">No leader</option>
        {(filters?.leaders ?? [])
          .filter((l) => !team || l.team_id === team)
          .map((l) => (
            <option key={l.id} value={l.id}>
              {l.full_name}
            </option>
          ))}
      </select>
      <select
        value={member}
        onChange={(e) => setMember(e.target.value)}
        className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold outline-none focus:border-primary"
      >
        <option value="">No member</option>
        {(filters?.members ?? [])
          .filter((m) => !team || m.team_id === team)
          .map((m) => (
            <option key={m.id} value={m.id}>
              {m.full_name}
            </option>
          ))}
      </select>
      {dirty && (
        <button
          onClick={() =>
            onSave({
              team_id: team || null,
              leader_id: leader || null,
              member_id: member || null,
            })
          }
          className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
        >
          Save
        </button>
      )}
    </div>
  );
}

/* -------- Tabs -------- */

function OverviewTab({ data }: { data: Awaited<ReturnType<typeof adminGetCustomerDetail>> extends infer T ? T : never }) {
  const c = data.customer;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Contact">
        <Row label="Mobile" value={c.mobile_number} />
        <Row label="Alt mobile" value={c.alt_mobile_number} />
        <Row label="Email" value={c.email} />
        <Row label="Address" value={c.address} />
        <Row label="City" value={c.city} />
        <Row label="State" value={c.state} />
        <Row label="Pin" value={c.pin_code} />
      </Card>
      <Card title="Preferences & context">
        <Row label="Occupation" value={c.occupation} />
        <Row label="Company" value={c.company} />
        <Row label="Preferred project" value={data.project?.name} />
        <Row label="Preferred area" value={c.preferred_area} />
        <Row label="Preferred config" value={c.preferred_config} />
        <Row label="Lead source" value={c.lead_source} />
        <Row
          label="Budget"
          value={
            c.budget_min || c.budget_max
              ? `${formatINR(Number(c.budget_min ?? 0), { compact: true })} – ${formatINR(Number(c.budget_max ?? 0), { compact: true })}`
              : null
          }
        />
        <Row
          label="Next follow-up"
          value={c.next_followup_at ? new Date(c.next_followup_at).toLocaleString() : null}
        />
        <Row
          label="Last contact"
          value={c.last_contact_at ? new Date(c.last_contact_at).toLocaleString() : null}
        />
      </Card>
      {c.notes && (
        <Card title="Notes">
          <p className="text-sm text-foreground whitespace-pre-wrap">{c.notes}</p>
        </Card>
      )}
      {Array.isArray(c.tags) && c.tags.length > 0 && (
        <Card title="Tags">
          <div className="flex flex-wrap gap-1.5">
            {(c.tags as string[]).map((t) => (
              <span
                key={t}
                className="rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-semibold text-primary"
              >
                {t}
              </span>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass-card rounded-3xl p-5 shadow-[var(--shadow-soft)]">
      <div className="mb-3 text-sm font-bold text-foreground">{title}</div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-3 text-xs">
      <div className="text-muted-foreground">{label}</div>
      <div className="text-foreground">{value || <span className="text-muted-foreground">—</span>}</div>
    </div>
  );
}

function SalesTab({ data }: { data: Awaited<ReturnType<typeof adminGetCustomerDetail>> }) {
  if (data.sales.length === 0) {
    return (
      <div className="glass-card rounded-3xl p-10 text-center text-sm text-muted-foreground">
        <Building2 className="mx-auto mb-3 text-muted-foreground" size={24} />
        No sales linked to this customer yet.
      </div>
    );
  }
  return (
    <div className="glass-card divide-y divide-border overflow-hidden rounded-3xl shadow-[var(--shadow-soft)]">
      {data.sales.map((s) => (
        <Link
          key={s.id}
          to="/sales-workflow/$id"
          params={{ id: s.id }}
          className="grid grid-cols-[1fr_auto] items-center gap-4 p-4 hover:bg-surface"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="font-mono text-sm font-bold text-foreground">
                {s.sale_number ?? s.id.slice(0, 8)}
              </div>
              <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-semibold text-primary">
                {s.sale_status}
              </span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                {s.approval_status}
              </span>
            </div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">
              {s.unit_label ?? "—"} · {new Date(s.sale_date).toLocaleDateString()} · Payment {s.payment_status}
            </div>
          </div>
          <div className="text-right text-sm font-bold text-foreground">
            {formatINR(Number(s.deal_value), { compact: true })}
          </div>
        </Link>
      ))}
    </div>
  );
}

function DocumentsTab({
  customerId,
  documents,
  onChange,
}: {
  customerId: string;
  documents: Awaited<ReturnType<typeof adminGetCustomerDetail>>["documents"];
  onChange: () => void;
}) {
  const [showHistory, setShowHistory] = useState(false);
  const signedFn = useServerFn(adminCreateDocumentSignedUpload);
  const registerFn = useServerFn(adminRegisterDocument);
  const urlFn = useServerFn(adminGetDocumentUrl);
  const deleteFn = useServerFn(adminDeleteDocument);

  const visible = showHistory ? documents : documents.filter((d) => d.is_current);

  async function upload(file: File, docType: string, label: string) {
    try {
      const signed = await signedFn({
        data: { customer_id: customerId, filename: file.name },
      });
      const { error: upErr } = await supabase.storage
        .from("customer-documents")
        .uploadToSignedUrl(signed.path, signed.token, file);
      if (upErr) throw upErr;
      await registerFn({
        data: {
          customer_id: customerId,
          doc_type: docType,
          label,
          storage_path: signed.path,
          mime_type: file.type,
          size_bytes: file.size,
        },
      });
      toast.success("Document uploaded");
      onChange();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    }
  }

  async function open(storage_path: string) {
    try {
      const { url } = await urlFn({ data: { storage_path } });
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Preview failed");
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this document permanently?")) return;
    try {
      await deleteFn({ data: { id } });
      toast.success("Document deleted");
      onChange();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  }

  return (
    <div className="space-y-4">
      <UploadCard onUpload={upload} />

      <div className="glass-card overflow-hidden rounded-3xl shadow-[var(--shadow-soft)]">
        <div className="flex items-center justify-between border-b border-border px-4 py-2 text-xs">
          <div className="font-semibold text-foreground">
            {visible.length} document{visible.length === 1 ? "" : "s"}
          </div>
          <button
            onClick={() => setShowHistory((v) => !v)}
            className="inline-flex items-center gap-1 text-muted-foreground"
          >
            <History size={12} /> {showHistory ? "Current only" : "Show history"}
          </button>
        </div>
        {visible.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            <FileText className="mx-auto mb-3" size={22} />
            No documents on file
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {visible.map((d) => (
              <li key={d.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 p-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary">
                  <FileText size={16} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="truncate text-sm font-bold text-foreground">
                      {d.label || d.doc_type}
                    </div>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
                      {d.doc_type}
                    </span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                      v{d.version}
                    </span>
                    {!d.is_current && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                        superseded
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                    {d.mime_type || "unknown type"} ·{" "}
                    {d.size_bytes ? `${Math.round(d.size_bytes / 1024)} KB` : "—"} ·{" "}
                    {new Date(d.created_at).toLocaleString()}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => open(d.storage_path)}
                    className="rounded-full border border-border bg-surface p-1.5 text-foreground"
                    title="Open"
                  >
                    <Download size={14} />
                  </button>
                  <button
                    onClick={() => remove(d.id)}
                    className="rounded-full border border-border bg-surface p-1.5 text-destructive"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function UploadCard({
  onUpload,
}: {
  onUpload: (file: File, docType: string, label: string) => Promise<void>;
}) {
  const [docType, setDocType] = useState("kyc");
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <div className="glass-card rounded-3xl p-4 shadow-[var(--shadow-soft)]">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={docType}
          onChange={(e) => setDocType(e.target.value)}
          className="rounded-2xl border border-border bg-surface px-3 py-2 text-sm font-semibold outline-none focus:border-primary"
        >
          <option value="kyc">KYC</option>
          <option value="pan">PAN</option>
          <option value="aadhaar">Aadhaar</option>
          <option value="agreement">Agreement</option>
          <option value="booking_form">Booking form</option>
          <option value="payment_proof">Payment proof</option>
          <option value="other">Other</option>
        </select>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Optional label"
          className="flex-1 min-w-[160px] rounded-2xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <label
          className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground ${
            busy ? "opacity-50" : ""
          }`}
        >
          <Upload size={12} />
          {busy ? "Uploading…" : "Upload"}
          <input
            type="file"
            className="hidden"
            disabled={busy}
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              setBusy(true);
              await onUpload(f, docType, label);
              setBusy(false);
              setLabel("");
              e.target.value = "";
            }}
          />
        </label>
      </div>
    </div>
  );
}

function MeetingsTab({
  customerId,
  meetings,
  onChanged,
}: {
  customerId: string;
  meetings: Awaited<ReturnType<typeof adminGetCustomerDetail>>["meetings"];
  onChanged: () => void;
}) {
  const schedule = useServerFn(scheduleMeeting);
  const setStatus = useServerFn(updateMeetingStatus);
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"site_visit" | "call" | "in_person" | "virtual" | "other">("site_visit");
  const [when, setWhen] = useState("");
  const [location, setLocation] = useState("");
  const [remarks, setRemarks] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!when) return toast.error("Pick a date & time");
    setBusy(true);
    try {
      await schedule({
        data: {
          customer_id: customerId,
          scheduled_at: new Date(when).toISOString(),
          meeting_type: type,
          location: location || undefined,
          remarks: remarks || undefined,
        },
      });
      toast.success("Meeting scheduled");
      setOpen(false); setWhen(""); setLocation(""); setRemarks("");
      onChanged();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setBusy(false); }
  }

  async function transition(id: string, status: "completed" | "cancelled" | "missed") {
    try {
      await setStatus({ data: { id, status } });
      toast.success(`Marked ${status}`);
      onChanged();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
        >
          <Calendar size={12} /> {open ? "Close" : "Schedule meeting"}
        </button>
      </div>
      {open && (
        <div className="glass-card space-y-2 rounded-2xl p-4 shadow-[var(--shadow-soft)]">
          <div className="grid gap-2 sm:grid-cols-2">
            <select value={type} onChange={(e) => setType(e.target.value as typeof type)}
              className="rounded-xl border border-border bg-surface px-3 py-2 text-sm">
              <option value="site_visit">Site visit</option>
              <option value="call">Call</option>
              <option value="in_person">In person</option>
              <option value="virtual">Virtual</option>
              <option value="other">Other</option>
            </select>
            <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)}
              className="rounded-xl border border-border bg-surface px-3 py-2 text-sm" />
          </div>
          <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location (optional)"
            className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm" />
          <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Remarks"
            rows={3} className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm" />
          <div className="flex justify-end">
            <button onClick={save} disabled={busy}
              className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-60">
              {busy ? "Saving…" : "Save meeting"}
            </button>
          </div>
        </div>
      )}
      {meetings.length === 0 ? (
        <div className="glass-card rounded-3xl p-10 text-center text-sm text-muted-foreground">
          <Calendar className="mx-auto mb-3" size={22} /> No meetings scheduled
        </div>
      ) : (
        <div className="glass-card divide-y divide-border overflow-hidden rounded-3xl shadow-[var(--shadow-soft)]">
          {meetings.map((m) => (
            <div key={m.id} className="p-4">
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-sm font-bold text-foreground capitalize">
                  {m.meeting_type.replace("_", " ")}
                </div>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                  {m.status}
                </span>
                {m.status === "scheduled" && (
                  <div className="ml-auto flex gap-1">
                    <button onClick={() => transition(m.id, "completed")}
                      className="rounded-full bg-primary-soft px-2 py-1 text-[10px] font-semibold text-primary">
                      Complete
                    </button>
                    <button onClick={() => transition(m.id, "cancelled")}
                      className="rounded-full border border-border bg-surface px-2 py-1 text-[10px] font-semibold text-foreground">
                      Cancel
                    </button>
                    <button onClick={() => transition(m.id, "missed")}
                      className="rounded-full border border-border bg-surface px-2 py-1 text-[10px] font-semibold text-foreground">
                      Missed
                    </button>
                  </div>
                )}
              </div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">
                {new Date(m.scheduled_at).toLocaleString()}
                {m.location ? ` · ${m.location}` : ""}
              </div>
              {m.remarks && <div className="mt-2 text-xs text-foreground">{m.remarks}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NotesTab({
  customerId,
  notes,
  onChanged,
}: {
  customerId: string;
  notes: Awaited<ReturnType<typeof adminGetCustomerDetail>>["notes"];
  onChanged: () => void;
}) {
  const addFn = useServerFn(addNote);
  const [content, setContent] = useState("");
  const [pin, setPin] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit() {
    const text = content.trim();
    if (text.length < 1) return;
    setBusy(true);
    try {
      await addFn({ data: { customer_id: customerId, content: text, is_pinned: pin } });
      toast.success("Note added");
      setContent(""); setPin(false);
      onChanged();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-3">
      <div className="glass-card space-y-2 rounded-2xl p-4 shadow-[var(--shadow-soft)]">
        <textarea value={content} onChange={(e) => setContent(e.target.value)}
          placeholder="Add a note about this customer…" rows={3} maxLength={2000}
          className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary" />
        <div className="flex items-center justify-between">
          <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <input type="checkbox" checked={pin} onChange={(e) => setPin(e.target.checked)} /> Pin note
          </label>
          <button onClick={submit} disabled={busy || content.trim().length === 0}
            className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-60">
            {busy ? "Saving…" : "Add note"}
          </button>
        </div>
      </div>
      {notes.length === 0 ? (
        <div className="glass-card rounded-3xl p-10 text-center text-sm text-muted-foreground">
          <StickyNote className="mx-auto mb-3" size={22} /> No notes yet
        </div>
      ) : (
        <div className="space-y-2">
          {notes.map((n) => (
            <div key={n.id} className="glass-card rounded-2xl p-4 shadow-[var(--shadow-soft)]">
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                {n.is_pinned && (
                  <span className="rounded-full bg-gold/20 px-2 py-0.5 font-semibold text-gold-foreground">
                    pinned
                  </span>
                )}
                <span>{new Date(n.created_at).toLocaleString()}</span>
              </div>
              <div className="mt-1 whitespace-pre-wrap text-sm text-foreground">{n.content}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TimelineTab({
  timeline,
}: {
  timeline: Awaited<ReturnType<typeof adminGetCustomerDetail>>["timeline"];
}) {
  if (timeline.length === 0) {
    return (
      <div className="glass-card rounded-3xl p-10 text-center text-sm text-muted-foreground">
        <Users className="mx-auto mb-3" size={22} /> No timeline events yet
      </div>
    );
  }
  return (
    <div className="glass-card overflow-hidden rounded-3xl shadow-[var(--shadow-soft)]">
      <ul className="divide-y divide-border">
        {timeline.map((t) => (
          <li key={t.id} className="p-3">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-semibold text-primary">
                {t.event}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {new Date(t.created_at).toLocaleString()}
              </span>
            </div>
            {t.detail && (
              <div className="mt-1 text-xs text-foreground">{t.detail}</div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
