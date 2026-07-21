import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isWithinWithdrawalWindow } from "@/lib/leader.functions";

/**
 * Aawash MEMBER server functions.
 * RLS restricts every read/write to the caller's own rows.
 */

/* -------------------- Member overview -------------------- */

export const getMemberOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const [profileRes, teamRes, salesRes, commRes, refRes, tipRes, wdRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, mobile_number, login_id, display_code, email, avatar_url, team_id, wallet_balance, total_earnings, total_sales, referral_count, created_at, status")
        .eq("id", userId)
        .maybeSingle(),
      supabase.from("profiles").select("team_id").eq("id", userId).maybeSingle().then(async (r) => {
        if (!r.data?.team_id) return null;
        return supabase
          .from("teams")
          .select("id, name, letter, leader_id")
          .eq("id", r.data.team_id)
          .maybeSingle();
      }),
      supabase.from("sales").select("id, deal_value, sale_date, created_at").eq("seller_id", userId),
      supabase.from("commissions").select("id, amount, status, created_at").eq("user_id", userId),
      supabase.from("referrals").select("id, status").eq("member_id", userId),
      supabase.from("tip_persons").select("id").eq("member_id", userId),
      supabase.from("withdrawals").select("id, amount, status, requested_at").eq("user_id", userId).order("requested_at", { ascending: false }).limit(1),
    ]);

    const profile = profileRes.data;
    const teamData = teamRes && "data" in teamRes ? teamRes.data : null;
    const sales = salesRes.data ?? [];
    const commissions = commRes.data ?? [];

    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const startMonth = new Date(y, m, 1);
    const today = now.toISOString().slice(0, 10);

    const salesToday = sales.filter((s) => s.sale_date === today);
    const salesMonth = sales.filter((s) => new Date(s.created_at) >= startMonth);

    const totalCommission = commissions.reduce((s, c) => s + Number(c.amount || 0), 0);
    const monthCommission = commissions
      .filter((c) => new Date(c.created_at) >= startMonth)
      .reduce((s, c) => s + Number(c.amount || 0), 0);
    const pendingCommission = commissions
      .filter((c) => c.status === "pending")
      .reduce((s, c) => s + Number(c.amount || 0), 0);
    const todayCommission = commissions
      .filter((c) => new Date(c.created_at).toISOString().slice(0, 10) === today)
      .reduce((s, c) => s + Number(c.amount || 0), 0);

    let leaderName: string | null = null;
    if (teamData?.leader_id) {
      const { data: leader } = await supabase
        .from("profiles")
        .select("full_name, mobile_number")
        .eq("id", teamData.leader_id)
        .maybeSingle();
      leaderName = leader?.full_name ?? null;
      (teamData as { leader?: { full_name?: string; mobile_number?: string } }).leader = {
        full_name: leader?.full_name ?? undefined,
        mobile_number: leader?.mobile_number ?? undefined,
      };
    }

    return {
      profile,
      team: teamData,
      leaderName,
      stats: {
        totalSales: sales.reduce((s, x) => s + Number(x.deal_value || 0), 0),
        salesCount: sales.length,
        todaySalesValue: salesToday.reduce((s, x) => s + Number(x.deal_value || 0), 0),
        todaySalesCount: salesToday.length,
        monthSalesValue: salesMonth.reduce((s, x) => s + Number(x.deal_value || 0), 0),
        monthSalesCount: salesMonth.length,
        totalCommission,
        monthCommission,
        pendingCommission,
        todayCommission,
        referralCount: (refRes.data ?? []).length,
        tipCount: (tipRes.data ?? []).length,
      },
      lastWithdrawal: wdRes.data?.[0] ?? null,
    };
  });

/* -------------------- Sales -------------------- */

