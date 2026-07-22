import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Save,
  Building2,
  Layers,
  Home,
  Plus,
  Trash2,
  Pencil,
  Image as ImageIcon,
  FileText,
  Grid3x3,
  ExternalLink,
} from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { RoleGuard } from "@/components/aawash/AuthGuard";
import { AdminShell } from "@/components/aawash/admin/AdminShell";
import {
  adminGetProject,
  adminUpsertProject,
  adminListBuildings,
  adminUpsertBuilding,
  adminDeleteBuilding,
  adminUpsertFloor,
  adminDeleteFloor,
  adminUpsertFlatFull,
  adminDeleteFlat,
  adminBulkCreateFlats,
} from "@/lib/project-admin.functions";
import { getProjectInventory } from "@/lib/inventory.functions";
import { formatINR } from "@/components/aawash/dashboard-kit";

export const Route = createFileRoute("/_authenticated/admin/projects/$id")({
  component: EditProjectPage,
  head: () => ({ meta: [{ title: "Manage Project — Aawash Admin" }] }),
});

function EditProjectPage() {
  return (
    <RoleGuard allow={["super_admin"]}>
      <EditProjectContent />
    </RoleGuard>
  );
}

type Tab = "overview" | "buildings" | "inventory" | "media" | "content";

function EditProjectContent() {
  const { profile } = useSession();
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const getFn = useServerFn(adminGetProject);
  const { data: project, isLoading } = useQuery({
    queryKey: ["admin", "project", id],
    queryFn: () => getFn({ data: { id } }),
  });

  const [tab, setTab] = useState<Tab>("overview");

  if (isLoading) {
    return (
      <AdminShell profile={profile}>
        <div className="h-48 animate-pulse rounded-4xl bg-muted/40" />
      </AdminShell>
    );
  }
  if (!project) {
    return (
      <AdminShell profile={profile}>
        <div className="glass-card grid place-items-center rounded-4xl px-8 py-20 text-center">
          <h3 className="text-lg font-bold text-foreground">Project not found</h3>
          <Link to="/admin/projects" className="mt-4 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
            Back to Projects
          </Link>
        </div>
      </AdminShell>
    );
  }

  const tabs: Array<{ id: Tab; label: string; icon: React.ElementType }> = [
    { id: "overview", label: "Overview", icon: FileText },
    { id: "buildings", label: "Structure", icon: Building2 },
    { id: "inventory", label: "Inventory", icon: Grid3x3 },
    { id: "media", label: "Media", icon: ImageIcon },
    { id: "content", label: "Content & SEO", icon: FileText },
  ];

  return (
    <AdminShell profile={profile}>
      <button
        onClick={() => navigate({ to: "/admin/projects" })}
        className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft size={14} /> Back to Projects
      </button>

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="truncate text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            {project.name}
          </h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
              {project.slug}
            </span>
            <span>·</span>
            <span>{project.location}</span>
          </p>
        </div>
        <Link
          to="/projects/$slug"
          params={{ slug: project.slug }}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-foreground"
        >
          <ExternalLink size={14} /> View public page
        </Link>
      </div>

      <div className="glass-card mb-6 inline-flex flex-wrap gap-1 rounded-2xl p-1 shadow-[var(--shadow-soft)]">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
              tab === t.id
                ? "bg-primary text-primary-foreground shadow-[var(--shadow-glow)]"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && <OverviewTab project={project} onSaved={() => qc.invalidateQueries({ queryKey: ["admin", "project", id] })} />}
      {tab === "buildings" && <BuildingsTab projectId={id} />}
      {tab === "inventory" && <InventoryTab projectId={id} slug={project.slug} />}
      {tab === "media" && <MediaTab project={project} onSaved={() => qc.invalidateQueries({ queryKey: ["admin", "project", id] })} />}
      {tab === "content" && <ContentTab project={project} onSaved={() => qc.invalidateQueries({ queryKey: ["admin", "project", id] })} />}
    </AdminShell>
  );
}

/* ==================== OVERVIEW ==================== */

