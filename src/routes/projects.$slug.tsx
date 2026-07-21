import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Bus,
  Building2,
  CalendarCheck2,
  CalendarClock,
  Camera,
  Check,
  ExternalLink,
  Home,
  Hospital,
  Layers,
  MapPin,
  School,
  ShoppingBag,
  Sparkles,
  Train,
  Video,
} from "lucide-react";
import { AmbientBackground } from "@/components/aawash/AmbientBackground";
import { LandingNav } from "@/components/aawash/landing/LandingNav";
import { Reveal } from "@/components/aawash/landing/Reveal";
import { formatINR, SkeletonBlock } from "@/components/aawash/dashboard-kit";
import { FlatInventoryBoard } from "@/components/aawash/projects/FlatInventoryBoard";
import { getPublicProject } from "@/lib/projects.functions";
import { getPublicProject } from "@/lib/projects.functions";

const STATUS_LABELS: Record<string, string> = {
  planning: "Planning",
  pre_launch: "Pre-Launch",
  under_construction: "Under Construction",
  nearing_completion: "Nearing Completion",
  ready_to_move: "Ready to Move",
  completed: "Completed",
  on_hold: "On Hold",
};

export const Route = createFileRoute("/projects/$slug")({
  component: ProjectDetailPage,
  head: ({ params }) => ({
    meta: [
      { title: `${prettify(params.slug)} — Aawash Projects` },
      {
        name: "description",
        content: `Explore ${prettify(params.slug)} — a premium Aawash residential project.`,
      },
      { property: "og:title", content: `${prettify(params.slug)} — Aawash Projects` },
      {
        property: "og:description",
        content: `Discover the ${prettify(params.slug)} project by Aawash.`,
      },
    ],
  }),
});

