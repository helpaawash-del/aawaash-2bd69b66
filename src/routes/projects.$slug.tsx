import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState, useCallback } from "react";
import {
  ArrowLeft,
  Box,
  Building2,
  CalendarClock,
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Grid3x3,
  Home as HomeIcon,
  Images,
  Info,
  Layers,
  Link2,
  MapPin,
  Phone,
  Play,
  Share2,
  Sparkles,
  X,
} from "lucide-react";
import { AmbientBackground } from "@/components/aawash/AmbientBackground";
import { LandingNav } from "@/components/aawash/landing/LandingNav";
import { Reveal } from "@/components/aawash/landing/Reveal";
import { formatINR, SkeletonBlock } from "@/components/aawash/dashboard-kit";
import { FlatInventoryBoard } from "@/components/aawash/projects/FlatInventoryBoard";
import { getPublicProject } from "@/lib/projects.functions";
import { useRealtimeInvalidate } from "@/hooks/useRealtimeInvalidate";

const STATUS_LABELS: Record<string, string> = {
  planning: "Planning",
  pre_launch: "Pre-Launch",
  under_construction: "Under Construction",
  nearing_completion: "Nearing Completion",
  ready_to_move: "Ready to Move",
  completed: "Completed",
  on_hold: "On Hold",
  sold_out: "Sold Out",
};

type TabId = "overview" | "gallery" | "tour" | "availability" | "location";

export const Route = createFileRoute("/projects/$slug")({
  component: ProjectDetailPage,
  head: ({ params }) => {
    const title = `${prettify(params.slug)} — Aawaash`;
    const desc = `Explore ${prettify(params.slug)}: floor plans, live availability, gallery, 3D tour and location. A premium Aawaash residence.`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: desc },
      ],
    };
  },
});

