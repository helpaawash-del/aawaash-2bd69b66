import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ArrowLeft,
  ChevronDown,
  Eye,
  EyeOff,
  GripVertical,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  Trash2,
} from "lucide-react";
import { AdminShell } from "@/components/aawash/admin/AdminShell";
import { useSession } from "@/hooks/useSession";
import { RoleGuard } from "@/components/aawash/AuthGuard";
import { ImageUploadField } from "@/components/aawash/admin/MediaUploaders";
import { getHomepageContent, saveHomepageContent } from "@/lib/homepage.functions";
import {
  DEFAULT_HOMEPAGE,
  SECTION_SPECS,
  type FieldKey,
  type HomeItem,
  type HomepageDoc,
  type SectionSpec,
} from "@/lib/homepage-content";

export const Route = createFileRoute("/_authenticated/admin/homepage")({
  component: () => (
    <RoleGuard allow={["super_admin"]}>
      <AdminHomepageEditor />
    </RoleGuard>
  ),
  head: () => ({
    meta: [
      { title: "Public Homepage Editor · Aawaash Admin" },
      {
        name: "description",
        content: "Edit every section, heading, image and list item of the public Aawaash homepage.",
      },
    ],
  }),
});

const FIELD_LABELS: Record<FieldKey, string> = {
  eyebrow: "Eyebrow / badge",
  title: "Heading",
  accent: "Heading accent (highlighted words)",
  subtitle: "Description",
  image: "Image",
};

function AdminHomepageEditor() {
  const { profile } = useSession();
  const load = useServerFn(getHomepageContent);
  const save = useServerFn(saveHomepageContent);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin", "homepage"],
    queryFn: () => load(),
  });

  const [doc, setDoc] = useState<HomepageDoc | null>(null);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState<string | null>("hero");

  useEffect(() => {
    if (data) setDoc(structuredClone(data));
  }, [data]);

  const dirty = useMemo(
    () => (doc && data ? JSON.stringify(doc) !== JSON.stringify(data) : false),
    [doc, data],
  );

  function patch(id: string, next: Partial<HomepageDoc[string]>) {
    setDoc((d) => (d ? { ...d, [id]: { ...d[id], ...next } } : d));
  }

  async function onSave() {
    if (!doc) return;
    setSaving(true);
    try {
      await save({ data: { doc } });
      await refetch();
      toast.success("Homepage updated", { description: "Your changes are live on the public site." });
    } catch (err) {
      toast.error("Could not save homepage", {
        description: err instanceof Error ? err.message : "Unexpected error. Please retry.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminShell profile={profile}>
      <div className="mx-auto max-w-4xl space-y-5 pb-32">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-border bg-surface p-4 shadow-[var(--shadow-soft)]">
          <div className="flex items-center gap-3">
            <Link
              to="/admin"
              className="grid h-10 w-10 place-items-center rounded-2xl border border-border bg-background text-foreground"
              aria-label="Back to admin dashboard"
            >
              <ArrowLeft size={16} />
            </Link>
            <div>
              <h1 className="text-base font-extrabold text-foreground">Homepage sections</h1>
              <p className="text-xs text-muted-foreground">
                Toggle, edit and reorder the content shown at aawaash.lovable.app
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-xs font-bold text-foreground"
            >
              <Eye size={14} /> Preview
            </a>
            <button
              type="button"
              onClick={onSave}
              disabled={saving || !dirty}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-xs font-extrabold uppercase tracking-wider text-primary-foreground shadow-[var(--shadow-glow)] disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {dirty ? "Save changes" : "Saved"}
            </button>
          </div>
        </div>

        {isLoading || !doc ? (
          <div className="grid place-items-center rounded-3xl border border-border bg-surface p-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          SECTION_SPECS.map((spec) => (
            <SectionCard
              key={spec.id}
              spec={spec}
              value={doc[spec.id] ?? { enabled: true }}
              open={open === spec.id}
              onToggleOpen={() => setOpen(open === spec.id ? null : spec.id)}
              onChange={(next) => patch(spec.id, next)}
              onReset={() =>
                setDoc((d) =>
                  d ? { ...d, [spec.id]: structuredClone(DEFAULT_HOMEPAGE[spec.id] ?? { enabled: true }) } : d,
                )
              }
            />
          ))
        )}
      </div>
    </AdminShell>
  );
}