function OverviewTab({ project, onSaved }: { project: Record<string, unknown>; onSaved: () => void }) {
  const upsert = useServerFn(adminUpsertProject);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const p = project as Record<string, string | number | null>;

  // Live inventory counters
  const [total, setTotal] = useState<number>(Number(p.total_flats ?? 0));
  const [available, setAvailable] = useState<number>(Number(p.available_flats ?? 0));
  const [reserved, setReserved] = useState<number>(Number(p.reserved_flats ?? 0));
  const [sold, setSold] = useState<number>(Number(p.sold_flats ?? 0));

  const allocated = available + reserved + sold;
  const remaining = total - allocated;
  const counterError =
    total < 0 || available < 0 || reserved < 0 || sold < 0
      ? "Values cannot be negative"
      : allocated > total
      ? `Available + reserved + sold (${allocated}) exceeds total flats (${total})`
      : null;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setOk(false);
    if (counterError) {
      setError(counterError);
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData(e.currentTarget);
      const raw = Object.fromEntries(fd.entries());
      await upsert({ data: { ...raw, id: project.id } as never });
      setOk(true);
      onSaved();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Section title="Identity">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Project Name" name="name" required defaultValue={p.name as string} />
          <Field label="Slug" name="slug" required pattern="[a-z0-9-]+" defaultValue={p.slug as string} />
          <Field label="Location" name="location" required defaultValue={p.location as string} />
          <Field label="Address" name="address" defaultValue={(p.address as string) ?? ""} />
          <Field label="Tag" name="tag" defaultValue={(p.tag as string) ?? ""} />
          <SelectField label="Visibility" name="visibility" defaultValue={(p.visibility as string) ?? "public"} options={[
            { value: "public", label: "Public" },
            { value: "internal", label: "Internal" },
            { value: "draft", label: "Draft" },
            { value: "archived", label: "Archived" },
          ]} />
        </div>
      </Section>

      <Section title="Type & Status">
        <div className="grid gap-4 md:grid-cols-2">
          <SelectField label="Project Type" name="project_type" defaultValue={(p.project_type as string) ?? "flat_inventory"} options={[
            { value: "flat_inventory", label: "Flat Inventory" },
            { value: "plot", label: "Plot" },
            { value: "villa", label: "Villa" },
            { value: "commercial", label: "Commercial" },
          ]} />
          <SelectField label="Construction Status" name="construction_status" defaultValue={(p.construction_status as string) ?? "planning"} options={[
            { value: "planning", label: "Planning" },
            { value: "under_construction", label: "Under Construction" },
            { value: "nearing_completion", label: "Nearing Completion" },
            { value: "ready_to_move", label: "Ready to Move" },
            { value: "completed", label: "Completed" },
            { value: "sold_out", label: "Sold Out" },
          ]} />
          <Field label="Launch Date" name="launch_date" type="date" defaultValue={(p.launch_date as string)?.slice(0, 10) ?? ""} />
          <Field label="Possession Date" name="possession_date" type="date" defaultValue={(p.possession_date as string)?.slice(0, 10) ?? ""} />
          <Field label="Completion %" name="completion_percent" type="number" min={0} max={100} defaultValue={(p.completion_percent as number) ?? 0} />
          <Field label="Display Priority" name="display_priority" type="number" min={0} max={1000} defaultValue={(p.display_priority as number) ?? 0} />
        </div>
      </Section>

      <Section title="Inventory Counters (live)">
        <div className="grid gap-4 md:grid-cols-4">
          <NumberBox label="Total Flats" name="total_flats" value={total} onChange={setTotal} min={0} />
          <NumberBox label="Available" name="available_flats" value={available} onChange={setAvailable} min={0} max={total} tone="emerald" />
          <NumberBox label="Reserved" name="reserved_flats" value={reserved} onChange={setReserved} min={0} max={total} tone="amber" />
          <NumberBox label="Sold" name="sold_flats" value={sold} onChange={setSold} min={0} max={total} tone="rose" />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
          <span className="rounded-full bg-muted px-3 py-1 font-semibold text-muted-foreground">
            Allocated: <span className="text-foreground">{allocated}</span> / {total}
          </span>
          <span
            className={`rounded-full px-3 py-1 font-semibold ${
              remaining < 0
                ? "bg-rose-500/15 text-rose-700"
                : remaining === 0
                ? "bg-emerald-500/15 text-emerald-700"
                : "bg-primary-soft text-primary"
            }`}
          >
            Remaining: {remaining}
          </span>
          {counterError && (
            <span className="rounded-full bg-rose-500/15 px-3 py-1 font-semibold text-rose-700">
              ⚠ {counterError}
            </span>
          )}
        </div>
      </Section>

      <Section title="Pricing">
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Price From (₹)" name="price_from" type="number" min={0} required defaultValue={(p.price_from as number) ?? 0} />
          <Field label="Price Min (₹)" name="price_min" type="number" min={0} defaultValue={(p.price_min as number) ?? ""} />
          <Field label="Price Max (₹)" name="price_max" type="number" min={0} defaultValue={(p.price_max as number) ?? ""} />
        </div>
      </Section>

      <Section title="Location & Map">
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Latitude" name="latitude" type="number" step="0.0000001" defaultValue={(p.latitude as number) ?? ""} />
          <Field label="Longitude" name="longitude" type="number" step="0.0000001" defaultValue={(p.longitude as number) ?? ""} />
          <Field label="Google Map URL" name="google_map_url" type="url" defaultValue={(p.google_map_url as string) ?? ""} />
        </div>
      </Section>

      {error && <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-700">{error}</div>}
      {ok && <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-700">Saved.</div>}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving || !!counterError}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] disabled:opacity-60"
        >
          <Save size={14} /> {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </form>
  );
}

function NumberBox({
  label,
  name,
  value,
  onChange,
  min,
  max,
  tone,
}: {
  label: string;
  name: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  tone?: "emerald" | "amber" | "rose";
}) {
  const toneMap: Record<string, string> = {
    emerald: "focus:border-emerald-500 focus:ring-emerald-500/25",
    amber: "focus:border-amber-500 focus:ring-amber-500/25",
    rose: "focus:border-rose-500 focus:ring-rose-500/25",
  };
  const ring = tone ? toneMap[tone] : "focus:border-primary focus:ring-primary/25";
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">{label}</span>
      <div className="flex items-stretch overflow-hidden rounded-2xl border border-border bg-background focus-within:ring-2 focus-within:ring-primary/20">
        <button
          type="button"
          onClick={() => onChange(Math.max(min ?? 0, value - 1))}
          aria-label={`Decrease ${label}`}
          className="grid w-10 place-items-center text-lg font-bold text-muted-foreground hover:bg-muted"
        >
          −
        </button>
        <input
          name={name}
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (Number.isNaN(n)) return;
            onChange(n);
          }}
          className={`w-full border-x border-border bg-transparent px-3 py-2.5 text-center text-base font-bold text-foreground outline-none transition-colors ${ring}`}
        />
        <button
          type="button"
          onClick={() => onChange(Math.min(max ?? Number.MAX_SAFE_INTEGER, value + 1))}
          aria-label={`Increase ${label}`}
          className="grid w-10 place-items-center text-lg font-bold text-muted-foreground hover:bg-muted"
        >
          +
        </button>
      </div>
    </label>
  );
}