function prettify(slug: string) {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function ProjectDetailPage() {
  const { slug } = Route.useParams();
  const fetchProject = useServerFn(getPublicProject);
  const { data: project, isLoading } = useQuery({
    queryKey: ["project", "public", slug],
    queryFn: () => fetchProject({ data: { slug } }),
  });

  if (!isLoading && !project) {
    throw notFound();
  }

  const total = project?.total_flats ?? 0;
  const available = project?.available_flats ?? 0;
  const reserved = project?.reserved_flats ?? 0;
  const sold = project?.sold_flats ?? 0;
  const salesPct = total ? Math.round((sold / total) * 100) : 0;
  const availPct = total ? Math.round((available / total) * 100) : 0;
  const buildPct = project?.completion_percent ?? 0;

  return (
    <div className="relative min-h-screen">
      <AmbientBackground />
      <LandingNav />

      <main className="mx-auto max-w-6xl px-4 pb-24 pt-24 sm:px-6 sm:pt-28">
        <Link
          to="/projects"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={14} /> All Projects
        </Link>

        {isLoading || !project ? (
          <div className="mt-4 space-y-4">
            <SkeletonBlock className="h-72" />
            <SkeletonBlock className="h-40" />
          </div>
        ) : (
          <>
            {/* Hero */}
            <Reveal>
              <section
                className={`glass-card mt-4 overflow-hidden rounded-[2rem] shadow-[var(--shadow-float)]`}
              >
                <div
                  className={`relative aspect-[16/8] w-full overflow-hidden bg-gradient-to-br ${
                    project.hero_hue || "from-primary/25 to-leaf/20"
                  }`}
                >
                  {project.hero_banner_url ? (
                    <img
                      src={project.hero_banner_url}
                      alt={project.name}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_15%,rgba(255,255,255,0.35),transparent_60%)]" />
                  )}
                  <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-4 bg-gradient-to-t from-background/95 via-background/60 to-transparent p-5 sm:p-8">
                    <div className="min-w-0">
                      {project.tag && (
                        <span className="glass-card rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                          {project.tag}
                        </span>
                      )}
                      <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-foreground sm:text-5xl">
                        {project.name}
                      </h1>
                      <div className="mt-1 inline-flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin size={14} /> {project.address || project.location}
                      </div>
                    </div>
                    <div className="glass-card rounded-2xl px-4 py-3">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Starting Price
                      </div>
                      <div className="text-xl font-extrabold text-foreground sm:text-2xl">
                        {formatINR(project.price_min ?? project.price_from, { compact: true })}
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </Reveal>

            {/* Quick info + progress */}
            <section className="mt-6 grid gap-4 sm:grid-cols-3">
              <QuickCard
                icon={<Building2 size={16} />}
                label="Type"
                value={project.project_type === "entire_building" ? "Entire Building" : "Flat Inventory"}
              />
              <QuickCard
                icon={<Sparkles size={16} />}
                label="Status"
                value={STATUS_LABELS[project.construction_status] || project.construction_status}
              />
              <QuickCard
                icon={<Home size={16} />}
                label="Total Flats"
                value={String(total || project.total_units || 0)}
              />
            </section>

            {/* Progress rings */}
            <section className="mt-4 grid gap-4 sm:grid-cols-3">
              <ProgressCard label="Construction" pct={buildPct} tone="primary" />
              <ProgressCard label="Sales" pct={salesPct} tone="gold" />
              <ProgressCard label="Availability" pct={availPct} tone="leaf" />
            </section>

            {/* Summary + Location */}
            <section className="mt-6 grid gap-4 lg:grid-cols-3">
              <Reveal className="lg:col-span-2">
                <div className="glass-card rounded-3xl p-6 shadow-[var(--shadow-soft)]">
                  <h2 className="text-lg font-bold text-foreground">Project Summary</h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {project.description || project.short_description || "Details coming soon."}
                  </p>

                  <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <MiniStat label="Buildings" value={project.total_buildings ?? 0} />
                    <MiniStat label="Floors" value={project.total_floors ?? 0} />
                    <MiniStat label="Available" value={available} />
                    <MiniStat label="Sold" value={sold} />
                    <MiniStat label="Reserved" value={reserved} />
                    <MiniStat
                      label="Price Range"
                      value={
                        project.price_min && project.price_max
                          ? `${formatINR(project.price_min, { compact: true })} – ${formatINR(
                              project.price_max,
                              { compact: true },
                            )}`
                          : formatINR(project.price_from, { compact: true })
                      }
                    />
                    {project.launch_date && (
                      <MiniStat label="Launch" value={new Date(project.launch_date).toLocaleDateString()} />
                    )}
                    {project.possession_date && (
                      <MiniStat
                        label="Possession"
                        value={new Date(project.possession_date).toLocaleDateString()}
                      />
                    )}
                  </div>
                </div>
              </Reveal>

              <Reveal>
                <div className="glass-card rounded-3xl p-6 shadow-[var(--shadow-soft)]">
                  <h2 className="inline-flex items-center gap-2 text-lg font-bold text-foreground">
                    <MapPin size={16} /> Location
                  </h2>
                  <div className="mt-3 aspect-video overflow-hidden rounded-2xl bg-gradient-to-br from-primary/15 to-leaf/10">
                    <div className="grid h-full w-full place-items-center text-xs text-muted-foreground">
                      Map preview
                    </div>
                  </div>
                  <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                    <div>{project.address || project.location}</div>
                    <div>Nearby: roads, schools, hospitals & markets</div>
                  </div>
                  {project.google_map_url && (
                    <a
                      href={project.google_map_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                    >
                      Open in Google Maps <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              </Reveal>
            </section>

            {/* Timeline */}
            <section className="mt-6">
              <Reveal>
                <div className="glass-card rounded-3xl p-6 shadow-[var(--shadow-soft)]">
                  <h2 className="inline-flex items-center gap-2 text-lg font-bold text-foreground">
                    <CalendarClock size={16} /> Timeline
                  </h2>
                  <ol className="mt-4 relative border-l-2 border-dashed border-border pl-4">
                    <TimelineItem
                      label="Project Launch"
                      value={project.launch_date ? new Date(project.launch_date).toLocaleDateString() : "TBA"}
                    />
                    <TimelineItem label="Construction Started" value="Ongoing" />
                    <TimelineItem label="Current Progress" value={`${buildPct}%`} highlight />
                    <TimelineItem
                      label="Expected Possession"
                      value={
                        project.possession_date
                          ? new Date(project.possession_date).toLocaleDateString()
                          : "TBA"
                      }
                      icon={<CalendarCheck2 size={12} />}
                    />
                  </ol>
                </div>
              </Reveal>
            </section>

            {/* Media preview */}
            <section className="mt-6">
              <Reveal>
                <div className="glass-card rounded-3xl p-6 shadow-[var(--shadow-soft)]">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-foreground">Media</h2>
                    <button
                      type="button"
                      className="text-xs font-semibold text-muted-foreground hover:text-foreground"
                      disabled
                    >
                      View All →
                    </button>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <MediaTile icon={<Camera size={16} />} label="Photos" count={project.gallery_count ?? 0} />
                    <MediaTile icon={<Video size={16} />} label="Videos" count={project.video_count ?? 0} />
                    <MediaTile icon={<Layers size={16} />} label="Floor Plans" count={project.floor_plan_count ?? 0} />
                    <MediaTile icon={<Building2 size={16} />} label="3D Tours" count={project.model_count ?? 0} />
                  </div>
                </div>
              </Reveal>
            </section>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/auth"
                className="inline-flex h-12 items-center gap-2 rounded-full bg-primary px-6 text-sm font-bold text-primary-foreground shadow-[var(--shadow-glow)] hover:brightness-110"
              >
                Enquire Now
              </Link>
              <Link
                to="/projects"
                className="inline-flex h-12 items-center gap-2 rounded-full border border-input bg-surface px-6 text-sm font-bold text-foreground hover:bg-muted"
              >
                Back to Projects
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function QuickCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="glass-card rounded-2xl p-4 shadow-[var(--shadow-soft)]">
      <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {icon} {label}
      </div>
      <div className="mt-1 text-base font-extrabold text-foreground">{value}</div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-muted/40 p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 text-sm font-extrabold text-foreground">{value}</div>
    </div>
  );
}

function ProgressCard({
  label,
  pct,
  tone,
}: {
  label: string;
  pct: number;
  tone: "primary" | "gold" | "leaf";
}) {
  const stroke =
    tone === "gold" ? "hsl(var(--gold))" : tone === "leaf" ? "hsl(var(--leaf))" : "hsl(var(--primary))";
  const r = 32;
  const c = 2 * Math.PI * r;
  const off = c - (pct / 100) * c;
  return (
    <div className="glass-card flex items-center gap-4 rounded-3xl p-5 shadow-[var(--shadow-soft)]">
      <svg viewBox="0 0 80 80" className="h-20 w-20">
        <circle cx="40" cy="40" r={r} strokeWidth="8" fill="none" className="stroke-muted" />
        <circle
          cx="40"
          cy="40"
          r={r}
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={off}
          style={{ stroke, transform: "rotate(-90deg)", transformOrigin: "center", transition: "stroke-dashoffset 700ms" }}
        />
        <text x="50%" y="52%" textAnchor="middle" className="fill-foreground text-[15px] font-extrabold">
          {pct}%
        </text>
      </svg>
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div className="mt-0.5 text-sm font-extrabold text-foreground">{pct}% complete</div>
      </div>
    </div>
  );
}

function TimelineItem({
  label,
  value,
  highlight,
  icon,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <li className="mb-4 last:mb-0">
      <span
        className={`absolute -left-[7px] mt-1 grid h-3 w-3 place-items-center rounded-full ${
          highlight ? "bg-primary shadow-[var(--shadow-glow)]" : "bg-muted-foreground/40"
        }`}
      />
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="inline-flex items-center gap-1.5 text-sm font-bold text-foreground">
        {icon} {value}
      </div>
    </li>
  );
}

function MediaTile({
  icon,
  label,
  count,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
}) {
  return (
    <div className="rounded-2xl border border-border bg-muted/30 p-4 text-center">
      <div className="mx-auto grid h-9 w-9 place-items-center rounded-full bg-primary-soft text-primary">
        {icon}
      </div>
      <div className="mt-2 text-xs font-semibold text-foreground">{label}</div>
      <div className="text-[10px] text-muted-foreground">{count} items</div>
    </div>
  );
}
