import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Building2, MapPin, Search } from "lucide-react";
import { useState, useMemo } from "react";
import { useSession } from "@/hooks/useSession";
import { RoleGuard } from "@/components/aawash/AuthGuard";
import { DashboardShell } from "@/components/aawash/DashboardShell";
import { EmptyState, SkeletonBlock, formatINR } from "@/components/aawash/dashboard-kit";
import { listProjects } from "@/lib/leader.functions";

export const Route = createFileRoute("/_authenticated/leader/projects")({
  component: ProjectsPage,
  head: () => ({ meta: [{ title: "Projects — Aawash" }] }),
});

function ProjectsPage() {
  return (
    <RoleGuard allow={["team_leader", "super_admin", "member"]}>
      <ProjectsContent />
    </RoleGuard>
  );
}

function ProjectsContent() {
  const { profile, role } = useSession();
  const fetchProjects = useServerFn(listProjects);
  const [q, setQ] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["projects", "all"],
    queryFn: () => fetchProjects(),
  });

  const projects = useMemo(() => {
    const list = data ?? [];
    if (!q.trim()) return list;
    const t = q.trim().toLowerCase();
    return list.filter((p) => p.name.toLowerCase().includes(t) || p.location.toLowerCase().includes(t));
  }, [data, q]);

  return (
    <DashboardShell role={role || "team_leader"} profile={profile}>
      <header>
        <div className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
          Inventory
        </div>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">Projects</h1>
        <p className="mt-1 text-sm text-muted-foreground">Live developments available to sell.</p>
      </header>

      <section className="mt-6">
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="Search projects…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-12 w-full rounded-2xl border border-input bg-surface pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </section>

      <section className="mt-6">
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonBlock key={i} className="h-64" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <EmptyState
            icon={<Building2 size={22} />}
            title={q ? "No matches" : "No projects yet"}
            body={q ? "Try a different search." : "Projects will appear here once Admin publishes them."}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => {
              const pct = p.total_units ? Math.min(100, Math.round((p.sold_units / p.total_units) * 100)) : 0;
              return (
                <Link
                  key={p.id}
                  to="/projects/$slug"
                  params={{ slug: p.slug }}
                  aria-label={`Open ${p.name}`}
                  className="glass-card block overflow-hidden rounded-3xl shadow-[var(--shadow-soft)] transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-float)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                >
                  <div className={`relative aspect-[16/10] bg-gradient-to-br ${p.hero_hue}`}>
                    {p.tag && (
                      <span className="glass-card absolute left-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                        {p.tag}
                      </span>
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="text-base font-bold text-foreground">{p.name}</h3>
                    <div className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin size={12} /> {p.location}
                    </div>
                    {p.description && (
                      <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                        {p.description}
                      </p>
                    )}
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Starting</div>
                        <div className="text-sm font-extrabold text-foreground">
                          {formatINR(p.price_from, { compact: true })}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Units</div>
                        <div className="text-sm font-extrabold text-foreground">
                          {p.sold_units}/{p.total_units}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary to-leaf transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </DashboardShell>
  );
}
