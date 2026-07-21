/**
 * Member Management — server functions (Super Admin only).
 *
 * Single source of truth for Member CRUD, team assignment, status,
 * password reset, and aggregated read models (stats, customers, sales,
 * tip persons, commissions, wallet, withdrawals, activity).
 *
 * Auth pattern is identical to team-leaders.functions.ts:
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

async function readMemberLimit(admin: import("@supabase/supabase-js").SupabaseClient) {
  const { data } = await admin.from("system_settings").select("extra").eq("id", 1).maybeSingle();
  const extra = (data?.extra ?? {}) as Record<string, unknown>;
  const n = Number(extra.max_members_per_team ?? 10);
  return Number.isFinite(n) && n > 0 ? n : 10;
}

/* ================================================================== */
/* List Members                                                        */
/* ================================================================== */

export const listAllMembers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: memberRoles } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "member");
    const memberIds = (memberRoles ?? []).map((r) => r.user_id);

    const { data: teams } = await supabaseAdmin
      .from("teams")
      .select("id, letter, name, leader_id, is_deleted")
      .eq("is_deleted", false)
      .order("letter");

    if (!memberIds.length) {
      return { members: [], teams: teams ?? [], leaders: [] };
    }

    const { data: profiles, error } = await supabaseAdmin
      .from("profiles")
      .select(
        "id, display_code, full_name, mobile_number, login_id, email, avatar_url, team_id, status, is_active, is_deleted, joining_date, wallet_balance, total_earnings, total_sales, referral_count, last_login_at, created_at",
      )
      .in("id", memberIds)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const teamById = new Map((teams ?? []).map((t) => [t.id, t]));

    const leaderIds = (teams ?? []).map((t) => t.leader_id).filter(Boolean) as string[];
    const { data: leaderProfiles } = leaderIds.length
      ? await supabaseAdmin.from("profiles").select("id, full_name, mobile_number").in("id", leaderIds)
      : { data: [] };
    const leaderById = new Map((leaderProfiles ?? []).map((p) => [p.id, p]));

    // Aggregated approved sales and commissions
    const [{ data: sales }, { data: txns }] = await Promise.all([
      supabaseAdmin
        .from("sales")
        .select("seller_id, deal_value, approval_status")
        .in("seller_id", memberIds),
      supabaseAdmin
        .from("commission_transactions")
        .select("member_id, member_amount, status")
        .in("member_id", memberIds),
    ]);

    const revenueMap = new Map<string, number>();
    const salesCountMap = new Map<string, number>();
    (sales ?? []).forEach((s) => {
      if (!s.seller_id || s.approval_status !== "approved") return;
      revenueMap.set(s.seller_id, (revenueMap.get(s.seller_id) ?? 0) + Number(s.deal_value ?? 0));
      salesCountMap.set(s.seller_id, (salesCountMap.get(s.seller_id) ?? 0) + 1);
    });
    const commissionMap = new Map<string, number>();
    (txns ?? []).forEach((t) => {
      if (!t.member_id || t.status === "reversed") return;
      commissionMap.set(t.member_id, (commissionMap.get(t.member_id) ?? 0) + Number(t.member_amount ?? 0));
    });

    const members = (profiles ?? []).map((p) => {
      const team = p.team_id ? teamById.get(p.team_id) : null;
      const leader = team?.leader_id ? leaderById.get(team.leader_id) : null;
      return {
        ...p,
        team_letter: team?.letter ?? null,
        team_name: team?.name ?? null,
        leader_id: team?.leader_id ?? null,
        leader_name: leader?.full_name ?? null,
        sales_count: salesCountMap.get(p.id) ?? 0,
        total_revenue: revenueMap.get(p.id) ?? 0,
        member_commission: commissionMap.get(p.id) ?? 0,
      };
    });

    const leaders = (teams ?? []).map((t) => {
      const l = t.leader_id ? leaderById.get(t.leader_id) : null;
      return {
        team_id: t.id,
        letter: t.letter,
        name: t.name,
        leader_id: t.leader_id,
        leader_name: l?.full_name ?? null,
        member_count: members.filter((m) => m.team_id === t.id && !m.is_deleted).length,
      };
    });

    return { members, teams: teams ?? [], leaders };
  });

/* ================================================================== */
/* Create Member (enterprise form)                                     */
/* ================================================================== */

