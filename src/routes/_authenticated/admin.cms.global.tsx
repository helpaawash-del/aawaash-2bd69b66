import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Globe, Save } from "lucide-react";
import { RoleGuard } from "@/components/aawash/AuthGuard";
import { AdminShell } from "@/components/aawash/admin/AdminShell";
import { useSession } from "@/hooks/useSession";
import { SectionCard, SkeletonBlock } from "@/components/aawash/dashboard-kit";
import { cmsGetGlobal, cmsUpdateGlobal } from "@/lib/cms.functions";

export const Route = createFileRoute("/_authenticated/admin/cms/global")({
  component: () => (<RoleGuard allow={["super_admin"]}><Content /></RoleGuard>),
  head: () => ({ meta: [{ title: "Global content — Aawash CMS" }, { name: "description", content: "One place to edit company info, contact, socials, nav, footer." }, { name: "robots", content: "noindex" }] }),
});

function Content() {
  const { profile } = useSession();
  const qc = useQueryClient();
  const getFn = useServerFn(cmsGetGlobal);
  const q = useQuery({ queryKey: ["cms-global-admin"], queryFn: () => getFn() });

  const upFn = useServerFn(cmsUpdateGlobal);
  const upMut = useMutation({
    mutationFn: (v: { key: string; value: unknown }) => upFn({ data: v }),
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["cms-global"] }); qc.invalidateQueries({ queryKey: ["cms-global-admin"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (q.isLoading) return <AdminShell profile={profile}><div className="p-6"><SkeletonBlock lines={12} /></div></AdminShell>;

  return (
    <AdminShell profile={profile}>
      <div className="mx-auto max-w-5xl space-y-4 p-4 sm:p-6">
        <header className="glass-card rounded-3xl p-5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary"><Globe className="h-4 w-4" /> Global content</div>
          <h1 className="mt-1 text-2xl font-black">One source of truth</h1>
          <p className="text-sm text-muted-foreground">Company details, contact info, navigation, socials — reused everywhere.</p>
        </header>

        {(q.data ?? []).map((row) => (
          <GlobalEditor key={row.key} row={row} onSave={(value) => upMut.mutate({ key: row.key, value })} saving={upMut.isPending} />
        ))}
      </div>
    </AdminShell>
  );
}

function GlobalEditor({ row, onSave, saving }: { row: { key: string; label: string | null; category: string | null; value: unknown }; onSave: (value: unknown) => void; saving: boolean }) {
  const [txt, setTxt] = useState(() => JSON.stringify(row.value, null, 2));
  const [err, setErr] = useState<string | null>(null);
  return (
    <SectionCard title={row.label ?? row.key} subtitle={row.category ?? ""}>
      <textarea value={txt} onChange={(e) => { setTxt(e.target.value); setErr(null); }} rows={Math.min(12, txt.split("\n").length + 1)} className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs" />
      {err && <div className="mt-1 text-xs text-destructive">{err}</div>}
      <div className="mt-2 flex justify-end">
        <button onClick={() => { try { onSave(JSON.parse(txt)); } catch (e) { setErr((e as Error).message); } }} disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"><Save className="h-3 w-3" /> Save</button>
      </div>
    </SectionCard>
  );
}
