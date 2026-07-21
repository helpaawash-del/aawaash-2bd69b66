import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Save } from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { RoleGuard } from "@/components/aawash/AuthGuard";
import { AdminShell } from "@/components/aawash/admin/AdminShell";
import { adminUpsertProject } from "@/lib/project-admin.functions";

export const Route = createFileRoute("/_authenticated/admin/projects/new")({
  component: NewProjectPage,
  head: () => ({ meta: [{ title: "New Project — Aawash Admin" }] }),
});

function NewProjectPage() {
  return (
    <RoleGuard allow={["super_admin"]}>
      <NewProjectContent />
    </RoleGuard>
  );
}

function NewProjectContent() {
  const { profile } = useSession();
  const navigate = useNavigate();
  const upsert = useServerFn(adminUpsertProject);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const fd = new FormData(e.currentTarget);
      const raw = Object.fromEntries(fd.entries());
      const payload = {
        ...raw,
        display_priority: raw.display_priority || 0,
        completion_percent: raw.completion_percent || 0,
        price_from: raw.price_from || 0,
      };
      const res = await upsert({ data: payload as never });
      if (res.project?.id) {
        navigate({ to: "/admin/projects/$id", params: { id: res.project.id } });
      } else {
        navigate({ to: "/admin/projects" });
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create project");
      setSaving(false);
    }
  }

  return (
    <AdminShell profile={profile}>
      <button
        onClick={() => navigate({ to: "/admin/projects" })}
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft size={14} />
        Back to Projects
      </button>

      <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
        Create New Project
      </h1>
      <p className="mt-2 max-w-xl text-sm text-muted-foreground">
        Set up the core project record. You can add buildings, floors, flats and media after saving.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-8">
        <Section title="Identity">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Project Name *" name="name" required maxLength={120} />
            <Field label="Slug (lowercase-with-dashes) *" name="slug" required pattern="[a-z0-9-]+" maxLength={80} />
            <Field label="Location *" name="location" required maxLength={120} />
            <Field label="Address" name="address" maxLength={240} />
            <Field label="Tag (e.g. Featured)" name="tag" maxLength={40} />
            <SelectField label="Visibility" name="visibility" defaultValue="draft" options={[
              { value: "public", label: "Public" },
              { value: "internal", label: "Internal" },
              { value: "draft", label: "Draft" },
              { value: "archived", label: "Archived" },
            ]} />
          </div>
        </Section>

        <Section title="Type & Status">
          <div className="grid gap-4 md:grid-cols-2">
            <SelectField label="Project Type" name="project_type" defaultValue="flat_inventory" options={[
              { value: "flat_inventory", label: "Flat Inventory" },
              { value: "plot", label: "Plot" },
              { value: "villa", label: "Villa" },
              { value: "commercial", label: "Commercial" },
            ]} />
            <SelectField label="Construction Status" name="construction_status" defaultValue="planning" options={[
              { value: "planning", label: "Planning" },
              { value: "under_construction", label: "Under Construction" },
              { value: "nearing_completion", label: "Nearing Completion" },
              { value: "ready_to_move", label: "Ready to Move" },
              { value: "completed", label: "Completed" },
              { value: "sold_out", label: "Sold Out" },
            ]} />
            <Field label="Launch Date" name="launch_date" type="date" />
            <Field label="Possession Date" name="possession_date" type="date" />
            <Field label="Completion %" name="completion_percent" type="number" min={0} max={100} defaultValue={0} />
            <Field label="Display Priority" name="display_priority" type="number" min={0} max={1000} defaultValue={0} />
          </div>
        </Section>

        <Section title="Pricing">
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Price From (₹) *" name="price_from" type="number" min={0} required defaultValue={0} />
            <Field label="Price Min (₹)" name="price_min" type="number" min={0} />
            <Field label="Price Max (₹)" name="price_max" type="number" min={0} />
          </div>
        </Section>

        <Section title="Description">
          <div className="grid gap-4">
            <Field label="Short Description" name="short_description" maxLength={240} />
            <TextAreaField label="Full Description" name="description" maxLength={4000} rows={4} />
          </div>
        </Section>

        <Section title="Location & Map">
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Latitude" name="latitude" type="number" step="0.0000001" />
            <Field label="Longitude" name="longitude" type="number" step="0.0000001" />
            <Field label="Google Map URL" name="google_map_url" type="url" />
          </div>
        </Section>

        <Section title="Media URLs">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Thumbnail URL" name="thumbnail_url" type="url" />
            <Field label="Cover URL" name="cover_url" type="url" />
            <Field label="Hero Banner URL" name="hero_banner_url" type="url" />
            <Field label="Logo URL" name="logo_url" type="url" />
          </div>
        </Section>

        <Section title="SEO">
          <div className="grid gap-4">
            <Field label="SEO Title" name="seo_title" maxLength={160} />
            <Field label="SEO Description" name="seo_description" maxLength={320} />
          </div>
        </Section>

        {error && (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-700">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 border-t border-border pt-6">
          <button
            type="button"
            onClick={() => navigate({ to: "/admin/projects" })}
            className="rounded-full border border-border bg-surface px-5 py-2.5 text-sm font-semibold text-foreground"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition-transform hover:-translate-y-0.5 disabled:opacity-60"
          >
            <Save size={14} />
            {saving ? "Creating…" : "Create Project"}
          </button>
        </div>
      </form>
    </AdminShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-border bg-surface p-6 shadow-[var(--shadow-soft)]">
      <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-muted-foreground">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, name, ...rest }: { label: string; name: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">{label}</span>
      <input
        name={name}
        {...rest}
        className="w-full rounded-2xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
    </label>
  );
}

function TextAreaField({ label, name, ...rest }: { label: string; name: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">{label}</span>
      <textarea
        name={name}
        {...rest}
        className="w-full rounded-2xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
    </label>
  );
}

function SelectField({ label, name, defaultValue, options }: { label: string; name: string; defaultValue?: string; options: Array<{ value: string; label: string }> }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="w-full rounded-2xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}
