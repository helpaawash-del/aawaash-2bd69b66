import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  KeyRound,
  Loader2,
  Lock,
  Plus,
  ShieldOff,
  Trash2,
  User as UserIcon,
  UserCheck,
  Users,
} from "lucide-react";
import { RoleGuard } from "@/components/aawash/AuthGuard";
import { AdminShell as DashboardShell } from "@/components/aawash/admin/AdminShell";
import { useSession } from "@/hooks/useSession";
import {
  adminResetPassword,
  createMember,
  createTeamLeader,
  listAllUsers,
  listTeamsWithLeaders,
  setUserStatus,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: AdminUsersPage,
  head: () => ({ meta: [{ title: "Users — Aawash Admin" }] }),
});

function AdminUsersPage() {
  return (
    <RoleGuard allow={["super_admin"]}>
      <AdminUsersContent />
    </RoleGuard>
  );
}

type TabId = "leaders" | "members" | "all";

function AdminUsersContent() {
  const { profile } = useSession();
  const [tab, setTab] = useState<TabId>("leaders");

  return (
    <DashboardShell role="super_admin" profile={profile}>
      <section>
        <Link
          to="/admin"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft size={14} /> Back to Admin
        </Link>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="glass-card inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium text-foreground shadow-[var(--shadow-soft)]">
              <Users size={14} className="text-primary" /> User management
            </div>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Team Leaders & Members
            </h1>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
              Create accounts, reset passwords, and manage status. Login IDs
              are generated automatically.
            </p>
          </div>
        </div>

        <div className="mt-8 inline-flex rounded-2xl border border-border bg-surface p-1 shadow-[var(--shadow-soft)]">
          {(
            [
              { id: "leaders", label: "Team Leaders" },
              { id: "members", label: "Members" },
              { id: "all", label: "All users" },
            ] as { id: TabId; label: string }[]
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                tab === t.id
                  ? "bg-primary text-primary-foreground shadow-[var(--shadow-soft)]"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-8">
        {tab === "leaders" && <TeamLeadersTab />}
        {tab === "members" && <MembersTab />}
        {tab === "all" && <AllUsersTab />}
      </section>
    </DashboardShell>
  );
}

/* -------------------------- Team Leaders tab -------------------------- */

function TeamLeadersTab() {
  const listTeams = useServerFn(listTeamsWithLeaders);
  const { data: teams, isLoading } = useQuery({
    queryKey: ["admin", "teams-with-leaders"],
    queryFn: () => listTeams(),
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
      <CreateTeamLeaderCard teams={teams ?? []} loading={isLoading} />
      <div className="rounded-4xl border border-border bg-surface p-6 shadow-[var(--shadow-soft)]">
        <h2 className="text-lg font-bold text-foreground">Team ownership</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Each team can have exactly one Team Leader. The Team Letter becomes
          the parent identifier for every Member on that team.
        </p>
        <ul className="mt-5 grid gap-3">
          {isLoading && <RowSkeleton />}
          {(teams ?? []).map((t) => (
            <li
              key={t.id}
              className="flex items-center justify-between rounded-2xl border border-border bg-surface-warm px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">
                  {t.letter}
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground">{t.name}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {t.leader
                      ? `${t.leader.full_name} · ${t.leader.login_id}`
                      : "No leader assigned"}
                  </div>
                </div>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${
                  t.leader
                    ? "bg-success/15 text-success"
                    : "bg-gold/20 text-gold-foreground"
                }`}
              >
                {t.leader ? "Assigned" : "Vacant"}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

type TeamWithLeader = Awaited<ReturnType<typeof listTeamsWithLeaders>>[number];

function CreateTeamLeaderCard({
  teams,
  loading,
}: {
  teams: TeamWithLeader[];
  loading: boolean;
}) {
  const create = useServerFn(createTeamLeader);
  const qc = useQueryClient();
  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [teamLetter, setTeamLetter] = useState("");
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const vacant = teams.filter((t) => !t.leader);

  const mutation = useMutation({
    mutationFn: () =>
      create({
        data: { fullName: fullName.trim(), mobile, password, teamLetter },
      }),
    onSuccess: (res) => {
      setMsg({ kind: "ok", text: `Team Leader created. Login ID: ${res.loginId}` });
      setFullName("");
      setMobile("");
      setPassword("");
      setTeamLetter("");
      qc.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (err) =>
      setMsg({ kind: "err", text: err instanceof Error ? err.message : "Failed" }),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (fullName.trim().length < 2) return setMsg({ kind: "err", text: "Enter full name." });
    if (!/^\d{10}$/.test(mobile))
      return setMsg({ kind: "err", text: "Mobile must be 10 digits." });
    if (password.length < 8)
      return setMsg({ kind: "err", text: "Password must be at least 8 characters." });
    if (!teamLetter) return setMsg({ kind: "err", text: "Select a team." });
    mutation.mutate();
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-4xl border border-border bg-surface p-6 shadow-[var(--shadow-soft)]"
    >
      <div className="flex items-center gap-2">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary-soft text-primary">
          <Plus size={18} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Create Team Leader</h2>
          <p className="text-[11px] text-muted-foreground">
            Login ID becomes the leader's mobile number.
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        <TextField
          label="Full name"
          value={fullName}
          onChange={setFullName}
          placeholder="Priya Sharma"
        />
        <TextField
          label="Mobile number"
          value={mobile}
          onChange={(v) => setMobile(v.replace(/\D/g, "").slice(0, 10))}
          inputMode="numeric"
          placeholder="9876543210"
          hint="10 digits. This is the leader's Login ID."
        />
        <TextField
          label="Temporary password"
          value={password}
          onChange={setPassword}
          type="password"
          placeholder="Min 8 characters"
        />
        <div>
          <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Team
          </span>
          <div className="grid grid-cols-3 gap-2">
            {loading && (
              <div className="col-span-3 h-11 animate-pulse rounded-2xl bg-surface-warm" />
            )}
            {!loading &&
              teams.map((t) => {
                const disabled = !!t.leader;
                const active = teamLetter === t.letter;
                return (
                  <button
                    key={t.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => setTeamLetter(t.letter)}
                    className={`rounded-2xl border px-3 py-2.5 text-xs font-semibold transition-all ${
                      active
                        ? "border-primary bg-primary text-primary-foreground shadow-[var(--shadow-glow)]"
                        : disabled
                          ? "cursor-not-allowed border-border bg-surface-warm text-muted-foreground/60"
                          : "border-border bg-surface-warm text-foreground hover:border-primary/40"
                    }`}
                  >
                    {t.letter}
                    <span className="ml-1 text-[10px] opacity-70">
                      {disabled ? "· taken" : ""}
                    </span>
                  </button>
                );
              })}
          </div>
          {!loading && vacant.length === 0 && (
            <p className="mt-2 text-[11px] text-muted-foreground">
              All teams currently have a leader.
            </p>
          )}
        </div>

        {msg && (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm font-medium ${
              msg.kind === "ok"
                ? "border-success/30 bg-success/10 text-success"
                : "border-destructive/20 bg-destructive/10 text-destructive"
            }`}
          >
            {msg.text}
          </div>
        )}

        <button
          type="submit"
          disabled={mutation.isPending}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition-all hover:-translate-y-0.5 disabled:opacity-70"
        >
          {mutation.isPending ? <Loader2 size={16} className="animate-spin" /> : "Create Team Leader"}
        </button>
      </div>
    </form>
  );
}

/* ----------------------------- Members tab ----------------------------- */

function MembersTab() {
  const listTeams = useServerFn(listTeamsWithLeaders);
  const { data: teams } = useQuery({
    queryKey: ["admin", "teams-with-leaders"],
    queryFn: () => listTeams(),
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
      <CreateMemberCard teams={teams ?? []} />
      <MembersList />
    </div>
  );
}

function CreateMemberCard({ teams }: { teams: TeamWithLeader[] }) {
  const create = useServerFn(createMember);
  const qc = useQueryClient();
  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [teamLetter, setTeamLetter] = useState("");
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      create({ data: { fullName: fullName.trim(), mobile, password, teamLetter } }),
    onSuccess: (res) => {
      setMsg({ kind: "ok", text: `Member created. Login ID: ${res.loginId}` });
      setFullName("");
      setMobile("");
      setPassword("");
      qc.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (err) =>
      setMsg({ kind: "err", text: err instanceof Error ? err.message : "Failed" }),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (fullName.trim().length < 2) return setMsg({ kind: "err", text: "Enter full name." });
    if (!/^\d{10}$/.test(mobile))
      return setMsg({ kind: "err", text: "Mobile must be 10 digits." });
    if (password.length < 8)
      return setMsg({ kind: "err", text: "Password must be at least 8 characters." });
    if (!teamLetter) return setMsg({ kind: "err", text: "Select a team." });
    mutation.mutate();
  }

  const generatedId = teamLetter && /^\d{10}$/.test(mobile) ? `${teamLetter}${mobile}` : "";

  return (
    <form
      onSubmit={submit}
      className="rounded-4xl border border-border bg-surface p-6 shadow-[var(--shadow-soft)]"
    >
      <div className="flex items-center gap-2">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary-soft text-primary">
          <Plus size={18} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Create Member</h2>
          <p className="text-[11px] text-muted-foreground">
            Login ID = Team letter + 10-digit mobile. Generated automatically.
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        <TextField
          label="Full name"
          value={fullName}
          onChange={setFullName}
          placeholder="Rahul Verma"
        />
        <TextField
          label="Mobile number"
          value={mobile}
          onChange={(v) => setMobile(v.replace(/\D/g, "").slice(0, 10))}
          inputMode="numeric"
          placeholder="9876543210"
        />
        <TextField
          label="Temporary password"
          value={password}
          onChange={setPassword}
          type="password"
          placeholder="Min 8 characters"
        />
        <div>
          <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Team
          </span>
          <div className="grid grid-cols-3 gap-2">
            {teams.map((t) => {
              const disabled = !t.leader;
              const active = teamLetter === t.letter;
              return (
                <button
                  key={t.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => setTeamLetter(t.letter)}
                  className={`rounded-2xl border px-3 py-2.5 text-xs font-semibold transition-all ${
                    active
                      ? "border-primary bg-primary text-primary-foreground shadow-[var(--shadow-glow)]"
                      : disabled
                        ? "cursor-not-allowed border-border bg-surface-warm text-muted-foreground/60"
                        : "border-border bg-surface-warm text-foreground hover:border-primary/40"
                  }`}
                  title={disabled ? "This team has no leader yet" : ""}
                >
                  {t.letter}
                  {disabled && <span className="ml-1 text-[10px] opacity-70">· no leader</span>}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-dashed border-primary/30 bg-primary-soft/40 px-4 py-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-primary">
            Generated Login ID
          </div>
          <div className="mt-1 font-mono text-lg font-bold text-foreground">
            {generatedId || "—"}
          </div>
        </div>

        {msg && (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm font-medium ${
              msg.kind === "ok"
                ? "border-success/30 bg-success/10 text-success"
                : "border-destructive/20 bg-destructive/10 text-destructive"
            }`}
          >
            {msg.text}
          </div>
        )}

        <button
          type="submit"
          disabled={mutation.isPending}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition-all hover:-translate-y-0.5 disabled:opacity-70"
        >
          {mutation.isPending ? <Loader2 size={16} className="animate-spin" /> : "Create Member"}
        </button>
      </div>
    </form>
  );
}

function MembersList() {
  const listUsers = useServerFn(listAllUsers);
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "all-users"],
    queryFn: () => listUsers(),
  });
  const members = (data ?? []).filter((u) => u.role === "member");

  return (
    <div className="rounded-4xl border border-border bg-surface p-6 shadow-[var(--shadow-soft)]">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">Members</h2>
        <span className="rounded-full bg-primary-soft px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary">
          {isLoading ? "…" : `${members.length} total`}
        </span>
      </div>
      <ul className="mt-4 grid gap-2">
        {isLoading && <RowSkeleton />}
        {!isLoading && members.length === 0 && (
          <li className="rounded-2xl border border-dashed border-border bg-surface-warm px-4 py-6 text-center text-xs text-muted-foreground">
            No members yet.
          </li>
        )}
        {members.map((u) => (
          <UserRow key={u.id} user={u} />
        ))}
      </ul>
    </div>
  );
}

function AllUsersTab() {
  const listUsers = useServerFn(listAllUsers);
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "all-users"],
    queryFn: () => listUsers(),
  });

  return (
    <div className="rounded-4xl border border-border bg-surface p-6 shadow-[var(--shadow-soft)]">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">All users</h2>
        <span className="rounded-full bg-primary-soft px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary">
          {isLoading ? "…" : `${data?.length ?? 0} total`}
        </span>
      </div>
      <ul className="mt-4 grid gap-2">
        {isLoading && <RowSkeleton />}
        {(data ?? []).map((u) => (
          <UserRow key={u.id} user={u} />
        ))}
      </ul>
    </div>
  );
}

type ListedUser = Awaited<ReturnType<typeof listAllUsers>>[number];

function UserRow({ user }: { user: ListedUser }) {
  const resetPwd = useServerFn(adminResetPassword);
  const setStatus = useServerFn(setUserStatus);
  const qc = useQueryClient();
  const [busy, setBusy] = useState<null | "reset" | "status">(null);
  const [reply, setReply] = useState<string | null>(null);

  async function onReset() {
    const pwd = window.prompt(`Set new password for ${user.login_id} (min 8 chars):`);
    if (!pwd) return;
    if (pwd.length < 8) return setReply("Password must be at least 8 characters.");
    setBusy("reset");
    try {
      await resetPwd({ data: { userId: user.id, password: pwd } });
      setReply("Password updated.");
    } catch (e) {
      setReply(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  }

  async function onStatus(action: "activate" | "suspend" | "delete") {
    if (action === "delete" && !window.confirm(`Soft-delete ${user.login_id}?`)) return;
    setBusy("status");
    try {
      await setStatus({ data: { userId: user.id, action } });
      qc.invalidateQueries({ queryKey: ["admin"] });
      setReply(`Status: ${action}d.`);
    } catch (e) {
      setReply(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  }

  const statusColor =
    user.status === "active"
      ? "bg-success/15 text-success"
      : "bg-destructive/10 text-destructive";

  return (
    <li className="rounded-2xl border border-border bg-surface-warm px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-leaf text-xs font-bold text-primary-foreground">
            {(user.full_name || user.login_id).slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-foreground">
              {user.full_name}{" "}
              <span className="text-[10px] font-medium text-muted-foreground">
                · {user.display_code}
              </span>
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="font-mono font-medium text-foreground">{user.login_id}</span>
              <span>·</span>
              <span className="capitalize">{user.role.replace("_", " ")}</span>
              {user.team_letter && (
                <>
                  <span>·</span>
                  <span>Team {user.team_letter}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${statusColor}`}
          >
            {user.status}
          </span>
          <button
            onClick={onReset}
            disabled={busy !== null}
            className="grid h-9 w-9 place-items-center rounded-xl border border-border bg-surface text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary disabled:opacity-50"
            title="Reset password"
            aria-label="Reset password"
          >
            {busy === "reset" ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
          </button>
          {user.is_active ? (
            <button
              onClick={() => onStatus("suspend")}
              disabled={busy !== null}
              className="grid h-9 w-9 place-items-center rounded-xl border border-border bg-surface text-muted-foreground transition-colors hover:border-gold/30 hover:text-gold-foreground disabled:opacity-50"
              title="Suspend"
              aria-label="Suspend"
            >
              <ShieldOff size={14} />
            </button>
          ) : (
            <button
              onClick={() => onStatus("activate")}
              disabled={busy !== null}
              className="grid h-9 w-9 place-items-center rounded-xl border border-border bg-surface text-muted-foreground transition-colors hover:border-success/30 hover:text-success disabled:opacity-50"
              title="Reactivate"
              aria-label="Reactivate"
            >
              <UserCheck size={14} />
            </button>
          )}
          <button
            onClick={() => onStatus("delete")}
            disabled={busy !== null}
            className="grid h-9 w-9 place-items-center rounded-xl border border-border bg-surface text-muted-foreground transition-colors hover:border-destructive/30 hover:text-destructive disabled:opacity-50"
            title="Soft-delete"
            aria-label="Soft-delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      {reply && (
        <div className="mt-2 text-[11px] font-medium text-muted-foreground">{reply}</div>
      )}
    </li>
  );
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  hint,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  hint?: string;
  inputMode?: "text" | "numeric";
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface-warm px-4 py-3 transition-colors focus-within:border-primary/40 focus-within:bg-surface">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
          {type === "password" ? <Lock size={14} /> : <UserIcon size={14} />}
        </span>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          inputMode={inputMode}
          className="min-w-0 flex-1 bg-transparent text-base font-medium text-foreground outline-none placeholder:text-muted-foreground/60"
        />
      </div>
      {hint && <p className="mt-1.5 text-[11px] text-muted-foreground">{hint}</p>}
    </label>
  );
}

function RowSkeleton() {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-14 animate-pulse rounded-2xl bg-surface-warm" />
      ))}
    </>
  );
}

// Silence unused-suppress warnings for icons imported for future use.
void useEffect;
