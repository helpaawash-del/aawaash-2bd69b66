import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  Plus,
  Search,
  MapPin,
  Archive,
  Undo2,
  Copy,
  Pencil,
  Layers,
  Home,
  ShieldCheck,
} from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { RoleGuard } from "@/components/aawash/AuthGuard";
import { AdminShell } from "@/components/aawash/admin/AdminShell";
import {
  adminListProjects,
  adminArchiveProject,
  adminRestoreProject,
  adminDuplicateProject,
} from "@/lib/project-admin.functions";
import { formatINR } from "@/components/aawash/dashboard-kit";

export const Route = createFileRoute("/_authenticated/admin/projects/")({
  component: AdminProjectsPage,
  head: () => ({ meta: [{ title: "Projects — Aawash Admin" }] }),
});

function AdminProjectsPage() {
  return (
    <RoleGuard allow={["super_admin"]}>
      <AdminProjectsContent />
    </RoleGuard>
  );
}

const STATUS_TINTS: Record<string, string> = {
  planning: "bg-slate-500/15 text-slate-700 border-slate-500/30",
  under_construction: "bg-amber-500/15 text-amber-700 border-amber-500/30",
  nearing_completion: "bg-primary/15 text-primary border-primary/30",
  ready_to_move: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  completed: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  sold_out: "bg-rose-500/15 text-rose-700 border-rose-500/30",
};

