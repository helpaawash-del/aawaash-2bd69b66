// Digital Asset Management (DAM) master console — /admin/media
// Reuses existing Aawash design system (SectionCard, StatCard, EmptyState, SkeletonBlock)
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Upload, Trash2, Copy, Search, FolderPlus, Folder, FolderOpen, ChevronRight,
  Image as ImageIcon, Video, FileText, Box, Play, Palette, FileArchive, File,
  Grid3x3, List, X, Pin, PinOff, Download, Replace, History, Link2, Filter,
  Loader2, CheckCircle2, Activity, Layers,
} from "lucide-react";
import { RoleGuard } from "@/components/aawash/AuthGuard";
import { AdminShell } from "@/components/aawash/admin/AdminShell";
import { useSession } from "@/hooks/useSession";
import { SectionCard, EmptyState, SkeletonBlock, StatCard, formatINR } from "@/components/aawash/dashboard-kit";
import { supabase } from "@/integrations/supabase/client";
import {
  damDashboard, damListFolders, damCreateFolder, damRenameFolder, damDeleteFolder, damToggleFolderPin,
  damListAssets, damGetAsset, damCreateUploadUrl, damRegisterAsset, damUpdateAsset,
  damMoveAssets, damDeleteAssets, damRestoreAsset, damReplaceAsset, damRollbackAsset,
  damRecentAudit, damGetSignedUrl, classifyAsset, type DamAssetRow,
} from "@/lib/dam.functions";

export const Route = createFileRoute("/_authenticated/admin/media")({
  component: () => (<RoleGuard allow={["super_admin"]}><Content /></RoleGuard>),
  head: () => ({
    meta: [
      { title: "Digital Asset Management — Aawash Admin" },
      { name: "description", content: "Central media authority: upload, organise, version, and track every asset used across the Aawash platform." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

/* ------------- helpers ------------- */
function humanBytes(n: number | null | undefined): string {
  const v = Number(n ?? 0);
  if (!v) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(v) / Math.log(1024)));
  return `${(v / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
function kindIcon(kind: string) {
  const cls = "h-4 w-4";
  switch (kind) {
    case "image": case "gif": return <ImageIcon className={cls} />;
    case "svg": case "icon": return <Palette className={cls} />;
    case "video": return <Video className={cls} />;
    case "pdf": case "doc": return <FileText className={cls} />;
    case "model": return <Box className={cls} />;
    case "lottie": return <Play className={cls} />;
    case "archive": return <FileArchive className={cls} />;
    default: return <File className={cls} />;
  }
}
async function readImageDims(file: File): Promise<{ width?: number; height?: number }> {
  if (!file.type.startsWith("image/")) return {};
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { resolve({ width: img.naturalWidth, height: img.naturalHeight }); URL.revokeObjectURL(url); };
    img.onerror = () => { resolve({}); URL.revokeObjectURL(url); };
    img.src = url;
  });
}
async function readVideoMeta(file: File): Promise<{ width?: number; height?: number; duration_seconds?: number }> {
  if (!file.type.startsWith("video/")) return {};
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => {
      resolve({ width: v.videoWidth, height: v.videoHeight, duration_seconds: v.duration });
      URL.revokeObjectURL(url);
    };
    v.onerror = () => { resolve({}); URL.revokeObjectURL(url); };
    v.src = url;
  });
}

/* ------------- Upload state (with per-file progress + abort) ------------- */
type UploadItem = {
  id: string;
  file: File;
  progress: number;   // 0..100
  status: "pending" | "uploading" | "done" | "error" | "cancelled";
  error?: string;
  controller?: AbortController;
};

async function uploadOne(
  file: File,
  onProgress: (p: number) => void,
  controller: AbortController,
  createUrl: (a: { data: { filename: string; size?: number } }) => Promise<{ path: string; signed_url: string }>,
  register: (a: { data: Record<string, unknown> }) => Promise<{ id: string }>,
  folderId: string | null,
): Promise<{ id: string }> {
  const dims = await readImageDims(file);
  const vmeta = await readVideoMeta(file);
  const signed = await createUrl({ data: { filename: file.name, size: file.size } });
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", signed.signed_url);
    xhr.setRequestHeader("x-upsert", "true");
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100)); };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed: ${xhr.status}`)));
    xhr.onerror = () => reject(new Error("Network error"));
    xhr.onabort = () => reject(new Error("Cancelled"));
    controller.signal.addEventListener("abort", () => xhr.abort());
    xhr.send(file);
  });
  return register({
    data: {
      storage_path: signed.path,
      filename: file.name,
      size: file.size,
      mime: file.type || null,
      width: dims.width ?? vmeta.width,
      height: dims.height ?? vmeta.height,
      duration_seconds: vmeta.duration_seconds,
      folder_id: folderId,
    },
  });
}

/* ------------- Folder tree ------------- */
type FolderRow = { id: string; name: string; slug: string; parent_id: string | null; path: string; is_pinned: boolean; is_favorite: boolean; color: string | null };

function buildTree(folders: FolderRow[]): Array<FolderRow & { children: FolderRow[] }> {
  const map = new Map<string, FolderRow & { children: FolderRow[] }>();
  folders.forEach((f) => map.set(f.id, { ...f, children: [] }));
  const roots: Array<FolderRow & { children: FolderRow[] }> = [];
  map.forEach((node) => {
    if (node.parent_id && map.has(node.parent_id)) map.get(node.parent_id)!.children.push(node);
    else roots.push(node);
  });
  return roots;
}

