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
  CheckCircle2,
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
import { getProjectFlats } from "@/lib/project-flats";

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
  const {
    data: project,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["project", "public", slug],
    queryFn: () => fetchProject({ data: { slug } }),
  });

  // Realtime: admin edits to projects or flats invalidate this page instantly.
  useRealtimeInvalidate(
    `project-public-${slug}`,
    ["projects", "flats"],
    [
      ["project", "public", slug],
      ["project-inventory-public", slug],
    ],
    { pollMs: 45_000 },
  );

  const [lightbox, setLightbox] = useState<number | null>(null);

  if (!isLoading && !project) throw notFound();

  const p = (project ?? {}) as Record<string, unknown>;
  const total = (p.total_flats as number) ?? 0;
  const available = (p.available_flats as number) ?? 0;
  const reserved = (p.reserved_flats as number) ?? 0;
  const sold = (p.sold_flats as number) ?? 0;

  const gallery = useMemo<string[]>(() => {
    const raw = p.gallery;
    if (Array.isArray(raw)) return raw.filter((v): v is string => typeof v === "string" && !!v);
    return [];
  }, [p.gallery]);

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

  const dockItems: Array<{
    id: string;
    label: string;
    icon: React.ElementType;
    href: string;
    targetId?: string;
  }> = [
    { id: "home", label: "Home", icon: HomeIcon, href: "/" },
    { id: "gallery", label: "Gallery", icon: Images, href: "#gallery", targetId: "gallery" },
    { id: "flats", label: "Total Flats", icon: Layers, href: "#flats", targetId: "flats" },
    {
      id: "availability",
      label: "Availability",
      icon: Grid3x3,
      href: "#availability",
      targetId: "availability",
    },
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

      {/* Floating share pill (top-right, under header) */}
      {project && (
        <button
          onClick={doShare}
          aria-label="Share project"
          className="fixed right-4 top-20 z-30 grid h-10 w-10 place-items-center rounded-full border border-border bg-white text-foreground shadow-[var(--shadow-soft)] hover:text-primary sm:right-8"
        >
          <Share2 size={14} />
        </button>
      )}

      <main className="mx-auto max-w-6xl px-4 pb-16 pt-24 sm:px-6 sm:pt-28">
        <Link
          to="/projects"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={14} /> All Projects
        </Link>

        {isError ? (
          <div className="mt-6 rounded-3xl border border-destructive/30 bg-destructive/5 p-6 text-center">
            <p className="text-sm font-semibold text-destructive">We couldn't load this project.</p>
            <button
              onClick={() => refetch()}
              className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-full bg-primary px-4 text-xs font-bold text-primary-foreground shadow-[var(--shadow-glow)] hover:brightness-110"
            >
              Retry
            </button>
          </div>
        ) : isLoading || !project ? (
          <div className="mt-4 space-y-4" aria-busy="true" aria-live="polite">
            <SkeletonBlock className="h-72 rounded-[2rem]" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonBlock key={i} className="h-20 rounded-2xl" />
              ))}
            </div>
            <SkeletonBlock className="h-40 rounded-3xl" />
            <SkeletonBlock className="h-64 rounded-3xl" />
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
                      onClick={() => setLightbox(0)}
                      className="glass-card absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold text-foreground shadow-[var(--shadow-soft)]"
                    >
                      <Images size={12} /> {heroImages.length} photos
                    </button>
                  )}
                </div>

                {/* Title + Price sit BELOW the image, never overlapping */}
                <div className="flex flex-wrap items-end justify-between gap-4 border-t border-border/60 bg-surface/60 p-5 sm:p-8">
                  <div className="min-w-0 max-w-full flex-1">
                    {(p.tag as string) && (
                      <span className="inline-block rounded-full bg-primary-soft px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                        {p.tag as string}
                      </span>
                    )}
                    <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-foreground sm:text-5xl">
                      {p.name as string}
                    </h1>
                    <div className="mt-1 inline-flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin size={14} />
                      <span className="truncate">
                        {(p.address as string) || (p.location as string)}
                      </span>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-white/80 px-4 py-3 shadow-[var(--shadow-soft)]">
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

            {/* ABOUT + STATS (Overview) */}
            <div id="about" className="mt-6">
              <OverviewPanel
                p={p}
                total={total}
                available={available}
                reserved={reserved}
                sold={sold}
              />
            </div>

            {/* AVAILABILITY (seatmap) */}
            <section id="availability" className="mt-8 scroll-mt-24">
              <SectionHeader
                icon={<Grid3x3 size={16} />}
                title="Availability"
                subtitle="Live flat seatmap"
              />
              <div className="mt-4">
                <Reveal>
                  <FlatInventoryBoard slug={slug} projectName={p.name as string} />
                </Reveal>
              </div>
            </section>

            {/* GALLERY */}
            <section id="gallery" className="mt-8 scroll-mt-24">
              <SectionHeader
                icon={<Images size={16} />}
                title="Gallery"
                subtitle="Photos of the project"
              />
              <div className="mt-4">
                <GalleryPanel images={heroImages} onOpen={(i) => setLightbox(i)} />
              </div>
            </section>

            {/* 3D MODEL */}
            <section id="tour" className="mt-8 scroll-mt-24">
              <SectionHeader
                icon={<Box size={16} />}
                title="3D Model"
                subtitle="Explore in immersive detail"
              />
              <div className="mt-4">
                <TourPanel modelUrl={modelUrl} isGlb={isGlb} />
              </div>
            </section>

            {/* LOCATION */}
            <section id="location" className="mt-8 scroll-mt-24">
              <SectionHeader
                icon={<MapPin size={16} />}
                title="Location"
                subtitle="Where you'll live"
              />
              <div className="mt-4">
                <LocationPanel p={p} />
              </div>
            </section>

            {/* Desktop CTAs */}
            <div className="mt-10 hidden flex-wrap gap-3 sm:flex">
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
            </div>
          </>
        )}
      </main>

      {/* Project Dock — Home / Gallery / Total Flats / Availability */}
      {project && <ProjectDock items={dockItems} />}

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
  total,
  available,
  reserved,
  sold,
}: {
  p: Record<string, unknown>;
  total: number;
  available: number;
  reserved: number;
  sold: number;
}) {
  return (
    <div className="space-y-6">
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
            <GalleryTile key={`${src}-${i}`} src={src} index={i} onOpen={onOpen} />
          ))}
        </div>
      </section>
    </Reveal>
  );
}

