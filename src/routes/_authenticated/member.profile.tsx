import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Mail, KeyRound, Phone, Building2, Calendar, Wallet, TrendingUp, IndianRupee, Save, User, Image as ImageIcon } from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { RoleGuard } from "@/components/aawash/AuthGuard";
import { DashboardShell } from "@/components/aawash/DashboardShell";
import {
  SectionCard,
  formatINR,
  initials,
} from "@/components/aawash/dashboard-kit";
import { roleLabel } from "@/lib/auth";
import { updateMyProfile, changeMyPassword } from "@/lib/leader.functions";

export const Route = createFileRoute("/_authenticated/member/profile")({
  component: ProfilePage,
  head: () => ({ meta: [{ title: "Profile — Aawash" }] }),
});

function ProfilePage() {
  return (
    <RoleGuard allow={["member", "team_leader", "super_admin"]}>
      <ProfileContent />
    </RoleGuard>
  );
}

function ProfileContent() {
  const { profile, role } = useSession();
  const qc = useQueryClient();
  const updateFn = useServerFn(updateMyProfile);
  const passFn = useServerFn(changeMyPassword);

  const [email, setEmail] = useState(profile?.email ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? "");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const saveProfile = useMutation({
    mutationFn: () => updateFn({ data: { email, avatar_url: avatarUrl || null } }),
    onSuccess: () => {
      setMsg({ kind: "success", text: "Profile updated." });
      qc.invalidateQueries();
    },
    onError: (e) => setMsg({ kind: "error", text: (e as Error).message }),
  });

  const savePassword = useMutation({
    mutationFn: () => passFn({ data: { password } }),
    onSuccess: () => {
      setMsg({ kind: "success", text: "Password updated." });
      setPassword("");
    },
    onError: (e) => setMsg({ kind: "error", text: (e as Error).message }),
  });

  return (
    <DashboardShell role="member" profile={profile}>
      <header>
        <div className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
          Account
        </div>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">Profile</h1>
      </header>

      <section className="glass-card mt-6 rounded-4xl p-5 shadow-[var(--shadow-float)] sm:p-8">
        <div className="flex flex-wrap items-center gap-4">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="h-16 w-16 rounded-3xl object-cover" />
          ) : (
            <div className="grid h-16 w-16 place-items-center rounded-3xl bg-gradient-to-br from-primary to-leaf text-lg font-bold text-primary-foreground">
              {initials(profile?.full_name)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-2xl font-extrabold tracking-tight text-foreground">{profile?.full_name || "—"}</h2>
            <div className="mt-1 font-mono text-xs text-muted-foreground">
              {profile?.login_id} · {profile?.display_code}
            </div>
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-primary">
              {roleLabel(role)}
            </div>
          </div>
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KV icon={<Phone size={12} />} label="Mobile" value={profile?.mobile_number ?? "—"} />
          <KV icon={<Mail size={12} />} label="Email" value={profile?.email ?? "—"} />
          <KV icon={<User size={12} />} label="Login ID" value={profile?.login_id ?? "—"} mono />
          <KV icon={<Building2 size={12} />} label="Team" value={profile?.team_id ? "Assigned" : "—"} />
        </dl>
      </section>

      <section className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MiniCard icon={<Wallet size={16} />} label="Wallet" value={formatINR(profile?.wallet_balance)} />
        <MiniCard icon={<IndianRupee size={16} />} label="Earnings" value={formatINR(profile?.total_earnings ?? 0, { compact: true })} />
        <MiniCard icon={<TrendingUp size={16} />} label="Sales" value={formatINR(profile?.total_sales ?? 0, { compact: true })} />
        <MiniCard icon={<Calendar size={16} />} label="Referrals" value={String(profile?.referral_count ?? 0)} accent="gold" />
      </section>

      {msg && (
        <div
          className={`mt-6 rounded-2xl px-4 py-3 text-xs font-semibold ${
            msg.kind === "success" ? "bg-success/15 text-success" : "bg-destructive/10 text-destructive"
          }`}
        >
          {msg.text}
        </div>
      )}

      <section className="mt-6 grid gap-5 lg:grid-cols-2">
        <SectionCard title="Editable details" subtitle="Update your email and photo.">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setMsg(null);
              saveProfile.mutate();
            }}
            className="flex flex-col gap-3"
          >
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Email</label>
              <div className="relative mt-1">
                <Mail size={14} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="h-12 w-full rounded-2xl border border-input bg-surface pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Avatar URL</label>
              <div className="relative mt-1">
                <ImageIcon size={14} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="url"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://…"
                  className="h-12 w-full rounded-2xl border border-input bg-surface pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={saveProfile.isPending}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] disabled:opacity-50"
            >
              <Save size={14} /> {saveProfile.isPending ? "Saving…" : "Save changes"}
            </button>
          </form>
        </SectionCard>

        <SectionCard title="Change password" subtitle="Minimum 8 characters.">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setMsg(null);
              savePassword.mutate();
            }}
            className="flex flex-col gap-3"
          >
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password"
              minLength={8}
              className="h-12 w-full rounded-2xl border border-input bg-surface px-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="submit"
              disabled={savePassword.isPending || password.length < 8}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] disabled:opacity-50"
            >
              <KeyRound size={14} /> {savePassword.isPending ? "Updating…" : "Change password"}
            </button>
          </form>
        </SectionCard>
      </section>

      <p className="mt-6 text-center text-[11px] text-muted-foreground">
        Only your email, avatar, and password can be edited. Everything else is managed by your Admin.
      </p>
    </DashboardShell>
  );
}

function KV({ icon, label, value, mono = false }: { icon: React.ReactNode; label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {icon} {label}
      </div>
      <div className={`mt-1 truncate text-sm font-semibold text-foreground ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}

function MiniCard({
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
    <div className="glass-card rounded-3xl p-4 shadow-[var(--shadow-soft)]">
      <div className={`grid h-9 w-9 place-items-center rounded-xl ${accent === "gold" ? "bg-gold/15 text-gold-foreground" : "bg-primary-soft text-primary"}`}>
        {icon}
      </div>
      <div className="mt-3 text-lg font-extrabold tracking-tight text-foreground">{value}</div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}