function FolderNode({
  node, level, active, onPick, onNew, onRename, onDelete, onPin, expanded, toggle,
}: {
  node: FolderRow & { children: FolderRow[] };
  level: number;
  active: string | null | undefined;
  onPick: (id: string | null) => void;
  onNew: (parent: string | null) => void;
  onRename: (f: FolderRow) => void;
  onDelete: (f: FolderRow) => void;
  onPin: (f: FolderRow) => void;
  expanded: Set<string>;
  toggle: (id: string) => void;
}) {
  const isOpen = expanded.has(node.id);
  const isActive = active === node.id;
  return (
    <div>
      <div
        className={`group flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm hover:bg-muted ${isActive ? "bg-primary-soft text-primary font-semibold" : ""}`}
        style={{ paddingLeft: 8 + level * 12 }}
      >
        <button type="button" onClick={() => toggle(node.id)} className="grid h-5 w-5 place-items-center text-muted-foreground">
          <ChevronRight className={`h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-90" : ""}`} />
        </button>
        <button type="button" onClick={() => onPick(node.id)} className="flex flex-1 items-center gap-1.5 text-left">
          {isOpen ? <FolderOpen className="h-4 w-4" /> : <Folder className="h-4 w-4" />}
          <span className="truncate">{node.name}</span>
          {node.is_pinned && <Pin className="h-3 w-3 opacity-60" />}
        </button>
        <div className="hidden gap-0.5 opacity-0 group-hover:flex group-hover:opacity-100">
          <button title="New subfolder" onClick={() => onNew(node.id)} className="rounded p-1 hover:bg-background"><FolderPlus className="h-3 w-3" /></button>
          <button title={node.is_pinned ? "Unpin" : "Pin"} onClick={() => onPin(node)} className="rounded p-1 hover:bg-background">{node.is_pinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}</button>
          <button title="Rename" onClick={() => onRename(node)} className="rounded p-1 hover:bg-background text-xs">✎</button>
          <button title="Delete" onClick={() => onDelete(node)} className="rounded p-1 hover:bg-destructive/10 text-destructive"><Trash2 className="h-3 w-3" /></button>
        </div>
      </div>
      {isOpen && node.children.map((c) => (
        <FolderNode key={c.id} node={c as FolderRow & { children: FolderRow[] }} level={level + 1} active={active} onPick={onPick} onNew={onNew} onRename={onRename} onDelete={onDelete} onPin={onPin} expanded={expanded} toggle={toggle} />
      ))}
    </div>
  );
}

/* ------------- Asset preview renderer ------------- */
function AssetPreview({ asset }: { asset: DamAssetRow }) {
  const url = asset.signed_url;
  if (!url) return <div className="grid h-full min-h-[240px] place-items-center text-xs uppercase text-muted-foreground">No preview</div>;
  switch (asset.kind) {
    case "image": case "svg": case "gif":
      return <img src={url} alt={asset.alt ?? asset.filename} className="mx-auto max-h-[520px] max-w-full rounded-xl object-contain" loading="lazy" />;
    case "video":
      return <video src={url} controls className="mx-auto max-h-[520px] max-w-full rounded-xl bg-black" />;
    case "pdf":
      return <iframe src={url} className="h-[520px] w-full rounded-xl border border-border bg-background" title={asset.filename} />;
    case "model":
      return <ModelViewerLazy src={url} />;
    case "lottie":
      return <LottiePreview src={url} filename={asset.filename} />;
    default:
      return (
        <div className="grid h-[300px] place-items-center rounded-xl border border-dashed border-border text-center">
          <div>
            <File className="mx-auto h-10 w-10 text-muted-foreground" />
            <div className="mt-2 text-xs uppercase text-muted-foreground">{asset.kind} preview unavailable</div>
            <a href={url} download={asset.filename} className="mt-3 inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted"><Download className="h-3 w-3" /> Download</a>
          </div>
        </div>
      );
  }
}

// Lazily inject Google's model-viewer web component only when needed
function ModelViewerLazy({ src }: { src: string }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const w = window as unknown as { customElements?: CustomElementRegistry };
    if (w.customElements?.get("model-viewer")) { setReady(true); return; }
    const existing = document.querySelector('script[data-model-viewer="1"]');
    if (existing) { existing.addEventListener("load", () => setReady(true)); return; }
    const s = document.createElement("script");
    s.type = "module";
    s.src = "https://unpkg.com/@google/model-viewer@3.5.0/dist/model-viewer.min.js";
    s.dataset.modelViewer = "1";
    s.onload = () => setReady(true);
    document.head.appendChild(s);
  }, []);
  if (!ready) return <div className="grid h-[400px] place-items-center rounded-xl border border-border bg-muted/40 text-xs text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  return (
    // @ts-expect-error web component
    <model-viewer src={src} camera-controls auto-rotate style={{ width: "100%", height: 480, background: "hsl(var(--muted))", borderRadius: 12 }} />
  );
}

function LottiePreview({ src, filename }: { src: string; filename: string }) {
  const [Comp, setComp] = useState<null | React.ComponentType<{ src: string; autoplay?: boolean; loop?: boolean; style?: React.CSSProperties }>>(null);
  useEffect(() => { import("@lottiefiles/dotlottie-react").then((m) => setComp(() => m.DotLottieReact)); }, []);
  if (!Comp) return <div className="grid h-[400px] place-items-center rounded-xl bg-muted"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  return (
    <div className="rounded-xl bg-muted/40 p-4">
      <Comp src={src} autoplay loop style={{ width: "100%", height: 380 }} />
      <div className="mt-2 text-center text-xs text-muted-foreground">{filename}</div>
    </div>
  );
}

