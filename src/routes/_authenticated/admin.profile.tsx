import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck, Mail, Phone, Clock, KeyRound, Smartphone, Fingerprint } from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { RoleGuard } from "@/components/aawash/AuthGuard";
import { AdminShell } from "@/components/aawash/admin/AdminShell";

export const Route = createFileRoute("/_authenticated/admin/profile")({
  component: AdminProfilePage,
  head: () => ({ meta: [{ title: "Profile — Admin" }] }),
});

function AdminProfilePage() {
  return (
    <RoleGuard allow={["super_admin"]}>
      <Content />
    </RoleGuard>
  );
}

function Content() {
  const { profile, user } = useSession();
  const initials = (profile?.full_name || profile?.login_id || "AA")
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <AdminShell role="super_admin" profile={profile}>
      <section className="glass-card overflow-hidden rounded-4xl p-6 shadow-[var(--shadow-float)] sm:p-8">
        <div className="grid gap-6 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
          <div className="grid h-24 w-24 place-items-center rounded-3xl bg-gradient-to-br from-primary to-leaf text-3xl font-black text-primary-foreground shadow-[var(--shadow-glow)]">
            {initials}
          </div>
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
              <ShieldCheck size={12} /> Super Admin
            </div>
            <h1 className="mt-2 truncate text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
              {profile?.full_name || "Admin"}
            </h1>
            <div className="mt-1 text-sm text-muted-foreground">Login ID · {profile?.login_id}</div>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <InfoCard title="Contact" items={[
          { icon: Mail, label: "Email", value: profile?.email || user?.email || "—" },
          { icon: Phone, label: "Mobile", value: profile?.mobile_number || "—" },
        ]} />
        <InfoCard title="Session" items={[
          { icon: Clock, label: "Last sign in", value: user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : "—" },
          { icon: Smartphone, label: "Device", value: typeof navigator !== "undefined" ? navigator.userAgent.split(") ")[0].replace(/^Mozilla\/[0-9.]+ \(/, "") : "—" },
        ]} />
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <SecurityAction
          icon={KeyRound}
          title="Change password"
          description="Update your admin password. You'll need to sign in again on other devices."
          disabled
        />
        <SecurityAction
          icon={Fingerprint}
          title="Two-factor authentication"
          description="Coming soon — TOTP and biometric options for high-privilege accounts."
          disabled
        />
      </section>

      <section className="mt-6 rounded-3xl border border-border bg-surface p-5 shadow-[var(--shadow-soft)]">
        <h2 className="text-sm font-bold text-foreground">Permission model</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Super Admin has unrestricted access. Future roles — Admin, Manager, Finance, Sales Head,
          CRM Manager, Content Manager, Media Manager — are provisioned via granular permissions
          without code changes.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {["Super Admin", "Admin", "Manager", "Finance", "Sales Head", "CRM Manager", "Content Manager", "Media Manager"].map((r, i) => (
            <span
              key={r}
              className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                i === 0
                  ? "bg-gradient-to-r from-primary to-leaf text-primary-foreground"
                  : "border border-dashed border-border text-muted-foreground"
              }`}
            >
              {r}
              {i > 0 && " · soon"}
            </span>
          ))}
        </div>
      </section>
    </AdminShell>
  );
}

function InfoCard({
  title,
  items,
}: {
  title: string;
  items: Array<{ icon: React.ElementType; label: string; value: string }>;
}) {
  return (
    <div className="glass-card rounded-3xl p-5 shadow-[var(--shadow-soft)]">
      <h2 className="mb-3 text-sm font-bold text-foreground">{title}</h2>
      <ul className="space-y-2">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <li key={it.label} className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-3 py-2.5">
              <Icon size={16} className="text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {it.label}
                </div>
                <div className="truncate text-sm font-semibold text-foreground">{it.value}</div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function SecurityAction({
  icon: Icon,
  title,
  description,
  disabled,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  disabled?: boolean;
}) {
  return (
    <div className="glass-card flex items-start gap-4 rounded-3xl p-5 shadow-[var(--shadow-soft)]">
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary">
        <Icon size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-bold text-foreground">{title}</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      <button
        disabled={disabled}
        className="rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-muted-foreground disabled:cursor-not-allowed disabled:opacity-60"
      >
        Soon
      </button>
    </div>
  );
}