const createSchema = z.object({
  fullName: z.string().trim().min(2).max(80),
  mobile: z.string().regex(/^\d{10}$/, "Mobile must be exactly 10 digits"),
  password: z.string().min(8).max(72),
  teamId: z.string().uuid(),
  email: z.string().trim().email().max(160).optional().or(z.literal("")),
  address: z.string().trim().max(400).optional().or(z.literal("")),
  avatarUrl: z.string().trim().url().max(600).optional().or(z.literal("")),
  joiningDate: z.string().optional().or(z.literal("")),
  remarks: z.string().trim().max(600).optional().or(z.literal("")),
});

export const createMemberFull = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => createSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Validate team
    const { data: team, error: teamErr } = await supabaseAdmin
      .from("teams")
      .select("id, letter, name, leader_id, is_deleted")
      .eq("id", data.teamId)
      .maybeSingle();
    if (teamErr) throw new Error(teamErr.message);
    if (!team || team.is_deleted) throw new Error("Selected team no longer exists.");
    if (!team.leader_id)
      throw new Error(`Team ${team.letter} has no Team Leader yet. Assign a leader first.`);

    // Configurable member cap (excludes leader)
    const maxMembers = await readMemberLimit(supabaseAdmin);
    const { data: currentMembers } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("team_id", team.id)
      .eq("is_deleted", false);
    const memberCount = (currentMembers ?? []).filter((m) => m.id !== team.leader_id).length;
    if (memberCount >= maxMembers) {
      throw new Error(
        `Team ${team.letter} is full (${maxMembers} members). Increase the limit in System Settings first.`,
      );
    }

    const loginId = `${team.letter}${data.mobile}`;

    // Duplicate checks
    const { data: dupe } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .or(`mobile_number.eq.${data.mobile},login_id.eq.${loginId}`)
      .maybeSingle();
    if (dupe) throw new Error("A user with that mobile number or Login ID already exists.");

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
        role: "member",
      },
    });
    if (createErr || !created.user) {
      throw new Error(createErr?.message ?? "Failed to create Member");
    }

    // Ensure role is member (trigger already inserts, but be defensive)
    await supabaseAdmin.from("user_roles").delete().eq("user_id", created.user.id);
    await supabaseAdmin.from("user_roles").insert({
      user_id: created.user.id,
      role: "member",
      granted_by: context.userId,
    } as never);

    const profileUpdate: Record<string, unknown> = {
      team_id: team.id,
      login_id: loginId,
      email: data.email && data.email.length > 0 ? data.email : null,
      avatar_url: data.avatarUrl && data.avatarUrl.length > 0 ? data.avatarUrl : null,
      address: data.address && data.address.length > 0 ? data.address : null,
      remarks: data.remarks && data.remarks.length > 0 ? data.remarks : null,
      joining_date: data.joiningDate && data.joiningDate.length > 0 ? data.joiningDate : null,
      created_by: context.userId,
      updated_by: context.userId,
    };
    await supabaseAdmin.from("profiles").update(profileUpdate as never).eq("id", created.user.id);

    await supabaseAdmin.from("audit_logs").insert({
      actor_id: context.userId,
      action: "create_member",
      entity_type: "profile",
      entity_id: created.user.id,
      new_value: { team_id: team.id, team_letter: team.letter, login_id: loginId },
    });

    return { ok: true as const, userId: created.user.id, loginId, teamLetter: team.letter };
  });

/* ================================================================== */
/* Update Member profile (non-team fields)                             */
/* ================================================================== */

const updateSchema = z.object({
  userId: z.string().uuid(),
  fullName: z.string().trim().min(2).max(80).optional(),
  email: z.string().trim().email().max(160).optional().or(z.literal("")),
  address: z.string().trim().max(400).optional().or(z.literal("")),
  avatarUrl: z.string().trim().url().max(600).optional().or(z.literal("")),
  joiningDate: z.string().optional().or(z.literal("")),
  remarks: z.string().trim().max(600).optional().or(z.literal("")),
});

