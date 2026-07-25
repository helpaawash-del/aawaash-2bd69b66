/**
 * Team Leader Management — server functions (Super Admin only).
 *
 * Single source of truth for Team Leader CRUD, team assignment, status,
 * password reset, and aggregated read models (stats, members, sales,
 * commissions, wallet, withdrawals, activity).
 *
 * Every state-changing endpoint follows the auth pattern:
 *   1. requireSupabaseAuth (bearer verified)
 *   2. verify caller is super_admin via context.supabase RPC
 *   3. only then load supabaseAdmin for privileged Auth Admin work
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { AAWASH_AUTH_EMAIL_DOMAIN } from "@/lib/auth";

type Ctx = {
  supabase: import("@supabase/supabase-js").SupabaseClient;
  userId: string;
};

async function assertSuperAdmin(ctx: Ctx) {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "super_admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: Super Admin only");
}

async function readLimits(admin: import("@supabase/supabase-js").SupabaseClient) {
  const { data } = await admin.from("system_settings").select("extra").eq("id", 1).maybeSingle();
  const extra = (data?.extra ?? {}) as Record<string, unknown>;
  const maxLeaders = Number(extra.max_team_leaders ?? 3);
  const maxMembers = Number(extra.max_members_per_team ?? 10);
  return {
    maxTeamLeaders: Number.isFinite(maxLeaders) && maxLeaders > 0 ? maxLeaders : 3,
    maxMembersPerTeam: Number.isFinite(maxMembers) && maxMembers > 0 ? maxMembers : 10,
  };
}

/* ================================================================== */
/* System limits                                                       */
/* ================================================================== */

export const getTeamLimits = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const limits = await readLimits(supabaseAdmin);
    const { count: leadersCount } = await supabaseAdmin
      .from("user_roles")
      .select("*", { count: "exact", head: true })
      .eq("role", "team_leader");
    return { ...limits, currentTeamLeaders: leadersCount ?? 0 };
  });

const updateLimitsSchema = z.object({
  maxTeamLeaders: z.number().int().min(1).max(200).optional(),
  maxMembersPerTeam: z.number().int().min(0).max(500).optional(),
});

export const updateTeamLimits = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => updateLimitsSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const current = await readLimits(supabaseAdmin);
    const next = {
      max_team_leaders: data.maxTeamLeaders ?? current.maxTeamLeaders,
      max_members_per_team: data.maxMembersPerTeam ?? current.maxMembersPerTeam,
    };
    const { data: row } = await supabaseAdmin
      .from("system_settings")
      .select("extra")
      .eq("id", 1)
      .maybeSingle();
    const merged = { ...(row?.extra as object | null ?? {}), ...next };
    const { error } = await supabaseAdmin
      .from("system_settings")
      .update({ extra: merged, updated_by: context.userId } as never)
      .eq("id", 1);
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("audit_logs").insert({
      actor_id: context.userId,
      action: "update_team_limits",
      entity_type: "system_settings",
      new_value: next,
    });
    return { ok: true as const, ...next };
  });

/* ================================================================== */
/* List Team Leaders                                                   */
/* ================================================================== */

