import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Bell,
  Shield,
  Globe,
  Palette,
  LifeBuoy,
  LogOut,
  Info,
  ChevronRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { RoleGuard } from "@/components/aawash/AuthGuard";
import { DashboardShell } from "@/components/aawash/DashboardShell";
import { SectionCard } from "@/components/aawash/dashboard-kit";

export const Route = createFileRoute("/_authenticated/leader/settings")({
  component: SettingsPage,
  head: () => ({ meta: [{ title: "Settings — Aawash" }] }),
});

function SettingsPage() {
  return (
    <RoleGuard allow={["team_leader", "super_admin", "member"]}>
      <SettingsContent />
    </RoleGuard>
  );
}

function SettingsContent() {
  const { profile, role } = useSession();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    try {
      await qc.cancelQueries();
      qc.clear();
      await supabase.auth.signOut();
    } finally {
      navigate({ to: "/auth", replace: true });
    }
  }

  return (
    <DashboardShell role={role || "team_leader"} profile={profile}>
      <header>
        <div className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
          Preferences
        </div>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage how Aawash works for you.</p>
      </header>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <SectionCard title="Notifications">
          <Row icon={<Bell size={16} />} title="Push notifications" hint="Coming soon" />
          <Row icon={<Bell size={16} />} title="Email alerts" hint="Coming soon" />
        </SectionCard>

        <SectionCard title="Preferences">
          <Row icon={<Palette size={16} />} title="Appearance" hint="Light (default)" />
          <Row icon={<Globe size={16} />} title="Language" hint="English (India)" />
        </SectionCard>

        <SectionCard title="Privacy & security">
          <Row icon={<Shield size={16} />} title="Privacy policy" hint="Read online" />
          <Row icon={<Info size={16} />} title="Terms of use" hint="Read online" />
        </SectionCard>

        <SectionCard title="Support">
          <Row icon={<LifeBuoy size={16} />} title="Contact support" hint="hello@aawash.app" />
          <Row icon={<Info size={16} />} title="App version" hint="1.0.0" />
        </SectionCard>
      </section>

      <section className="mt-6">
        <button
          onClick={signOut}
          disabled={signingOut}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 text-sm font-semibold text-destructive shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5 disabled:opacity-50 sm:w-auto sm:px-8"
        >
          <LogOut size={14} /> {signingOut ? "Signing out…" : "Sign out"}
        </button>
      </section>

      <p className="mt-6 text-center text-[11px] text-muted-foreground">
        <Link to="/leader/profile" className="hover:text-foreground">
          Manage account
        </Link>
      </p>
    </DashboardShell>
  );
}

function Row({ icon, title, hint }: { icon: React.ReactNode; title: string; hint: string }) {
  return (
    <button
      type="button"
      className="flex w-full items-center gap-3 rounded-2xl border border-transparent px-2 py-2.5 text-left transition-colors hover:border-border/60 hover:bg-surface"
    >
      <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary-soft text-primary">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-foreground">{title}</div>
        <div className="text-[11px] text-muted-foreground">{hint}</div>
      </div>
      <ChevronRight size={16} className="text-muted-foreground" />
    </button>
  );
}