export const listMySales = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("sales")
      .select("id, project_id, buyer_name, unit_label, deal_value, status, payment_status, customer_status, sale_date, created_at, notes, contact_visible, buyer_mobile")
      .eq("seller_id", context.userId)
      .order("sale_date", { ascending: false })
      .order("created_at", { ascending: false });

    const list = data ?? [];
    const projectIds = Array.from(new Set(list.map((s) => s.project_id).filter(Boolean))) as string[];
    let projMap = new Map<string, { name: string; location: string }>();
    if (projectIds.length) {
      const { data: projs } = await context.supabase
        .from("projects")
        .select("id, name, location")
        .in("id", projectIds);
      projMap = new Map((projs ?? []).map((p) => [p.id, { name: p.name, location: p.location }]));
    }

    // Attach commission per sale
    const saleIds = list.map((s) => s.id);
    let commMap = new Map<string, { amount: number; status: string }>();
    if (saleIds.length) {
      const { data: comms } = await context.supabase
        .from("commissions")
        .select("sale_id, amount, status")
        .in("sale_id", saleIds)
        .eq("user_id", context.userId);
      for (const c of comms ?? []) {
        if (c.sale_id) commMap.set(c.sale_id, { amount: Number(c.amount || 0), status: c.status });
      }
    }

    return list.map((s) => ({
      ...s,
      project: s.project_id ? projMap.get(s.project_id) ?? null : null,
      commission: commMap.get(s.id) ?? null,
      // hide contact when admin disallows
      buyer_mobile: s.contact_visible ? s.buyer_mobile : null,
    }));
  });

export const getMySaleDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: sale, error } = await context.supabase
      .from("sales")
      .select("*")
      .eq("id", data.id)
      .eq("seller_id", context.userId)
      .maybeSingle();
    if (error || !sale) throw new Error("Sale not found");

    let project: { name: string; location: string } | null = null;
    if (sale.project_id) {
      const { data: p } = await context.supabase
        .from("projects")
        .select("name, location")
        .eq("id", sale.project_id)
        .maybeSingle();
      project = p ?? null;
    }

    const { data: comm } = await context.supabase
      .from("commissions")
      .select("id, tier, amount, status, created_at")
      .eq("sale_id", data.id)
      .eq("user_id", context.userId);

    return {
      sale: {
        ...sale,
        buyer_mobile: sale.contact_visible ? sale.buyer_mobile : null,
      },
      project,
      commissions: comm ?? [],
    };
  });

/* -------------------- Commission summary -------------------- */

export const getMyCommissionSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("commissions")
      .select("id, sale_id, tier, amount, status, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });

    const list = data ?? [];
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const sum = (arr: typeof list) => arr.reduce((s, c) => s + Number(c.amount || 0), 0);

    return {
      today: sum(list.filter((c) => c.created_at.slice(0, 10) === today)),
      week: sum(list.filter((c) => new Date(c.created_at) >= startOfWeek)),
      month: sum(list.filter((c) => new Date(c.created_at) >= startOfMonth)),
      lifetime: sum(list),
      pending: sum(list.filter((c) => c.status === "pending")),
      recent: list.slice(0, 5),
      history: list,
    };
  });

/* -------------------- Wallet + transactions -------------------- */