/* ==================== BUILDINGS / FLOORS / FLATS ==================== */

function BuildingsTab({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const listFn = useServerFn(adminListBuildings);
  const upsertB = useServerFn(adminUpsertBuilding);
  const deleteB = useServerFn(adminDeleteBuilding);
  const upsertFloor = useServerFn(adminUpsertFloor);
  const deleteFloor = useServerFn(adminDeleteFloor);
  const upsertFlat = useServerFn(adminUpsertFlatFull);
  const deleteFlat = useServerFn(adminDeleteFlat);
  const bulkFlats = useServerFn(adminBulkCreateFlats);
  const invFn = useServerFn(getProjectInventory);

  const { data: buildings } = useQuery({
    queryKey: ["admin", "buildings", projectId],
    queryFn: () => listFn({ data: { project_id: projectId } }),
  });

  const [openBuilding, setOpenBuilding] = useState<string | null>(null);

  async function refresh() {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["admin", "buildings", projectId] }),
      qc.invalidateQueries({ queryKey: ["admin", "project-inv", projectId] }),
      qc.invalidateQueries({ queryKey: ["admin", "project", projectId] }),
    ]);
  }

  async function handleAddBuilding() {
    const name = prompt("Building name (e.g. Tower A)");
    if (!name) return;
    const code = prompt("Building code (unique per project)", name.slice(0, 3).toUpperCase());
    if (!code) return;
    try {
      await upsertB({ data: { project_id: projectId, name, code, total_floors: 0, ordering: (buildings?.length ?? 0) } as never });
      await refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed");
    }
  }
  async function handleEditBuilding(b: Record<string, unknown>) {
    const name = prompt("Building name", b.name as string);
    if (!name) return;
    await upsertB({ data: { id: b.id, project_id: projectId, name, code: b.code as string, description: (b.description as string) ?? "", total_floors: (b.total_floors as number) ?? 0, ordering: (b.ordering as number) ?? 0 } as never });
    await refresh();
  }
  async function handleDeleteBuilding(id: string) {
    if (!confirm("Delete this building and ALL its floors + flats? This cannot be undone.")) return;
    await deleteB({ data: { id } });
    await refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">Buildings, Floors & Flats</h2>
        <button onClick={handleAddBuilding} className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)]">
          <Plus size={14} /> Add Building
        </button>
      </div>

      {(!buildings || buildings.length === 0) ? (
        <div className="glass-card grid place-items-center rounded-3xl px-8 py-16 text-center">
          <Building2 size={32} className="text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">No buildings yet. Add the first one to start building inventory.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {buildings.map((b) => (
            <BuildingRow
              key={b.id as string}
              b={b as Record<string, unknown>}
              projectId={projectId}
              isOpen={openBuilding === b.id}
              onToggle={() => setOpenBuilding(openBuilding === b.id ? null : (b.id as string))}
              onEdit={() => handleEditBuilding(b as Record<string, unknown>)}
              onDelete={() => handleDeleteBuilding(b.id as string)}
              onFloorSaved={refresh}
              upsertFloor={upsertFloor}
              deleteFloor={deleteFloor}
              upsertFlat={upsertFlat}
              deleteFlat={deleteFlat}
              bulkFlats={bulkFlats}
              invFn={invFn}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function BuildingRow({
  b, projectId, isOpen, onToggle, onEdit, onDelete, onFloorSaved,
  upsertFloor, deleteFloor, upsertFlat, deleteFlat, bulkFlats, invFn,
}: {
  b: Record<string, unknown>;
  projectId: string;
  isOpen: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onFloorSaved: () => Promise<void>;
  upsertFloor: (args: { data: unknown }) => Promise<unknown>;
  deleteFloor: (args: { data: unknown }) => Promise<unknown>;
  upsertFlat: (args: { data: unknown }) => Promise<unknown>;
  deleteFlat: (args: { data: unknown }) => Promise<unknown>;
  bulkFlats: (args: { data: unknown }) => Promise<unknown>;
  invFn: (args: { data: unknown }) => Promise<unknown>;
}) {
  return (
    <div className="rounded-3xl border border-border bg-surface shadow-[var(--shadow-soft)]">
      <div className="flex items-center justify-between gap-4 p-4">
        <button onClick={onToggle} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary">
            <Building2 size={18} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 truncate text-base font-bold text-foreground">
              {b.name as string}
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{b.code as string}</span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {(b.total_floors as number) ?? 0} floors · {(b.total_flats as number) ?? 0} flats
            </p>
          </div>
        </button>
        <div className="flex shrink-0 items-center gap-2">
          <button onClick={onEdit} className="grid h-8 w-8 place-items-center rounded-full border border-border text-muted-foreground hover:text-foreground"><Pencil size={12} /></button>
          <button onClick={onDelete} className="grid h-8 w-8 place-items-center rounded-full border border-border text-muted-foreground hover:text-rose-500"><Trash2 size={12} /></button>
        </div>
      </div>

      {isOpen && (
        <FloorsPanel
          buildingId={b.id as string}
          projectId={projectId}
          onSaved={onFloorSaved}
          upsertFloor={upsertFloor}
          deleteFloor={deleteFloor}
          upsertFlat={upsertFlat}
          deleteFlat={deleteFlat}
          bulkFlats={bulkFlats}
          invFn={invFn}
        />
      )}
    </div>
  );
}

function FloorsPanel({
  buildingId, projectId, onSaved,
  upsertFloor, deleteFloor, upsertFlat, deleteFlat, bulkFlats, invFn,
}: {
  buildingId: string;
  projectId: string;
  onSaved: () => Promise<void>;
  upsertFloor: (args: { data: unknown }) => Promise<unknown>;
  deleteFloor: (args: { data: unknown }) => Promise<unknown>;
  upsertFlat: (args: { data: unknown }) => Promise<unknown>;
  deleteFlat: (args: { data: unknown }) => Promise<unknown>;
  bulkFlats: (args: { data: unknown }) => Promise<unknown>;
  invFn: (args: { data: unknown }) => Promise<unknown>;
}) {
  const qc = useQueryClient();
  const { data: inv } = useQuery({
    queryKey: ["admin", "project-inv", projectId],
    // Fetch full inventory via public function — this project is visible to admin regardless
    queryFn: () => invFn({ data: { slug: "__by_id__" } }).catch(() => null),
  });

  // Fallback: use direct fetch to buildings/floors/flats via the same public fn — needs slug.
  // Simpler: reload buildings via listBuildings and refetch floors/flats through supabase client.

  const floors = useMemo(() => {
    const arr = (inv as { floors?: Array<{ id: string; building_id: string; number: number; name: string | null; total_flats: number }> } | null)?.floors ?? [];
    return arr.filter((f) => f.building_id === buildingId).sort((a, b) => a.number - b.number);
  }, [inv, buildingId]);
  const flats = useMemo(() => {
    const arr = (inv as { flats?: Array<{ id: string; floor_id: string; building_id: string; unit_code: string; status: string; price: number | null; area_sqft: number | null }> } | null)?.flats ?? [];
    return arr.filter((f) => f.building_id === buildingId);
  }, [inv, buildingId]);

  async function handleAddFloor() {
    const num = prompt("Floor number (e.g. 1)");
    if (!num) return;
    const name = prompt("Floor name (optional)", `Floor ${num}`) ?? undefined;
    try {
      await upsertFloor({ data: { project_id: projectId, building_id: buildingId, number: Number(num), name, ordering: floors.length } as never });
      await onSaved();
      await qc.invalidateQueries({ queryKey: ["admin", "project-inv", projectId] });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed");
    }
  }
  async function handleDeleteFloor(id: string) {
    if (!confirm("Delete this floor and all its flats?")) return;
    await deleteFloor({ data: { id } });
    await onSaved();
    await qc.invalidateQueries({ queryKey: ["admin", "project-inv", projectId] });
  }
  async function handleAddFlat(floorId: string) {
    const code = prompt("Flat / unit code (unique per project)");
    if (!code) return;
    const config = prompt("Configuration (e.g. 2BHK)", "2BHK") ?? undefined;
    const area = prompt("Carpet area (sqft)", "800");
    const price = prompt("Price (₹)", "3000000");
    try {
      await upsertFlat({ data: {
        project_id: projectId, building_id: buildingId, floor_id: floorId,
        unit_code: code, configuration: config, area_sqft: area ? Number(area) : undefined,
        price: price ? Number(price) : undefined, bedrooms: 2, bathrooms: 2, balconies: 1,
      } as never });
      await onSaved();
      await qc.invalidateQueries({ queryKey: ["admin", "project-inv", projectId] });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed");
    }
  }
  async function handleBulkFlats(floorId: string) {
    const prefix = prompt("Unit prefix (e.g. A1-)", "");
    if (!prefix) return;
    const start = prompt("Start number", "1");
    const count = prompt("How many flats?", "6");
    if (!start || !count) return;
    try {
      await bulkFlats({ data: {
        project_id: projectId, building_id: buildingId, floor_id: floorId,
        prefix, start: Number(start), count: Number(count), bedrooms: 2, bathrooms: 2, balconies: 1,
      } as never });
      await onSaved();
      await qc.invalidateQueries({ queryKey: ["admin", "project-inv", projectId] });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed");
    }
  }
  async function handleDeleteFlat(id: string) {
    if (!confirm("Delete this flat?")) return;
    await deleteFlat({ data: { id } });
    await onSaved();
    await qc.invalidateQueries({ queryKey: ["admin", "project-inv", projectId] });
  }

  return (
    <div className="border-t border-border bg-background/40 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Floors</h4>
        <button onClick={handleAddFloor} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-foreground">
          <Plus size={12} /> Add Floor
        </button>
      </div>

      {floors.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-xs text-muted-foreground">
          Add floors to start creating flats. (Inventory refresh may take a moment after adding.)
        </p>
      ) : (
        <div className="space-y-3">
          {floors.map((f) => {
            const fFlats = flats.filter((fl) => fl.floor_id === f.id);
            return (
              <div key={f.id} className="rounded-2xl border border-border bg-surface p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Layers size={14} className="text-muted-foreground" />
                    <span className="text-sm font-bold text-foreground">Floor {f.number}</span>
                    {f.name && <span className="text-xs text-muted-foreground">· {f.name}</span>}
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">{fFlats.length} flats</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => handleAddFlat(f.id)} className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-semibold text-foreground">
                      <Plus size={10} /> Flat
                    </button>
                    <button onClick={() => handleBulkFlats(f.id)} className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-semibold text-foreground">
                      <Plus size={10} /> Bulk
                    </button>
                    <button onClick={() => handleDeleteFloor(f.id)} className="grid h-6 w-6 place-items-center rounded-full border border-border text-muted-foreground hover:text-rose-500">
                      <Trash2 size={10} />
                    </button>
                  </div>
                </div>

                {fFlats.length > 0 && (
                  <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                    {fFlats.map((fl) => (
                      <div key={fl.id} className={`group relative rounded-xl border p-2 text-xs ${STATUS_STYLES[fl.status] ?? "border-border bg-background"}`}>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-foreground">{fl.unit_code}</span>
                          <button onClick={() => handleDeleteFlat(fl.id)} className="opacity-0 transition-opacity group-hover:opacity-100">
                            <Trash2 size={10} className="text-rose-500" />
                          </button>
                        </div>
                        <div className="mt-0.5 text-[10px] text-muted-foreground">
                          {fl.area_sqft ? `${fl.area_sqft} sqft` : "—"}
                        </div>
                        <div className="text-[10px] font-semibold text-foreground">
                          {fl.price ? formatINR(fl.price) : "—"}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  available: "border-emerald-500/40 bg-emerald-500/10",
  reserved: "border-amber-500/40 bg-amber-500/10",
  sold: "border-rose-500/40 bg-rose-500/10",
  blocked: "border-slate-500/40 bg-slate-500/10",
  not_released: "border-border bg-muted/30",
};

/* ==================== INVENTORY (visual grid) ==================== */

function InventoryTab({ projectId, slug }: { projectId: string; slug: string }) {
  const invFn = useServerFn(getProjectInventory);
  const { data: inv, isLoading } = useQuery({
    queryKey: ["admin", "inv-view", projectId],
    queryFn: () => invFn({ data: { slug } }),
  });

  if (isLoading) return <div className="h-40 animate-pulse rounded-3xl bg-muted/40" />;
  if (!inv) {
    return (
      <div className="glass-card grid place-items-center rounded-3xl px-8 py-16 text-center">
        <p className="text-sm text-muted-foreground">
          Inventory grid is only available for projects with public visibility.
          Set the project visibility to <span className="font-semibold">public</span> in Overview, then reload.
        </p>
      </div>
    );
  }

  const total = inv.flats.length;
  const counts = {
    available: inv.flats.filter((f) => f.status === "available").length,
    reserved: inv.flats.filter((f) => f.status === "reserved").length,
    sold: inv.flats.filter((f) => f.status === "sold").length,
    blocked: inv.flats.filter((f) => f.status === "blocked").length,
    not_released: inv.flats.filter((f) => f.status === "not_released").length,
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatChip label="Total" value={total} tone="primary" />
        <StatChip label="Available" value={counts.available} tone="emerald" />
        <StatChip label="Reserved" value={counts.reserved} tone="amber" />
        <StatChip label="Sold" value={counts.sold} tone="rose" />
        <StatChip label="Other" value={counts.blocked + counts.not_released} tone="slate" />
      </div>

      {inv.buildings.map((b) => {
        const bFloors = inv.floors.filter((f) => f.building_id === b.id).sort((a, c) => a.number - c.number);
        return (
          <div key={b.id} className="rounded-3xl border border-border bg-surface p-5 shadow-[var(--shadow-soft)]">
            <div className="mb-4 flex items-center gap-2">
              <Building2 size={16} className="text-primary" />
              <h3 className="text-base font-bold text-foreground">{b.name}</h3>
              <span className="text-xs text-muted-foreground">· {b.code}</span>
            </div>
            <div className="space-y-3">
              {bFloors.map((f) => {
                const fFlats = inv.flats.filter((fl) => fl.floor_id === f.id);
                return (
                  <div key={f.id}>
                    <div className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                      <Layers size={12} /> Floor {f.number}{f.name ? ` · ${f.name}` : ""}
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10">
                      {fFlats.map((fl) => (
                        <div key={fl.id} className={`rounded-lg border p-1.5 text-center ${STATUS_STYLES[fl.status] ?? "border-border"}`}>
                          <div className="text-[11px] font-bold text-foreground">{fl.unit_code}</div>
                          <div className="text-[9px] text-muted-foreground">{fl.area_sqft ? `${fl.area_sqft}sf` : ""}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StatChip({ label, value, tone }: { label: string; value: number; tone: "primary" | "emerald" | "amber" | "rose" | "slate" }) {
  const tones: Record<string, string> = {
    primary: "bg-primary-soft text-primary",
    emerald: "bg-emerald-500/15 text-emerald-700",
    amber: "bg-amber-500/15 text-amber-700",
    rose: "bg-rose-500/15 text-rose-700",
    slate: "bg-slate-500/15 text-slate-700",
  };
  return (
    <div className={`rounded-2xl px-4 py-3 ${tones[tone]}`}>
      <div className="text-xs font-semibold uppercase tracking-wider opacity-80">{label}</div>
      <div className="mt-1 text-2xl font-extrabold">{value}</div>
    </div>
  );
}

/* ==================== MEDIA ==================== */

function MediaTab({ project, onSaved }: { project: Record<string, unknown>; onSaved: () => void }) {
  const upsert = useServerFn(adminUpsertProject);
  const [saving, setSaving] = useState(false);
  const [ok, setOk] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const p = project as Record<string, string | null>;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setOk(false);
    setSaving(true);
    try {
      const fd = new FormData(e.currentTarget);
      const raw = Object.fromEntries(fd.entries());
      await upsert({ data: {
        id: project.id,
        // preserve required fields
        name: p.name, slug: p.slug, location: p.location,
        project_type: p.project_type, construction_status: p.construction_status,
        ...raw,
      } as never });
      setOk(true);
      onSaved();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Section title="Cover Media (paste public URLs)">
        <div className="grid gap-4 md:grid-cols-2">
          <MediaField label="Thumbnail" name="thumbnail_url" value={p.thumbnail_url} />
          <MediaField label="Cover" name="cover_url" value={p.cover_url} />
          <MediaField label="Hero Banner" name="hero_banner_url" value={p.hero_banner_url} />
          <MediaField label="Logo" name="logo_url" value={p.logo_url} />
        </div>
      </Section>

      <Section title="3D Model & Immersive Media">
        <div className="grid gap-4 md:grid-cols-2">
          <MediaField label="3D Tour URL (Matterport / Sketchfab / GLB)" name="three_d_tour_url" value={p.three_d_tour_url} />
          <MediaField label="Virtual Walkthrough (YouTube / Vimeo)" name="virtual_walkthrough_url" value={p.virtual_walkthrough_url} />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Paste a public URL to a Matterport tour, Sketchfab embed, hosted <code>.glb</code> file, or a video walkthrough.
        </p>
      </Section>

      <p className="rounded-2xl border border-dashed border-border bg-background p-4 text-xs text-muted-foreground">
        Rich media galleries (multiple images, brochures, master plans) can be pasted as public URLs above.
        Drag-and-drop uploads with reorder are managed from the Media Library.
      </p>

      {error && <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-700">{error}</div>}
      {ok && <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-700">Saved.</div>}

      <div className="flex justify-end">
        <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] disabled:opacity-60">
          <Save size={14} /> {saving ? "Saving…" : "Save Media"}
        </button>
      </div>
    </form>
  );
}

function MediaField({ label, name, value }: { label: string; name: string; value: string | null }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground">{label}</span>
        {value && <span className="text-[10px] text-emerald-600">✓ set</span>}
      </div>
      <input
        name={name}
        type="url"
        defaultValue={value ?? ""}
        placeholder="https://…"
        className="w-full rounded-2xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
      {value && (
        <div className="mt-2 h-24 overflow-hidden rounded-xl border border-border bg-muted/30" style={{ backgroundImage: `url(${value})`, backgroundSize: "cover", backgroundPosition: "center" }} />
      )}
    </div>
  );
}

/* ==================== CONTENT / SEO ==================== */

function ContentTab({ project, onSaved }: { project: Record<string, unknown>; onSaved: () => void }) {
  const upsert = useServerFn(adminUpsertProject);
  const [saving, setSaving] = useState(false);
  const [ok, setOk] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const p = project as Record<string, string | null>;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setOk(false);
    setSaving(true);
    try {
      const fd = new FormData(e.currentTarget);
      const raw = Object.fromEntries(fd.entries());
      await upsert({ data: {
        id: project.id,
        name: p.name, slug: p.slug, location: p.location,
        project_type: p.project_type, construction_status: p.construction_status,
        ...raw,
      } as never });
      setOk(true);
      onSaved();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Section title="Description">
        <div className="grid gap-4">
          <Field label="Short Description" name="short_description" defaultValue={p.short_description ?? ""} maxLength={240} />
          <TextAreaField label="Full Description" name="description" defaultValue={p.description ?? ""} rows={6} maxLength={4000} />
        </div>
      </Section>
      <Section title="SEO Metadata">
        <div className="grid gap-4">
          <Field label="SEO Title" name="seo_title" defaultValue={p.seo_title ?? ""} maxLength={160} />
          <TextAreaField label="SEO Description" name="seo_description" defaultValue={p.seo_description ?? ""} rows={3} maxLength={320} />
        </div>
      </Section>

      {error && <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-700">{error}</div>}
      {ok && <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-700">Saved.</div>}

      <div className="flex justify-end">
        <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] disabled:opacity-60">
          <Save size={14} /> {saving ? "Saving…" : "Save Content"}
        </button>
      </div>
    </form>
  );
}

/* ==================== SHARED FIELDS ==================== */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-border bg-surface p-6 shadow-[var(--shadow-soft)]">
      <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-muted-foreground">{title}</h2>
      {children}
    </div>
  );
}
function Field({ label, name, ...rest }: { label: string; name: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">{label}</span>
      <input name={name} {...rest} className="w-full rounded-2xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20" />
    </label>
  );
}
function TextAreaField({ label, name, ...rest }: { label: string; name: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">{label}</span>
      <textarea name={name} {...rest} className="w-full rounded-2xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20" />
    </label>
  );
}
function SelectField({ label, name, defaultValue, options }: { label: string; name: string; defaultValue?: string; options: Array<{ value: string; label: string }> }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">{label}</span>
      <select name={name} defaultValue={defaultValue} className="w-full rounded-2xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20">
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}