export const listTeamLeaders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: teams, error: teamsErr } = await supabaseAdmin
      .from("teams")
      .select("id, letter, name, leader_id, is_deleted")
      .eq("is_deleted", false)
      .order("letter");
    if (teamsErr) throw new Error(teamsErr.message);
    const activeTeams = teams ?? [];

    const { data: leaderRoles } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "team_leader");
    const leaderIds = (leaderRoles ?? []).map((r) => r.user_id);

    if (!leaderIds.length) {
      return { leaders: [], teams: activeTeams };
    }

    const { data: profiles, error } = await supabaseAdmin
      .from("profiles")
      .select(
        "id, display_code, full_name, mobile_number, login_id, email, avatar_url, team_id, status, is_active, is_deleted, joining_date, wallet_balance, total_earnings, total_sales, metrics_override, last_login_at, created_at",
      )
      .in("id", leaderIds)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const teamById = new Map(activeTeams.map((t) => [t.id, t]));

    // Member counts per team (excluding the leader)
    const teamIds = (profiles ?? []).map((p) => p.team_id).filter(Boolean) as string[];
    const memberCounts = new Map<string, number>();
    if (teamIds.length) {
      const { data: members } = await supabaseAdmin
        .from("profiles")
        .select("team_id, id")
        .in("team_id", teamIds)
        .eq("is_deleted", false);
      (members ?? []).forEach((m) => {
        if (!m.team_id) return;
        if (leaderIds.includes(m.id)) return;
        memberCounts.set(m.team_id, (memberCounts.get(m.team_id) ?? 0) + 1);
      });
    }

    // Aggregated sales / commission per leader
    const [{ data: sales }, { data: commissions }] = await Promise.all([
      supabaseAdmin
        .from("sales")
        .select("leader_id, deal_value, sale_status, approval_status")
        .in("leader_id", leaderIds),
      supabaseAdmin
        .from("commission_transactions")
        .select("leader_id, net_leader, status")
        .in("leader_id", leaderIds),
    ]);
    const sumBy = <T,>(rows: T[] | null | undefined, key: (r: T) => string | null, val: (r: T) => number) => {
      const m = new Map<string, number>();
      (rows ?? []).forEach((r) => {
        const k = key(r);
        if (!k) return;
        m.set(k, (m.get(k) ?? 0) + Number(val(r) ?? 0));
      });
      return m;
    };
    const revenueMap = sumBy(
      (sales ?? []).filter((s) => s.approval_status === "approved"),
      (s) => s.leader_id,
      (s) => Number(s.deal_value ?? 0),
    );
    const salesCountMap = new Map<string, number>();
    (sales ?? [])
      .filter((s) => s.approval_status === "approved")
      .forEach((s) => {
        if (!s.leader_id) return;
        salesCountMap.set(s.leader_id, (salesCountMap.get(s.leader_id) ?? 0) + 1);
      });
    const commissionMap = sumBy(
      (commissions ?? []).filter((c) => c.status !== "reversed"),
      (c) => c.leader_id,
      (c) => Number(c.net_leader ?? 0),
    );

    const leaders = (profiles ?? []).map((p) => {
      const team = p.team_id ? teamById.get(p.team_id) : null;
      const ov = ((p as { metrics_override?: Record<string, unknown> }).metrics_override ?? {}) as Record<string, unknown>;
      const pick = (key: string, fallback: number) =>
        ov[key] === undefined || ov[key] === null ? fallback : Number(ov[key]);
      return {
        ...p,
        team_letter: team?.letter ?? null,
        team_name: team?.name ?? null,
        member_count: pick("member_count", p.team_id ? memberCounts.get(p.team_id) ?? 0 : 0),
        sales_count: pick("sales_count", salesCountMap.get(p.id) ?? 0),
        total_revenue: pick("total_revenue", revenueMap.get(p.id) ?? 0),
        total_commission: pick("total_commission", commissionMap.get(p.id) ?? 0),
      };
    });

    return { leaders, teams: activeTeams };
  });

/* ================================================================== */
/* Create Team Leader (enterprise form)                                */
/* ================================================================== */

const createSchema = z.object({
  fullName: z.string().trim().min(2).max(80),
  mobile: z.string().regex(/^\d{10}$/, "Mobile must be exactly 10 digits"),
  password: z.string().min(8).max(72),
  teamId: z.string().uuid(),
  teamName: z.string().trim().min(2).max(80).optional(),
  email: z.string().trim().email().max(160).optional().or(z.literal("")),
  address: z.string().trim().max(400).optional().or(z.literal("")),
  avatarUrl: z.string().trim().url().max(600).optional().or(z.literal("")),
  joiningDate: z.string().optional().or(z.literal("")),
  remarks: z.string().trim().max(600).optional().or(z.literal("")),
});

