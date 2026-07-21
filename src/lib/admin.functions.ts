import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { AAWASH_AUTH_EMAIL_DOMAIN } from "@/lib/auth";

/**
 * Aawash admin & leader server functions.
 *
 * All state-changing endpoints:
 *  1. Run inside requireSupabaseAuth (bearer token verified).
 *  2. Verify the caller's role via context.supabase.rpc('has_role', ...) — RLS applies.
 *  3. Only THEN import supabaseAdmin to perform privileged Auth Admin operations.
 */

async function assertSuperAdmin(ctx: {
  supabase: import("@supabase/supabase-js").SupabaseClient;
  userId: string;
}) {
  const { data: isAdmin, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "super_admin",
  });
  if (error) throw new Error(error.message);
  if (!isAdmin) throw new Error("Forbidden: Super Admin only");
}

/* ------------------------------------------------------------------ */
/* Team helpers                                                        */
/* ------------------------------------------------------------------ */

export const listTeamsWithLeaders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: teams, error } = await supabaseAdmin
      .from("teams")
      .select("id, letter, name, leader_id, is_deleted")
      .eq("is_deleted", false)
      .order("letter", { ascending: true });
    if (error) throw new Error(error.message);
    const leaderIds = (teams ?? []).map((t) => t.leader_id).filter(Boolean) as string[];
    let leaders: Array<{ id: string; full_name: string; login_id: string }> = [];
    if (leaderIds.length) {
      const { data } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name, login_id")
        .in("id", leaderIds);
      leaders = data ?? [];
    }
    return (teams ?? []).map((t) => ({
      ...t,
      leader: leaders.find((l) => l.id === t.leader_id) ?? null,
    }));
  });

/* ------------------------------------------------------------------ */
/* Create Team Leader                                                  */
/* ------------------------------------------------------------------ */

const teamLeaderSchema = z.object({
  fullName: z.string().trim().min(2).max(80),
  mobile: z.string().regex(/^\d{10}$/, "Mobile must be exactly 10 digits"),
  password: z.string().min(8).max(72),
  teamLetter: z.string().regex(/^[A-Z]$/, "Team letter must be A–Z"),
});

export const createTeamLeader = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => teamLeaderSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Verify the team exists and doesn't already have a leader.
    const { data: team, error: teamErr } = await supabaseAdmin
      .from("teams")
      .select("id, letter, leader_id, is_deleted")
      .eq("letter", data.teamLetter)
      .maybeSingle();
    if (teamErr) throw new Error(teamErr.message);
    if (!team || team.is_deleted) throw new Error(`Team ${data.teamLetter} does not exist.`);
    if (team.leader_id) throw new Error(`Team ${data.teamLetter} already has a Team Leader.`);

    // Duplicate checks
    const { data: dupe } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .or(`mobile_number.eq.${data.mobile},login_id.eq.${data.mobile}`)
      .maybeSingle();
    if (dupe) throw new Error("A user with that mobile number already exists.");

    const loginId = data.mobile;
    const email = `${loginId.toLowerCase()}@${AAWASH_AUTH_EMAIL_DOMAIN}`;

    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        full_name: data.fullName,
        mobile_number: data.mobile,
        login_id: loginId,
        team_letter: data.teamLetter,
        role: "team_leader",
      },
    });
    if (createErr || !created.user) {
      throw new Error(createErr?.message ?? "Failed to create Team Leader");
    }

    // Trigger inserted role=member by default — replace with team_leader.
    await supabaseAdmin.from("user_roles").delete().eq("user_id", created.user.id);
    await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: created.user.id, role: "team_leader", granted_by: context.userId });

    // Assign team ownership.
    await supabaseAdmin
      .from("teams")
      .update({ leader_id: created.user.id, updated_by: context.userId })
      .eq("id", team.id);

    // Ensure the leader's own profile row is tagged with their team.
    await supabaseAdmin
      .from("profiles")
      .update({ team_id: team.id, created_by: context.userId })
      .eq("id", created.user.id);

    await supabaseAdmin.from("audit_logs").insert({
      actor_id: context.userId,
      action: "create_team_leader",
      entity_type: "profile",
      entity_id: created.user.id,
      metadata: { team_letter: data.teamLetter, login_id: loginId },
    });

    return { ok: true as const, loginId, userId: created.user.id };
  });

/* ------------------------------------------------------------------ */
/* Create Member                                                       */
/* ------------------------------------------------------------------ */

const memberSchema = z.object({
  fullName: z.string().trim().min(2).max(80),
  mobile: z.string().regex(/^\d{10}$/, "Mobile must be exactly 10 digits"),
  password: z.string().min(8).max(72),
  teamLetter: z.string().regex(/^[A-Z]$/, "Team letter must be A–Z"),
});

