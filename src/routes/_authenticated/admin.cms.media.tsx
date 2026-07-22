import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Upload, Trash2, Copy, ImageIcon, Search } from "lucide-react";
import { RoleGuard } from "@/components/aawash/AuthGuard";
import { AdminShell } from "@/components/aawash/admin/AdminShell";
import { useSession } from "@/hooks/useSession";
import { SectionCard, EmptyState, SkeletonBlock } from "@/components/aawash/dashboard-kit";
import { cmsListMedia, cmsCreateMediaUploadUrl, cmsRegisterMedia, cmsDeleteMedia } from "@/lib/cms.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/cms/media")({
  component: () => (<RoleGuard allow={["super_admin"]}><Content /></RoleGuard>),
  head: () => ({ meta: [{ title: "Media Library — Aawash CMS" }, { name: "description", content: "Central media library." }, { name: "robots", content: "noindex" }] }),
});

function kindOf(file: File): "image" | "video" | "pdf" | "svg" | "lottie" | "model" | "other" {
  const m = file.type;
  if (m.startsWith("image/svg")) return "svg";
  if (m.startsWith("image/")) return "image";
  if (m.startsWith("video/")) return "video";
  if (m === "application/pdf") return "pdf";
  if (file.name.endsWith(".lottie") || file.name.endsWith(".json")) return "lottie";
  if (/\.(glb|gltf|obj|fbx|stl)$/i.test(file.name)) return "model";
  return "other";
}

function Content() {
  const { profile } = useSession();
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [uploading, setUploading] = useState(false);

  const listFn = useServerFn(cmsListMedia);
  const list = useQuery({ queryKey: ["cms-media", q], queryFn: () => listFn({ data: { search: q || undefined } }) });

  const signFn = useServerFn(cmsCreateMediaUploadUrl);
  const regFn = useServerFn(cmsRegisterMedia);
  const delFn = useServerFn(cmsDeleteMedia);

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const s = await signFn({ data: { filename: file.name } });
        const { error } = await supabase.storage.from("cms-media").uploadToSignedUrl(s.path, s.token, file);
        if (error) throw error;
        await regFn({ data: { storage_path: s.path, filename: file.name, kind: kindOf(file), size: file.size, mime: file.type } });
      }
      toast.success("Uploaded");
      qc.invalidateQueries({ queryKey: ["cms-media"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const delMut = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["cms-media"] }); },
  });

  return (
    <AdminShell profile={profile}>
      <div className="mx-auto max-w-6xl space-y-4 p-4 sm:p-6">
        <header className="glass-card rounded-3xl p-5">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary"><ImageIcon className="h-4 w-4" /> Media library</div>
              <h1 className="mt-1 truncate text-2xl font-black">Uploads</h1>
              <p className="text-sm text-muted-foreground">Images, videos, PDFs, SVGs, Lottie, 3D models.</p>
            </div>
            <div>
              <input ref={inputRef} type="file" multiple hidden onChange={(e) => handleUpload(e.target.files)} />
              <button onClick={() => inputRef.current?.click()} disabled={uploading} className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"><Upload className="h-4 w-4" /> {uploading ? "Uploading…" : "Upload"}</button>
            </div>
          </div>
        </header>

        <SectionCard title="All media">
          <div className="mb-3 relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search filename or alt…" className="w-full rounded-xl border border-border bg-background py-2 pl-9 pr-3 text-sm" />
          </div>
          {list.isLoading ? <SkeletonBlock lines={6} /> : (list.data ?? []).length === 0 ? (
            <EmptyState title="No media" description="Upload your first file." />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {(list.data ?? []).map((m) => (
                <div key={m.id} className="group overflow-hidden rounded-2xl border border-border bg-card">
                  <div className="aspect-square bg-muted">
                    {m.kind === "image" && m.signed_url ? (
                      <img src={m.signed_url} alt={m.alt ?? ""} className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <div className="grid h-full place-items-center text-xs uppercase text-muted-foreground">{m.kind}</div>
                    )}
                  </div>
                  <div className="p-2">
                    <div className="truncate text-xs font-semibold">{m.filename}</div>
                    <div className="mt-1 flex justify-between gap-1">
                      <button onClick={() => { if (m.signed_url) { navigator.clipboard.writeText(m.signed_url); toast.success("URL copied"); } }} className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs hover:bg-muted"><Copy className="h-3 w-3" /> Copy URL</button>
                      <button onClick={() => delMut.mutate(m.id)} className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs text-destructive hover:bg-destructive/10"><Trash2 className="h-3 w-3" /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </AdminShell>
  );
}