export const createTeamLeaderFull = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => createSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Enforce configurable Team Leader cap
    const limits = await readLimits(supabaseAdmin);
    const { count: currentLeaders } = await supabaseAdmin
      .from("user_roles")
      .select("*", { count: "exact", head: true })
      .eq("role", "team_leader");
    if ((currentLeaders ?? 0) >= limits.maxTeamLeaders) {
      throw new Error(
        `Team Leader cap reached (${limits.maxTeamLeaders}). Increase the limit in System Settings first.`,
      );
    }

    // Validate the team & ownership.
    const { data: team, error: teamErr } = await supabaseAdmin
      .from("teams")
      .select("id, letter, name, leader_id, is_deleted")
      .eq("id", data.teamId)
      .maybeSingle();
    if (teamErr) throw new Error(teamErr.message);
    if (!team || team.is_deleted) throw new Error("Selected team no longer exists.");
    if (team.leader_id) throw new Error(`Team ${team.letter} already has a Team Leader.`);

    // Duplicate checks
    const { data: dupe } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .or(`mobile_number.eq.${data.mobile},login_id.eq.${data.mobile}`)
      .maybeSingle();
    if (dupe) throw new Error("A user with that mobile number already exists.");

    const loginId = data.mobile;
    const email = data.email && data.email.length > 0
      ? data.email
      : `${loginId.toLowerCase()}@${AAWASH_AUTH_EMAIL_DOMAIN}`;

    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        full_name: data.fullName,
        mobile_number: data.mobile,
        login_id: loginId,
        team_letter: team.letter,
        role: "team_leader",
      },
    });
    if (createErr || !created.user) {
      throw new Error(createErr?.message ?? "Failed to create Team Leader");
    }

    // Trigger inserts default member role — swap for team_leader.
    await supabaseAdmin.from("user_roles").delete().eq("user_id", created.user.id);
    const { error: roleErr } = await supabaseAdmin.from("user_roles").insert({
      user_id: created.user.id,
      role: "team_leader",
      granted_by: context.userId,
    } as never);
    if (roleErr) throw new Error(roleErr.message);

    // Optional team rename
    if (data.teamName && data.teamName !== team.name) {
      const { error: renameErr } = await supabaseAdmin
        .from("teams")
        .update({ name: data.teamName, updated_by: context.userId } as never)
        .eq("id", team.id);
      if (renameErr) throw new Error(renameErr.message);
    }

    // Assign leader to team
    const { error: teamUpdateErr } = await supabaseAdmin
      .from("teams")
      .update({ leader_id: created.user.id, updated_by: context.userId } as never)
      .eq("id", team.id);
    if (teamUpdateErr) throw new Error(teamUpdateErr.message);

    // Persist enterprise profile fields
    const profileUpdate: Record<string, unknown> = {
      full_name: data.fullName,
      mobile_number: data.mobile,
      login_id: loginId,
      team_id: team.id,
      email: data.email && data.email.length > 0 ? data.email : null,
      avatar_url: data.avatarUrl && data.avatarUrl.length > 0 ? data.avatarUrl : null,
      address: data.address && data.address.length > 0 ? data.address : null,
      remarks: data.remarks && data.remarks.length > 0 ? data.remarks : null,
      joining_date: data.joiningDate && data.joiningDate.length > 0 ? data.joiningDate : null,
      created_by: context.userId,
      updated_by: context.userId,
    };
    const { error: profileErr } = await supabaseAdmin
      .from("profiles")
      .update(profileUpdate as never)
      .eq("id", created.user.id);
    if (profileErr) throw new Error(profileErr.message);

    await supabaseAdmin.from("audit_logs").insert({
      actor_id: context.userId,
      action: "create_team_leader",
      entity_type: "profile",
      entity_id: created.user.id,
      new_value: { team_id: team.id, team_letter: team.letter, login_id: loginId },
    });

    return { ok: true as const, userId: created.user.id, loginId, teamLetter: team.letter };
  });