export const getMyWallet = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const [profileR, commR, wdR] = await Promise.all([
      supabase
        .from("profiles")
        .select("wallet_balance, total_earnings, total_sales")
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("commissions")
        .select("id, sale_id, amount, status, created_at, tier")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabase
        .from("withdrawals")
        .select("id, amount, status, requested_at, processed_at, note")
        .eq("user_id", userId)
        .order("requested_at", { ascending: false }),
    ]);

    const commissions = commR.data ?? [];
    const withdrawals = wdR.data ?? [];

    const pending = commissions
      .filter((c) => c.status === "pending")
      .reduce((s, c) => s + Number(c.amount || 0), 0);

    // Build unified transaction feed
    const transactions = [
      ...commissions.map((c) => ({
        id: `c-${c.id}`,
        type: "commission" as const,
        amount: Number(c.amount || 0),
        status: c.status,
        date: c.created_at,
        reference: `TIER-${c.tier}`,
        source: c.sale_id ? `Sale #${String(c.sale_id).slice(0, 6).toUpperCase()}` : "Commission",
      })),
      ...withdrawals.map((w) => ({
        id: `w-${w.id}`,
        type: "withdrawal" as const,
        amount: -Number(w.amount || 0),
        status: w.status,
        date: w.requested_at,
        reference: `WD-${String(w.id).slice(0, 6).toUpperCase()}`,
        source: "Wallet withdrawal",
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
      profile: profileR.data ?? null,
      pending,
      lastWithdrawal: withdrawals[0] ?? null,
      transactions,
    };
  });

/* -------------------- Team-scoped leaderboard for members -------------------- */

export const getMyTeamLeaderboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: me } = await supabase
      .from("profiles")
      .select("team_id")
      .eq("id", userId)
      .maybeSingle();
    if (!me?.team_id) return { members: [], meId: userId };
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, login_id, display_code, total_sales, total_earnings, status")
      .eq("team_id", me.team_id)
      .eq("status", "active");
    const list = (data ?? [])
      .map((m) => ({ ...m, total_sales: Number(m.total_sales || 0), total_earnings: Number(m.total_earnings || 0) }))
      .sort((a, b) => b.total_sales - a.total_sales)
      .map((m, i) => ({ ...m, rank: i + 1, score: Math.round(m.total_sales / 10000) }));
    return { members: list, meId: userId };
  });

/* -------------------- Referrals -------------------- */

const referralSchema = z.object({
  customer_name: z.string().trim().min(2).max(100),
  mobile_number: z.string().trim().min(6).max(20),
  alt_mobile: z.string().trim().max(20).optional().or(z.literal("")),
  address: z.string().trim().max(400).optional().or(z.literal("")),
  project_id: z.string().uuid().optional().or(z.literal("")),
  interested_project: z.string().trim().max(200).optional().or(z.literal("")),
  preferred_budget: z.union([z.number().nonnegative(), z.string()]).optional(),
  preferred_flat: z.string().trim().max(60).optional().or(z.literal("")),
  meeting_notes: z.string().trim().max(1000).optional().or(z.literal("")),
  expected_timeline: z.string().trim().max(60).optional().or(z.literal("")),
  remarks: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const submitReferral = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => referralSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: me } = await supabase
      .from("profiles")
      .select("team_id")
      .eq("id", userId)
      .maybeSingle();

    const budget =
      typeof data.preferred_budget === "string"
        ? Number(data.preferred_budget.replace(/[^0-9.]/g, "")) || 0
        : Number(data.preferred_budget || 0);

    const { data: inserted, error } = await supabase
      .from("referrals")
      .insert({
        member_id: userId,
        team_id: me?.team_id ?? null,
        customer_name: data.customer_name,
        mobile_number: data.mobile_number,
        alt_mobile: data.alt_mobile || null,
        address: data.address || null,
        project_id: data.project_id || null,
        interested_project: data.interested_project || null,
        preferred_budget: budget || null,
        preferred_flat: data.preferred_flat || null,
        meeting_notes: data.meeting_notes || null,
        expected_timeline: data.expected_timeline || null,
        remarks: data.remarks || null,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);
    return { id: inserted.id };
  });

export const listMyReferrals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("referrals")
      .select("id, customer_name, mobile_number, interested_project, project_id, status, meeting_status, purchase_status, potential_commission, preferred_budget, created_at")
      .eq("member_id", context.userId)
      .order("created_at", { ascending: false });
    const list = data ?? [];
    const projectIds = Array.from(new Set(list.map((r) => r.project_id).filter(Boolean))) as string[];
    let projMap = new Map<string, string>();
    if (projectIds.length) {
      const { data: projs } = await context.supabase
        .from("projects")
        .select("id, name")
        .in("id", projectIds);
      projMap = new Map((projs ?? []).map((p) => [p.id, p.name]));
    }
    return list.map((r) => ({
      ...r,
      project_name: r.project_id ? projMap.get(r.project_id) ?? r.interested_project : r.interested_project,
    }));
  });

