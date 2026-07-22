import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Save, Rocket, History, Plus, Trash2, ArrowUp, ArrowDown, Eye, EyeOff, Copy, Monitor, Tablet, Smartphone } from "lucide-react";
import { RoleGuard } from "@/components/aawash/AuthGuard";
import { AdminShell } from "@/components/aawash/admin/AdminShell";
import { useSession } from "@/hooks/useSession";
import { SectionCard, SkeletonBlock } from "@/components/aawash/dashboard-kit";
import { cmsGetPage, cmsSaveDraft, cmsPublishPage, cmsUpdatePageMeta, cmsRollbackPage, cmsGetVersion } from "@/lib/cms.functions";
import { BlockRenderer, BLOCK_TYPES, type Block } from "@/components/aawash/cms/BlockRenderer";

export const Route = createFileRoute("/_authenticated/admin/cms/pages/$id")({
  component: () => (<RoleGuard allow={["super_admin"]}><Content /></RoleGuard>),
  head: () => ({ meta: [{ title: "Page editor — Aawash CMS" }, { name: "description", content: "Visual block editor for CMS pages." }, { name: "robots", content: "noindex" }] }),
});

function uid() { return Math.random().toString(36).slice(2, 10); }

function Content() {
  const { profile } = useSession();
  const { id } = Route.useParams();
  const qc = useQueryClient();

  const getFn = useServerFn(cmsGetPage);
  const q = useQuery({ queryKey: ["cms-page", id], queryFn: () => getFn({ data: { id } }) });

  const [blocks, setBlocks] = useState<Block[]>([]);
  const [seo, setSeo] = useState<{ title?: string; description?: string; keywords?: string }>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [device, setDevice] = useState<"mobile" | "tablet" | "desktop">("desktop");
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (q.data) {
      setBlocks((q.data.blocks as Block[]) ?? []);
      setSeo((q.data.seo as typeof seo) ?? {});
    }
  }, [q.data]);

  const saveFn = useServerFn(cmsSaveDraft);
  const saveMut = useMutation({
    mutationFn: (note?: string) => saveFn({ data: { page_id: id, blocks, seo, note } }),
    onSuccess: () => { toast.success("Draft saved"); qc.invalidateQueries({ queryKey: ["cms-page", id] }); },
  });

  const pubFn = useServerFn(cmsPublishPage);
  const pubMut = useMutation({
    mutationFn: async () => {
      await saveFn({ data: { page_id: id, blocks, seo, note: "Auto-save before publish" } });
      return pubFn({ data: { page_id: id } });
    },
    onSuccess: () => { toast.success("Published"); qc.invalidateQueries({ queryKey: ["cms-page", id] }); },
  });

  const metaFn = useServerFn(cmsUpdatePageMeta);
  type MetaPatch = { page_id: string; seo_title?: string | null; seo_description?: string | null; seo_keywords?: string | null; title?: string; slug?: string };
  const metaMut = useMutation({
    mutationFn: (patch: MetaPatch) => metaFn({ data: patch }),
    onSuccess: () => { toast.success("Meta updated"); qc.invalidateQueries({ queryKey: ["cms-page", id] }); },
  });

  const rbFn = useServerFn(cmsRollbackPage);
  const rbMut = useMutation({
    mutationFn: (version_id: string) => rbFn({ data: { page_id: id, version_id } }),
    onSuccess: () => { toast.success("Rolled back"); qc.invalidateQueries({ queryKey: ["cms-page", id] }); setShowHistory(false); },
  });

  const selected = useMemo(() => blocks.find((b) => b.id === selectedId) ?? null, [blocks, selectedId]);

  function addBlock(type: string) {
    const def = BLOCK_TYPES.find((t) => t.type === type);
    const b: Block = { id: uid(), type, props: { ...(def?.defaults ?? {}) } };
    setBlocks((prev) => [...prev, b]);
    setSelectedId(b.id);
  }
  function move(idx: number, dir: -1 | 1) {
    setBlocks((prev) => {
      const next = [...prev];
      const j = idx + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });
  }
  function remove(bid: string) { setBlocks((p) => p.filter((b) => b.id !== bid)); if (selectedId === bid) setSelectedId(null); }
  function duplicate(bid: string) {
    setBlocks((p) => {
      const i = p.findIndex((b) => b.id === bid);
      if (i < 0) return p;
      const copy = { ...p[i], id: uid() };
      return [...p.slice(0, i + 1), copy, ...p.slice(i + 1)];
    });
  }
  function toggleHide(bid: string) { setBlocks((p) => p.map((b) => b.id === bid ? { ...b, hidden: !b.hidden } : b)); }
  function updateSelected(patch: Record<string, unknown>) {
    if (!selected) return;
    setBlocks((p) => p.map((b) => b.id === selected.id ? { ...b, props: { ...(b.props ?? {}), ...patch } } : b));
  }

  if (q.isLoading) return <AdminShell profile={profile}><div className="p-6"><SkeletonBlock className="h-40" /></div></AdminShell>;
  if (!q.data) return <AdminShell profile={profile}><div className="p-6">Page not found.</div></AdminShell>;

  const page = q.data.page;
  const previewWidth = device === "mobile" ? 390 : device === "tablet" ? 768 : "100%";

  return (
    <AdminShell profile={profile}>
      <div className="mx-auto max-w-[1600px] space-y-4 p-3 sm:p-4">
        <header className="glass-card rounded-3xl p-4">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
            <div className="min-w-0">
              <Link to="/admin/cms/pages" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3 w-3" /> Back</Link>
              <h1 className="mt-1 truncate text-xl font-black sm:text-2xl">{page.title}</h1>
              <p className="truncate text-xs text-muted-foreground">/{page.slug} · <span className={page.status === "published" ? "text-primary" : "text-warning"}>{page.status}</span></p>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-1 rounded-xl border border-border bg-background p-1">
                <button onClick={() => setDevice("mobile")} className={`rounded-lg p-1.5 ${device === "mobile" ? "bg-muted" : ""}`}><Smartphone className="h-4 w-4" /></button>
                <button onClick={() => setDevice("tablet")} className={`rounded-lg p-1.5 ${device === "tablet" ? "bg-muted" : ""}`}><Tablet className="h-4 w-4" /></button>
                <button onClick={() => setDevice("desktop")} className={`rounded-lg p-1.5 ${device === "desktop" ? "bg-muted" : ""}`}><Monitor className="h-4 w-4" /></button>
              </div>
              <button onClick={() => setShowHistory(true)} className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-1.5 text-sm font-semibold hover:bg-muted"><History className="h-4 w-4" /> History</button>
              <button onClick={() => saveMut.mutate(undefined)} disabled={saveMut.isPending} className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-1.5 text-sm font-semibold hover:bg-muted disabled:opacity-50"><Save className="h-4 w-4" /> {saveMut.isPending ? "Saving…" : "Save draft"}</button>
              <button onClick={() => pubMut.mutate()} disabled={pubMut.isPending} className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"><Rocket className="h-4 w-4" /> {pubMut.isPending ? "Publishing…" : "Publish"}</button>
            </div>
          </div>
        </header>

        <div className="grid gap-4 lg:grid-cols-[240px_1fr_320px]">
          {/* Left: block palette + tree */}
          <aside className="space-y-3">
            <SectionCard title="Add block" subtitle="">
              <div className="grid grid-cols-2 gap-1.5">
                {BLOCK_TYPES.map((t) => (
                  <button key={t.type} onClick={() => addBlock(t.type)} className="rounded-lg border border-border bg-background px-2 py-1.5 text-left text-xs font-semibold hover:bg-muted">
                    <Plus className="mr-1 inline h-3 w-3" />{t.label}
                  </button>
                ))}
              </div>
            </SectionCard>
            <SectionCard title="Structure" subtitle={`${blocks.length} blocks`}>
              <div className="space-y-1">
                {blocks.length === 0 && <div className="text-xs text-muted-foreground">No blocks yet.</div>}
                {blocks.map((b, i) => (
                  <div key={b.id} className={`flex items-center gap-1 rounded-lg border p-1.5 text-xs ${selectedId === b.id ? "border-primary bg-primary/5" : "border-border bg-background"} ${b.hidden ? "opacity-50" : ""}`}>
                    <button onClick={() => setSelectedId(b.id)} className="flex-1 truncate text-left font-semibold">{BLOCK_TYPES.find((t) => t.type === b.type)?.label ?? b.type}</button>
                    <button onClick={() => move(i, -1)} className="rounded p-0.5 hover:bg-muted"><ArrowUp className="h-3 w-3" /></button>
                    <button onClick={() => move(i, 1)} className="rounded p-0.5 hover:bg-muted"><ArrowDown className="h-3 w-3" /></button>
                    <button onClick={() => toggleHide(b.id)} className="rounded p-0.5 hover:bg-muted">{b.hidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}</button>
                    <button onClick={() => duplicate(b.id)} className="rounded p-0.5 hover:bg-muted"><Copy className="h-3 w-3" /></button>
                    <button onClick={() => remove(b.id)} className="rounded p-0.5 text-destructive hover:bg-destructive/10"><Trash2 className="h-3 w-3" /></button>
                  </div>
                ))}
              </div>
            </SectionCard>
          </aside>

          {/* Middle: preview */}
          <main className="min-w-0">
            <div className="mx-auto overflow-hidden rounded-3xl border border-border bg-background" style={{ maxWidth: previewWidth }}>
              <div className="border-b border-border bg-muted/40 px-4 py-2 text-xs text-muted-foreground">Live preview · {device}</div>
              <div className="p-4">
                {blocks.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Add blocks from the left to start building.</div>
                ) : (
                  <BlockRenderer blocks={blocks} />
                )}
              </div>
            </div>
          </main>

          {/* Right: inspector + SEO */}
          <aside className="space-y-3">
            {selected ? (
              <SectionCard title={`Edit: ${BLOCK_TYPES.find((t) => t.type === selected.type)?.label ?? selected.type}`} subtitle="">
                <BlockInspector block={selected} onChange={updateSelected} />
              </SectionCard>
            ) : (
              <SectionCard title="Inspector" subtitle="Select a block"><div className="text-xs text-muted-foreground">Click a block on the left to edit its properties.</div></SectionCard>
            )}
            <SectionCard title="SEO & meta" subtitle="Search & social">
              <div className="space-y-2 text-xs">
                <label className="block"><span className="font-semibold">SEO title</span><input value={seo.title ?? ""} onChange={(e) => setSeo({ ...seo, title: e.target.value })} className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5" /></label>
                <label className="block"><span className="font-semibold">Description</span><textarea value={seo.description ?? ""} onChange={(e) => setSeo({ ...seo, description: e.target.value })} rows={3} className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5" /></label>
                <label className="block"><span className="font-semibold">Keywords</span><input value={seo.keywords ?? ""} onChange={(e) => setSeo({ ...seo, keywords: e.target.value })} className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5" /></label>
                <div className="pt-2">
                  <button onClick={() => metaMut.mutate({ page_id: id, seo_title: seo.title ?? null, seo_description: seo.description ?? null, seo_keywords: seo.keywords ?? null })} className="w-full rounded-lg bg-primary px-3 py-1.5 font-semibold text-primary-foreground">Save page meta</button>
                </div>
              </div>
            </SectionCard>
          </aside>
        </div>

        {showHistory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowHistory(false)}>
            <div className="max-h-[80vh] w-full max-w-lg overflow-auto rounded-3xl border border-border bg-background p-5" onClick={(e) => e.stopPropagation()}>
              <div className="mb-3 flex items-center justify-between"><h3 className="text-lg font-bold">Version history</h3><button onClick={() => setShowHistory(false)} className="text-sm text-muted-foreground">Close</button></div>
              <div className="space-y-1">
                {q.data.versions.map((v) => (
                  <div key={v.id} className="flex items-center justify-between rounded-lg border border-border p-2 text-sm">
                    <div>
                      <div className="font-semibold">v{v.version_number}{page.published_version_id === v.id ? " · published" : ""}{page.current_version_id === v.id ? " · current" : ""}</div>
                      <div className="text-xs text-muted-foreground">{new Date(v.created_at).toLocaleString()} · {v.note ?? "—"}</div>
                    </div>
                    <button onClick={() => rbMut.mutate(v.id)} disabled={rbMut.isPending || page.current_version_id === v.id} className="rounded-lg border border-border px-2 py-1 text-xs font-semibold hover:bg-muted disabled:opacity-40">Restore</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}

function BlockInspector({ block, onChange }: { block: Block; onChange: (patch: Record<string, unknown>) => void }) {
  const p = block.props ?? {};
  const stringField = (key: string, label: string, multiline = false) => (
    <label className="block">
      <span className="text-xs font-semibold">{label}</span>
      {multiline ? (
        <textarea rows={3} value={(p[key] as string) ?? ""} onChange={(e) => onChange({ [key]: e.target.value })} className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs" />
      ) : (
        <input value={(p[key] as string) ?? ""} onChange={(e) => onChange({ [key]: e.target.value })} className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs" />
      )}
    </label>
  );

  const jsonField = (key: string, label: string) => (
    <label className="block">
      <span className="text-xs font-semibold">{label} <span className="text-muted-foreground">(JSON)</span></span>
      <textarea rows={5} defaultValue={JSON.stringify(p[key] ?? [], null, 2)} onBlur={(e) => { try { onChange({ [key]: JSON.parse(e.target.value) }); } catch { /* ignore */ } }} className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 font-mono text-xs" />
    </label>
  );

  switch (block.type) {
    case "hero":
      return <div className="space-y-2">{stringField("title", "Title")}{stringField("subtitle", "Subtitle", true)}{stringField("ctaLabel", "CTA label")}{stringField("ctaHref", "CTA link")}</div>;
    case "cta":
      return <div className="space-y-2">{stringField("title", "Title")}{stringField("ctaLabel", "Button label")}{stringField("ctaHref", "Button link")}</div>;
    case "richtext":
      return <div className="space-y-2">{stringField("body", "Body", true)}</div>;
    case "media":
      return <div className="space-y-2">{stringField("url", "Media URL")}{stringField("alt", "Alt text")}</div>;
    case "html":
      return <div className="space-y-2">{stringField("html", "HTML", true)}</div>;
    case "spacer":
      return <div className="space-y-2"><label className="block"><span className="text-xs font-semibold">Height (px)</span><input type="number" value={(p.height as number) ?? 48} onChange={(e) => onChange({ height: Number(e.target.value) })} className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs" /></label></div>;
    case "features":
    case "stats":
    case "testimonials":
    case "faq":
      return <div className="space-y-2">{block.type === "features" && stringField("title", "Section title")}{jsonField("items", "Items")}</div>;
    default:
      return <div className="text-xs text-muted-foreground">No inspector for this block type.</div>;
  }
}
