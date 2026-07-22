import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Palette, Save } from "lucide-react";
import { RoleGuard } from "@/components/aawash/AuthGuard";
import { AdminShell } from "@/components/aawash/admin/AdminShell";
import { useSession } from "@/hooks/useSession";
import { SectionCard, SkeletonBlock } from "@/components/aawash/dashboard-kit";
import { cmsGetBrand, cmsUpdateBrand } from "@/lib/cms.functions";

export const Route = createFileRoute("/_authenticated/admin/cms/brand")({
  component: () => (<RoleGuard allow={["super_admin"]}><Content /></RoleGuard>),
  head: () => ({ meta: [{ title: "Brand & Theme — Aawash CMS" }, { name: "description", content: "Global brand tokens, colors and typography." }, { name: "robots", content: "noindex" }] }),
});

const COLOR_KEYS = ["primary", "secondary", "accent", "success", "warning", "destructive", "background", "foreground", "border", "muted"] as const;

function Content() {
  const { profile } = useSession();
  const qc = useQueryClient();
  const getFn = useServerFn(cmsGetBrand);
  const q = useQuery({ queryKey: ["cms-brand-admin"], queryFn: () => getFn() });

  const [colors, setColors] = useState<Record<string, string>>({});
  const [fonts, setFonts] = useState<{ display?: string; body?: string }>({});
  const [logo, setLogo] = useState<string>("");

  useEffect(() => {
    if (q.data) {
      setColors((q.data.colors ?? {}) as Record<string, string>);
      setFonts((q.data.fonts ?? {}) as { display?: string; body?: string });
      setLogo(q.data.logo_url ?? "");
    }
  }, [q.data]);

  // Live-apply
  useEffect(() => {
    const root = document.documentElement;
    Object.entries(colors).forEach(([k, v]) => { if (v) root.style.setProperty(`--${k}`, v); });
  }, [colors]);

  const upFn = useServerFn(cmsUpdateBrand);
  const upMut = useMutation({
    mutationFn: () => upFn({ data: { colors, fonts, logo_url: logo || null } }),
    onSuccess: () => { toast.success("Brand saved"); qc.invalidateQueries({ queryKey: ["cms-brand"] }); },
  });

  if (q.isLoading) return <AdminShell profile={profile}><div className="p-6"><SkeletonBlock lines={10} /></div></AdminShell>;

  return (
    <AdminShell profile={profile}>
      <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
        <header className="glass-card rounded-3xl p-5">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary"><Palette className="h-4 w-4" /> Brand & theme</div>
              <h1 className="mt-1 truncate text-2xl font-black">Live brand tokens</h1>
              <p className="text-sm text-muted-foreground">Colors update live across the app. Save to persist.</p>
            </div>
            <button onClick={() => upMut.mutate()} disabled={upMut.isPending} className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"><Save className="h-4 w-4" /> {upMut.isPending ? "Saving…" : "Save"}</button>
          </div>
        </header>

        <SectionCard title="Colors" subtitle="oklch(L C H) values recommended">
          <div className="grid gap-3 sm:grid-cols-2">
            {COLOR_KEYS.map((k) => (
              <label key={k} className="block">
                <span className="text-xs font-semibold capitalize">{k}</span>
                <div className="mt-1 flex items-center gap-2">
                  <div className="h-9 w-9 shrink-0 rounded-lg border border-border" style={{ background: colors[k] || "transparent" }} />
                  <input value={colors[k] ?? ""} onChange={(e) => setColors({ ...colors, [k]: e.target.value })} placeholder="oklch(0.62 0.19 145)" className="w-full rounded-lg border border-border bg-background px-2 py-2 font-mono text-xs" />
                </div>
              </label>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Typography" subtitle="Loaded via Google Fonts link in root">
          <div className="grid gap-3 sm:grid-cols-2">
            <label><span className="text-xs font-semibold">Display font</span><input value={fonts.display ?? ""} onChange={(e) => setFonts({ ...fonts, display: e.target.value })} className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-2 text-sm" /></label>
            <label><span className="text-xs font-semibold">Body font</span><input value={fonts.body ?? ""} onChange={(e) => setFonts({ ...fonts, body: e.target.value })} className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-2 text-sm" /></label>
          </div>
        </SectionCard>

        <SectionCard title="Logo" subtitle="Public URL from media library">
          <input value={logo} onChange={(e) => setLogo(e.target.value)} placeholder="https://…" className="w-full rounded-lg border border-border bg-background px-2 py-2 text-sm" />
          {logo && <img src={logo} alt="Logo preview" className="mt-3 h-16 rounded-lg border border-border p-2" />}
        </SectionCard>
      </div>
    </AdminShell>
  );
}