/* ================================================================== */
/* Update Team Leader profile                                          */
/* ================================================================== */

const updateProfileSchema = z.object({
  userId: z.string().uuid(),
  fullName: z.string().trim().min(2).max(80).optional(),
  email: z.string().trim().email().max(160).optional().or(z.literal("")),
  address: z.string().trim().max(400).optional().or(z.literal("")),
  avatarUrl: z.string().trim().url().max(600).optional().or(z.literal("")),
  joiningDate: z.string().optional().or(z.literal("")),
  remarks: z.string().trim().max(600).optional().or(z.literal("")),
  teamName: z.string().trim().min(2).max(80).optional(),
});

export const updateTeamLeader = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => updateProfileSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, team_id, full_name, email, address, avatar_url, joining_date, remarks")
      .eq("id", data.userId)
      .maybeSingle();
    if (!profile) throw new Error("Team Leader not found");

    const updates: Record<string, unknown> = { updated_by: context.userId };
    if (data.fullName !== undefined) updates.full_name = data.fullName;
    if (data.email !== undefined)
      updates.email = data.email.length > 0 ? data.email : null;
    if (data.address !== undefined)
      updates.address = data.address.length > 0 ? data.address : null;
    if (data.avatarUrl !== undefined)
      updates.avatar_url = data.avatarUrl.length > 0 ? data.avatarUrl : null;
    if (data.joiningDate !== undefined)
      updates.joining_date = data.joiningDate.length > 0 ? data.joiningDate : null;
    if (data.remarks !== undefined)
      updates.remarks = data.remarks.length > 0 ? data.remarks : null;

    const { error } = await supabaseAdmin
      .from("profiles")
      .update(updates as never)
      .eq("id", data.userId);
    if (error) throw new Error(error.message);

    if (data.teamName && profile.team_id) {
      await supabaseAdmin
        .from("teams")
        .update({ name: data.teamName, updated_by: context.userId } as never)
        .eq("id", profile.team_id);
    }

    await supabaseAdmin.from("audit_logs").insert({
      actor_id: context.userId,
      action: "update_team_leader",
      entity_type: "profile",
      entity_id: data.userId,
      new_value: updates as never,
      previous_value: profile,
    });

    return { ok: true as const };
  });

/* ================================================================== */
/* Team Leader detail (profile + aggregated read models)               */
/* ================================================================== */

const idSchema = z.object({ userId: z.string().uuid() });

