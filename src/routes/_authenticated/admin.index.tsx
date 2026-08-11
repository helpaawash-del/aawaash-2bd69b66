import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle2,
  Circle,
  ClipboardList,
  Coins,
  Home,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  TrendingUp,
  UserCog,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { RoleGuard } from "@/components/aawash/AuthGuard";
import { AdminShell } from "@/components/aawash/admin/AdminShell";
import { getAdminOverview } from "@/lib/admin-overview.functions";
import { adminListProjects } from "@/lib/project-admin.functions";
import { listTeamLeaders, createTeamLeaderFull, getTeamLimits } from "@/lib/team-leaders.functions";
import { listAllMembers, createMemberFull } from "@/lib/members-admin.functions";
import { getSystemHealth } from "@/lib/system.functions";
import { formatINR, initials } from "@/components/aawash/dashboard-kit";
import { WalletQuickPanel } from "@/components/aawash/admin/WalletQuickPanel";
import { invalidateAdmin } from "@/lib/admin-cache";


export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminHome,
  head: () => ({
    meta: [
      { title: "Admin Panel — Aawash Control Center" },
      { name: "description", content: "Aawash private admin control center for projects, teams, members, finance, and system operations." },
      { property: "og:title", content: "Admin Panel — Aawash Control Center" },
      { property: "og:description", content: "Private admin control center for Aawash operations." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
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
  const qc = useQueryClient();
  const overviewFn = useServerFn(getAdminOverview);
  const healthFn = useServerFn(getSystemHealth);
  const projectFn = useServerFn(adminListProjects);
  const leadersFn = useServerFn(listTeamLeaders);
  const membersFn = useServerFn(listAllMembers);
  const limitsFn = useServerFn(getTeamLimits);
  const createLeaderFn = useServerFn(createTeamLeaderFull);
  const createMemberFn = useServerFn(createMemberFull);

  const overview = useQuery({ queryKey: ["admin", "overview"], queryFn: () => overviewFn(), refetchInterval: 60_000 });
  const health = useQuery({ queryKey: ["admin", "health"], queryFn: () => healthFn(), refetchInterval: 90_000 });
  const projects = useQuery({ queryKey: ["admin", "projects", false], queryFn: () => projectFn({ data: { includeArchived: false } }) });
  const leaders = useQuery({
    queryKey: ["admin", "team-leaders"],
    queryFn: () => leadersFn(),
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
  const members = useQuery({
    queryKey: ["admin", "members"],
    queryFn: () => membersFn(),
    staleTime: 0,
    refetchOnMount: "always",
  });
  const limits = useQuery({
    queryKey: ["admin", "team-limits"],
    queryFn: () => limitsFn(),
    staleTime: 0,
    refetchOnMount: "always",
  });

  const refreshTeamData = async () => {
    await invalidateAdmin(qc, "team-refresh");
  };


  useEffect(() => {
    void refreshTeamData();
  }, []);

  const [clock, setClock] = useState(new Date());
  const [walletOpen, setWalletOpen] = useState(false);
  useEffect(() => {
    const id = window.setInterval(() => setClock(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const projectRows = (projects.data ?? []).slice(0, 5);
  const teamRows = useMemo(() => {
    const rows = leaders.data?.leaders ?? [];
    const teams = (leaders.data?.teams ?? []).filter((team) => !team.is_deleted);
    const slots = ["A", "B", "C"].map((letter) => {
      const team = teams.find((t) => t.letter === letter) ?? teams.find((t) => !rows.some((l) => l.team_id === t.id));
      const leader = rows.find((l) => l.team_letter === letter) ?? (team ? rows.find((l) => l.team_id === team.id) : undefined);
      const occupiedLeaderId = team?.leader_id && !leader ? team.leader_id : null;
      return { letter, team, leader, occupiedLeaderId };
    });
    return slots;
  }, [leaders.data]);
  const currentLeaderCount = leaders.data?.leaders.length ?? limits.data?.currentTeamLeaders ?? 0;
  const maxTeamLeaders = limits.data?.maxTeamLeaders ?? 3;
  const teamDataLoading = leaders.isLoading || leaders.isFetching || limits.isLoading || limits.isFetching;
  const teamDataError = leaders.error ?? limits.error;

  return (
    <AdminShell profile={profile}>
      <section className="glass-card relative overflow-hidden rounded-4xl p-5 shadow-[var(--shadow-float)] sm:p-7">
        <div className="absolute inset-0 opacity-60" aria-hidden="true">
          <div className="absolute right-4 top-4 h-40 w-40 rounded-full border border-primary/10" />
          <div className="absolute right-14 top-14 h-20 w-20 rounded-full border border-gold/20" />
        </div>
        <div className="relative grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-primary">
              <ShieldCheck size={14} /> Super Admin Panel
            </div>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Aawash Control Center
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Projects, leaders, members, sales, wallets, content and system checks are arranged as direct work sections with no generic quick actions.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3 lg:w-[420px]">
            <MiniTile label="Today" value={clock.toLocaleDateString(undefined, { day: "numeric", month: "short" })} />
            <MiniTile label="Time" value={clock.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })} />
            <MiniTile label="Admin" value={profile?.full_name?.split(" ")[0] ?? "Active"} />
          </div>
        </div>
      </section>

      <section className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <Kpi icon={<Building2 size={16} />} label="Projects" value={overview.data?.projects_total ?? "—"} to="/admin/projects" />
        <Kpi icon={<Home size={16} />} label="Flats" value={overview.data?.flats_total ?? "—"} />
        <Kpi icon={<CheckCircle2 size={16} />} label="Available" value={overview.data?.flats_available ?? "—"} tone="success" />
        <Kpi icon={<Users size={16} />} label="Members" value={overview.data?.members ?? "—"} to="/admin/members" />
        <button
          type="button"
          onClick={() => setWalletOpen(true)}
          className="glass-card group flex items-center justify-between gap-2 rounded-3xl border border-primary/25 bg-gradient-to-br from-primary-soft to-surface p-3 text-left shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-glow)]"
          aria-label="Open wallet quick edit"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-primary">
              <Wallet size={14} /> Wallets
            </div>
            <div className="mt-0.5 truncate text-[13px] font-extrabold text-foreground">
              Quick edit
            </div>
            <div className="text-[10px] text-muted-foreground">Leaders & members</div>
          </div>
          <ArrowRight size={16} className="shrink-0 text-primary transition-transform group-hover:translate-x-0.5" />
        </button>
        <Kpi icon={<TrendingUp size={16} />} label="Revenue" value={formatINR(overview.data?.revenue_total ?? 0, { compact: true })} to="/admin/finance" tone="gold" />
      </section>

      <section className="mt-5">
        <Link
          to="/admin/homepage"
          className="glass-card group flex items-center gap-4 rounded-4xl border border-primary/25 bg-gradient-to-br from-primary-soft via-surface to-surface p-5 shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-glow)]"
        >
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground">
            <Home size={20} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-base font-extrabold text-foreground">Public Homepage</span>
            <span className="block text-xs leading-relaxed text-muted-foreground">
              Add, edit, hide or delete any section, heading, image, list item or contact detail on the
              public website homepage.
            </span>
          </span>
          <ArrowRight size={18} className="shrink-0 text-primary transition-transform group-hover:translate-x-1" />
        </Link>
      </section>



      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-foreground">Project sections</h2>
            <p className="text-xs text-muted-foreground">Five featured project blocks, each opening its own edit console.</p>
          </div>
          <Link to="/admin/projects" className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-xs font-bold text-foreground">
            All projects <ArrowRight size={14} />
          </Link>
        </div>
        {projects.isLoading ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-56 animate-pulse rounded-3xl bg-muted/50" />)}
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {projectRows.map((project) => <ProjectSectionCard key={project.id} project={project} />)}
            {projectRows.length < 5 && (
              <Link to="/admin/projects/new" className="grid min-h-56 place-items-center rounded-3xl border border-dashed border-border bg-surface/70 p-5 text-center shadow-[var(--shadow-soft)]">
                <div>
                  <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary-soft text-primary"><Plus size={20} /></div>
                  <div className="mt-3 text-sm font-extrabold text-foreground">Add project</div>
                  <div className="mt-1 text-xs text-muted-foreground">Create another project section.</div>
                </div>
              </Link>
            )}
          </div>
        )}
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)]">
        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-extrabold text-foreground">Team leader slots</h2>
              <p className="text-xs text-muted-foreground">Three direct leader boxes with name, login ID/mobile and password creation.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void refreshTeamData()}
                disabled={teamDataLoading}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-xs font-bold text-foreground disabled:cursor-wait disabled:opacity-60"
              >
                <RefreshCw size={14} className={teamDataLoading ? "animate-spin" : ""} />
                Refresh teams
              </button>
              <Link to="/admin/team-leaders" className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-xs font-bold text-foreground">
                Manage leaders <ArrowRight size={14} />
              </Link>
            </div>
          </div>
          {teamDataError && (
            <div role="alert" className="mb-3 flex items-start gap-2 rounded-3xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-xs font-semibold text-destructive">
              <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                Team slots could not refresh: {teamDataError instanceof Error ? teamDataError.message : "Unknown error"}
              </div>
            </div>
          )}
          <div className="grid gap-3 lg:grid-cols-3">
            {teamRows.map((slot) => (
              <TeamLeaderSlot
                key={slot.letter}
                letter={slot.letter}
                team={slot.team}
                leader={slot.leader}
                occupiedLeaderId={slot.occupiedLeaderId}
                capReached={currentLeaderCount >= maxTeamLeaders}
                maxTeamLeaders={maxTeamLeaders}
                teamDataLoading={teamDataLoading}
                onRefresh={refreshTeamData}
                onCreate={async (input) => {
                  await createLeaderFn({ data: input });
                  await invalidateAdmin(qc, "leader");
                }}
              />
            ))}
          </div>
        </div>

        <MemberCreatePanel
          teams={members.data?.leaders ?? []}
          cap={limits.data?.maxMembersPerTeam ?? 10}
          onCreate={async (input) => {
            await createMemberFn({ data: input });
            await invalidateAdmin(qc, "member");
          }}
        />

      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <FeatureDirectory />
        <SystemStatus sys={health.data} />
      </section>

      <WalletQuickPanel open={walletOpen} onClose={() => setWalletOpen(false)} />
    </AdminShell>
  );
}

function ProjectSectionCard({ project }: { project: Record<string, unknown> }) {
  const total = Number(project.total_flats ?? 0);
  const sold = Number(project.sold_flats ?? 0);
  const pct = total > 0 ? Math.round((sold / total) * 100) : Number(project.completion_percent ?? 0);
  const image = String(project.thumbnail_url || project.cover_url || project.hero_banner_url || "");
  return (
    <Link to="/admin/projects/$id" params={{ id: String(project.id) }} className="group overflow-hidden rounded-3xl border border-border bg-surface shadow-[var(--shadow-soft)] transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-float)]">
      <div className="relative aspect-[4/3] overflow-hidden bg-primary-soft">
        {image ? <img src={image} alt={String(project.name ?? "Project")} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" /> : <BlueprintMini />}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-foreground/60 to-transparent p-3 text-primary-foreground">
          <div className="line-clamp-1 text-sm font-extrabold">{String(project.name ?? "Project")}</div>
          <div className="text-[11px] opacity-90">{String(project.location ?? "Location")}</div>
        </div>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <MiniStat label="Total" value={total} />
          <MiniStat label="Avail" value={Number(project.available_flats ?? 0)} />
          <MiniStat label="Sold" value={sold} />
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
        </div>
        <div className="mt-3 flex items-center justify-between text-[11px] font-bold text-muted-foreground">
          <span>{String(project.visibility ?? "public")}</span>
          <span className="inline-flex items-center gap-1 text-primary">Open <ArrowRight size={12} /></span>
        </div>
      </div>
    </Link>
  );
}

type TeamSlot = {
  id?: string | null;
  letter?: string | null;
  name?: string | null;
  leader_id?: string | null;
};

type LeaderSummary = {
  id: string;
  full_name?: string | null;
  mobile_number?: string | null;
  login_id?: string | null;
  team_id?: string | null;
  team_letter?: string | null;
  team_name?: string | null;
  member_count?: number | null;
  total_revenue?: number | null;
  wallet_balance?: number | null;
};

function TeamLeaderSlot({
  letter,
  team,
  leader,
  occupiedLeaderId,
  capReached,
  maxTeamLeaders,
  teamDataLoading,
  onRefresh,
  onCreate,
}: {
  letter: string;
  team?: TeamSlot | null;
  leader?: LeaderSummary | null;
  occupiedLeaderId?: string | null;
  capReached: boolean;
  maxTeamLeaders: number;
  teamDataLoading: boolean;
  onRefresh: () => Promise<void>;
  onCreate: (input: { fullName: string; mobile: string; password: string; teamId: string; teamName?: string }) => Promise<void>;
}) {
  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const teamId = team?.id ?? "";
  const unavailableReason = teamDataLoading
    ? "Checking the latest available teams before enabling this slot."
    : !teamId
      ? "Team data is unavailable for this slot. Refresh teams, then try again."
      : occupiedLeaderId
        ? "This team already has a leader assignment, but the leader profile did not load. Refresh teams or open Manage leaders."
        : capReached
          ? `Team Leader cap reached (${maxTeamLeaders}). Increase the limit in Settings or remove an inactive leader first.`
          : null;
  const formIssue = fullName.trim().length < 2
    ? "Enter the leader name."
    : !/^\d{10}$/.test(mobile)
      ? "Enter a 10-digit mobile/login ID."
      : password.length < 8
        ? "Enter a password with at least 8 characters."
        : null;
  const canCreate = !unavailableReason && !formIssue && !leader && !busy;
  const disabledReason = unavailableReason ?? formIssue;

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canCreate) {
      if (disabledReason) {
        setError(disabledReason);
        if (unavailableReason) toast.error(disabledReason);
      }
      return;
    }
    setError(null);
    setMessage(null);
    setBusy(true);
    try {
      await onCreate({ fullName: fullName.trim(), mobile, password, teamId, teamName: team?.name ?? `Team ${letter}` });
      setMessage(`Team Leader ${letter} created. Login ID: ${mobile}`);
      toast.success(`Team Leader ${letter} created`);
      setFullName("");
      setMobile("");
      setPassword("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not create team leader";
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  if (leader) {
    return (
      <Link to="/admin/team-leaders/$id" params={{ id: leader.id }} className="group rounded-3xl border border-border bg-surface p-4 shadow-[var(--shadow-soft)] transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-float)]">
        <div className="flex items-start justify-between gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary-soft text-sm font-extrabold text-primary">{initials(leader.full_name)}</div>
          <span className="rounded-full bg-leaf/15 px-2 py-1 text-[10px] font-extrabold uppercase text-leaf">Team {leader.team_letter ?? letter}</span>
        </div>
        <h3 className="mt-4 line-clamp-1 text-lg font-extrabold text-foreground">{leader.full_name}</h3>
        <div className="mt-1 font-mono text-xs font-bold text-muted-foreground">Login ID: {leader.login_id ?? leader.mobile_number}</div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
          <MiniStat label="Members" value={leader.member_count ?? 0} />
          <MiniStat label="Revenue" value={formatINR(leader.total_revenue ?? 0, { compact: true })} />
          <MiniStat label="Wallet" value={formatINR(Number(leader.wallet_balance ?? 0), { compact: true })} />
        </div>
        <div className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-primary">Open leader page <ArrowRight size={12} /></div>
      </Link>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-3xl border border-border bg-surface p-4 shadow-[var(--shadow-soft)]">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Team Leader {letter}</div>
          <div className="text-sm font-extrabold text-foreground">{team?.name ?? `Team ${letter}`}</div>
        </div>
        <UserCog size={18} className="text-primary" />
      </div>
      <div className="mt-4 space-y-3">
        <SmallInput label="Name" value={fullName} onChange={setFullName} placeholder="Leader name" />
        <SmallInput label="Number / Login ID" value={mobile} onChange={(v) => setMobile(v.replace(/\D/g, "").slice(0, 10))} placeholder="9876543210" mono />
        <SmallInput label="Password" value={password} onChange={setPassword} placeholder="Minimum 8 chars" type="password" />
      </div>
      {message && <div className="mt-3 rounded-2xl bg-leaf/10 px-3 py-2 text-xs font-semibold text-leaf">{message}</div>}
      {error && <div className="mt-3 rounded-2xl bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive">{error}</div>}
      <button type="submit" aria-label={`Save leader Team ${letter}`} disabled={!canCreate} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider text-primary-foreground shadow-[var(--shadow-glow)] disabled:cursor-not-allowed disabled:opacity-50">
        {busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
        Save leader
      </button>
      {disabledReason && <div className="mt-2 text-[11px] font-semibold text-muted-foreground">{disabledReason}</div>}
      {unavailableReason && (
        <button type="button" onClick={() => void onRefresh()} className="mt-2 text-[11px] font-extrabold text-primary">
          Refresh teams
        </button>
      )}
    </form>
  );
}

type MemberTeam = { team_id?: string | null; letter?: string | null; name?: string | null; leader_id?: string | null; leader_name?: string | null; member_count?: number | null };

function MemberCreatePanel({
  teams,
  cap,
  onCreate,
}: {
  teams: MemberTeam[];
  cap: number;
  onCreate: (input: { fullName: string; mobile: string; password: string; teamId: string }) => Promise<void>;
}) {
  const availableTeams = teams.filter((t) => t.leader_id && (t.member_count ?? 0) < cap);
  const [fullName, setFullName] = useState("");
  const [teamId, setTeamId] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const chosen = availableTeams.find((t) => t.team_id === teamId);
  const loginId = chosen && /^\d{10}$/.test(mobile) ? `${chosen.letter}${mobile}` : "";
  const canCreate = fullName.trim().length >= 2 && !!teamId && /^\d{10}$/.test(mobile) && password.length >= 8 && !busy;

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canCreate) return;
    setError(null);
    setMessage(null);
    setBusy(true);
    try {
      await onCreate({ fullName: fullName.trim(), mobile, password, teamId });
      setMessage(`Member created. Login ID: ${loginId}`);
      setFullName("");
      setMobile("");
      setPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create member");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-3xl border border-border bg-surface p-4 shadow-[var(--shadow-soft)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-foreground">Create member</h2>
          <p className="mt-1 text-xs text-muted-foreground">Add member credentials; it appears in the admin panel and leader page immediately.</p>
        </div>
        <UserPlus size={20} className="text-primary" />
      </div>
      <form onSubmit={submit} className="mt-4 space-y-3">
        <SmallInput label="Name" value={fullName} onChange={setFullName} placeholder="Member name" />
        <label className="block text-xs font-bold text-muted-foreground">
          Team A / Team B / Team C
          <select value={teamId} onChange={(e) => setTeamId(e.target.value)} className="mt-1 block w-full rounded-2xl border border-border bg-background px-3 py-2.5 text-sm font-semibold text-foreground outline-none focus:border-primary">
            <option value="">Choose team</option>
            {availableTeams.map((team) => (
              <option key={team.team_id} value={team.team_id ?? ""}>Team {team.letter} · {team.leader_name ?? team.name} ({team.member_count}/{cap})</option>
            ))}
          </select>
        </label>
        <SmallInput label="User ID / Number" value={mobile} onChange={(v) => setMobile(v.replace(/\D/g, "").slice(0, 10))} placeholder="9876543210" mono />
        <SmallInput label="Password" value={password} onChange={setPassword} placeholder="Minimum 8 chars" type="password" />
        {loginId && <div className="rounded-2xl bg-primary-soft px-3 py-2 text-xs font-bold text-primary">Login ID: <span className="font-mono">{loginId}</span></div>}
        {message && <div className="rounded-2xl bg-leaf/10 px-3 py-2 text-xs font-semibold text-leaf">{message}</div>}
        {error && <div className="rounded-2xl bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive">{error}</div>}
        <button type="submit" disabled={!canCreate} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider text-primary-foreground shadow-[var(--shadow-glow)] disabled:cursor-not-allowed disabled:opacity-50">
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Save member
        </button>
      </form>
      <Link to="/admin/members" className="mt-4 flex items-center justify-between rounded-2xl border border-border bg-background px-3 py-2.5 text-sm font-bold text-foreground">
        Open member list <ArrowRight size={14} />
      </Link>
    </section>
  );
}

function FeatureDirectory() {
  const items = [
    { to: "/admin/projects", label: "All projects", sub: "Pictures, sections, inventory and media", icon: Building2 },
    { to: "/admin/members", label: "Members", sub: "Accounts, sales, earnings, withdrawals and tips", icon: Users },
    { to: "/admin/customers", label: "Customer CRM", sub: "Leads, meetings, notes and documents", icon: ClipboardList },
    { to: "/admin/finance", label: "Finance", sub: "Wallets, commissions and revenue", icon: Coins },
    { to: "/admin/analytics", label: "Analytics", sub: "Role-scoped charts and BI", icon: BarChart3 },
    { to: "/admin/system", label: "System", sub: "Health, sync and integrity checks", icon: Activity },
  ];
  return (
    <section className="rounded-3xl border border-border bg-surface p-4 shadow-[var(--shadow-soft)]">
      <h2 className="text-lg font-extrabold text-foreground">Organized admin pages</h2>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <Link key={item.to} to={item.to} className="flex items-center gap-3 rounded-2xl border border-border bg-background p-3 transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-soft)]">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary-soft text-primary"><item.icon size={16} /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-extrabold text-foreground">{item.label}</span>
              <span className="block truncate text-xs text-muted-foreground">{item.sub}</span>
            </span>
            <ArrowRight size={14} className="text-muted-foreground" />
          </Link>
        ))}
      </div>
    </section>
  );
}

type SysHealth = {
  users_active?: number;
  active_flat_locks?: number;
  expired_flat_locks?: number;
  last_job_run?: { status: string; job_name: string } | null;
  notifications_unread?: number;
} | undefined;

function SystemStatus({ sys }: { sys: SysHealth }) {
  const items = [
    { label: "Auth", ok: true },
    { label: "Database", ok: !!sys },
    { label: "Sync", ok: (sys?.expired_flat_locks ?? 0) === 0 },
    { label: "Jobs", ok: sys?.last_job_run ? sys.last_job_run.status === "success" : true },
  ];
  return (
    <section className="rounded-3xl border border-border bg-surface p-4 shadow-[var(--shadow-soft)]">
      <h2 className="text-lg font-extrabold text-foreground">System status</h2>
      <div className="mt-4 space-y-2">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between rounded-2xl bg-background px-3 py-2 text-sm font-bold text-foreground">
            <span>{item.label}</span>
            <span className={`inline-flex items-center gap-1 text-xs ${item.ok ? "text-leaf" : "text-warning"}`}><Circle size={8} fill="currentColor" /> {item.ok ? "Healthy" : "Check"}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function Kpi({ icon, label, value, to, tone = "primary" }: { icon: React.ReactNode; label: string; value: React.ReactNode; to?: string; tone?: "primary" | "success" | "warning" | "gold" }) {
  const toneMap = { primary: "bg-primary-soft text-primary", success: "bg-leaf/15 text-leaf", warning: "bg-warning/20 text-warning", gold: "bg-gold/20 text-gold-foreground" };
  const content = (
    <div className="rounded-3xl border border-border bg-surface p-4 shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-float)]">
      <div className={`grid h-9 w-9 place-items-center rounded-xl ${toneMap[tone]}`}>{icon}</div>
      <div className="mt-3 text-2xl font-extrabold text-foreground">{value}</div>
      <div className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
  return to ? <Link to={to}>{content}</Link> : content;
}

function MiniTile({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="rounded-2xl border border-border bg-surface px-3 py-2"><div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</div><div className="mt-0.5 truncate text-sm font-extrabold text-foreground">{value}</div></div>;
}

function MiniStat({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="rounded-2xl bg-background px-2 py-2"><div className="text-[10px] font-bold uppercase text-muted-foreground">{label}</div><div className="mt-0.5 truncate font-extrabold text-foreground">{value}</div></div>;
}

function SmallInput({ label, value, onChange, placeholder, type = "text", mono }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string; mono?: boolean }) {
  return (
    <label className="block text-xs font-bold text-muted-foreground">
      {label}
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={`mt-1 block w-full rounded-2xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary ${mono ? "font-mono" : ""}`} />
    </label>
  );
}

function BlueprintMini() {
  return (
    <div className="grid h-full w-full place-items-center bg-primary-soft text-primary">
      <svg viewBox="0 0 120 90" className="h-24 w-32" aria-hidden="true">
        <g fill="none" stroke="currentColor" strokeWidth="2" opacity="0.8">
          <path d="M14 76h92M28 76V24h24v52M62 76V12h30v64" />
          <path d="M34 34h12M34 46h12M34 58h12M68 24h16M68 38h16M68 52h16" />
        </g>
      </svg>
    </div>
  );
}