export const updateMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => updateSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email, address, avatar_url, joining_date, remarks")
      .eq("id", data.userId)
      .maybeSingle();
    if (!profile) throw new Error("Member not found");

    const updates: Record<string, unknown> = { updated_by: context.userId };
    if (data.fullName !== undefined) updates.full_name = data.fullName;
    if (data.email !== undefined) updates.email = data.email.length > 0 ? data.email : null;
    if (data.address !== undefined) updates.address = data.address.length > 0 ? data.address : null;
    if (data.avatarUrl !== undefined)
      updates.avatar_url = data.avatarUrl.length > 0 ? data.avatarUrl : null;
    if (data.joiningDate !== undefined)
      updates.joining_date = data.joiningDate.length > 0 ? data.joiningDate : null;
    if (data.remarks !== undefined) updates.remarks = data.remarks.length > 0 ? data.remarks : null;

    const { error } = await supabaseAdmin
      .from("profiles")
      .update(updates as never)
      .eq("id", data.userId);
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("audit_logs").insert({
      actor_id: context.userId,
      action: "update_member",
      entity_type: "profile",
      entity_id: data.userId,
      new_value: updates as never,
      previous_value: profile,
    });
    return { ok: true as const };
  });

/* ================================================================== */
/* Change team assignment (regenerates Login ID)                       */
/* ================================================================== */

const changeTeamSchema = z.object({
  userId: z.string().uuid(),
  teamId: z.string().uuid(),
});

export const changeMemberTeam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => changeTeamSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, mobile_number, login_id, team_id, email")
      .eq("id", data.userId)
      .maybeSingle();
    if (!profile) throw new Error("Member not found");
    if (profile.team_id === data.teamId) return { ok: true as const, unchanged: true };

    const { data: team } = await supabaseAdmin
      .from("teams")
      .select("id, letter, leader_id, is_deleted")
      .eq("id", data.teamId)
      .maybeSingle();
    if (!team || team.is_deleted) throw new Error("Selected team does not exist.");
    if (!team.leader_id) throw new Error(`Team ${team.letter} has no Team Leader yet.`);

    // Cap check
    const maxMembers = await readMemberLimit(supabaseAdmin);
    const { data: existing } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("team_id", team.id)
      .eq("is_deleted", false);
    const memberCount = (existing ?? []).filter((m) => m.id !== team.leader_id).length;
    if (memberCount >= maxMembers) {
      throw new Error(`Team ${team.letter} is full (${maxMembers} members).`);
    }

    const newLoginId = `${team.letter}${profile.mobile_number}`;

    // Duplicate check across the platform
    const { data: dupe } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("login_id", newLoginId)
      .neq("id", data.userId)
      .maybeSingle();
    if (dupe) throw new Error(`Login ID ${newLoginId} is already taken.`);

    // Update Auth email (synthesized emails only — never overwrite a real one)
    const isSynth = profile.email?.endsWith(`@${AAWASH_AUTH_EMAIL_DOMAIN}`) ?? false;
    if (isSynth) {
      const newEmail = `${newLoginId.toLowerCase()}@${AAWASH_AUTH_EMAIL_DOMAIN}`;
      await supabaseAdmin.auth.admin.updateUserById(data.userId, {
        email: newEmail,
        email_confirm: true,
        user_metadata: { login_id: newLoginId, team_letter: team.letter },
      });
      await supabaseAdmin
        .from("profiles")
        .update({
          team_id: team.id,
          login_id: newLoginId,
          email: newEmail,
          updated_by: context.userId,
        } as never)
        .eq("id", data.userId);
    } else {
      await supabaseAdmin.auth.admin.updateUserById(data.userId, {
        user_metadata: { login_id: newLoginId, team_letter: team.letter },
      });
      await supabaseAdmin
        .from("profiles")
        .update({
          team_id: team.id,
          login_id: newLoginId,
          updated_by: context.userId,
        } as never)
        .eq("id", data.userId);
    }

    await supabaseAdmin.from("audit_logs").insert({
      actor_id: context.userId,
      action: "change_member_team",
      entity_type: "profile",
      entity_id: data.userId,
      previous_value: { team_id: profile.team_id, login_id: profile.login_id },
      new_value: { team_id: team.id, login_id: newLoginId, team_letter: team.letter },
    });

    return { ok: true as const, loginId: newLoginId, teamLetter: team.letter };
  });

/* ================================================================== */
/* Member detail                                                       */
/* ================================================================== */

const idSchema = z.object({ userId: z.string().uuid() });