function SectionCard({
  spec,
  value,
  open,
  onToggleOpen,
  onChange,
  onReset,
}: {
  spec: SectionSpec;
  value: HomepageDoc[string];
  open: boolean;
  onToggleOpen: () => void;
  onChange: (next: Partial<HomepageDoc[string]>) => void;
  onReset: () => void;
}) {
  const items = value.items ?? [];

  function setItems(next: HomeItem[]) {
    onChange({ items: next });
  }
  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    const a = next[i]!;
    next[i] = next[j]!;
    next[j] = a;
    setItems(next);
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-border bg-surface shadow-[var(--shadow-soft)]">
      <div className="flex items-center gap-3 p-4">
        <button
          type="button"
          onClick={onToggleOpen}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
            <GripVertical size={15} />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-extrabold text-foreground">{spec.label}</span>
            <span className="block truncate text-xs text-muted-foreground">{spec.hint}</span>
          </span>
          <ChevronDown
            size={16}
            className={`ml-auto shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
        <button
          type="button"
          onClick={() => onChange({ enabled: !value.enabled })}
          aria-pressed={value.enabled}
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold ${
            value.enabled
              ? "border-primary/30 bg-primary-soft text-primary"
              : "border-border bg-background text-muted-foreground"
          }`}
        >
          {value.enabled ? <Eye size={12} /> : <EyeOff size={12} />}
          {value.enabled ? "Visible" : "Hidden"}
        </button>
      </div>

      {open && (
        <div className="space-y-4 border-t border-border bg-background/60 p-4">
          {spec.fields.map((f) =>
            f === "image" ? (
              <ImageUploadField
                key={f}
                label={FIELD_LABELS[f]}
                name={`${spec.id}-image`}
                value={value.image ?? ""}
                onChange={(url) => onChange({ image: url })}
                folder={`homepage/${spec.id}`}
              />
            ) : f === "subtitle" ? (
              <label key={f} className="block">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {FIELD_LABELS[f]}
                </span>
                <textarea
                  rows={3}
                  value={value[f] ?? ""}
                  onChange={(e) => onChange({ [f]: e.target.value })}
                  className="mt-1.5 w-full resize-none rounded-2xl border border-input bg-surface px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </label>
            ) : (
              <label key={f} className="block">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {FIELD_LABELS[f]}
                </span>
                <input
                  value={value[f] ?? ""}
                  onChange={(e) => onChange({ [f]: e.target.value })}
                  className="mt-1.5 w-full rounded-2xl border border-input bg-surface px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </label>
            ),
          )}

          {spec.items && (
            <div className="rounded-2xl border border-border bg-surface p-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {spec.items.label}
                </span>
                <button
                  type="button"
                  onClick={() => setItems([...items, { title: "", body: "" }])}
                  className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1.5 text-[11px] font-bold text-primary"
                >
                  <Plus size={12} /> Add
                </button>
              </div>
              <div className="mt-3 space-y-3">
                {items.map((it, i) => (
                  <div key={i} className="rounded-2xl border border-border bg-background p-3">
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1 space-y-2">
                        <input
                          value={it.title}
                          placeholder={spec.items!.titleLabel}
                          aria-label={`${spec.items!.titleLabel} ${i + 1}`}
                          onChange={(e) =>
                            setItems(items.map((x, k) => (k === i ? { ...x, title: e.target.value } : x)))
                          }
                          className="w-full rounded-xl border border-input bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                        {spec.items!.bodyLabel && (
                          <textarea
                            rows={2}
                            value={it.body ?? ""}
                            placeholder={spec.items!.bodyLabel}
                            aria-label={`${spec.items!.bodyLabel} ${i + 1}`}
                            onChange={(e) =>
                              setItems(items.map((x, k) => (k === i ? { ...x, body: e.target.value } : x)))
                            }
                            className="w-full resize-none rounded-xl border border-input bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                        )}
                      </div>
                      <div className="flex shrink-0 flex-col gap-1">
                        <button
                          type="button"
                          aria-label="Move up"
                          onClick={() => move(i, -1)}
                          className="grid h-7 w-7 place-items-center rounded-lg border border-border text-xs text-muted-foreground"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          aria-label="Move down"
                          onClick={() => move(i, 1)}
                          className="grid h-7 w-7 place-items-center rounded-lg border border-border text-xs text-muted-foreground"
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          aria-label="Delete item"
                          onClick={() => setItems(items.filter((_, k) => k !== i))}
                          className="grid h-7 w-7 place-items-center rounded-lg border border-destructive/30 text-destructive"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {items.length === 0 && (
                  <p className="py-3 text-center text-xs text-muted-foreground">No items yet.</p>
                )}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground hover:text-foreground"
          >
            <RotateCcw size={12} /> Reset section to default
          </button>
        </div>
      )}
    </section>
  );
}