/* -------------------- Tip persons -------------------- */

const tipSchema = z.object({
  tip_name: z.string().trim().min(2).max(100),
  tip_mobile: z.string().trim().min(6).max(20),
  tip_address: z.string().trim().max(400).optional().or(z.literal("")),
  relationship: z.string().trim().max(80).optional().or(z.literal("")),
  customer_name: z.string().trim().min(2).max(100),
  customer_contact: z.string().trim().max(20).optional().or(z.literal("")),
  project_id: z.string().uuid().optional().or(z.literal("")),
  interested_project: z.string().trim().max(200).optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const submitTip = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => tipSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: me } = await supabase
      .from("profiles")
      .select("team_id")
      .eq("id", userId)
      .maybeSingle();

    const { data: inserted, error } = await supabase
      .from("tip_persons")
      .insert({
        member_id: userId,
        team_id: me?.team_id ?? null,
        tip_name: data.tip_name,
        tip_mobile: data.tip_mobile,
        tip_address: data.tip_address || null,
        relationship: data.relationship || null,
        customer_name: data.customer_name,
        customer_contact: data.customer_contact || null,
        project_id: data.project_id || null,
        interested_project: data.interested_project || null,
        notes: data.notes || null,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);
    return { id: inserted.id };
  });

export const listMyTips = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("tip_persons")
      .select("id, tip_name, tip_mobile, customer_name, interested_project, project_id, status, created_at")
      .eq("member_id", context.userId)
      .order("created_at", { ascending: false });
    return data ?? [];
  });

/* -------------------- Recent activity feed -------------------- */

export const getMyActivity = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [salesR, commR, refR, tipR, wdR] = await Promise.all([
      supabase.from("sales").select("id, buyer_name, deal_value, created_at").eq("seller_id", userId).order("created_at", { ascending: false }).limit(10),
      supabase.from("commissions").select("id, amount, tier, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(10),
      supabase.from("referrals").select("id, customer_name, created_at").eq("member_id", userId).order("created_at", { ascending: false }).limit(10),
      supabase.from("tip_persons").select("id, customer_name, created_at").eq("member_id", userId).order("created_at", { ascending: false }).limit(10),
      supabase.from("withdrawals").select("id, amount, status, requested_at").eq("user_id", userId).order("requested_at", { ascending: false }).limit(10),
    ]);

    const items = [
      ...(salesR.data ?? []).map((s) => ({
        id: `sale-${s.id}`,
        kind: "sale" as const,
        title: `Sale submitted · ${s.buyer_name}`,
        amount: Number(s.deal_value || 0),
        date: s.created_at,
      })),
      ...(commR.data ?? []).map((c) => ({
        id: `comm-${c.id}`,
        kind: "commission" as const,
        title: `Commission earned · Tier ${c.tier}`,
        amount: Number(c.amount || 0),
        date: c.created_at,
      })),
      ...(refR.data ?? []).map((r) => ({
        id: `ref-${r.id}`,
        kind: "referral" as const,
        title: `Referral submitted · ${r.customer_name}`,
        amount: 0,
        date: r.created_at,
      })),
      ...(tipR.data ?? []).map((t) => ({
        id: `tip-${t.id}`,
        kind: "tip" as const,
        title: `Tip lead logged · ${t.customer_name}`,
        amount: 0,
        date: t.created_at,
      })),
      ...(wdR.data ?? []).map((w) => ({
        id: `wd-${w.id}`,
        kind: "withdrawal" as const,
        title: `Withdrawal ${w.status}`,
        amount: -Number(w.amount || 0),
        date: w.requested_at,
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return items.slice(0, 20);
  });

export { isWithinWithdrawalWindow };
