import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Aawash leader / member server functions.
 * Everything is scoped by RLS to the caller's own team / rows.
 */

async function getMyTeamId(ctx: {
  supabase: import("@supabase/supabase-js").SupabaseClient;
  userId: string;
}): Promise<{ teamId: string | null; teamLetter: string | null }> {
  const { data: me } = await ctx.supabase
    .from("profiles")
    .select("team_id")
    .eq("id", ctx.userId)
    .maybeSingle();
  if (!me?.team_id) return { teamId: null, teamLetter: null };
  const { data: team } = await ctx.supabase
    .from("teams")
    .select("letter")
    .eq("id", me.team_id)
    .maybeSingle();
  return { teamId: me.team_id, teamLetter: team?.letter ?? null };
}

/* -------------------- Leader overview stats -------------------- */

export const getLeaderOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { teamId, teamLetter } = await getMyTeamId(context);
    if (!teamId) {
      return {
        teamId: null,
        teamLetter: null,
        memberCount: 0,
        totalSales: 0,
        salesCount: 0,
        totalRevenue: 0,
        totalCommission: 0,
        pendingCommission: 0,
        monthlyRevenue: 0,
        monthlyCommission: 0,
        approvedWithdrawals: 0,
        pendingWithdrawals: 0,
        walletBalance: 0,
        projectCount: 0,
      };
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const [membersRes, salesRes, salesMonthRes, commRes, commMonthRes, wdRes, projRes] =
      await Promise.all([
        context.supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("team_id", teamId)
          .eq("is_deleted", false)
          .neq("id", context.userId),
        context.supabase.from("sales").select("deal_value").eq("team_id", teamId),
        context.supabase
          .from("sales")
          .select("deal_value")
          .eq("team_id", teamId)
          .gte("created_at", monthStart),
        context.supabase.from("commissions").select("amount, status").eq("team_id", teamId),
        context.supabase
          .from("commissions")
          .select("amount")
          .eq("team_id", teamId)
          .gte("created_at", monthStart),
        context.supabase.from("withdrawals").select("amount, status").eq("team_id", teamId),
        context.supabase
          .from("projects")
          .select("id", { count: "exact", head: true })
          .eq("is_deleted", false),
      ]);

    const sum = (rows: Array<{ amount?: number; deal_value?: number }> | null, key: "amount" | "deal_value") =>
      (rows ?? []).reduce((s, r) => s + Number((r as never as Record<string, number>)[key] || 0), 0);

    const totalRevenue = sum(salesRes.data as never, "deal_value");
    const monthlyRevenue = sum(salesMonthRes.data as never, "deal_value");
    const totalCommission = sum(commRes.data as never, "amount");
    const monthlyCommission = sum(commMonthRes.data as never, "amount");
    const pendingCommission = (commRes.data ?? [])
      .filter((r) => r.status === "pending")
      .reduce((s, r) => s + Number(r.amount || 0), 0);
    const approvedWithdrawals = (wdRes.data ?? [])
      .filter((r) => r.status === "approved" || r.status === "paid")
      .reduce((s, r) => s + Number(r.amount || 0), 0);
    const pendingWithdrawals = (wdRes.data ?? [])
      .filter((r) => r.status === "pending")
      .reduce((s, r) => s + Number(r.amount || 0), 0);

    // Admin-set overrides (profiles.metrics_override) win over computed values
    // so anything edited in the admin console shows up here immediately.
    const { data: meRow } = await context.supabase
      .from("profiles")
      .select("metrics_override, wallet_balance")
      .eq("id", context.userId)
      .maybeSingle();
    const ov = ((meRow?.metrics_override ?? {}) as Record<string, unknown>) || {};
    const pick = (key: string, fallback: number) =>
      ov[key] === undefined || ov[key] === null ? fallback : Number(ov[key]);

    return {
      teamId,
      teamLetter,
      memberCount: pick("member_count", membersRes.count ?? 0),
      totalSales: pick("total_revenue", totalRevenue),
      salesCount: pick("sales_count", (salesRes.data ?? []).length),
      totalRevenue: pick("total_revenue", totalRevenue),
      totalCommission: pick("total_commission", totalCommission),
      pendingCommission,
      monthlyRevenue,
      monthlyCommission,
      approvedWithdrawals,
      pendingWithdrawals,
      walletBalance: Number(meRow?.wallet_balance ?? 0),
      projectCount: projRes.count ?? 0,
    };
  });

/* -------------------- Trend (last 6 months) -------------------- */

export const getLeaderTrend = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { teamId } = await getMyTeamId(context);
    if (!teamId) return { months: [] as { key: string; label: string; revenue: number; commission: number; sales: number }[] };

    const start = new Date();
    start.setMonth(start.getMonth() - 5, 1);
    start.setHours(0, 0, 0, 0);

    const [salesRes, commRes] = await Promise.all([
      context.supabase
        .from("sales")
        .select("deal_value, created_at")
        .eq("team_id", teamId)
        .gte("created_at", start.toISOString()),
      context.supabase
        .from("commissions")
        .select("amount, created_at")
        .eq("team_id", teamId)
        .gte("created_at", start.toISOString()),
    ]);

    const buckets: Record<string, { revenue: number; commission: number; sales: number }> = {};
    const months: { key: string; label: string }[] = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months.push({ key, label: d.toLocaleString("en-IN", { month: "short" }) });
      buckets[key] = { revenue: 0, commission: 0, sales: 0 };
    }
    for (const s of salesRes.data ?? []) {
      const d = new Date(s.created_at as string);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (buckets[key]) {
        buckets[key].revenue += Number(s.deal_value || 0);
        buckets[key].sales += 1;
      }
    }
    for (const c of commRes.data ?? []) {
      const d = new Date(c.created_at as string);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (buckets[key]) buckets[key].commission += Number(c.amount || 0);
    }
    return { months: months.map((m) => ({ ...m, ...buckets[m.key] })) };
  });