export const getTeamLeaderDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", data.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!profile) throw new Error("Team Leader not found");

    const { data: team } = profile.team_id
      ? await supabaseAdmin
          .from("teams")
          .select("id, letter, name, description, status")
          .eq("id", profile.team_id)
          .maybeSingle()
      : { data: null };

    const membersQuery = supabaseAdmin
      .from("profiles")
      .select(
        "id, display_code, full_name, mobile_number, login_id, avatar_url, status, is_active, total_sales, total_earnings, referral_count, last_login_at, created_at",
      )
      .eq("team_id", profile.team_id ?? "00000000-0000-0000-0000-000000000000")
      .eq("is_deleted", false)
      .neq("id", profile.id)
      .order("created_at", { ascending: false });

    const [{ data: members }, { data: sales }, { data: txns }, { data: withdrawals }, { data: audit }] =
      await Promise.all([
        membersQuery,
        supabaseAdmin
          .from("sales")
          .select(
            "id, sale_number, deal_value, sale_status, approval_status, seller_id, customer_id, buyer_name, unit_label, created_at, approval_at",
          )
          .eq("leader_id", profile.id)
          .order("created_at", { ascending: false })
          .limit(200),
        supabaseAdmin
          .from("commission_transactions")
          .select(
            "id, txn_number, sale_id, leader_gross, net_leader, member_amount, bonus_amount, status, created_at",
          )
          .eq("leader_id", profile.id)
          .order("created_at", { ascending: false })
          .limit(200),
        supabaseAdmin
          .from("withdrawals")
          .select("id, reference_number, amount, status, requested_at, completed_at, admin_notes")
          .eq("user_id", profile.id)
          .order("requested_at", { ascending: false })
          .limit(100),
        supabaseAdmin
          .from("audit_logs")
          .select("id, action, entity_type, entity_id, metadata, new_value, created_at, actor_id")
          .eq("entity_id", profile.id)
          .order("created_at", { ascending: false })
          .limit(50),
      ]);


    const customerCount = profile.team_id
      ? (
          await supabaseAdmin
            .from("customers")
            .select("*", { count: "exact", head: true })
            .eq("team_id", profile.team_id)
        ).count ?? 0
      : 0;

    // Sales aggregates
    const approvedSales = (sales ?? []).filter((s) => s.approval_status === "approved");
    const pendingSales = (sales ?? []).filter((s) =>
      ["pending", "submitted", "changes_requested"].includes(String(s.approval_status)),
    );
    const draftSales = (sales ?? []).filter((s) => s.sale_status === "draft" || s.sale_status === "flat_locked");
    const cancelledSales = (sales ?? []).filter((s) =>
      ["cancelled", "rejected"].includes(String(s.approval_status)),
    );
    const revenue = approvedSales.reduce((a, s) => a + Number(s.deal_value ?? 0), 0);
    const highestSale = approvedSales.reduce((m, s) => Math.max(m, Number(s.deal_value ?? 0)), 0);
    const avgSale = approvedSales.length ? revenue / approvedSales.length : 0;

    // Time windows
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString();
    const inWindow = (from: string) =>
      approvedSales
        .filter((s) => (s.approval_at ?? s.created_at) >= from)
        .reduce((a, s) => a + Number(s.deal_value ?? 0), 0);

    // Commission aggregates
    const activeTxns = (txns ?? []).filter((t) => t.status !== "reversed");
    const totalCommission = activeTxns.reduce((a, t) => a + Number(t.net_leader ?? 0), 0);
    const pendingCommission = activeTxns
      .filter((t) => t.status === "pending")
      .reduce((a, t) => a + Number(t.net_leader ?? 0), 0);
    const approvedCommission = activeTxns
      .filter((t) => t.status === "credited" || t.status === "approved")
      .reduce((a, t) => a + Number(t.net_leader ?? 0), 0);
    const memberCommission = activeTxns.reduce((a, t) => a + Number(t.member_amount ?? 0), 0);
    const bonusTotal = activeTxns.reduce((a, t) => a + Number(t.bonus_amount ?? 0), 0);

    // Withdrawal aggregates
    const wSummary = {
      pending: (withdrawals ?? []).filter((w) => w.status === "pending").length,
      approved: (withdrawals ?? []).filter((w) => w.status === "approved").length,
      processing: (withdrawals ?? []).filter((w) => w.status === "processing").length,
      completed: (withdrawals ?? []).filter((w) => w.status === "completed").length,
      rejected: (withdrawals ?? []).filter((w) => w.status === "rejected").length,
      cancelled: (withdrawals ?? []).filter((w) => w.status === "cancelled").length,
    };

    return {
      profile,
      team,
      customerCount,
      members: members ?? [],
      sales: sales ?? [],
      salesSummary: {
        approved: approvedSales.length,
        pending: pendingSales.length,
        draft: draftSales.length,
        cancelled: cancelledSales.length,
        revenue,
        highestSale,
        avgSale,
        today: inWindow(startOfDay),
        month: inWindow(startOfMonth),
        year: inWindow(startOfYear),
      },
      transactions: txns ?? [],
      commissionSummary: {
        total: totalCommission,
        pending: pendingCommission,
        approved: approvedCommission,
        memberShare: memberCommission,
        bonus: bonusTotal,
      },
      withdrawals: withdrawals ?? [],
      withdrawalSummary: wSummary,
      audit: audit ?? [],
    };
  });
