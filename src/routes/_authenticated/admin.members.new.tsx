import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, UserPlus, CheckCircle2, Loader2, Sparkles, AlertTriangle, Lock } from "lucide-react";
import { z } from "zod";
import { useSession } from "@/hooks/useSession";
import { RoleGuard } from "@/components/aawash/AuthGuard";
import { AdminShell } from "@/components/aawash/admin/AdminShell";
import { createMemberFull, listAllMembers } from "@/lib/members-admin.functions";
import { getTeamLimits } from "@/lib/team-leaders.functions";

const searchSchema = z.object({ leaderId: z.string().uuid().optional() });

export const Route = createFileRoute("/_authenticated/admin/members/new")({
  component: Page,
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({ meta: [{ title: "New Member — Aawash Admin" }] }),
});


function Page() {
  return (
    <RoleGuard allow={["super_admin"]}>
      <Content />
    </RoleGuard>
  );
}

function Content() {
  const { profile } = useSession();
  const navigate = useNavigate();
  const createFn = useServerFn(createMemberFull);
  const listFn = useServerFn(listAllMembers);
  const limitsFn = useServerFn(getTeamLimits);

  const { data } = useQuery({ queryKey: ["admin", "members"], queryFn: () => listFn() });
  const { data: limits } = useQuery({ queryKey: ["admin", "team-limits"], queryFn: () => limitsFn() });

  const cap = limits?.maxMembersPerTeam ?? 10;

  const availableTeams = useMemo(
    () =>
      (data?.leaders ?? []).filter(
        (t) => t.leader_id && t.member_count < cap,
      ),
    [data, cap],
  );

  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [teamId, setTeamId] = useState<string>("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [joiningDate, setJoiningDate] = useState("");
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ loginId: string; teamLetter: string } | null>(null);

  const chosenTeam = availableTeams.find((t) => t.team_id === teamId);
  const previewLoginId =
    chosenTeam && /^\d{10}$/.test(mobile) ? `${chosenTeam.letter}${mobile}` : "";

  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const canSubmit =
    !submitting &&
    fullName.trim().length >= 2 &&
    /^\d{10}$/.test(mobile) &&
    password.length >= 8 &&
    passwordsMatch &&
    teamId.length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await createFn({
        data: {
          fullName: fullName.trim(),
          mobile: mobile.trim(),
          password,
          teamId,
          email: email.trim(),
          address: address.trim(),
          avatarUrl: avatarUrl.trim(),
          joiningDate,
          remarks: remarks.trim(),
        },
      });
      setSuccess({ loginId: res.loginId, teamLetter: res.teamLetter });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create Member");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <AdminShell profile={profile}>
        <div className="glass-card mx-auto mt-10 max-w-lg rounded-4xl p-8 text-center shadow-[var(--shadow-float)]">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-emerald-500/15 text-emerald-600">
            <CheckCircle2 size={32} />
          </div>
          <h2 className="mt-4 text-2xl font-extrabold text-foreground">Member created</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Team <span className="font-bold text-foreground">{success.teamLetter}</span> now has one
            more member. Share these credentials securely.
          </p>
          <div className="mt-5 rounded-2xl border border-border bg-surface p-4 text-left">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Login ID
            </div>
            <div className="mt-1 font-mono text-lg font-bold text-foreground">{success.loginId}</div>
            <div className="mt-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Password
            </div>
            <div className="mt-1 font-mono text-lg font-bold text-foreground">{password}</div>
          </div>
          <div className="mt-6 flex items-center justify-center gap-2">
            <Link
              to="/admin/members"
              className="rounded-full border border-border bg-surface px-5 py-2 text-sm font-semibold text-foreground"
            >
              Back to list
            </Link>
            <button
              onClick={() => {
                setSuccess(null);
                setFullName("");
                setMobile("");
                setPassword("");
                setConfirmPassword("");
                setTeamId("");
                setEmail("");
                setAddress("");
                setAvatarUrl("");
                setJoiningDate("");
                setRemarks("");
              }}
              className="rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground shadow-[var(--shadow-glow)]"
            >
              Add another
            </button>
          </div>
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell profile={profile}>
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={() => navigate({ to: "/admin/members" })}
          className="glass-card grid h-10 w-10 place-items-center rounded-2xl text-foreground shadow-[var(--shadow-soft)]"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <div className="glass-card inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-foreground">
            <Sparkles size={12} className="text-gold" />
            Up to {cap} members per team
          </div>
          <h1 className="mt-2 text-3xl font-extrabold text-foreground">Add a Member</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Assign to a team, and issue login credentials. Login ID = TeamLetter + Mobile.
          </p>
        </div>
      </div>

      {availableTeams.length === 0 && (
        <div className="mb-6 flex items-start gap-3 rounded-3xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-900">
          <AlertTriangle size={18} className="mt-0.5 flex-shrink-0" />
          <div>
            <div className="font-bold">No teams have space</div>
            <div className="text-xs">
              Every team is either at capacity or missing a Team Leader. Increase the limit in Team
              Leaders → Limits, or add a leader first.
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-3">
        <section className="glass-card rounded-4xl p-6 shadow-[var(--shadow-soft)] lg:col-span-2">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Identity</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Full name*" value={fullName} onChange={setFullName} placeholder="Aditi Verma" />
            <Field
              label="Mobile (10 digits)*"
              value={mobile}
              onChange={(v) => setMobile(v.replace(/\D/g, "").slice(0, 10))}
              placeholder="9876543210"
              hint="Combines with team letter to form the Login ID"
              mono
            />
            <Field
              label="Password*"
              value={password}
              onChange={setPassword}
              placeholder="Minimum 8 characters"
              type="password"
            />
            <Field
              label="Confirm password*"
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder="Re-enter password"
              type="password"
              hint={
                password.length > 0 && confirmPassword.length > 0 && !passwordsMatch
                  ? "Passwords do not match"
                  : undefined
              }
            />
            <Field label="Email (optional)" value={email} onChange={setEmail} placeholder="aditi@example.com" />
            <Field label="Joining date" value={joiningDate} onChange={setJoiningDate} type="date" />
            <Field label="Avatar URL" value={avatarUrl} onChange={setAvatarUrl} placeholder="https://…" />
          </div>
          <div className="mt-4 grid gap-4">
            <Field
              label="Address"
              value={address}
              onChange={setAddress}
              placeholder="City, state, or full address"
              multiline
            />
            <Field
              label="Remarks (internal)"
              value={remarks}
              onChange={setRemarks}
              placeholder="Onboarding notes for admin reference"
              multiline
            />
          </div>
        </section>

        <aside className="glass-card flex flex-col gap-5 rounded-4xl p-6 shadow-[var(--shadow-soft)]">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Team assignment
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Members belong to exactly one team.
            </p>
          </div>
          <label className="block text-sm">
            <span className="text-xs font-semibold text-muted-foreground">Select team*</span>
            <select
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              className="mt-1 block w-full rounded-2xl border border-border bg-surface px-3 py-2.5 text-sm font-semibold text-foreground outline-none focus:border-primary"
            >
              <option value="">— Choose a team —</option>
              {availableTeams.map((t) => (
                <option key={t.team_id} value={t.team_id}>
                  Team {t.letter} · {t.name} ({t.member_count}/{cap})
                </option>
              ))}
            </select>
          </label>

          {previewLoginId && (
            <div className="rounded-2xl border border-primary/30 bg-primary-soft p-3 text-sm">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Generated Login ID
              </div>
              <div className="mt-1 font-mono text-lg font-bold text-foreground">{previewLoginId}</div>
            </div>
          )}

          {error && (
            <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-800">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-[var(--shadow-glow)] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
            {submitting ? "Creating…" : "Create Member"}
          </button>
          <p className="text-[11px] text-muted-foreground">
            Login ID is auto-generated and read-only. Credentials show once on success.
          </p>
        </aside>
      </form>
    </AdminShell>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  hint,
  type = "text",
  mono,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
  type?: string;
  mono?: boolean;
  multiline?: boolean;
}) {
  return (
    <label className="block text-sm">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="mt-1 block w-full resize-none rounded-2xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`mt-1 block w-full rounded-2xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary ${mono ? "font-mono" : ""}`}
        />
      )}
      {hint && <span className="mt-1 block text-[10px] text-muted-foreground">{hint}</span>}
    </label>
  );
}