/* -------------------- Leaderboard (team members ranked) -------------------- */

export const getTeamLeaderboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { teamId } = await getMyTeamId(context);
    if (!teamId) return [];
    const { data, error } = await context.supabase
      .from("profiles")
      .select("id, display_code, full_name, login_id, avatar_url, total_sales, total_earnings, referral_count")
      .eq("team_id", teamId)
      .eq("is_deleted", false)
      .neq("id", context.userId)
      .order("total_sales", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return (data ?? []).map((m, i) => ({ ...m, rank: i + 1 }));
  });

/* -------------------- Recent sales / commissions -------------------- */

export const listTeamSales = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { teamId } = await getMyTeamId(context);
    if (!teamId) return [];
    const { data } = await context.supabase
      .from("sales")
      .select("id, buyer_name, unit_label, deal_value, sale_date, status, seller_id, project_id, created_at")
      .eq("team_id", teamId)
      .order("created_at", { ascending: false })
      .limit(30);
    return data ?? [];
  });

export const listTeamCommissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { teamId } = await getMyTeamId(context);
    if (!teamId) return [];
    const { data } = await context.supabase
      .from("commissions")
      .select("id, amount, status, tier, user_id, sale_id, created_at")
      .eq("team_id", teamId)
      .order("created_at", { ascending: false })
      .limit(30);
    return data ?? [];
  });

/* -------------------- Projects (all live) -------------------- */

export const listProjects = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("projects")
      .select("id, name, slug, location, price_from, total_units, sold_units, total_flats, available_flats, reserved_flats, sold_flats, extra, hero_hue, tag, description, status")
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });
    return data ?? [];
  });

/* -------------------- Notifications -------------------- */

export const listMyNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("notifications")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(100);
    return data ?? [];
  });

export const markAllNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await context.supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", context.userId)
      .eq("is_read", false);
    return { ok: true as const };
  });

export const markNotificationRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await context.supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    return { ok: true as const };
  });

export const deleteNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await context.supabase.from("notifications").delete().eq("id", data.id).eq("user_id", context.userId);
    return { ok: true as const };
  });

/* -------------------- Withdrawals -------------------- */

export function isWithinWithdrawalWindow(d: Date = new Date()): boolean {
  const day = d.getDate();
  return day >= 25 && day <= 30;
}

export const listMyWithdrawals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("withdrawals")
      .select("*")
      .eq("user_id", context.userId)
      .order("requested_at", { ascending: false })
      .limit(50);
    return data ?? [];
  });

export const requestWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ amount: z.number().positive().max(10_00_00_000) }).parse(d))
  .handler(async ({ context, data }) => {
    if (!isWithinWithdrawalWindow()) {
      throw new Error("Withdrawal requests are currently closed. Window: 25th–30th each month.");
    }
    const { teamId } = await getMyTeamId(context);
    const { data: me } = await context.supabase
      .from("profiles")
      .select("wallet_balance")
      .eq("id", context.userId)
      .maybeSingle();
    const balance = Number(me?.wallet_balance ?? 0);
    if (data.amount > balance) throw new Error("Amount exceeds your available balance.");

    const { error } = await context.supabase.from("withdrawals").insert({
      user_id: context.userId,
      team_id: teamId,
      amount: data.amount,
      status: "pending",
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/* -------------------- Member detail (team-scoped) -------------------- */

export const getMemberDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ memberId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: member, error } = await context.supabase
      .from("profiles")
      .select(
        "id, display_code, full_name, login_id, mobile_number, email, avatar_url, team_id, status, is_active, wallet_balance, total_earnings, total_sales, referral_count, created_at",
      )
      .eq("id", data.memberId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!member) throw new Error("Member not found or not in your team.");

    const [{ data: sales }, { data: commissions }] = await Promise.all([
      context.supabase
        .from("sales")
        .select("id, buyer_name, deal_value, unit_label, sale_date, created_at")
        .eq("seller_id", data.memberId)
        .order("created_at", { ascending: false })
        .limit(20),
      context.supabase
        .from("commissions")
        .select("id, amount, status, tier, created_at")
        .eq("user_id", data.memberId)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
    return { member, sales: sales ?? [], commissions: commissions ?? [] };
  });

/* -------------------- Profile update (self, safe fields) -------------------- */

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        email: z.string().email().optional(),
        avatar_url: z.string().url().max(500).optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const patch: { email?: string; avatar_url?: string } = {};
    if (data.email) patch.email = data.email;
    if (data.avatar_url) patch.avatar_url = data.avatar_url;
    if (Object.keys(patch).length === 0) return { ok: true as const };
    const { error } = await context.supabase.from("profiles").update(patch).eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const changeMyPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ password: z.string().min(8).max(72) }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.auth.updateUser({ password: data.password });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