export const createMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => memberSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Team must exist and have a leader (members require a Team Leader).
    const { data: team } = await supabaseAdmin
      .from("teams")
      .select("id, letter, leader_id, is_deleted")
      .eq("letter", data.teamLetter)
      .maybeSingle();
    if (!team || team.is_deleted) throw new Error(`Team ${data.teamLetter} does not exist.`);
    if (!team.leader_id)
      throw new Error(`Team ${data.teamLetter} has no Team Leader yet. Create the leader first.`);

    const loginId = `${data.teamLetter}${data.mobile}`;

    // Duplicate checks
    const { data: dupe } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .or(`mobile_number.eq.${data.mobile},login_id.eq.${loginId}`)
      .maybeSingle();
    if (dupe) throw new Error("A user with that mobile number or Login ID already exists.");

    const email = `${loginId.toLowerCase()}@${AAWASH_AUTH_EMAIL_DOMAIN}`;
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        full_name: data.fullName,
        mobile_number: data.mobile,
        login_id: loginId,
        team_letter: data.teamLetter,
        role: "member",
      },
    });
    if (createErr || !created.user) {
      throw new Error(createErr?.message ?? "Failed to create Member");
    }

    // Trigger already inserted role=member; leave as is.
    // Ensure profile is stamped with created_by and correct team_id.
    await supabaseAdmin
      .from("profiles")
      .update({ team_id: team.id, created_by: context.userId })
      .eq("id", created.user.id);

    await supabaseAdmin.from("audit_logs").insert({
      actor_id: context.userId,
      action: "create_member",
      entity_type: "profile",
      entity_id: created.user.id,
      metadata: { team_letter: data.teamLetter, login_id: loginId },
    });

    return { ok: true as const, loginId, userId: created.user.id };
  });

/* ------------------------------------------------------------------ */
/* User list (admin)                                                   */
/* ------------------------------------------------------------------ */

export const listAllUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: profiles, error: pErr }, { data: roles, error: rErr }, { data: teams }] =
      await Promise.all([
        supabaseAdmin
          .from("profiles")
          .select(
            "id, display_code, full_name, login_id, mobile_number, team_id, status, is_active, is_deleted, last_login_at, created_at",
          )
          .eq("is_deleted", false)
          .order("created_at", { ascending: false }),
        supabaseAdmin.from("user_roles").select("user_id, role"),
        supabaseAdmin.from("teams").select("id, letter"),
      ]);
    if (pErr) throw new Error(pErr.message);
    if (rErr) throw new Error(rErr.message);

    const roleMap = new Map<string, string>();
    (roles ?? []).forEach((r) => roleMap.set(r.user_id, r.role));
    const teamMap = new Map<string, string>();
    (teams ?? []).forEach((t) => teamMap.set(t.id, t.letter));

    return (profiles ?? []).map((p) => ({
      ...p,
      role: roleMap.get(p.id) ?? "member",
      team_letter: p.team_id ? teamMap.get(p.team_id) ?? null : null,
    }));
  });

/* ------------------------------------------------------------------ */
/* Reset password (admin)                                              */
/* ------------------------------------------------------------------ */

const resetSchema = z.object({
  userId: z.string().uuid(),
  password: z.string().min(8).max(72),
});

export const adminResetPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => resetSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      password: data.password,
    });
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("audit_logs").insert({
      actor_id: context.userId,
      action: "reset_password",
      entity_type: "profile",
      entity_id: data.userId,
    });
    return { ok: true as const };
  });

/* ------------------------------------------------------------------ */
/* Status change (activate / suspend / soft-delete)                    */
/* ------------------------------------------------------------------ */

const statusSchema = z.object({
  userId: z.string().uuid(),
  status: z.enum(["active", "inactive", "suspended", "deleted"]),
});

export const setUserStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => statusSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: Record<string, unknown> = {
      status: data.status,
      is_active: data.status === "active",
      is_deleted: data.status === "deleted",
      updated_by: context.userId,
    };
    const { error } = await supabaseAdmin.from("profiles").update(patch).eq("id", data.userId);
    if (error) throw new Error(error.message);

    // Also ban/unban at the Auth layer so inactive/suspended/deleted users
    // cannot sign in even if they somehow have valid credentials.
    await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      ban_duration: data.status === "active" ? "none" : "876000h", // ~100 years
    });

    await supabaseAdmin.from("audit_logs").insert({
      actor_id: context.userId,
      action: `status_${data.status}`,
      entity_type: "profile",
      entity_id: data.userId,
    });
    return { ok: true as const };
  });

/* ------------------------------------------------------------------ */
/* Team Leader: list my team                                           */
/* ------------------------------------------------------------------ */

export const listMyTeamMembers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // RLS enforces "team leader reads own team" — safe to use context.supabase.
    const { data: me, error: meErr } = await context.supabase
      .from("profiles")
      .select("team_id")
      .eq("id", context.userId)
      .maybeSingle();
    if (meErr) throw new Error(meErr.message);
    if (!me?.team_id) return [];

    const { data, error } = await context.supabase
      .from("profiles")
      .select(
        "id, display_code, full_name, login_id, mobile_number, status, is_active, total_sales, total_earnings, referral_count, created_at",
      )
      .eq("team_id", me.team_id)
      .eq("is_deleted", false)
      .neq("id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/* ------------------------------------------------------------------ */
/* Sign-in status probe (public, but requires bearer via middleware)   */
/* ------------------------------------------------------------------ */

export const getMyStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("status, is_active, is_deleted")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ?? { status: "active", is_active: true, is_deleted: false };
  });