function prettify(slug: string) {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function ProjectDetailPage() {
  const { slug } = Route.useParams();
  const qc = useQueryClient();
  const fetchProject = useServerFn(getPublicProject);
  const { data: project, isLoading } = useQuery({
    queryKey: ["project", "public", slug],
    queryFn: () => fetchProject({ data: { slug } }),
  });

  // Realtime: admin edits to projects or flats invalidate this page instantly.
  useRealtimeInvalidate(
    `project-public-${slug}`,
    ["projects", "flats"],
    [["project", "public", slug], ["project-inventory-public", slug]],
    { pollMs: 45_000 },
  );

  const [tab, setTab] = useState<TabId>("overview");
  const [lightbox, setLightbox] = useState<number | null>(null);

  if (!isLoading && !project) throw notFound();

  const p = (project ?? {}) as Record<string, unknown>;
  const total = (p.total_flats as number) ?? 0;
  const available = (p.available_flats as number) ?? 0;
  const reserved = (p.reserved_flats as number) ?? 0;
  const sold = (p.sold_flats as number) ?? 0;
  const buildPct = (p.completion_percent as number) ?? 0;
  const salesPct = total ? Math.round((sold / total) * 100) : 0;
  const availPct = total ? Math.round((available / total) * 100) : 0;

  const gallery = useMemo<string[]>(() => {
    const raw = p.gallery;
    if (Array.isArray(raw)) return raw.filter((v): v is string => typeof v === "string" && !!v);
    return [];
  }, [p.gallery]);
  const videos = useMemo<string[]>(() => {
    const raw = p.videos;
    if (Array.isArray(raw)) return raw.filter((v): v is string => typeof v === "string" && !!v);
    const wt = p.virtual_walkthrough_url as string | null | undefined;
    return wt ? [wt] : [];
  }, [p.videos, p.virtual_walkthrough_url]);

  const heroImages = useMemo<string[]>(() => {
    const arr = [
      p.hero_banner_url as string | null,
      p.cover_url as string | null,
      p.thumbnail_url as string | null,
      ...gallery,
    ];
    return arr.filter((v): v is string => !!v);
  }, [p.hero_banner_url, p.cover_url, p.thumbnail_url, gallery]);

  const modelUrl = (p.three_d_tour_url as string | null) ?? null;
  const isGlb = !!modelUrl && /\.(glb|gltf)(\?|$)/i.test(modelUrl);

  // Load model-viewer web component when needed
  useEffect(() => {
    if (!isGlb) return;
    if (customElements.get("model-viewer")) return;
    const s = document.createElement("script");
    s.type = "module";
    s.src = "https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js";
    s.async = true;
    document.head.appendChild(s);
  }, [isGlb]);

  const tabs: Array<{ id: TabId; label: string; icon: React.ElementType }> = [
    { id: "overview", label: "Overview", icon: Info },
    { id: "gallery", label: "Gallery", icon: Images },
    { id: "tour", label: "3D & Video", icon: Box },
    { id: "availability", label: "Availability", icon: Grid3x3 },
    { id: "location", label: "Location", icon: MapPin },
  ];

  const shareUrl = typeof window !== "undefined" ? window.location.href : `/projects/${slug}`;
  const doShare = useCallback(async () => {
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
    const name = (p.name as string) || prettify(slug);
    try {
      if (nav.share) {
        await nav.share({ title: `${name} — Aawaash`, url: shareUrl });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        alert("Link copied to clipboard");
      }
    } catch {
      /* user cancelled */
    }
  }, [p.name, shareUrl, slug]);

  return (
    <div className="relative min-h-screen pb-24 sm:pb-0">
      <AmbientBackground />
      <LandingNav />

      {/* Sticky tab bar (below nav) */}
      {project && (
        <div className="sticky top-16 z-30 -mb-2 border-b border-border/40 bg-background/70 backdrop-blur-xl">
          <div className="mx-auto flex max-w-6xl items-center gap-1 overflow-x-auto px-3 py-2 sm:px-6 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {tabs.map((t) => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setTab(t.id);
                    qc.invalidateQueries({ queryKey: ["project", "public", slug] });
                  }}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                    active
                      ? "bg-primary text-primary-foreground shadow-[var(--shadow-glow)]"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  }`}
                >
                  <t.icon size={13} />
                  {t.label}
                </button>
              );
            })}
            <div className="ml-auto flex shrink-0 items-center gap-1">
              <button
                onClick={doShare}
                aria-label="Share"
                className="grid h-8 w-8 place-items-center rounded-full border border-border bg-surface text-muted-foreground hover:text-foreground"
              >
                <Share2 size={13} />
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6">
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
            {/* HERO */}
            <Reveal>
              <section className="glass-card mt-4 overflow-hidden rounded-[2rem] shadow-[var(--shadow-float)]">
                <div
                  className={`relative aspect-[16/9] w-full overflow-hidden bg-gradient-to-br ${
                    (p.hero_hue as string) || "from-primary/25 to-leaf/20"
                  } sm:aspect-[16/7]`}
                >
                  {heroImages[0] ? (
                    <button
                      type="button"
                      onClick={() => setLightbox(0)}
                      className="group absolute inset-0"
                      aria-label="Open gallery"
                    >
                      <img
                        src={heroImages[0]}
                        alt={p.name as string}
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                      />
                    </button>
                  ) : (
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_15%,rgba(255,255,255,0.35),transparent_60%)]" />
                  )}

                  {heroImages.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        setTab("gallery");
                        setLightbox(0);
                      }}
                      className="glass-card absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold text-foreground shadow-[var(--shadow-soft)]"
                    >
                      <Images size={12} /> {heroImages.length} photos
                    </button>
                  )}

                  <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-3 bg-gradient-to-t from-background/95 via-background/50 to-transparent p-5 sm:p-8">
                    <div className="min-w-0 max-w-full">
                      {(p.tag as string) && (
                        <span className="glass-card rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                          {p.tag as string}
                        </span>
                      )}
                      <h1 className="mt-2 truncate text-3xl font-extrabold tracking-tight text-foreground sm:text-5xl">
                        {p.name as string}
                      </h1>
                      <div className="mt-1 inline-flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin size={14} />
                        <span className="truncate">
                          {(p.address as string) || (p.location as string)}
                        </span>
                      </div>
                    </div>
                    <div className="glass-card rounded-2xl px-4 py-3">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Starting Price
                      </div>
                      <div className="text-xl font-extrabold text-foreground sm:text-2xl">
                        {formatINR((p.price_min as number) ?? (p.price_from as number), {
                          compact: true,
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Filmstrip */}
                {heroImages.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto p-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {heroImages.slice(0, 10).map((src, i) => (
                      <button
                        key={`${src}-${i}`}
                        type="button"
                        onClick={() => setLightbox(i)}
                        className="relative h-16 w-24 shrink-0 overflow-hidden rounded-xl border border-border/60 transition-all hover:scale-105 hover:border-primary"
                        aria-label={`Open photo ${i + 1}`}
                      >
                        <img src={src} alt="" className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </section>
            </Reveal>

            {/* Quick facts row — always visible */}
            <section className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <QuickCard
                icon={<Building2 size={14} />}
                label="Type"
                value={
                  p.project_type === "entire_building"
                    ? "Entire Building"
                    : (p.project_type as string) === "villa"
                    ? "Villa"
                    : "Flat Inventory"
                }
              />
              <QuickCard
                icon={<Sparkles size={14} />}
                label="Status"
                value={
                  STATUS_LABELS[(p.construction_status as string) ?? ""] ||
                  ((p.construction_status as string) ?? "—")
                }
              />
              <QuickCard
                icon={<HomeIcon size={14} />}
                label="Total Flats"
                value={String(total || ((p.total_units as number) ?? 0))}
              />
              <QuickCard
                icon={<Layers size={14} />}
                label="Available"
                value={String(available)}
                accent="emerald"
              />
            </section>

            {/* TAB PANELS */}
            <div className="mt-6">
              {tab === "overview" && (
                <OverviewPanel
                  p={p}
                  buildPct={buildPct}
                  salesPct={salesPct}
                  availPct={availPct}
                  total={total}
                  available={available}
                  reserved={reserved}
                  sold={sold}
                />
              )}

              {tab === "gallery" && (
                <GalleryPanel images={heroImages} onOpen={(i) => setLightbox(i)} />
              )}

              {tab === "tour" && (
                <TourPanel modelUrl={modelUrl} isGlb={isGlb} videos={videos} />
              )}

              {tab === "availability" && (
                <Reveal>
                  <FlatInventoryBoard slug={slug} projectName={p.name as string} />
                </Reveal>
              )}

              {tab === "location" && <LocationPanel p={p} />}
            </div>

            {/* Desktop CTAs */}
            <div className="mt-8 hidden flex-wrap gap-3 sm:flex">
              <Link
                to="/auth"
                className="inline-flex h-12 items-center gap-2 rounded-full bg-primary px-6 text-sm font-bold text-primary-foreground shadow-[var(--shadow-glow)] hover:brightness-110"
              >
                <Phone size={14} /> Enquire Now
              </Link>
              <button
                onClick={doShare}
                className="inline-flex h-12 items-center gap-2 rounded-full border border-input bg-surface px-6 text-sm font-bold text-foreground hover:bg-muted"
              >
                <Link2 size={14} /> Copy Share Link
              </button>
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

      {/* Sticky mobile CTA */}
      {project && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/40 bg-background/85 px-4 py-3 backdrop-blur-xl sm:hidden">
          <div className="mx-auto flex max-w-6xl items-center gap-2">
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                From
              </div>
              <div className="truncate text-sm font-extrabold text-foreground">
                {formatINR((p.price_min as number) ?? (p.price_from as number), { compact: true })}
              </div>
            </div>
            <button
              onClick={doShare}
              aria-label="Share"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-border bg-surface text-foreground"
            >
              <Share2 size={16} />
            </button>
            <Link
              to="/auth"
              className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full bg-primary text-sm font-bold text-primary-foreground shadow-[var(--shadow-glow)]"
            >
              <Phone size={14} /> Enquire
            </Link>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightbox !== null && heroImages.length > 0 && (
        <Lightbox
          images={heroImages}
          index={lightbox}
          onClose={() => setLightbox(null)}
          onIndex={(i) => setLightbox(i)}
        />
      )}
    </div>
  );
}

/* ================== PANELS ================== */

function OverviewPanel({
  p,
  buildPct,
  salesPct,
  availPct,
  total,
  available,
  reserved,
  sold,
}: {
  p: Record<string, unknown>;
  buildPct: number;
  salesPct: number;
  availPct: number;
  total: number;
  available: number;
  reserved: number;
  sold: number;
}) {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-3">
        <ProgressCard label="Construction" pct={buildPct} tone="primary" />
        <ProgressCard label="Sales" pct={salesPct} tone="gold" />
        <ProgressCard label="Availability" pct={availPct} tone="leaf" />
      </section>

      <Reveal>
        <section className="glass-card rounded-3xl p-6 shadow-[var(--shadow-soft)]">
          <h2 className="text-lg font-bold text-foreground">About this project</h2>
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
            {(p.description as string) ||
              (p.short_description as string) ||
              "Details coming soon."}
          </p>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MiniStat label="Buildings" value={(p.total_buildings as number) ?? 0} />
            <MiniStat label="Floors" value={(p.total_floors as number) ?? 0} />
            <MiniStat label="Total" value={total} />
            <MiniStat label="Available" value={available} />
            <MiniStat label="Reserved" value={reserved} />
            <MiniStat label="Sold" value={sold} />
            <MiniStat
              label="Price Range"
              value={
                (p.price_min as number) && (p.price_max as number)
                  ? `${formatINR(p.price_min as number, { compact: true })} – ${formatINR(
                      p.price_max as number,
                      { compact: true },
                    )}`
                  : formatINR((p.price_from as number) ?? 0, { compact: true })
              }
            />
            {(p.possession_date as string) && (
              <MiniStat
                label="Possession"
                value={new Date(p.possession_date as string).toLocaleDateString()}
              />
            )}
          </div>
        </section>
      </Reveal>

      {(p.amenities as string[] | undefined)?.length ? (
        <Reveal>
          <section className="glass-card rounded-3xl p-6 shadow-[var(--shadow-soft)]">
            <h2 className="text-lg font-bold text-foreground">Amenities</h2>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {(p.amenities as string[]).map((a) => (
                <div
                  key={a}
                  className="flex items-center gap-2 rounded-2xl border border-border bg-surface/60 px-3 py-2.5 text-xs font-semibold text-foreground"
                >
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-primary-soft text-primary">
                    <Check size={12} />
                  </span>
                  {a}
                </div>
              ))}
            </div>
          </section>
        </Reveal>
      ) : null}

      <Reveal>
        <section className="glass-card rounded-3xl p-6 shadow-[var(--shadow-soft)]">
          <h2 className="inline-flex items-center gap-2 text-lg font-bold text-foreground">
            <CalendarClock size={16} /> Timeline
          </h2>
          <ol className="relative mt-4 border-l-2 border-dashed border-border pl-4">
            <TimelineItem
              label="Project Launch"
              value={
                (p.launch_date as string)
                  ? new Date(p.launch_date as string).toLocaleDateString()
                  : "TBA"
              }
            />
            <TimelineItem label="Construction" value={`${buildPct}% complete`} highlight />
            <TimelineItem
              label="Expected Possession"
              value={
                (p.possession_date as string)
                  ? new Date(p.possession_date as string).toLocaleDateString()
                  : "TBA"
              }
            />
          </ol>
        </section>
      </Reveal>
    </div>
  );
}

function GalleryPanel({ images, onOpen }: { images: string[]; onOpen: (i: number) => void }) {
  if (!images.length) {
    return (
      <div className="glass-card grid place-items-center rounded-3xl px-6 py-16 text-center">
        <Images size={28} className="text-muted-foreground" />
        <p className="mt-3 text-sm font-semibold text-foreground">No photos yet</p>
        <p className="text-xs text-muted-foreground">Admin will add photos soon.</p>
      </div>
    );
  }
  return (
    <Reveal>
      <section className="glass-card rounded-3xl p-4 shadow-[var(--shadow-soft)] sm:p-6">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {images.map((src, i) => (
            <button
              key={`${src}-${i}`}
              type="button"
              onClick={() => onOpen(i)}
              className="group relative aspect-square overflow-hidden rounded-2xl border border-border/60 bg-muted/30"
            >
              <img
                src={src}
                alt=""
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
            </button>
          ))}
        </div>
      </section>
    </Reveal>
  );
}

function TourPanel({
  modelUrl,
  isGlb,
  videos,
}: {
  modelUrl: string | null;
  isGlb: boolean;
  videos: string[];
}) {
  return (
    <div className="space-y-4">
      {/* 3D Model */}
      <Reveal>
        <section className="glass-card overflow-hidden rounded-3xl shadow-[var(--shadow-soft)]">
          <div className="flex items-center justify-between border-b border-border/50 p-4 sm:p-5">
            <h2 className="inline-flex items-center gap-2 text-base font-bold text-foreground">
              <Box size={16} /> 3D Model / Virtual Tour
            </h2>
            {modelUrl && (
              <a
                href={modelUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                Open <ExternalLink size={11} />
              </a>
            )}
          </div>
          <div className="aspect-video w-full bg-gradient-to-br from-primary/5 to-leaf/10">
            {!modelUrl ? (
              <EmptyTile icon={<Box size={22} />} label="3D tour coming soon" />
            ) : isGlb ? (
              // model-viewer web component (script injected in parent)
              // @ts-expect-error - custom element
              <model-viewer
                src={modelUrl}
                camera-controls
                auto-rotate
                touch-action="pan-y"
                shadow-intensity="1"
                exposure="1"
                style={{ width: "100%", height: "100%", background: "transparent" }}
              />
            ) : (
              <iframe
                title="3D tour"
                src={modelUrl}
                className="h-full w-full"
                allow="fullscreen; xr-spatial-tracking; vr; accelerometer; gyroscope"
                allowFullScreen
              />
            )}
          </div>
        </section>
      </Reveal>

      {/* Videos */}
      {videos.length > 0 ? (
        videos.map((v, idx) => <VideoTile key={`${v}-${idx}`} url={v} />)
      ) : (
        <Reveal>
          <section className="glass-card rounded-3xl p-6 text-center shadow-[var(--shadow-soft)]">
            <Play size={22} className="mx-auto text-muted-foreground" />
            <p className="mt-2 text-sm font-semibold text-foreground">No walkthrough video yet</p>
          </section>
        </Reveal>
      )}
    </div>
  );
}

function VideoTile({ url }: { url: string }) {
  const embed = toEmbedUrl(url);
  return (
    <Reveal>
      <section className="glass-card overflow-hidden rounded-3xl shadow-[var(--shadow-soft)]">
        <div className="aspect-video w-full bg-black">
          {embed ? (
            <iframe
              title="Video walkthrough"
              src={embed}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
            />
          ) : (
            <video src={url} controls className="h-full w-full" />
          )}
        </div>
      </section>
    </Reveal>
  );
}

function LocationPanel({ p }: { p: Record<string, unknown> }) {
  const map = p.google_map_url as string | null;
  return (
    <Reveal>
      <section className="glass-card overflow-hidden rounded-3xl shadow-[var(--shadow-soft)]">
        <div className="aspect-video w-full bg-gradient-to-br from-primary/10 to-leaf/10">
          {map ? (
            <iframe title="Map" src={map} className="h-full w-full border-0" loading="lazy" />
          ) : (
            <EmptyTile icon={<MapPin size={22} />} label="Map preview will appear here" />
          )}
        </div>
        <div className="space-y-1 border-t border-border/50 p-5">
          <div className="text-sm font-bold text-foreground">
            {(p.address as string) || (p.location as string)}
          </div>
          <div className="text-xs text-muted-foreground">Nearby: schools, hospitals, markets & transit</div>
          {map && (
            <a
              href={map}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
            >
              Open in Google Maps <ExternalLink size={12} />
            </a>
          )}
        </div>
      </section>
    </Reveal>
  );
}

/* ================== BITS ================== */

function Lightbox({
  images,
  index,
  onClose,
  onIndex,
}: {
  images: string[];
  index: number;
  onClose: () => void;
  onIndex: (i: number) => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onIndex((index + 1) % images.length);
      if (e.key === "ArrowLeft") onIndex((index - 1 + images.length) % images.length);
    }
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [index, images.length, onClose, onIndex]);

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-black/90 p-3 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
        aria-label="Close"
      >
        <X size={18} />
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onIndex((index - 1 + images.length) % images.length);
        }}
        className="absolute left-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:left-6"
        aria-label="Previous"
      >
        <ChevronLeft size={20} />
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onIndex((index + 1) % images.length);
        }}
        className="absolute right-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:right-6"
        aria-label="Next"
      >
        <ChevronRight size={20} />
      </button>
      <img
        src={images[index]}
        alt=""
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] max-w-[92vw] rounded-2xl object-contain shadow-2xl"
      />
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white">
        {index + 1} / {images.length}
      </div>
    </div>
  );
}

function QuickCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: "emerald";
}) {
  return (
    <div className="glass-card rounded-2xl p-3 shadow-[var(--shadow-soft)] sm:p-4">
      <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {icon} {label}
      </div>
      <div
        className={`mt-1 truncate text-sm font-extrabold sm:text-base ${
          accent === "emerald" ? "text-emerald-600" : "text-foreground"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-muted/40 p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 truncate text-sm font-extrabold text-foreground">{value}</div>
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
    tone === "gold"
      ? "hsl(var(--gold))"
      : tone === "leaf"
      ? "hsl(var(--leaf))"
      : "hsl(var(--primary))";
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
          style={{
            stroke,
            transform: "rotate(-90deg)",
            transformOrigin: "center",
            transition: "stroke-dashoffset 700ms",
          }}
        />
        <text
          x="50%"
          y="52%"
          textAnchor="middle"
          className="fill-foreground text-[15px] font-extrabold"
        >
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
}: {
  label: string;
  value: string;
  highlight?: boolean;
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
      <div className="text-sm font-bold text-foreground">{value}</div>
    </li>
  );
}

function EmptyTile({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="grid h-full w-full place-items-center text-muted-foreground">
      <div className="flex flex-col items-center gap-2">
        {icon}
        <span className="text-xs font-semibold">{label}</span>
      </div>
    </div>
  );
}

function toEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtube.com" || host === "m.youtube.com") {
      const v = u.searchParams.get("v");
      return v ? `https://www.youtube.com/embed/${v}` : null;
    }
    if (host === "youtu.be") {
      const id = u.pathname.slice(1);
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (host === "vimeo.com") {
      const id = u.pathname.split("/").filter(Boolean)[0];
      return id ? `https://player.vimeo.com/video/${id}` : null;
    }
    if (host.includes("matterport.com") || host.includes("sketchfab.com")) {
      return url;
    }
    return null;
  } catch {
    return null;
  }
}
