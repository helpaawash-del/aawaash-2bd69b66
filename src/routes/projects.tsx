import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Building2, Search, SlidersHorizontal, X } from "lucide-react";
import { AmbientBackground } from "@/components/aawash/AmbientBackground";
import { LandingNav } from "@/components/aawash/landing/LandingNav";
import { Reveal } from "@/components/aawash/landing/Reveal";
import { ProjectCard } from "@/components/aawash/projects/ProjectCard";
import { EmptyState, SkeletonBlock } from "@/components/aawash/dashboard-kit";
import {
  listPublicProjects,
  getPublicProjectStats,
  type ProjectFilters,
} from "@/lib/projects.functions";
import { supabase } from "@/integrations/supabase/client";

const SORT_OPTIONS: { value: NonNullable<ProjectFilters["sort"]>; label: string }[] = [
  { value: "priority", label: "Featured" },
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "alphabetical", label: "A → Z" },
  { value: "price_low", label: "Price: Low" },
  { value: "price_high", label: "Price: High" },
];

const STATUS_OPTIONS = [
  { value: "", label: "All Status" },
  { value: "planning", label: "Planning" },
  { value: "pre_launch", label: "Pre-Launch" },
  { value: "under_construction", label: "Under Construction" },
  { value: "nearing_completion", label: "Nearing Completion" },
  { value: "ready_to_move", label: "Ready to Move" },
  { value: "completed", label: "Completed" },
];

const TYPE_OPTIONS = [
  { value: "", label: "All Types" },
  { value: "entire_building", label: "Entire Building" },
  { value: "flat_inventory", label: "Flat Inventory" },
];

const AVAILABILITY_OPTIONS = [
  { value: "any", label: "Any" },
  { value: "available", label: "Available" },
  { value: "sold_out", label: "Sold Out" },
] as const;

type Search = {
  q?: string;
  type?: string;
  status?: string;
  avail?: "any" | "available" | "sold_out";
  sort?: NonNullable<ProjectFilters["sort"]>;
};

export const Route = createFileRoute("/projects")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    q: typeof s.q === "string" ? s.q : undefined,
    type: typeof s.type === "string" ? s.type : undefined,
    status: typeof s.status === "string" ? s.status : undefined,
    avail:
      s.avail === "available" || s.avail === "sold_out" || s.avail === "any" ? s.avail : undefined,
    sort:
      typeof s.sort === "string"
        ? (SORT_OPTIONS.find((o) => o.value === s.sort)?.value ?? undefined)
        : undefined,
  }),
  component: ProjectsPage,
  head: () => ({
    meta: [
      { title: "Projects — Aawash Real Estate" },
      {
        name: "description",
        content:
          "Explore Aawash's curated portfolio of residential projects — premium towers, boutique flats, and future-ready communities.",
      },
      { property: "og:title", content: "Projects — Aawash Real Estate" },
      {
        property: "og:description",
        content: "Premium residential projects curated by Aawash.",
      },
    ],
  }),
});

function ProjectsPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  const [qLocal, setQLocal] = useState(search.q ?? "");
  const [showFilters, setShowFilters] = useState(false);

  // Debounce search input into URL state
  useEffect(() => {
    const t = setTimeout(() => {
      if ((qLocal || "") !== (search.q || "")) {
        navigate({ search: (prev: Search) => ({ ...prev, q: qLocal || undefined }), replace: true });
      }
    }, 220);
    return () => clearTimeout(t);
  }, [qLocal]); // eslint-disable-line react-hooks/exhaustive-deps

  const filters: ProjectFilters = useMemo(
    () => ({
      q: search.q,
      project_type: search.type || undefined,
      construction_status: search.status || undefined,
      availability: (search.avail as ProjectFilters["availability"]) || undefined,
      sort: search.sort ?? "priority",
    }),
    [search],
  );

  const fetchList = useServerFn(listPublicProjects);
  const fetchStats = useServerFn(getPublicProjectStats);

  const listQ = useQuery({
    queryKey: ["projects", "public", filters],
    queryFn: () => fetchList({ data: filters }),
  });
  const statsQ = useQuery({
    queryKey: ["projects", "public-stats"],
    queryFn: () => fetchStats(),
  });

  // Realtime — refetch on any project change
  useEffect(() => {
    const channel = supabase
      .channel("projects-public-catalogue")
      .on("postgres_changes", { event: "*", schema: "public", table: "projects" }, () => {
        listQ.refetch();
        statsQ.refetch();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const projects = listQ.data ?? [];
  const stats = statsQ.data;

  const activeFilters =
    (search.type ? 1 : 0) + (search.status ? 1 : 0) + (search.avail && search.avail !== "any" ? 1 : 0);

  function reset() {
    setQLocal("");
    navigate({ search: () => ({}), replace: true });
  }

  return (
    <div className="relative min-h-screen">
      <AmbientBackground />
      <LandingNav />

      <main className="mx-auto max-w-6xl px-4 pb-24 pt-24 sm:px-6 sm:pt-28">
        {/* Hero */}
        <Reveal>
          <section className="glass-card relative overflow-hidden rounded-[2rem] p-6 shadow-[var(--shadow-float)] sm:p-10">
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_10%,hsl(var(--primary)/0.18),transparent_60%),radial-gradient(circle_at_85%_90%,hsl(var(--gold)/0.15),transparent_60%)]" />
            <div className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
              Curated Portfolio
            </div>
            <h1 className="mt-3 max-w-2xl text-3xl font-extrabold tracking-tight text-foreground sm:text-5xl">
              Aawash Projects
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              A hand-picked catalogue of premium residential developments. Search, filter, and
              explore properties designed for modern living.
            </p>

            {/* Stat pills */}
            <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <HeroStat label="Projects" value={stats?.projects ?? "—"} />
              <HeroStat label="Buildings" value={stats?.buildings ?? "—"} />
              <HeroStat label="Total Flats" value={stats?.total_flats ?? "—"} />
              <HeroStat label="Available" value={stats?.available_flats ?? "—"} />
            </div>
          </section>
        </Reveal>

        {/* Search + filter bar */}
        <section className="sticky top-20 z-20 mt-6">
          <div className="glass-card flex flex-col gap-3 rounded-3xl p-3 shadow-[var(--shadow-soft)] sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search
                size={16}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                value={qLocal}
                onChange={(e) => setQLocal(e.target.value)}
                placeholder="Search by name, location, building…"
                className="h-11 w-full rounded-2xl border border-input bg-surface pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowFilters((s) => !s)}
                className="inline-flex h-11 items-center gap-2 rounded-2xl border border-input bg-surface px-4 text-sm font-semibold text-foreground transition hover:bg-muted"
              >
                <SlidersHorizontal size={14} /> Filters
                {activeFilters > 0 && (
                  <span className="rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                    {activeFilters}
                  </span>
                )}
              </button>
              <select
                value={search.sort ?? "priority"}
                onChange={(e) =>
                  navigate({
                    search: (prev: Search) => ({
                      ...prev,
                      sort: e.target.value as NonNullable<ProjectFilters["sort"]>,
                    }),
                    replace: true,
                  })
                }
                className="h-11 rounded-2xl border border-input bg-surface px-3 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {showFilters && (
            <div className="glass-card mt-2 grid gap-3 rounded-3xl p-4 shadow-[var(--shadow-soft)] sm:grid-cols-4">
              <FilterSelect
                label="Project Type"
                value={search.type ?? ""}
                onChange={(v) =>
                  navigate({
                    search: (prev: Search) => ({ ...prev, type: v || undefined }),
                    replace: true,
                  })
                }
                options={TYPE_OPTIONS}
              />
              <FilterSelect
                label="Status"
                value={search.status ?? ""}
                onChange={(v) =>
                  navigate({
                    search: (prev: Search) => ({ ...prev, status: v || undefined }),
                    replace: true,
                  })
                }
                options={STATUS_OPTIONS}
              />
              <FilterSelect
                label="Availability"
                value={search.avail ?? "any"}
                onChange={(v) =>
                  navigate({
                    search: (prev: Search) => ({
                      ...prev,
                      avail: (v as Search["avail"]) || undefined,
                    }),
                    replace: true,
                  })
                }
                options={AVAILABILITY_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
              />
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={reset}
                  className="inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-2xl border border-input bg-surface px-4 text-sm font-semibold text-muted-foreground transition hover:text-foreground"
                >
                  <X size={14} /> Reset
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Grid */}
        <section className="mt-6">
          {listQ.isLoading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonBlock key={i} className="h-80" />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <EmptyState
              icon={<Building2 size={22} />}
              title="No projects match"
              body="Try adjusting your filters or search terms."
            />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((p, i) => (
                <ProjectCard key={p.id} project={p} index={i} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function HeroStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="glass-card rounded-2xl px-3 py-2.5">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 text-lg font-extrabold text-foreground sm:text-xl">{value}</div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-2xl border border-input bg-surface px-3 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
