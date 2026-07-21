import { Link } from "@tanstack/react-router";
import { Heart, MapPin, Share2, ArrowUpRight } from "lucide-react";
import { formatINR } from "@/components/aawash/dashboard-kit";

export interface ProjectCardData {
  id: string;
  slug: string;
  name: string;
  location: string;
  tag?: string | null;
  short_description?: string | null;
  description?: string | null;
  price_from: number;
  price_min?: number | null;
  total_flats?: number | null;
  available_flats?: number | null;
  sold_flats?: number | null;
  total_units?: number | null;
  sold_units?: number | null;
  completion_percent?: number | null;
  construction_status?: string | null;
  hero_hue?: string | null;
  thumbnail_url?: string | null;
  hero_banner_url?: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  planning: "Planning",
  pre_launch: "Pre-Launch",
  under_construction: "Under Construction",
  nearing_completion: "Nearing Completion",
  ready_to_move: "Ready to Move",
  completed: "Completed",
  on_hold: "On Hold",
};

/**
 * Aawash Project Card — shared premium card used across landing, /projects,
 * dashboards, and favorites. Uses semantic tokens only.
 */
export function ProjectCard({
  project,
  isFavorite = false,
  onToggleFavorite,
  onShare,
  index = 0,
}: {
  project: ProjectCardData;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
  onShare?: (project: ProjectCardData) => void;
  index?: number;
}) {
  const total = project.total_flats ?? project.total_units ?? 0;
  const sold = project.sold_flats ?? project.sold_units ?? 0;
  const available = project.available_flats ?? Math.max(total - sold, 0);
  const salesPct = total ? Math.min(100, Math.round((sold / total) * 100)) : 0;
  const buildPct = project.completion_percent ?? 0;
  const heroImg = project.hero_banner_url || project.thumbnail_url;
  const hue = project.hero_hue || "from-primary/25 to-leaf/20";
  const price = project.price_min ?? project.price_from;

  return (
    <article
      className="group glass-card animate-fade-up overflow-hidden rounded-3xl shadow-[var(--shadow-soft)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[var(--shadow-float)]"
      style={{ animationDelay: `${Math.min(index * 60, 300)}ms` }}
    >
      <Link to="/projects/$slug" params={{ slug: project.slug }} className="block">
        <div className={`relative aspect-[16/10] overflow-hidden bg-gradient-to-br ${hue}`}>
          {heroImg ? (
            <img
              src={heroImg}
              alt={project.name}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.35),transparent_60%)]" />
          )}
          <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
            {project.tag ? (
              <span className="glass-card rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                {project.tag}
              </span>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-1.5">
              {onShare && (
                <button
                  type="button"
                  aria-label="Share project"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onShare(project);
                  }}
                  className="glass-card grid h-8 w-8 place-items-center rounded-full text-foreground/80 transition hover:text-primary"
                >
                  <Share2 size={14} />
                </button>
              )}
              {onToggleFavorite && (
                <button
                  type="button"
                  aria-label={isFavorite ? "Remove favorite" : "Add favorite"}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onToggleFavorite(project.id);
                  }}
                  className={`glass-card grid h-8 w-8 place-items-center rounded-full transition ${
                    isFavorite ? "text-destructive" : "text-foreground/80 hover:text-destructive"
                  }`}
                >
                  <Heart size={14} fill={isFavorite ? "currentColor" : "none"} />
                </button>
              )}
            </div>
          </div>
          {project.construction_status && (
            <span className="glass-card absolute bottom-3 left-3 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-foreground/90">
              {STATUS_LABELS[project.construction_status] || project.construction_status}
            </span>
          )}
        </div>
      </Link>

      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              to="/projects/$slug"
              params={{ slug: project.slug }}
              className="block truncate text-base font-bold text-foreground hover:text-primary"
            >
              {project.name}
            </Link>
            <div className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin size={12} /> {project.location}
            </div>
          </div>
          <Link
            to="/projects/$slug"
            params={{ slug: project.slug }}
            aria-label="Explore project"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground shadow-[var(--shadow-glow)] transition hover:brightness-110"
          >
            <ArrowUpRight size={16} />
          </Link>
        </div>

        {(project.short_description || project.description) && (
          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {project.short_description || project.description}
          </p>
        )}

        <div className="mt-4 grid grid-cols-3 gap-3">
          <Stat label="Starting" value={formatINR(price, { compact: true })} />
          <Stat label="Available" value={String(available)} />
          <Stat label="Progress" value={`${buildPct}%`} />
        </div>

        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <span>Sales</span>
            <span>{salesPct}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-leaf transition-all duration-700"
              style={{ width: `${salesPct}%` }}
            />
          </div>
        </div>
      </div>
    </article>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 truncate text-sm font-extrabold text-foreground">{value}</div>
    </div>
  );
}