function AdminProjectsContent() {
  const { profile } = useSession();
  const qc = useQueryClient();
  const listFn = useServerFn(adminListProjects);
  const archiveFn = useServerFn(adminArchiveProject);
  const restoreFn = useServerFn(adminRestoreProject);
  const duplicateFn = useServerFn(adminDuplicateProject);

  const [includeArchived, setIncludeArchived] = useState(false);
  const [q, setQ] = useState("");

  const { data: projects, isLoading } = useQuery({
    queryKey: ["admin", "projects", includeArchived],
    queryFn: () => listFn({ data: { includeArchived } }),
  });

  const filtered = useMemo(() => {
    const rows = projects ?? [];
    if (!q.trim()) return rows;
    const t = q.trim().toLowerCase();
    return rows.filter(
      (r) =>
        r.name?.toLowerCase().includes(t) ||
        r.slug?.toLowerCase().includes(t) ||
        r.location?.toLowerCase().includes(t) ||
        r.address?.toLowerCase().includes(t),
    );
  }, [projects, q]);

  async function handleArchive(id: string) {
    if (!confirm("Archive this project? It will be hidden from public listings but preserved.")) return;
    await archiveFn({ data: { id } });
    await qc.invalidateQueries({ queryKey: ["admin", "projects"] });
  }
  async function handleRestore(id: string) {
    await restoreFn({ data: { id } });
    await qc.invalidateQueries({ queryKey: ["admin", "projects"] });
  }
  async function handleDuplicate(id: string) {
    if (!confirm("Duplicate this project with all buildings, floors and flats?")) return;
    await duplicateFn({ data: { id, includeBuildings: true, includeFloors: true, includeFlats: true, nameSuffix: " (Copy)" } });
    await qc.invalidateQueries({ queryKey: ["admin", "projects"] });
  }

  return (
    <AdminShell profile={profile}>
      <section className="mb-8">
        <div className="glass-card inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium text-foreground shadow-[var(--shadow-soft)]">
          <ShieldCheck size={14} className="text-gold" />
          Project Management Console
        </div>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Projects
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              The single source of truth for every project, building, floor and flat across Aawash.
            </p>
          </div>
          <Link
            to="/admin/projects/new"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition-transform hover:-translate-y-0.5"
          >
            <Plus size={16} />
            New Project
          </Link>
        </div>
      </section>

      <section className="mb-6 flex flex-wrap items-center gap-3">
        <div className="glass-card flex min-w-[240px] flex-1 items-center gap-2 rounded-2xl px-4 py-2.5">
          <Search size={16} className="text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, slug, location…"
            className="w-full border-none bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
        <label className="glass-card inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium text-foreground">
          <input
            type="checkbox"
            checked={includeArchived}
            onChange={(e) => setIncludeArchived(e.target.checked)}
            className="accent-primary"
          />
          Show archived
        </label>
      </section>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-4xl bg-muted/40" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card grid place-items-center rounded-4xl px-8 py-20 text-center">
          <Building2 size={40} className="text-muted-foreground" />
          <h3 className="mt-4 text-lg font-bold text-foreground">No projects yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Create the first Aawash project to start managing inventory.
          </p>
          <Link
            to="/admin/projects/new"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)]"
          >
            <Plus size={16} />
            New Project
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p) => {
            const occupancy = p.total_flats
              ? Math.round(((p.sold_flats ?? 0) / p.total_flats) * 100)
              : 0;
            return (
              <div
                key={p.id}
                className="group relative flex flex-col overflow-hidden rounded-4xl border border-border bg-surface shadow-[var(--shadow-soft)] transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-float)]"
              >
                <div
                  className="relative h-40 w-full overflow-hidden bg-gradient-to-br from-primary/20 via-leaf/15 to-gold/15"
                  style={
                    p.thumbnail_url || p.cover_url || p.hero_banner_url
                      ? {
                          backgroundImage: `url(${p.thumbnail_url || p.cover_url || p.hero_banner_url})`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                        }
                      : undefined
                  }
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
                  <div className="absolute left-3 top-3 flex gap-1.5">
                    {p.is_deleted && (
                      <span className="rounded-full bg-slate-900/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                        Archived
                      </span>
                    )}
                    {p.tag && (
                      <span className="rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gold-foreground">
                        {p.tag}
                      </span>
                    )}
                  </div>
                  <span
                    className={`absolute right-3 top-3 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${STATUS_TINTS[p.construction_status] ?? "bg-primary/20 text-primary-foreground border-primary/30"}`}
                  >
                    {p.construction_status?.replace(/_/g, " ")}
                  </span>
                </div>

                <div className="flex flex-1 flex-col gap-3 p-5">
                  <div className="min-w-0">
                    <h3 className="truncate text-lg font-bold text-foreground">{p.name}</h3>
                    <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                      <MapPin size={12} />
                      {p.location}
                    </p>
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-center">
                    <StatBox icon={<Building2 size={12} />} label="Bldgs" value={p.total_buildings ?? 0} />
                    <StatBox icon={<Layers size={12} />} label="Floors" value={p.total_floors ?? 0} />
                    <StatBox icon={<Home size={12} />} label="Flats" value={p.total_flats ?? 0} />
                    <StatBox label="Occ." value={`${occupancy}%`} />
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 text-[10px] font-semibold uppercase tracking-wider">
                    <div className="rounded-lg bg-emerald-500/15 px-2 py-1.5 text-center text-emerald-700">
                      {p.available_flats ?? 0} Avail
                    </div>
                    <div className="rounded-lg bg-amber-500/15 px-2 py-1.5 text-center text-amber-700">
                      {p.reserved_flats ?? 0} Resv
                    </div>
                    <div className="rounded-lg bg-rose-500/15 px-2 py-1.5 text-center text-rose-700">
                      {p.sold_flats ?? 0} Sold
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-border pt-3 text-xs">
                    <span className="text-muted-foreground">From</span>
                    <span className="font-bold text-foreground">{formatINR(p.price_from ?? 0)}</span>
                  </div>

                  <div className="mt-auto flex flex-wrap items-center gap-2">
                    <Link
                      to="/admin/projects/$id"
                      params={{ id: p.id }}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow-[var(--shadow-glow)]"
                    >
                      <Pencil size={12} />
                      Manage
                    </Link>
                    <button
                      onClick={() => handleDuplicate(p.id)}
                      className="grid h-8 w-8 place-items-center rounded-full border border-border bg-surface text-muted-foreground transition-colors hover:text-foreground"
                      title="Duplicate"
                    >
                      <Copy size={12} />
                    </button>
                    {p.is_deleted ? (
                      <button
                        onClick={() => handleRestore(p.id)}
                        className="grid h-8 w-8 place-items-center rounded-full border border-border bg-surface text-muted-foreground transition-colors hover:text-leaf"
                        title="Restore"
                      >
                        <Undo2 size={12} />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleArchive(p.id)}
                        className="grid h-8 w-8 place-items-center rounded-full border border-border bg-surface text-muted-foreground transition-colors hover:text-rose-500"
                        title="Archive"
                      >
                        <Archive size={12} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AdminShell>
  );
}

function StatBox({ icon, label, value }: { icon?: React.ReactNode; label: string; value: number | string }) {
  return (
    <div className="rounded-xl bg-muted/30 px-2 py-1.5">
      <div className="flex items-center justify-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-0.5 text-sm font-bold text-foreground">{value}</div>
    </div>
  );
}