/* ------------- Main ------------- */
function Content() {
  const { profile } = useSession();
  const qc = useQueryClient();
  const fetchDash = useServerFn(damDashboard);
  const fetchFolders = useServerFn(damListFolders);
  const fetchAssets = useServerFn(damListAssets);
  const fetchAudit = useServerFn(damRecentAudit);
  const fetchAsset = useServerFn(damGetAsset);
  const createUrl = useServerFn(damCreateUploadUrl);
  const registerAsset = useServerFn(damRegisterAsset);
  const updateAsset = useServerFn(damUpdateAsset);
  const moveAssets = useServerFn(damMoveAssets);
  const deleteAssets = useServerFn(damDeleteAssets);
  const restoreAsset = useServerFn(damRestoreAsset);
  const replaceAsset = useServerFn(damReplaceAsset);
  const rollbackAsset = useServerFn(damRollbackAsset);
  const getSignedUrl = useServerFn(damGetSignedUrl);
  const createFolder = useServerFn(damCreateFolder);
  const renameFolder = useServerFn(damRenameFolder);
  const deleteFolder = useServerFn(damDeleteFolder);
  const pinFolder = useServerFn(damToggleFolderPin);

  // filters
  const [folder, setFolder] = useState<string | null | undefined>(undefined); // undefined = All
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<string>("all");
  const [status, setStatus] = useState<"active" | "archived" | "deleted">("active");
  const [sort, setSort] = useState<"recent" | "oldest" | "name" | "size" | "usage">("recent");
  const [unusedOnly, setUnusedOnly] = useState(false);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openAssetId, setOpenAssetId] = useState<string | null>(null);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [dragOver, setDragOver] = useState(false);

  const dash = useQuery({ queryKey: ["dam", "dashboard"], queryFn: () => fetchDash() });
  const folders = useQuery({ queryKey: ["dam", "folders"], queryFn: () => fetchFolders() });
  const assets = useQuery({
    queryKey: ["dam", "assets", { folder, q, kind, status, sort, unusedOnly }],
    queryFn: () => fetchAssets({ data: { folder_id: folder, search: q || undefined, kind, status, sort, unused: unusedOnly || undefined } }),
  });
  const audit = useQuery({ queryKey: ["dam", "audit"], queryFn: () => fetchAudit() });

  const tree = useMemo(() => buildTree(folders.data ?? []), [folders.data]);
  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["dam"] });
  };

  /* ---- upload flow ---- */
  const inputRef = useRef<HTMLInputElement>(null);
  const startUploads = useCallback(async (files: File[]) => {
    if (!files.length) return;
    const items: UploadItem[] = files.map((f) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      file: f, progress: 0, status: "pending", controller: new AbortController(),
    }));
    setUploads((u) => [...items, ...u].slice(0, 50));
    for (const it of items) {
      setUploads((u) => u.map((x) => x.id === it.id ? { ...x, status: "uploading" } : x));
      try {
        await uploadOne(
          it.file,
          (p) => setUploads((u) => u.map((x) => x.id === it.id ? { ...x, progress: p } : x)),
          it.controller!,
          createUrl as unknown as (a: { data: { filename: string; size?: number } }) => Promise<{ path: string; signed_url: string }>,
          registerAsset as unknown as (a: { data: Record<string, unknown> }) => Promise<{ id: string }>,
          folder ?? null,
        );
        setUploads((u) => u.map((x) => x.id === it.id ? { ...x, status: "done", progress: 100 } : x));
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Upload failed";
        setUploads((u) => u.map((x) => x.id === it.id ? { ...x, status: msg === "Cancelled" ? "cancelled" : "error", error: msg } : x));
      }
    }
    invalidateAll();
    toast.success(`${items.length} file${items.length === 1 ? "" : "s"} processed`);
  }, [folder, createUrl, registerAsset]); // eslint-disable-line react-hooks/exhaustive-deps

  const cancelUpload = (id: string) => {
    setUploads((u) => u.map((x) => { if (x.id === id) x.controller?.abort(); return x; }));
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    startUploads(files);
  };

  /* ---- selection + bulk actions ---- */
  const toggleSel = (id: string) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const selectAll = () => setSelected(new Set((assets.data ?? []).map((a) => a.id)));
  const clearSel = () => setSelected(new Set());
  const bulkMove = async () => {
    const target = window.prompt("Move to folder id (blank = root):", "");
    if (target === null) return;
    await moveAssets({ data: { ids: Array.from(selected), folder_id: target || null } });
    toast.success("Moved"); clearSel(); invalidateAll();
  };
  const bulkDelete = async (hard = false) => {
    if (!window.confirm(`${hard ? "Permanently delete" : "Move to trash"} ${selected.size} asset(s)?`)) return;
    await deleteAssets({ data: { ids: Array.from(selected), hard } });
    toast.success(hard ? "Deleted permanently" : "Moved to trash"); clearSel(); invalidateAll();
  };

  /* ---- folder mutators ---- */
  const handleNewFolder = async (parent: string | null) => {
    const name = window.prompt("New folder name:", "");
    if (!name) return;
    await createFolder({ data: { name, parent_id: parent } });
    invalidateAll(); toast.success("Folder created");
  };
  const handleRename = async (f: FolderRow) => {
    const name = window.prompt("Rename folder:", f.name);
    if (!name || name === f.name) return;
    await renameFolder({ data: { id: f.id, name } });
    invalidateAll(); toast.success("Renamed");
  };
  const handleDeleteFolder = async (f: FolderRow) => {
    if (!window.confirm(`Delete folder "${f.name}"? Assets inside will move to root.`)) return;
    await deleteFolder({ data: { id: f.id } });
    invalidateAll(); toast.success("Deleted");
  };
  const handlePinFolder = async (f: FolderRow) => {
    await pinFolder({ data: { id: f.id, pinned: !f.is_pinned } });
    invalidateAll();
  };
  const toggleExpand = (id: string) => setExpanded((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  /* ---- copy signed URL ---- */
  const copySignedUrl = async (path: string) => {
    try {
      const { url } = await getSignedUrl({ data: { path } });
      await navigator.clipboard.writeText(url);
      toast.success("Signed URL copied (1 hr)");
    } catch { toast.error("Failed to copy URL"); }
  };

  /* ---- KPI derivation ---- */
  const stats = (dash.data?.stats ?? {}) as {
    total?: number; total_size?: number; unused?: number; deleted?: number; folders?: number;
    recent_uploaded?: number; recent_updated?: number; by_kind?: Record<string, number>;
  };
  const kindCounts = stats.by_kind ?? {};

  return (
    <AdminShell profile={profile ?? null}>
      <div className="mx-auto max-w-[1600px] space-y-6 p-4 sm:p-6">
        {/* Header */}
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Digital Asset Management</h1>
            <p className="mt-1 text-sm text-muted-foreground">Every image, video, brochure, icon, 3D model and animation used across Aawash — versioned, tracked, and synchronized.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => inputRef.current?.click()} className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-soft)] hover:opacity-90"><Upload className="h-4 w-4" /> Upload</button>
            <button onClick={() => handleNewFolder(folder ?? null)} className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-semibold hover:bg-muted"><FolderPlus className="h-4 w-4" /> New folder</button>
            <input ref={inputRef} type="file" multiple className="hidden" onChange={(e) => { startUploads(Array.from(e.target.files ?? [])); if (e.target) e.target.value = ""; }} />
          </div>
        </header>

        {/* Dashboard KPIs */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard icon={<Layers className="h-4 w-4" />} label="Total assets" value={stats.total ?? 0} />
          <StatCard icon={<ImageIcon className="h-4 w-4" />} label="Images" value={(kindCounts.image ?? 0) + (kindCounts.gif ?? 0)} accent="leaf" />
          <StatCard icon={<Video className="h-4 w-4" />} label="Videos" value={kindCounts.video ?? 0} accent="gold" />
          <StatCard icon={<FileText className="h-4 w-4" />} label="Docs / PDF" value={(kindCounts.pdf ?? 0) + (kindCounts.doc ?? 0)} />
          <StatCard icon={<Box className="h-4 w-4" />} label="3D + Lottie" value={(kindCounts.model ?? 0) + (kindCounts.lottie ?? 0)} accent="leaf" />
          <StatCard icon={<Activity className="h-4 w-4" />} label="Storage used" value={humanBytes(stats.total_size ?? 0)} hint={`${stats.folders ?? 0} folders · ${stats.unused ?? 0} unused`} />
        </div>

        {/* Body: sidebar + browser */}
        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          {/* Sidebar */}
          <aside className="space-y-3">
            <SectionCard title="Folders" action={
              <button onClick={() => handleNewFolder(null)} className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-muted"><FolderPlus className="h-3 w-3" /></button>
            }>
              <div className="max-h-[520px] space-y-0.5 overflow-y-auto pr-1">
                <button onClick={() => setFolder(undefined)} className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-muted ${folder === undefined ? "bg-primary-soft text-primary font-semibold" : ""}`}>
                  <Layers className="h-4 w-4" /> All assets
                </button>
                <button onClick={() => setFolder(null)} className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-muted ${folder === null ? "bg-primary-soft text-primary font-semibold" : ""}`}>
                  <Folder className="h-4 w-4" /> Unfiled
                </button>
                <div className="my-2 border-t border-border" />
                {folders.isLoading ? <SkeletonBlock className="h-20" /> : tree.length === 0 ? (
                  <p className="px-2 py-3 text-xs text-muted-foreground">No folders yet.</p>
                ) : tree.map((n) => (
                  <FolderNode key={n.id} node={n} level={0} active={folder ?? null}
                    onPick={setFolder} onNew={handleNewFolder} onRename={handleRename}
                    onDelete={handleDeleteFolder} onPin={handlePinFolder}
                    expanded={expanded} toggle={toggleExpand} />
                ))}
              </div>
            </SectionCard>

            {uploads.length > 0 && (
              <SectionCard title="Uploads" action={<button onClick={() => setUploads([])} className="text-xs text-muted-foreground hover:text-foreground">Clear</button>}>
                <div className="space-y-2">
                  {uploads.slice(0, 8).map((u) => (
                    <div key={u.id} className="rounded-xl border border-border p-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1 truncate text-xs font-medium">{u.file.name}</div>
                        {u.status === "uploading" && <button onClick={() => cancelUpload(u.id)} className="text-xs text-destructive"><X className="h-3 w-3" /></button>}
                        {u.status === "done" && <CheckCircle2 className="h-4 w-4 text-primary" />}
                      </div>
                      <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted">
                        <div className={`h-full transition-all ${u.status === "error" ? "bg-destructive" : "bg-primary"}`} style={{ width: `${u.progress}%` }} />
                      </div>
                      {u.status === "error" && <div className="mt-1 text-[10px] text-destructive">{u.error}</div>}
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}
          </aside>

          {/* Browser */}
          <div className="space-y-4">
            {/* Toolbar */}
            <SectionCard>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search filename, alt, code, description…" className="w-full rounded-xl border border-border bg-background py-2 pl-9 pr-3 text-sm" />
                </div>
                <select value={kind} onChange={(e) => setKind(e.target.value)} className="rounded-xl border border-border bg-background px-3 py-2 text-sm">
                  <option value="all">All types</option>
                  <option value="image">Images</option>
                  <option value="svg">SVG</option>
                  <option value="gif">GIF</option>
                  <option value="video">Video</option>
                  <option value="pdf">PDF</option>
                  <option value="doc">Docs</option>
                  <option value="model">3D Models</option>
                  <option value="lottie">Lottie</option>
                  <option value="archive">Archive</option>
                  <option value="icon">Icons</option>
                  <option value="other">Other</option>
                </select>
                <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="rounded-xl border border-border bg-background px-3 py-2 text-sm">
                  <option value="recent">Recent</option>
                  <option value="oldest">Oldest</option>
                  <option value="name">Name</option>
                  <option value="size">Size</option>
                  <option value="usage">Most used</option>
                </select>
                <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className="rounded-xl border border-border bg-background px-3 py-2 text-sm">
                  <option value="active">Active</option>
                  <option value="archived">Archived</option>
                  <option value="deleted">Trash</option>
                </select>
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm">
                  <input type="checkbox" checked={unusedOnly} onChange={(e) => setUnusedOnly(e.target.checked)} className="h-3.5 w-3.5" />
                  <Filter className="h-3.5 w-3.5" /> Unused only
                </label>
                <div className="flex overflow-hidden rounded-xl border border-border">
                  <button onClick={() => setView("grid")} className={`px-2.5 py-2 ${view === "grid" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}><Grid3x3 className="h-4 w-4" /></button>
                  <button onClick={() => setView("list")} className={`px-2.5 py-2 ${view === "list" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}><List className="h-4 w-4" /></button>
                </div>
              </div>

              {selected.size > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-primary-soft/50 p-2 text-sm">
                  <span className="font-semibold">{selected.size} selected</span>
                  <button onClick={selectAll} className="rounded-lg border border-border bg-background px-2 py-1 text-xs">Select all</button>
                  <button onClick={clearSel} className="rounded-lg border border-border bg-background px-2 py-1 text-xs">Clear</button>
                  <div className="mx-1 h-4 border-l border-border" />
                  <button onClick={bulkMove} className="rounded-lg border border-border bg-background px-2 py-1 text-xs">Move…</button>
                  <button onClick={() => bulkDelete(false)} className="rounded-lg border border-destructive/30 bg-background px-2 py-1 text-xs text-destructive">Trash</button>
                  <button onClick={() => bulkDelete(true)} className="rounded-lg border border-destructive/30 bg-destructive/10 px-2 py-1 text-xs text-destructive">Delete permanently</button>
                </div>
              )}
            </SectionCard>

            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              className={`rounded-3xl border-2 border-dashed transition ${dragOver ? "border-primary bg-primary-soft/40" : "border-border/70 bg-surface-warm/30"}`}
            >
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary-soft text-primary"><Upload className="h-5 w-5" /></div>
                <div className="text-sm font-semibold">Drag & drop files here</div>
                <div className="text-xs text-muted-foreground">Supports images, video, PDF, docs, SVG, 3D models, Lottie · up to 200 MB each</div>
              </div>
            </div>

            {/* Grid / list */}
            <SectionCard title={`${(assets.data ?? []).length} asset${(assets.data ?? []).length === 1 ? "" : "s"}`}>
              {assets.isLoading ? <SkeletonBlock className="h-60" /> : (assets.data ?? []).length === 0 ? (
                <EmptyState icon={<ImageIcon className="h-6 w-6" />} title="No assets" body="Try changing filters or upload your first file." />
              ) : view === "grid" ? (
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {(assets.data ?? []).map((a) => (
                    <AssetCard key={a.id} asset={a} selected={selected.has(a.id)} onToggle={() => toggleSel(a.id)} onOpen={() => setOpenAssetId(a.id)} onCopy={() => copySignedUrl(a.storage_path)} />
                  ))}
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="w-8 px-2 py-2" />
                        <th className="px-2 py-2 text-left">Name</th>
                        <th className="px-2 py-2 text-left">Type</th>
                        <th className="px-2 py-2 text-left">Size</th>
                        <th className="px-2 py-2 text-left">Usage</th>
                        <th className="px-2 py-2 text-left">Version</th>
                        <th className="px-2 py-2 text-left">Uploaded</th>
                        <th className="px-2 py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {(assets.data ?? []).map((a) => (
                        <tr key={a.id} className="border-t border-border hover:bg-muted/40">
                          <td className="px-2 py-2"><input type="checkbox" checked={selected.has(a.id)} onChange={() => toggleSel(a.id)} /></td>
                          <td className="px-2 py-2">
                            <button onClick={() => setOpenAssetId(a.id)} className="flex items-center gap-2 text-left font-medium hover:underline">
                              <span className="text-muted-foreground">{kindIcon(a.kind)}</span>
                              <span className="truncate max-w-[280px]">{a.filename}</span>
                            </button>
                            <div className="text-[10px] text-muted-foreground">{a.asset_code}</div>
                          </td>
                          <td className="px-2 py-2 uppercase text-xs">{a.kind}</td>
                          <td className="px-2 py-2">{humanBytes(a.size)}</td>
                          <td className="px-2 py-2">{a.usage_count}</td>
                          <td className="px-2 py-2">v{a.current_version}</td>
                          <td className="px-2 py-2 text-xs">{new Date(a.created_at).toLocaleDateString()}</td>
                          <td className="px-2 py-2 text-right">
                            <button onClick={() => copySignedUrl(a.storage_path)} className="rounded-lg border border-border p-1 hover:bg-muted"><Copy className="h-3 w-3" /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>

            {/* Recent audit */}
            <SectionCard title="Recent activity" subtitle="Immutable log of every asset action">
              {audit.isLoading ? <SkeletonBlock /> : (audit.data ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground">No activity yet.</p>
              ) : (
                <ul className="space-y-1.5 text-xs">
                  {(audit.data ?? []).slice(0, 12).map((e) => (
                    <li key={e.id} className="flex items-center justify-between gap-2 rounded-lg bg-muted/40 px-2 py-1.5">
                      <span className="font-semibold uppercase text-[10px] tracking-wider text-primary">{e.action}</span>
                      <span className="truncate text-muted-foreground">{e.asset_id ?? e.folder_id ?? ""}</span>
                      <span className="whitespace-nowrap text-muted-foreground">{new Date(e.created_at).toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
          </div>
        </div>

        {/* Asset detail drawer */}
        {openAssetId && (
          <AssetDrawer
            id={openAssetId}
            onClose={() => setOpenAssetId(null)}
            fetchAsset={fetchAsset as unknown as (a: { data: { id: string } }) => Promise<Awaited<ReturnType<typeof damGetAsset>>>}
            createUrl={createUrl as unknown as (a: { data: { filename: string; size?: number } }) => Promise<{ path: string; signed_url: string }>}
            replaceAsset={replaceAsset as unknown as (a: { data: Record<string, unknown> }) => Promise<{ version_number: number }>}
            rollbackAsset={rollbackAsset as unknown as (a: { data: { id: string; version_id: string } }) => Promise<{ ok: true }>}
            updateAsset={updateAsset as unknown as (a: { data: Record<string, unknown> }) => Promise<{ ok: true }>}
            deleteAssets={deleteAssets as unknown as (a: { data: { ids: string[]; hard?: boolean } }) => Promise<{ ok: true }>}
            restoreAsset={restoreAsset as unknown as (a: { data: { id: string } }) => Promise<{ ok: true }>}
            getSignedUrl={getSignedUrl as unknown as (a: { data: { path: string; download?: boolean } }) => Promise<{ url: string }>}
            onChanged={invalidateAll}
            folders={folders.data ?? []}
          />
        )}
      </div>
    </AdminShell>
  );
}

/* ------------- Asset card ------------- */
function AssetCard({ asset, selected, onToggle, onOpen, onCopy }: { asset: DamAssetRow; selected: boolean; onToggle: () => void; onOpen: () => void; onCopy: () => void }) {
  return (
    <div className={`group relative overflow-hidden rounded-2xl border bg-card transition ${selected ? "border-primary ring-2 ring-primary/40" : "border-border hover:-translate-y-0.5 hover:shadow-[var(--shadow-soft)]"}`}>
      <input type="checkbox" checked={selected} onChange={onToggle} onClick={(e) => e.stopPropagation()} className="absolute left-2 top-2 z-10 h-4 w-4 rounded" />
      <button type="button" onClick={onOpen} className="block w-full">
        <div className="aspect-square bg-muted">
          {(asset.kind === "image" || asset.kind === "svg" || asset.kind === "gif") && asset.signed_url ? (
            <img src={asset.signed_url} alt={asset.alt ?? asset.filename} className="h-full w-full object-cover" loading="lazy" />
          ) : asset.kind === "video" && asset.signed_url ? (
            <video src={asset.signed_url} className="h-full w-full object-cover" muted preload="metadata" />
          ) : (
            <div className="grid h-full place-items-center text-muted-foreground">
              <div className="text-center">
                <div className="mx-auto">{kindIcon(asset.kind)}</div>
                <div className="mt-1 text-[10px] uppercase tracking-wider">{asset.kind}</div>
              </div>
            </div>
          )}
        </div>
      </button>
      <div className="p-2">
        <div className="truncate text-xs font-semibold" title={asset.filename}>{asset.filename}</div>
        <div className="mt-0.5 flex items-center justify-between text-[10px] text-muted-foreground">
          <span>{humanBytes(asset.size)}</span>
          <span>v{asset.current_version} · {asset.usage_count} use{asset.usage_count === 1 ? "" : "s"}</span>
        </div>
        <div className="mt-1.5 flex gap-1">
          <button onClick={onCopy} className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg border border-border px-1.5 py-1 text-[10px] hover:bg-muted"><Copy className="h-3 w-3" /> URL</button>
          <button onClick={onOpen} className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg border border-border px-1.5 py-1 text-[10px] hover:bg-muted"><Link2 className="h-3 w-3" /> Open</button>
        </div>
      </div>
    </div>
  );
}

/* ------------- Asset detail drawer ------------- */
function AssetDrawer({
  id, onClose, fetchAsset, createUrl, replaceAsset, rollbackAsset, updateAsset, deleteAssets, restoreAsset, getSignedUrl, onChanged, folders,
}: {
  id: string;
  onClose: () => void;
  fetchAsset: (a: { data: { id: string } }) => Promise<Awaited<ReturnType<typeof damGetAsset>>>;
  createUrl: (a: { data: { filename: string; size?: number } }) => Promise<{ path: string; signed_url: string }>;
  replaceAsset: (a: { data: Record<string, unknown> }) => Promise<{ version_number: number }>;
  rollbackAsset: (a: { data: { id: string; version_id: string } }) => Promise<{ ok: true }>;
  updateAsset: (a: { data: Record<string, unknown> }) => Promise<{ ok: true }>;
  deleteAssets: (a: { data: { ids: string[]; hard?: boolean } }) => Promise<{ ok: true }>;
  restoreAsset: (a: { data: { id: string } }) => Promise<{ ok: true }>;
  getSignedUrl: (a: { data: { path: string; download?: boolean } }) => Promise<{ url: string }>;
  onChanged: () => void;
  folders: FolderRow[];
}) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["dam", "asset", id], queryFn: () => fetchAsset({ data: { id } }) });
  const [tab, setTab] = useState<"preview" | "details" | "versions" | "usage" | "audit">("preview");
  const [alt, setAlt] = useState("");
  const [caption, setCaption] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [folderId, setFolderId] = useState<string | null>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const [replacing, setReplacing] = useState(false);

  useEffect(() => {
    if (q.data?.asset) {
      const a = q.data.asset;
      setAlt(a.alt ?? ""); setCaption(a.caption ?? ""); setDescription(a.description ?? "");
      setTags((a.tags ?? []).join(", ")); setFolderId(a.folder_id ?? null);
    }
  }, [q.data]);

  const save = useMutation({
    mutationFn: () => updateAsset({ data: { id, alt: alt || null, caption: caption || null, description: description || null, folder_id: folderId, tags: tags.split(",").map((t) => t.trim()).filter(Boolean) } }),
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["dam"] }); onChanged(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Save failed"),
  });

  const doReplace = async (file: File) => {
    if (!q.data?.asset) return;
    setReplacing(true);
    try {
      const dims = await readImageDims(file);
      const vmeta = await readVideoMeta(file);
      const signed = await createUrl({ data: { filename: file.name, size: file.size } });
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", signed.signed_url);
        xhr.setRequestHeader("x-upsert", "true");
        xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`HTTP ${xhr.status}`)));
        xhr.onerror = () => reject(new Error("Network error"));
        xhr.send(file);
      });
      await replaceAsset({ data: { id, storage_path: signed.path, size: file.size, mime: file.type, width: dims.width ?? vmeta.width, height: dims.height ?? vmeta.height, duration_seconds: vmeta.duration_seconds, note: `Replaced with ${file.name}` } });
      toast.success("Replaced — new version created");
      qc.invalidateQueries({ queryKey: ["dam"] });
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Replace failed");
    } finally { setReplacing(false); }
  };

  const doRollback = async (version_id: string) => {
    if (!window.confirm("Roll back to this version? Current file becomes an older version.")) return;
    await rollbackAsset({ data: { id, version_id } });
    toast.success("Rolled back"); qc.invalidateQueries({ queryKey: ["dam"] }); onChanged();
  };

  const doDelete = async () => {
    const usage = q.data?.usage.length ?? 0;
    if (usage > 0 && !window.confirm(`This asset is used in ${usage} location(s). Move to trash anyway?`)) return;
    if (usage === 0 && !window.confirm("Move to trash?")) return;
    await deleteAssets({ data: { ids: [id], hard: false } });
    toast.success("Moved to trash"); qc.invalidateQueries({ queryKey: ["dam"] }); onChanged(); onClose();
  };

  const doDownload = async () => {
    if (!q.data?.asset) return;
    const { url } = await getSignedUrl({ data: { path: q.data.asset.storage_path, download: true } });
    window.open(url, "_blank");
  };

  const asset = q.data?.asset;

  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true">
      <button onClick={onClose} className="absolute inset-0 bg-black/40" />
      <aside className="relative ml-auto flex h-full w-full max-w-3xl flex-col overflow-hidden bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold">{asset?.filename ?? "Asset"}</h2>
            {asset && <p className="text-xs text-muted-foreground">{asset.asset_code} · v{asset.current_version} · {humanBytes(asset.size)}{asset.width ? ` · ${asset.width}×${asset.height}` : ""}</p>}
          </div>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-muted"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex gap-1 overflow-x-auto border-b border-border px-4 pt-3 text-sm">
          {(["preview", "details", "versions", "usage", "audit"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`whitespace-nowrap rounded-t-lg px-3 py-2 font-semibold capitalize ${tab === t ? "bg-primary-soft text-primary" : "text-muted-foreground hover:text-foreground"}`}>{t}</button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {q.isLoading || !asset ? <SkeletonBlock className="h-80" /> : (
            <>
              {tab === "preview" && (
                <div className="space-y-3">
                  <AssetPreview asset={asset} />
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => replaceInputRef.current?.click()} disabled={replacing} className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-50"><Replace className="h-4 w-4" /> {replacing ? "Replacing…" : "Replace"}</button>
                    <input ref={replaceInputRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) doReplace(f); e.target.value = ""; }} />
                    <button onClick={doDownload} className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-semibold hover:bg-muted"><Download className="h-4 w-4" /> Download</button>
                    <button onClick={doDelete} className="inline-flex items-center gap-1.5 rounded-xl border border-destructive/30 px-3 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /> {asset.status === "deleted" ? "In trash" : "Move to trash"}</button>
                    {asset.status !== "active" && (
                      <button onClick={async () => { await restoreAsset({ data: { id } }); toast.success("Restored"); qc.invalidateQueries({ queryKey: ["dam"] }); onChanged(); }} className="inline-flex items-center gap-1.5 rounded-xl border border-primary/30 px-3 py-2 text-sm font-semibold text-primary hover:bg-primary-soft">Restore</button>
                    )}
                  </div>
                </div>
              )}

              {tab === "details" && (
                <div className="space-y-3 text-sm">
                  <Field label="Alt text"><input value={alt} onChange={(e) => setAlt(e.target.value)} className="w-full rounded-lg border border-border bg-background p-2" /></Field>
                  <Field label="Caption"><input value={caption} onChange={(e) => setCaption(e.target.value)} className="w-full rounded-lg border border-border bg-background p-2" /></Field>
                  <Field label="Description"><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full rounded-lg border border-border bg-background p-2" /></Field>
                  <Field label="Tags (comma-separated)"><input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="homepage, hero, project" className="w-full rounded-lg border border-border bg-background p-2" /></Field>
                  <Field label="Folder">
                    <select value={folderId ?? ""} onChange={(e) => setFolderId(e.target.value || null)} className="w-full rounded-lg border border-border bg-background p-2">
                      <option value="">Unfiled</option>
                      {folders.map((f) => <option key={f.id} value={f.id}>{f.path}</option>)}
                    </select>
                  </Field>
                  <div className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-muted/30 p-3 text-xs">
                    <div><div className="text-muted-foreground">Type</div><div className="font-semibold uppercase">{asset.kind}</div></div>
                    <div><div className="text-muted-foreground">MIME</div><div className="font-mono">{asset.mime ?? "—"}</div></div>
                    <div><div className="text-muted-foreground">Size</div><div className="font-semibold">{humanBytes(asset.size)}</div></div>
                    <div><div className="text-muted-foreground">Dimensions</div><div className="font-semibold">{asset.width ? `${asset.width} × ${asset.height}` : "—"}</div></div>
                    <div><div className="text-muted-foreground">Duration</div><div className="font-semibold">{asset.duration_seconds ? `${asset.duration_seconds.toFixed(1)}s` : "—"}</div></div>
                    <div><div className="text-muted-foreground">Uploaded</div><div className="font-semibold">{new Date(asset.created_at).toLocaleString()}</div></div>
                    <div><div className="text-muted-foreground">Usage</div><div className="font-semibold">{asset.usage_count}</div></div>
                    <div><div className="text-muted-foreground">Version</div><div className="font-semibold">v{asset.current_version}</div></div>
                  </div>
                  <div className="flex justify-end">
                    <button onClick={() => save.mutate()} disabled={save.isPending} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60">{save.isPending ? "Saving…" : "Save changes"}</button>
                  </div>
                </div>
              )}

              {tab === "versions" && (
                <div className="space-y-2">
                  {(q.data.versions ?? []).map((v) => (
                    <div key={v.id} className={`rounded-xl border p-3 ${v.version_number === asset.current_version ? "border-primary bg-primary-soft/30" : "border-border"}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-bold">Version {v.version_number}{v.version_number === asset.current_version && <span className="ml-2 rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">CURRENT</span>}</div>
                          <div className="text-xs text-muted-foreground">{new Date(v.created_at).toLocaleString()} · {humanBytes(v.size)}</div>
                          {v.note && <div className="mt-1 text-xs italic text-muted-foreground">{v.note}</div>}
                        </div>
                        <div className="flex gap-1">
                          {v.signed_url && <a href={v.signed_url} target="_blank" rel="noreferrer" className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-muted">Open</a>}
                          {v.version_number !== asset.current_version && (
                            <button onClick={() => doRollback(v.id)} className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs hover:bg-muted"><History className="h-3 w-3" /> Roll back</button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {tab === "usage" && (
                <div>
                  {(q.data.usage ?? []).length === 0 ? (
                    <EmptyState icon={<Link2 className="h-6 w-6" />} title="Not used yet" body="This asset isn't referenced anywhere. Safe to delete." />
                  ) : (
                    <ul className="space-y-1.5">
                      {q.data.usage.map((u) => (
                        <li key={u.id} className="flex items-center justify-between rounded-xl border border-border p-2 text-sm">
                          <div>
                            <div className="font-semibold">{u.ref_label ?? u.ref_id}</div>
                            <div className="text-xs uppercase tracking-wider text-muted-foreground">{u.context}</div>
                          </div>
                          {u.ref_url && <a href={u.ref_url} className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-muted">Open</a>}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {tab === "audit" && (
                <ul className="space-y-1.5 text-xs">
                  {(q.data.audit ?? []).map((e) => (
                    <li key={e.id} className="rounded-lg bg-muted/40 px-2 py-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold uppercase text-primary tracking-wider">{e.action}</span>
                        <span className="text-muted-foreground">{new Date(e.created_at).toLocaleString()}</span>
                      </div>
                      {e.meta && Object.keys(e.meta).length > 0 && <pre className="mt-1 overflow-x-auto text-[10px] text-muted-foreground">{JSON.stringify(e.meta, null, 2)}</pre>}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </aside>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}
