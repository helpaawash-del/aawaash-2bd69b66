import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bath,
  BedDouble,
  Building2,
  Compass,
  Layers,
  Ruler,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getProjectInventory, type FlatStatus, type PublicFlat } from "@/lib/inventory.functions";
import { formatINR } from "@/components/aawash/dashboard-kit";

const STATUS_META: Record<FlatStatus, { label: string; dot: string; chip: string }> = {
  available: {
    label: "Available",
    dot: "bg-emerald-500",
    chip: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  },
  reserved: {
    label: "Reserved",
    dot: "bg-amber-500",
    chip: "bg-amber-500/15 text-amber-700 border-amber-500/30",
  },
  sold: { label: "Sold", dot: "bg-rose-500", chip: "bg-rose-500/15 text-rose-700 border-rose-500/30" },
  not_released: {
    label: "Not Released",
    dot: "bg-muted-foreground/40",
    chip: "bg-muted text-muted-foreground border-border",
  },
  blocked: {
    label: "Blocked",
    dot: "bg-slate-500",
    chip: "bg-slate-500/15 text-slate-700 border-slate-500/30",
  },
};

export function FlatInventoryBoard({ slug, projectName }: { slug: string; projectName: string }) {
  const qc = useQueryClient();
  const fetchInv = useServerFn(getProjectInventory);
  const { data, isLoading } = useQuery({
    queryKey: ["inventory", slug],
    queryFn: () => fetchInv({ data: { slug } }),
  });

  const [selected, setSelected] = useState<PublicFlat | null>(null);

  // Realtime — refresh when any flat in this project changes.
  useEffect(() => {
    if (!data?.project_id) return;
    const channel = supabase
      .channel(`inv-${data.project_id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "flats", filter: `project_id=eq.${data.project_id}` },
        () => qc.invalidateQueries({ queryKey: ["inventory", slug] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [data?.project_id, qc, slug]);

  const buildings = data?.buildings ?? [];
  const floors = data?.floors ?? [];
  const flats = data?.flats ?? [];

  const filteredFlats = flats;

  const counts = useMemo(() => {
    const acc: Record<FlatStatus, number> = {
      available: 0,
      reserved: 0,
      sold: 0,
      not_released: 0,
      blocked: 0,
    };
    for (const f of flats) acc[f.status] = (acc[f.status] ?? 0) + 1;
    return acc;
  }, [flats]);

  // Group by floor for display
  const grouped = useMemo(() => {
    const map = new Map<string, PublicFlat[]>();
    for (const f of flats) {
      const list = map.get(f.floor_id) ?? [];
      list.push(f);
      map.set(f.floor_id, list);
    }
    return map;
  }, [filteredFlats]);

  if (isLoading) {
    return (
      <div className="glass-card animate-pulse rounded-3xl p-6 shadow-[var(--shadow-soft)]">
        <div className="h-6 w-40 rounded bg-muted" />
        <div className="mt-4 grid grid-cols-6 gap-2 sm:grid-cols-10">
          {Array.from({ length: 24 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (!data || flats.length === 0) {
    return (
      <div className="glass-card rounded-3xl p-8 text-center shadow-[var(--shadow-soft)]">
        <Building2 className="mx-auto text-muted-foreground" />
        <div className="mt-3 text-sm font-semibold text-foreground">
          Inventory coming soon
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          Flat availability for {projectName} will appear here once released.
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-3xl p-4 shadow-[var(--shadow-soft)] sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="inline-flex items-center gap-2 text-lg font-bold text-foreground">
            <Sparkles size={16} /> Flat Availability
          </h2>
          <div className="mt-1 text-xs text-muted-foreground">
            Tap a tile to view flat details. Live inventory updates automatically.
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-[10px] font-semibold">
          {(Object.keys(STATUS_META) as FlatStatus[]).map((s) => (
            <span
              key={s}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 ${STATUS_META[s].chip}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${STATUS_META[s].dot}`} />
              {STATUS_META[s].label} · {counts[s] ?? 0}
            </span>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
        <label className="relative">
          <Search
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search flat #, config, facing…"
            className="h-10 w-full rounded-full border border-input bg-surface pl-9 pr-3 text-xs outline-none focus:border-primary"
          />
        </label>
        <select
          value={buildingId}
          onChange={(e) => {
            setBuildingId(e.target.value as string);
            setFloorId("all");
          }}
          className="h-10 rounded-full border border-input bg-surface px-3 text-xs"
        >
          <option value="all">All Buildings</option>
          {buildings.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <select
          value={floorId}
          onChange={(e) => setFloorId(e.target.value as string)}
          className="h-10 rounded-full border border-input bg-surface px-3 text-xs"
        >
          <option value="all">All Floors</option>
          {activeFloors.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name || `Floor ${f.number}`}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as FlatStatus | "all")}
          className="h-10 rounded-full border border-input bg-surface px-3 text-xs"
        >
          <option value="all">All Status</option>
          {(Object.keys(STATUS_META) as FlatStatus[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_META[s].label}
            </option>
          ))}
        </select>
      </div>

      {/* Grid grouped by building > floor */}
      <div className="mt-5 space-y-6">
        {buildings
          .filter((b) => buildingId === "all" || b.id === buildingId)
          .map((b) => {
            const bFloors = floors
              .filter((f) => f.building_id === b.id)
              .filter((f) => floorId === "all" || f.id === floorId);
            const hasAny = bFloors.some((f) => (grouped.get(f.id) ?? []).length > 0);
            if (!hasAny) return null;
            return (
              <div key={b.id}>
                <div className="mb-2 flex items-center gap-2 text-sm font-bold text-foreground">
                  <Building2 size={14} className="text-primary" />
                  {b.name}
                  <span className="text-xs font-medium text-muted-foreground">
                    · {b.total_flats} flats
                  </span>
                </div>
                <div className="space-y-2">
                  {bFloors.map((fl) => {
                    const items = grouped.get(fl.id) ?? [];
                    if (items.length === 0) return null;
                    return (
                      <div key={fl.id} className="rounded-2xl border border-border bg-surface/60 p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <div className="text-xs font-semibold text-muted-foreground">
                            <Layers size={12} className="mr-1 inline" />
                            {fl.name || `Floor ${fl.number}`}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {items.length} unit{items.length === 1 ? "" : "s"}
                          </div>
                        </div>
                        <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10">
                          {items.map((f) => (
                            <FlatTile key={f.id} flat={f} onClick={() => setSelected(f)} />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        {filteredFlats.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border py-10 text-center text-xs text-muted-foreground">
            No flats match your filters.
          </div>
        )}
      </div>

      <FlatModal flat={selected} projectName={projectName} onClose={() => setSelected(null)} />
    </div>
  );
}

function FlatTile({ flat, onClick }: { flat: PublicFlat; onClick: () => void }) {
  const m = STATUS_META[flat.status];
  const disabled = flat.status === "not_released";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`group relative aspect-square rounded-lg border p-1 text-left transition active:scale-95 disabled:cursor-not-allowed ${m.chip} ${
        disabled ? "opacity-70" : "hover:shadow-md hover:-translate-y-0.5"
      }`}
      aria-label={`Flat ${flat.unit_code} — ${m.label}`}
    >
      <span className={`absolute right-1 top-1 h-1.5 w-1.5 rounded-full ${m.dot}`} />
      <div className="text-[10px] font-bold leading-tight">{flat.unit_code}</div>
      {flat.area_sqft && (
        <div className="mt-0.5 text-[9px] opacity-80">{Math.round(flat.area_sqft)} ft²</div>
      )}
    </button>
  );
}

function FlatModal({
  flat,
  projectName,
  onClose,
}: {
  flat: PublicFlat | null;
  projectName: string;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!flat) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [flat, onClose]);

  if (!flat) return null;
  const m = STATUS_META[flat.status];
  const canEnquire = flat.status === "available" || flat.status === "reserved";

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-background/60 backdrop-blur-sm sm:items-center">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default"
      />
      <div className="relative w-full max-w-lg animate-fade-up rounded-t-[2rem] bg-surface p-6 shadow-[var(--shadow-float)] sm:rounded-3xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-muted text-muted-foreground hover:bg-muted/70"
        >
          <X size={16} />
        </button>

        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {projectName}
        </div>
        <div className="mt-1 flex items-center gap-2">
          <h3 className="text-2xl font-extrabold text-foreground">Flat {flat.unit_code}</h3>
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${m.chip}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} /> {m.label}
          </span>
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          {flat.configuration ?? "Configuration"} · {flat.facing ?? "Facing TBA"}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MiniSpec icon={<Ruler size={14} />} label="Area" value={flat.area_sqft ? `${Math.round(flat.area_sqft)} ft²` : "—"} />
          <MiniSpec icon={<BedDouble size={14} />} label="Bedrooms" value={String(flat.bedrooms)} />
          <MiniSpec icon={<Bath size={14} />} label="Bathrooms" value={String(flat.bathrooms)} />
          <MiniSpec icon={<Compass size={14} />} label="Facing" value={flat.facing ?? "—"} />
        </div>

        {(flat.gallery?.length || flat.floor_plan_url) && (
          <div className="mt-4">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Media & Plans
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {flat.floor_plan_url && (
                <a
                  href={flat.floor_plan_url}
                  target="_blank"
                  rel="noreferrer"
                  className="group relative aspect-square overflow-hidden rounded-xl border border-border bg-muted"
                  title="Floor plan"
                >
                  <img
                    src={flat.floor_plan_url}
                    alt={`Floor plan ${flat.unit_code}`}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                  <span className="absolute inset-x-0 bottom-0 bg-background/80 px-2 py-0.5 text-center text-[9px] font-bold uppercase tracking-wider">
                    Floor Plan
                  </span>
                </a>
              )}
              {(flat.gallery ?? []).slice(0, 6).map((url, i) => (
                <a
                  key={`${url}-${i}`}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="group relative aspect-square overflow-hidden rounded-xl border border-border bg-muted"
                >
                  <img
                    src={url}
                    alt={`${flat.unit_code} photo ${i + 1}`}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                </a>
              ))}
            </div>
          </div>
        )}


        <div className="mt-4 rounded-2xl bg-primary-soft p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Price
          </div>
          <div className="mt-1 text-2xl font-extrabold text-foreground">
            {flat.price ? formatINR(flat.price, { compact: true }) : "On Request"}
          </div>
          {flat.construction_stage && (
            <div className="mt-1 text-[11px] text-muted-foreground">
              Construction: {flat.construction_stage}
            </div>
          )}
        </div>

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            disabled={!canEnquire}
            className="inline-flex h-11 flex-1 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground shadow-[var(--shadow-glow)] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {canEnquire ? "Enquire About This Flat" : "Not Available"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 items-center justify-center rounded-full border border-input px-5 text-sm font-bold text-foreground hover:bg-muted"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function MiniSpec({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface/60 p-3">
      <div className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {icon} {label}
      </div>
      <div className="mt-1 text-sm font-bold text-foreground">{value}</div>
    </div>
  );
}
