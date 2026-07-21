import { createFileRoute } from "@tanstack/react-router";
import { Building2, Users, Wallet, TrendingUp, ShieldCheck } from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { RoleGuard } from "@/components/aawash/AuthGuard";
import { DashboardShell } from "@/components/aawash/DashboardShell";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminHome,
  head: () => ({ meta: [{ title: "Admin — Aawash" }] }),
});

function AdminHome() {
  return (
    <RoleGuard allow={["super_admin"]}>
      <AdminContent />
    </RoleGuard>
  );
}

function AdminContent() {
  const { profile } = useSession();

  return (
    <DashboardShell role="super_admin" profile={profile}>
      <section>
        <div className="glass-card inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium text-foreground shadow-[var(--shadow-soft)]">
          <ShieldCheck size={14} className="text-gold" />
          Super Admin
        </div>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          Welcome back, {profile?.full_name?.split(" ")[0] || "Admin"}.
        </h1>
        <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
          Every team, project, sale and withdrawal across Aawash lives here.
          Full management surfaces roll out in the next parts.
        </p>
      </section>

      <section className="mt-10 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={<Building2 size={18} />} label="Active projects" value="0" />
        <StatCard icon={<TrendingUp size={18} />} label="Sales volume" value="—" accent="gold" />
        <StatCard icon={<Users size={18} />} label="Team members" value="0" />
        <StatCard icon={<Wallet size={18} />} label="Pending payouts" value="—" />
      </section>

      <section className="mt-10 rounded-4xl border border-border bg-surface p-6 shadow-[var(--shadow-soft)] sm:p-8">
        <h2 className="text-lg font-bold text-foreground sm:text-xl">Coming next</h2>
        <ul className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
          <li>Team Leader & Member management</li>
          <li>Projects, buildings & flat inventory</li>
          <li>Sales tracking & commission engine</li>
          <li>Withdrawals with approval workflow</li>
          <li>Referrals & tip persons</li>
          <li>Full audit logs & reporting</li>
        </ul>
      </section>
    </DashboardShell>
  );
}

function StatCard({
  icon,
  label,
  value,
  accent = "primary",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: "primary" | "gold";
}) {
  return (
    <div className="rounded-3xl border border-border bg-surface p-4 shadow-[var(--shadow-soft)] transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-float)] sm:p-5">
      <div
        className={`grid h-9 w-9 place-items-center rounded-xl ${accent === "gold" ? "bg-gold/15 text-gold-foreground" : "bg-primary-soft text-primary"}`}
      >
        {icon}
      </div>
      <div className="mt-4 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{value}</div>
      <div className="mt-1 text-[11px] font-medium text-muted-foreground">{label}</div>
    </div>
  );
}
