import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ClipboardList,
  Search,
  ShieldCheck,
  ArrowRight,
  Users,
  Filter,
  UserCog,
  GitMerge,
  Tag as TagIcon,
  Plus,
  Trash2,
  X,
  Download,
} from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { RoleGuard } from "@/components/aawash/AuthGuard";
import { AdminShell } from "@/components/aawash/admin/AdminShell";
import { initials } from "@/components/aawash/dashboard-kit";
import { CUSTOMER_STATUS_META, priorityStyle } from "@/components/aawash/crm/status";
import {
  adminListCustomers,
  adminGetCustomerFilters,
  adminBulkReassign,
  adminMergeCustomers,
  adminListTags,
  adminUpsertTag,
  adminDeleteTag,
} from "@/lib/customers-admin.functions";
import { useRealtimeInvalidate } from "@/hooks/useRealtimeInvalidate";

export const Route = createFileRoute("/_authenticated/admin/customers")({
  component: Page,
  head: () => ({ meta: [{ title: "Customers CRM — Aawash Admin" }] }),
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
  const listFn = useServerFn(adminListCustomers);
  const filtersFn = useServerFn(adminGetCustomerFilters);
  const bulkFn = useServerFn(adminBulkReassign);
  const mergeFn = useServerFn(adminMergeCustomers);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [teamId, setTeamId] = useState<string>("all");
  const [leaderId, setLeaderId] = useState<string>("all");
  const [memberId, setMemberId] = useState<string>("all");
  const [source, setSource] = useState<string>("all");
  const [archived, setArchived] = useState<"active" | "archived" | "all">("active");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showAssign, setShowAssign] = useState(false);
  const [showMerge, setShowMerge] = useState(false);
  const [showTags, setShowTags] = useState(false);

  const filters = useQuery({
    queryKey: ["admin", "customers", "filters"],
    queryFn: () => filtersFn(),
  });

  const list = useQuery({
    queryKey: ["admin", "customers", { status, teamId, leaderId, memberId, source, archived }],
    queryFn: () =>
      listFn({
        data: {
          status: status === "all" ? undefined : status,
          team_id: teamId === "all" ? null : teamId,
          leader_id: leaderId === "all" ? null : leaderId,
          member_id: memberId === "all" ? null : memberId,
          source: source === "all" ? undefined : source,
          archived,
        },
      }),
  });

  const filtered = useMemo(() => {
    const rows = list.data ?? [];
    if (!q.trim()) return rows;
    const t = q.trim().toLowerCase();
    return rows.filter(
      (r) =>
        r.full_name?.toLowerCase().includes(t) ||
        r.mobile_number?.toLowerCase().includes(t) ||
        r.email?.toLowerCase().includes(t) ||
        r.customer_code?.toLowerCase().includes(t) ||
        r.city?.toLowerCase().includes(t),
    );
  }, [list.data, q]);

  const sources = useMemo(() => {
    const s = new Set<string>();
    (list.data ?? []).forEach((r) => r.lead_source && s.add(r.lead_source));
    return Array.from(s).sort();
  }, [list.data]);

  function toggle(id: string) {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function toggleAll() {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((r) => r.id)));
  }

  async function handleBulkAssign(payload: {
    team_id?: string | null;
    leader_id?: string | null;
    member_id?: string | null;
  }) {
    try {
      await bulkFn({
        data: {
          customer_ids: Array.from(selected),
          ...payload,
        },
      });
      toast.success(`Reassigned ${selected.size} customer(s)`);
      setSelected(new Set());
      setShowAssign(false);
      qc.invalidateQueries({ queryKey: ["admin", "customers"] });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Reassignment failed");
    }
  }

  async function handleMerge(target: string, source: string) {
    try {
      await mergeFn({ data: { target_id: target, source_id: source } });
      toast.success("Customers merged");
      setSelected(new Set());
      setShowMerge(false);
      qc.invalidateQueries({ queryKey: ["admin", "customers"] });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Merge failed");
    }
  }

  function exportCsv(rows: typeof filtered) {
    if (rows.length === 0) return;
    const headers = [
      "code","name","mobile","email","city","state","status","priority",
      "lead_source","budget_min","budget_max","next_followup_at","last_contact_at",
      "team","leader","member","tags","created_at","archived",
    ];
    const esc = (v: unknown) => {
      const s = v == null ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const body = rows.map((r) => [
      r.customer_code, r.full_name, r.mobile_number, r.email ?? "", r.city ?? "",
      r.state ?? "", r.status, r.priority ?? "", r.lead_source ?? "",
      r.budget_min ?? "", r.budget_max ?? "",
      r.next_followup_at ?? "", r.last_contact_at ?? "",
      r.team_letter ? `${r.team_letter} · ${r.team_name ?? ""}` : "",
      r.leader_name ?? "", r.member_name ?? "",
      Array.isArray((r as { tags?: unknown }).tags) ? ((r as { tags: string[] }).tags).join(" | ") : "",
      r.created_at, r.is_archived ? "yes" : "no",
    ].map(esc).join(","));
    const csv = [headers.join(","), ...body].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `customers-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AdminShell profile={profile}>
      <section className="mb-8">
        <div className="glass-card inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium text-foreground shadow-[var(--shadow-soft)]">
          <ShieldCheck size={14} className="text-gold" />
          Customer CRM Console
        </div>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Customers
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Global directory of every lead, prospect and customer across all teams.
              Reassign, merge duplicates, and audit interactions from one place.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportCsv(filtered)}
              disabled={filtered.length === 0}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-foreground disabled:opacity-50"
            >
              <Download size={14} /> Export CSV ({filtered.length})
            </button>
            <button
              onClick={() => setShowTags(true)}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-foreground"
            >
              <TagIcon size={14} /> Tag catalog
            </button>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="glass-card mb-4 rounded-3xl p-4 shadow-[var(--shadow-soft)]">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, mobile, code, email, city…"
              className="w-full rounded-2xl border border-border bg-surface py-2.5 pl-9 pr-3 text-sm text-foreground outline-none focus:border-primary"
            />
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-2xl border border-border bg-surface px-3 py-2.5 text-sm font-semibold text-foreground outline-none focus:border-primary"
          >
            <option value="all">All statuses</option>
            {Object.entries(CUSTOMER_STATUS_META).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
          <select
            value={teamId}
            onChange={(e) => {
              setTeamId(e.target.value);
              setLeaderId("all");
              setMemberId("all");
            }}
            className="rounded-2xl border border-border bg-surface px-3 py-2.5 text-sm font-semibold text-foreground outline-none focus:border-primary"
          >
            <option value="all">All teams</option>
            {(filters.data?.teams ?? []).map((t) => (
              <option key={t.id} value={t.id}>
                Team {t.letter} · {t.name}
              </option>
            ))}
          </select>
          <select
            value={leaderId}
            onChange={(e) => setLeaderId(e.target.value)}
            className="rounded-2xl border border-border bg-surface px-3 py-2.5 text-sm font-semibold text-foreground outline-none focus:border-primary"
          >
            <option value="all">All leaders</option>
            {(filters.data?.leaders ?? [])
              .filter((l) => teamId === "all" || l.team_id === teamId)
              .map((l) => (
                <option key={l.id} value={l.id}>
                  {l.full_name}
                </option>
              ))}
          </select>
          <select
            value={memberId}
            onChange={(e) => setMemberId(e.target.value)}
            className="rounded-2xl border border-border bg-surface px-3 py-2.5 text-sm font-semibold text-foreground outline-none focus:border-primary"
          >
            <option value="all">All members</option>
            {(filters.data?.members ?? [])
              .filter((m) => teamId === "all" || m.team_id === teamId)
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name}
                </option>
              ))}
          </select>
          {sources.length > 0 && (
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="rounded-2xl border border-border bg-surface px-3 py-2.5 text-sm font-semibold text-foreground outline-none focus:border-primary"
            >
              <option value="all">All sources</option>
              {sources.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          )}
          <div className="inline-flex overflow-hidden rounded-full border border-border">
            {(["active", "archived", "all"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setArchived(s)}
                className={`px-3 py-1.5 text-xs font-semibold capitalize ${
                  archived === s ? "bg-primary text-primary-foreground" : "text-foreground"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {selected.size > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl bg-primary-soft px-3 py-2">
            <div className="text-xs font-bold text-primary">
              {selected.size} selected
            </div>
            <button
              onClick={() => setShowAssign(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
            >
              <UserCog size={12} /> Reassign
            </button>
            {selected.size === 2 && (
              <button
                onClick={() => setShowMerge(true)}
                className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-3 py-1.5 text-xs font-semibold text-background"
              >
                <GitMerge size={12} /> Merge
              </button>
            )}
            <button
              onClick={() => setSelected(new Set())}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-foreground"
            >
              <X size={12} /> Clear
            </button>
          </div>
        )}
      </section>

      {/* Table */}
      <section className="glass-card overflow-hidden rounded-3xl shadow-[var(--shadow-soft)]">
        {list.isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading customers…</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary-soft text-primary">
              <Users size={22} />
            </div>
            <div className="mt-3 text-sm font-semibold text-foreground">
              No customers match your filters
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Try clearing filters or widening the search.
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-border px-4 py-2 text-[11px] uppercase tracking-wider text-muted-foreground">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selected.size === filtered.length && filtered.length > 0}
                  onChange={toggleAll}
                />
                Select all ({filtered.length})
              </label>
              <span className="inline-flex items-center gap-1">
                <Filter size={11} /> {filtered.length} records
              </span>
            </div>
            <div className="divide-y divide-border">
              {filtered.map((c) => {
                const st =
                  CUSTOMER_STATUS_META[c.status] ?? {
                    label: c.status,
                    tone: "bg-muted text-muted-foreground",
                  };
                const pri = priorityStyle(c.priority);
                const isSel = selected.has(c.id);
                return (
                  <div
                    key={c.id}
                    className={`grid grid-cols-[auto_auto_1fr_auto] items-center gap-4 p-4 transition-colors hover:bg-surface ${
                      isSel ? "bg-primary-soft/40" : ""
                    }`}
                  >
                    <input type="checkbox" checked={isSel} onChange={() => toggle(c.id)} />
                    <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-primary to-leaf text-xs font-bold text-primary-foreground">
                      {initials(c.full_name)}
                    </div>
                    <Link
                      to="/admin/customers/$id"
                      params={{ id: c.id }}
                      className="min-w-0"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="truncate text-sm font-bold text-foreground">
                          {c.full_name}
                        </div>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${st.tone}`}>
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
                      <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                        <span className="font-mono">{c.customer_code}</span>
                        <span className="mx-1.5">·</span>
                        {c.mobile_number}
                        {c.email && (
                          <>
                            <span className="mx-1.5">·</span>
                            {c.email}
                          </>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                        <span>Team {c.team_letter ?? "—"}</span>
                        <span>Leader {c.leader_name ?? "—"}</span>
                        <span>Member {c.member_name ?? "—"}</span>
                        {c.city && <span>{c.city}</span>}
                        {c.lead_source && <span>via {c.lead_source}</span>}
                      </div>
                    </Link>
                    <Link
                      to="/admin/customers/$id"
                      params={{ id: c.id }}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary"
                    >
                      Open <ArrowRight size={12} />
                    </Link>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>

      {/* Assign dialog */}
      {showAssign && (
        <AssignDialog
          filters={filters.data}
          onClose={() => setShowAssign(false)}
          onSubmit={handleBulkAssign}
        />
      )}

      {/* Merge dialog */}
      {showMerge && selected.size === 2 && (
        <MergeDialog
          rows={filtered.filter((r) => selected.has(r.id))}
          onClose={() => setShowMerge(false)}
          onSubmit={handleMerge}
        />
      )}

      {/* Tag catalog */}
      {showTags && <TagCatalogDialog onClose={() => setShowTags(false)} />}
    </AdminShell>
  );
}

/* ---------- Dialogs ---------- */

function AssignDialog({
  filters,
  onClose,
  onSubmit,
}: {
  filters:
    | {
        teams: Array<{ id: string; letter: string; name: string }>;
        leaders: Array<{ id: string; full_name: string; team_id: string | null }>;
        members: Array<{ id: string; full_name: string; team_id: string | null }>;
      }
    | undefined;
  onClose: () => void;
  onSubmit: (p: {
    team_id?: string | null;
    leader_id?: string | null;
    member_id?: string | null;
  }) => void;
}) {
  const [teamId, setTeamId] = useState("");
  const [leaderId, setLeaderId] = useState("");
  const [memberId, setMemberId] = useState("");

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="glass-card w-full max-w-md rounded-3xl p-6 shadow-[var(--shadow-float)]">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-lg font-extrabold text-foreground">Reassign customers</div>
          <button onClick={onClose} className="text-muted-foreground">
            <X size={18} />
          </button>
        </div>
        <p className="mb-4 text-xs text-muted-foreground">
          Pick a target team, leader, or member. Leave blank to keep unchanged. Choosing a team also
          clears leader/member if they don't belong to it (handled server-side).
        </p>
        <div className="space-y-3">
          <select
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
            className="w-full rounded-2xl border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-primary"
          >
            <option value="">Keep team</option>
            {(filters?.teams ?? []).map((t) => (
              <option key={t.id} value={t.id}>
                Team {t.letter} · {t.name}
              </option>
            ))}
          </select>
          <select
            value={leaderId}
            onChange={(e) => setLeaderId(e.target.value)}
            className="w-full rounded-2xl border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-primary"
          >
            <option value="">Keep leader</option>
            {(filters?.leaders ?? [])
              .filter((l) => !teamId || l.team_id === teamId)
              .map((l) => (
                <option key={l.id} value={l.id}>
                  {l.full_name}
                </option>
              ))}
          </select>
          <select
            value={memberId}
            onChange={(e) => setMemberId(e.target.value)}
            className="w-full rounded-2xl border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-primary"
          >
            <option value="">Keep member</option>
            {(filters?.members ?? [])
              .filter((m) => !teamId || m.team_id === teamId)
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name}
                </option>
              ))}
          </select>
        </div>
        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground"
          >
            Cancel
          </button>
          <button
            onClick={() =>
              onSubmit({
                team_id: teamId || undefined,
                leader_id: leaderId || undefined,
                member_id: memberId || undefined,
              })
            }
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

function MergeDialog({
  rows,
  onClose,
  onSubmit,
}: {
  rows: Array<{ id: string; full_name: string; customer_code: string; mobile_number: string }>;
  onClose: () => void;
  onSubmit: (target: string, source: string) => void;
}) {
  const [target, setTarget] = useState(rows[0].id);
  const source = rows.find((r) => r.id !== target)?.id ?? rows[1].id;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="glass-card w-full max-w-md rounded-3xl p-6 shadow-[var(--shadow-float)]">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-lg font-extrabold text-foreground">Merge duplicates</div>
          <button onClick={onClose} className="text-muted-foreground">
            <X size={18} />
          </button>
        </div>
        <p className="mb-4 text-xs text-muted-foreground">
          Pick the record that <b>wins</b>. Notes, meetings, timeline, documents, sales and
          follow-ups from the other record will be moved into the winner. The losing record is
          archived.
        </p>
        <div className="space-y-2">
          {rows.map((r) => (
            <label
              key={r.id}
              className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-3 ${
                target === r.id ? "border-primary bg-primary-soft" : "border-border bg-surface"
              }`}
            >
              <input
                type="radio"
                name="mergeTarget"
                value={r.id}
                checked={target === r.id}
                onChange={() => setTarget(r.id)}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold text-foreground">{r.full_name}</div>
                <div className="truncate text-[11px] text-muted-foreground">
                  {r.customer_code} · {r.mobile_number}
                </div>
              </div>
              {target === r.id && (
                <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                  KEEP
                </span>
              )}
            </label>
          ))}
        </div>
        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground"
          >
            Cancel
          </button>
          <button
            onClick={() => onSubmit(target, source)}
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            Merge
          </button>
        </div>
      </div>
    </div>
  );
}

function TagCatalogDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const listFn = useServerFn(adminListTags);
  const upsertFn = useServerFn(adminUpsertTag);
  const deleteFn = useServerFn(adminDeleteTag);

  const tags = useQuery({ queryKey: ["admin", "customer-tags"], queryFn: () => listFn() });
  const [label, setLabel] = useState("");
  const [color, setColor] = useState("");

  async function addTag() {
    if (!label.trim()) return;
    try {
      await upsertFn({ data: { label, color, is_active: true } });
      setLabel("");
      setColor("");
      qc.invalidateQueries({ queryKey: ["admin", "customer-tags"] });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this tag?")) return;
    try {
      await deleteFn({ data: { id } });
      qc.invalidateQueries({ queryKey: ["admin", "customer-tags"] });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="glass-card w-full max-w-md rounded-3xl p-6 shadow-[var(--shadow-float)]">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-lg font-extrabold text-foreground">Tag catalog</div>
          <button onClick={onClose} className="text-muted-foreground">
            <X size={18} />
          </button>
        </div>
        <div className="mb-4 flex items-center gap-2">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Tag label"
            className="flex-1 rounded-2xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <input
            value={color}
            onChange={(e) => setColor(e.target.value)}
            placeholder="#hex"
            className="w-24 rounded-2xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <button
            onClick={addTag}
            className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
          >
            <Plus size={12} /> Add
          </button>
        </div>
        <div className="max-h-72 overflow-auto rounded-2xl border border-border">
          {(tags.data ?? []).length === 0 ? (
            <div className="p-4 text-center text-xs text-muted-foreground">No tags yet</div>
          ) : (
            <ul className="divide-y divide-border">
              {(tags.data ?? []).map((t) => (
                <li key={t.id} className="flex items-center justify-between px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ background: t.color ?? "var(--primary)" }}
                    />
                    <span className="text-sm font-semibold text-foreground">{t.label}</span>
                    {!t.is_active && (
                      <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        inactive
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => remove(t.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