export const getMemberDetail = createServerFn({ method: "GET" })
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
    if (!profile) throw new Error("Member not found");

    const { data: team } = profile.team_id
      ? await supabaseAdmin
          .from("teams")
          .select("id, letter, name, leader_id, status")
          .eq("id", profile.team_id)
          .maybeSingle()
      : { data: null };

    const { data: leader } = team?.leader_id
      ? await supabaseAdmin
          .from("profiles")
          .select("id, full_name, mobile_number, avatar_url")
          .eq("id", team.leader_id)
          .maybeSingle()
      : { data: null };

    const [
      { data: customers },
      { data: sales },
      { data: txns },
      { data: withdrawals },
      { data: tips },
      { data: audit },
    ] = await Promise.all([
      supabaseAdmin
        .from("customers")
        .select("id, full_name, mobile_number, status, created_at")
        .eq("assigned_member_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(200),
      supabaseAdmin
        .from("sales")
        .select(
          "id, sale_number, deal_value, sale_status, approval_status, buyer_name, unit_label, created_at, approval_at",
        )
        .eq("seller_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(200),
      supabaseAdmin
        .from("commission_transactions")
        .select("id, txn_number, sale_id, member_amount, tip_amount, status, created_at")
        .eq("member_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(200),
      supabaseAdmin
        .from("withdrawals")
        .select("id, reference_number, amount, status, requested_at, completed_at")
        .eq("user_id", profile.id)
        .order("requested_at", { ascending: false })
        .limit(100),
      supabaseAdmin
        .from("tip_persons")
        .select("*")
        .eq("member_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(100),
      supabaseAdmin
        .from("audit_logs")
        .select("id, action, entity_type, entity_id, metadata, new_value, created_at, actor_id")
        .eq("entity_id", profile.id)
        .order("created_at", { ascending: false })
        .limit: (50 as never) as never,
    ] as const);

    // Aggregates
    const approved = (sales ?? []).filter((s) => s.approval_status === "approved");
    const pending = (sales ?? []).filter((s) =>
      ["pending", "submitted", "changes_requested"].includes(String(s.approval_status)),
    );
    const draft = (sales ?? []).filter((s) =>
      ["draft", "flat_locked"].includes(String(s.sale_status)),
    );
    const cancelled = (sales ?? []).filter((s) =>
      ["cancelled", "rejected"].includes(String(s.approval_status)),
    );
    const revenue = approved.reduce((a, s) => a + Number(s.deal_value ?? 0), 0);
    const highestSale = approved.reduce((m, s) => Math.max(m, Number(s.deal_value ?? 0)), 0);
    const avgSale = approved.length ? revenue / approved.length : 0;

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString();
    const inWindow = (from: string) =>
      approved
        .filter((s) => (s.approval_at ?? s.created_at) >= from)
        .reduce((a, s) => a + Number(s.deal_value ?? 0), 0);

    const activeTxns = (txns ?? []).filter((t) => t.status !== "reversed");
    const memberCommission = activeTxns.reduce((a, t) => a + Number(t.member_amount ?? 0), 0);
    const pendingCommission = activeTxns
      .filter((t) => t.status === "pending")
      .reduce((a, t) => a + Number(t.member_amount ?? 0), 0);
    const approvedCommission = activeTxns
      .filter((t) => t.status === "credited" || t.status === "approved")
      .reduce((a, t) => a + Number(t.member_amount ?? 0), 0);
    const tipEarned = activeTxns.reduce((a, t) => a + Number(t.tip_amount ?? 0), 0);

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
      leader,
      customers: customers ?? [],
      customerCount: customers?.length ?? 0,
      sales: sales ?? [],
      salesSummary: {
        approved: approved.length,
        pending: pending.length,
        draft: draft.length,
        cancelled: cancelled.length,
        revenue,
        highestSale,
        avgSale,
        today: inWindow(startOfDay),
        month: inWindow(startOfMonth),
        year: inWindow(startOfYear),
      },
      transactions: txns ?? [],
      commissionSummary: {
        total: memberCommission,
        pending: pendingCommission,
        approved: approvedCommission,
        tips: tipEarned,
      },
      withdrawals: withdrawals ?? [],
      withdrawalSummary: wSummary,
      tipPersons: tips ?? [],
      audit: audit ?? [],
    };
  });
