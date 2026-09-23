import { Building2, Check, Home } from "lucide-react";
import { getProjectFlats, type ProjectFlatCard } from "@/lib/project-flats";

type ProjectLike = {
  id: string;
  name: string;
  slug: string;
  location?: string | null;
  total_flats?: number | null;
  available_flats?: number | null;
  reserved_flats?: number | null;
  sold_flats?: number | null;
  extra?: unknown;
};

export function ProjectFlatsSnapshot({ projects }: { projects: ProjectLike[] }) {
  if (!projects.length) {
    return (
      <div className="rounded-[22px] bg-surface-warm p-4 text-sm text-muted-foreground">
        Flats will appear here when projects are published.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {projects.slice(0, 4).map((project) => (
        <ProjectFlatsRow key={project.id} project={project} />
      ))}
    </div>
  );
}

function ProjectFlatsRow({ project }: { project: ProjectLike }) {
  const flats = getProjectFlats(project.extra);
  const available = Number(project.available_flats ?? 0);
  const total = Number(project.total_flats ?? 0);
  const reserved = Number(project.reserved_flats ?? 0);
  const sold = Number(project.sold_flats ?? 0);

  return (
    <div className="rounded-[22px] border border-border/70 bg-surface-warm p-3.5">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary">
          <Building2 size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-bold text-foreground">{project.name}</div>
          <div className="truncate text-[11px] text-muted-foreground">{project.location || "Live project"}</div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Available</div>
          <div className="text-sm font-extrabold text-primary">{available} / {total}</div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[10px] font-semibold uppercase tracking-[0.08em]">
        <Status label="Available" value={available} tone="text-primary" />
        <Status label="Reserved" value={reserved} tone="text-amber-700" />
        <Status label="Sold" value={sold} tone="text-rose-700" />
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {flats.map((flat) => (
          <FlatPlan key={`${project.id}-${flat.title}`} flat={flat} />
        ))}
      </div>
    </div>
  );
}

function Status({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className={`rounded-xl bg-surface px-2 py-2 ${tone}`}>
      <div>{label}</div>
      <div className="mt-0.5 text-sm font-extrabold text-foreground">{value}</div>
    </div>
  );
}

function FlatPlan({ flat }: { flat: ProjectFlatCard }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-surface">
      <div className="relative aspect-[16/9] bg-primary-soft">
        {flat.image ? (
          <img
            src={flat.image}
            alt={`${flat.title} plan`}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="grid h-full place-items-center text-primary">
            <Home size={18} />
          </div>
        )}
        <span className="absolute bottom-1.5 left-1.5 rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-bold text-foreground">
          {flat.title}
        </span>
      </div>
      <div className="p-2.5">
        <div className="text-[11px] font-bold text-foreground">{flat.area}</div>
        <div className="mt-1 space-y-1">
          {flat.amenities.slice(0, 2).map((amenity) => (
            <div key={amenity} className="flex min-w-0 items-center gap-1 text-[10px] text-muted-foreground">
              <Check size={10} className="shrink-0 text-primary" />
              <span className="truncate">{amenity}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}