function GalleryTile({
  src,
  index,
  onOpen,
}: {
  src: string;
  index: number;
  onOpen: (i: number) => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  return (
    <button
      type="button"
      onClick={() => onOpen(index)}
      className="group relative aspect-square overflow-hidden rounded-2xl border border-border/60 bg-muted/30"
    >
      {!loaded && !errored && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-muted/60 to-muted/30" />
      )}
      {errored ? (
        <div className="absolute inset-0 grid place-items-center text-muted-foreground">
          <Images size={18} />
        </div>
      ) : (
        <img
          src={src}
          alt=""
          className={`h-full w-full object-cover transition-all duration-500 group-hover:scale-[1.05] ${loaded ? "opacity-100" : "opacity-0"}`}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
  );
}

function TourPanel({ modelUrl, isGlb }: { modelUrl: string | null; isGlb: boolean }) {
  return (
    <div className="space-y-4">
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
          <div className="relative aspect-video w-full bg-gradient-to-br from-primary/5 to-leaf/10">
            {!modelUrl ? (
              <EmptyTile icon={<Box size={22} />} label="3D tour coming soon" />
            ) : isGlb ? (
              <ModelViewerFrame src={modelUrl} />
            ) : (
              <IframeFrame src={modelUrl} title="3D tour" />
            )}
          </div>
        </section>
      </Reveal>
    </div>
  );
}

function ModelViewerFrame({ src }: { src: string }) {
  const [ready, setReady] = useState(false);
  const [errored, setErrored] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const check = () => {
      if (cancelled) return;
      if (customElements.get("model-viewer")) setReady(true);
      else setTimeout(check, 200);
    };
    check();
    return () => {
      cancelled = true;
    };
  }, []);
  if (errored) {
    return <EmptyTile icon={<Box size={22} />} label="Couldn't load 3D model" />;
  }
  return (
    <>
      {!ready && (
        <div className="absolute inset-0 grid animate-pulse place-items-center text-muted-foreground">
          <div className="flex flex-col items-center gap-2">
            <Box size={22} />
            <span className="text-xs font-semibold">Loading 3D model…</span>
          </div>
        </div>
      )}
      {ready && (
        // @ts-expect-error - custom element
        <model-viewer
          src={src}
          camera-controls
          auto-rotate
          auto-rotate-delay="300"
          rotation-per-second="18deg"
          touch-action="pan-y"
          interaction-prompt="none"
          loading="eager"
          reveal="auto"
          shadow-intensity="0"
          exposure="1"
          power-preference="high-performance"
          onError={() => setErrored(true)}
          style={{ width: "100%", height: "100%", background: "transparent" }}
        />
      )}
    </>
  );
}

