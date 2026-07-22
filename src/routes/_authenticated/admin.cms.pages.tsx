import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Sparkles, Plus, Copy, Archive, ExternalLink, Search } from "lucide-react";
import { RoleGuard } from "@/components/aawash/AuthGuard";
import { AdminShell } from "@/components/aawash/admin/AdminShell";
import { useSession } from "@/hooks/useSession";
import { SectionCard, EmptyState, SkeletonBlock } from "@/components/aawash/dashboard-kit";
import { cmsListPages, cmsCreatePage, cmsDuplicatePage, cmsSetPageStatus } from "@/lib/cms.functions";

export const Route = createFileRoute("/_authenticated/admin/cms/pages")({
  component: () => (<RoleGuard allow={["super_admin"]}><Content /></RoleGuard>),
  head: () => ({
    meta: [
      { title: "Website CMS — Pages" },
      { name: "description", content: "Manage every website page, section and SEO field." },
      { property: "og:title", content: "Website CMS — Pages" },
      { property: "og:description", content: "Visual page builder and CMS for the Aawash website." },
    ],
  }),
});

function Content() {
  const { profile } = useSession();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | "draft" | "published" | "archived">("all");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: "", slug: "" });

  const listFn = useServerFn(cmsListPages);
  const list = useQuery({ queryKey: ["cms-pages", q, status], queryFn: () => listFn({ data: { search: q || undefined, status } }) });

  const createFn = useServerFn(cmsCreatePage);
  const createMut = useMutation({
    mutationFn: () => createFn({ data: form }),
    onSuccess: (r) => { toast.success("Page created"); nav({ to: "/admin/cms/pages/$id", params: { id: r.id } }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const dupFn = useServerFn(cmsDuplicatePage);
  const dupMut = useMutation({
    mutationFn: (id: string) => dupFn({ data: { page_id: id } }),
    onSuccess: () => { toast.success("Duplicated"); qc.invalidateQueries({ queryKey: ["cms-pages"] }); },
  });

  const setStatusFn = useServerFn(cmsSetPageStatus);
  const setStatusMut = useMutation({
    mutationFn: (v: { page_id: string; status: "draft" | "published" | "archived" }) => setStatusFn({ data: v }),
    onSuccess: () => { toast.success("Updated"); qc.invalidateQueries({ queryKey: ["cms-pages"] }); },
  });

  return (
    <AdminShell profile={profile}>
      <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
        <header className="glass-card rounded-3xl p-5 sm:p-6">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary"><Sparkles className="h-4 w-4" /> Website CMS</div>
              <h1 className="mt-1 truncate text-2xl font-black sm:text-3xl">Pages & Visual Builder</h1>
              <p className="mt-1 text-sm text-muted-foreground">Create, edit, publish and roll back every website page.</p>
            </div>
            <button onClick={() => setCreating((v) => !v)} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"><Plus className="h-4 w-4" /> New page</button>
          </div>
          {creating && (
            <div className="mt-4 grid gap-3 rounded-2xl border border-border bg-background p-4 sm:grid-cols-[1fr_1fr_auto]">
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value, slug: form.slug || e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") })} placeholder="Page title" className="rounded-xl border border-border bg-card px-3 py-2 text-sm" />
              <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="slug (e.g. about-us)" className="rounded-xl border border-border bg-card px-3 py-2 text-sm font-mono" />
              <button disabled={!form.title || !form.slug || createMut.isPending} onClick={() => createMut.mutate()} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">{createMut.isPending ? "Creating…" : "Create"}</button>
            </div>
          )}
        </header>

        <SectionCard title="All pages" subtitle="Managed website surface">
          <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title or slug…" className="w-full rounded-xl border border-border bg-background py-2 pl-9 pr-3 text-sm" />
            </div>
            <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className="rounded-xl border border-border bg-background px-3 py-2 text-sm">
              <option value="all">All statuses</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          {list.isLoading ? (
            <SkeletonBlock lines={6} />
          ) : (list.data ?? []).length === 0 ? (
            <EmptyState title="No pages yet" description="Create your first CMS page." />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                  <tr><th className="px-4 py-2">Title</th><th className="px-4 py-2">Slug</th><th className="px-4 py-2">Status</th><th className="px-4 py-2">Updated</th><th className="px-4 py-2 text-right">Actions</th></tr>
                </thead>
                <tbody>
                  {(list.data ?? []).map((p) => (
                    <tr key={p.id} className="border-t border-border">
                      <td className="px-4 py-2 font-semibold">{p.title}</td>
                      <td className="px-4 py-2 font-mono text-xs">/{p.slug}</td>
                      <td className="px-4 py-2"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${p.status === "published" ? "bg-primary/20 text-primary" : p.status === "archived" ? "bg-muted text-muted-foreground" : "bg-warning/20 text-warning"}`}>{p.status}</span></td>
                      <td className="px-4 py-2 text-xs text-muted-foreground">{new Date(p.updated_at).toLocaleString()}</td>
                      <td className="px-4 py-2">
                        <div className="flex justify-end gap-1">
                          <Link to="/admin/cms/pages/$id" params={{ id: p.id }} className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs hover:bg-muted"><ExternalLink className="h-3 w-3" /> Edit</Link>
                          <button onClick={() => dupMut.mutate(p.id)} className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs hover:bg-muted"><Copy className="h-3 w-3" /> Duplicate</button>
                          <button onClick={() => setStatusMut.mutate({ page_id: p.id, status: p.status === "archived" ? "draft" : "archived" })} className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs hover:bg-muted"><Archive className="h-3 w-3" /> {p.status === "archived" ? "Restore" : "Archive"}</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </div>
    </AdminShell>
  );
}