function IframeFrame({ src, title }: { src: string; title: string }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <>
      {!loaded && (
        <div className="absolute inset-0 grid animate-pulse place-items-center text-muted-foreground">
          <div className="flex flex-col items-center gap-2">
            <Box size={22} />
            <span className="text-xs font-semibold">Loading tour…</span>
          </div>
        </div>
      )}
      <iframe
        title={title}
        src={src}
        onLoad={() => setLoaded(true)}
        className="h-full w-full"
        allow="fullscreen; xr-spatial-tracking; vr; accelerometer; gyroscope"
        allowFullScreen
      />
    </>
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
          <div className="text-xs text-muted-foreground">
            Nearby: schools, hospitals, markets & transit
          </div>
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
      <div
        className="absolute bottom-3 left-1/2 flex max-w-[92vw] -translate-x-1/2 flex-col items-center gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white">
          {index + 1} / {images.length}
        </div>
        {images.length > 1 && (
          <div className="flex max-w-[92vw] gap-2 overflow-x-auto rounded-2xl bg-white/10 p-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {images.map((src, i) => (
              <button
                key={`thumb-${src}-${i}`}
                type="button"
                onClick={() => onIndex(i)}
                aria-label={`View photo ${i + 1}`}
                aria-current={i === index}
                className={`relative h-12 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition ${
                  i === index ? "border-white" : "border-transparent opacity-60 hover:opacity-100"
                }`}
              >
                <img
                  src={src}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
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

/* ================== SECTION HEADER + PROJECT DOCK ================== */

function SectionHeader({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div>
        <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-primary-soft">
            {icon}
          </span>
          {title}
        </div>
        {subtitle ? <div className="mt-1 text-sm text-muted-foreground">{subtitle}</div> : null}
      </div>
    </div>
  );
}

function ProjectDock({
  items,
}: {
  items: Array<{
    id: string;
    label: string;
    icon: React.ElementType;
    href: string;
    targetId?: string;
  }>;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const targetIds = useMemo(
    () => items.map((i) => i.targetId).filter((v): v is string => !!v),
    [items],
  );

  useEffect(() => {
    if (!targetIds.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        // Pick the entry closest to the top that is intersecting
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-40% 0px -50% 0px", threshold: [0, 0.1, 0.5] },
    );
    const els: HTMLElement[] = [];
    targetIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        observer.observe(el);
        els.push(el);
      }
    });
    return () => observer.disconnect();
  }, [targetIds]);

  const onClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (!href.startsWith("#")) return;
    e.preventDefault();
    const el = document.getElementById(href.slice(1));
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  return (
    <nav
      aria-label="Project sections"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[95] px-3 pb-[calc(max(0.75rem,env(safe-area-inset-bottom))+0.25rem)] sm:px-6"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 mx-auto h-10 max-w-[300px] rounded-full bg-primary/15 blur-2xl"
      />
      <ul className="pointer-events-auto relative mx-auto flex h-[68px] w-full max-w-[420px] items-stretch justify-between rounded-[32px] border border-white/60 bg-white/85 px-1.5 shadow-[0_20px_50px_rgba(46,125,91,0.18),0_4px_12px_rgba(0,0,0,0.05)] ring-1 ring-black/5 backdrop-blur-2xl">
        {items.map(({ id, label, icon: Icon, href, targetId }) => {
          const isRoute = href.startsWith("/");
          const Cmp: React.ElementType = isRoute ? Link : "a";
          const props = isRoute
            ? { to: href }
            : { href, onClick: (e: React.MouseEvent<HTMLAnchorElement>) => onClick(e, href) };
          const isActive = !!targetId && activeId === targetId;
          return (
            <li key={id} className="relative flex min-w-0 flex-1">
              <Cmp
                {...(props as Record<string, unknown>)}
                aria-label={label}
                aria-current={isActive ? "page" : undefined}
                className={`group relative flex min-h-11 min-w-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-[24px] px-1 outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-primary/40 ${
                  isActive ? "text-primary" : "text-slate-600 hover:text-primary"
                }`}
              >
                {isActive && (
                  <span
                    aria-hidden
                    className="absolute inset-x-2 inset-y-1 -z-10 rounded-[20px] bg-primary/10 ring-1 ring-primary/25"
                  />
                )}
                <Icon size={20} strokeWidth={isActive ? 2.4 : 2} aria-hidden="true" />
                <span className="w-full truncate text-center text-[10px] font-semibold leading-none tracking-tight">
                  {label}
                </span>
                {isActive && (
                  <span
                    aria-hidden
                    className="absolute -bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary"
                  />
                )}
              </Cmp>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
