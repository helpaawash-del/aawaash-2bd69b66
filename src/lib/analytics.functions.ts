import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Aawash Analytics & Business Intelligence engine.
 * All queries respect RLS. Admin sees everything; Team Leader sees their
 * own team; Member sees only personal data. No values are calculated
 * outside of the source tables (sales / commissions / wallet / crm /
 * projects) — this module purely aggregates.
 */

const rangeSchema = z
  .object({
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
    projectId: z.string().uuid().optional().nullable(),
  })
  .default({});

type RangeInput = z.infer<typeof rangeSchema>;

function resolveRange(input: RangeInput) {
  const to = input.to ? new Date(input.to) : new Date();
  const from = input.from
    ? new Date(input.from)
    : new Date(to.getTime() - 29 * 86_400_000);
  const fromISO = new Date(from.setHours(0, 0, 0, 0)).toISOString();
  const toISO = new Date(to.setHours(23, 59, 59, 999)).toISOString();
  const prevFrom = new Date(new Date(fromISO).getTime() - (new Date(toISO).getTime() - new Date(fromISO).getTime()));
  return { fromISO, toISO, prevFromISO: prevFrom.toISOString() };
}

type Bucket = { date: string; count: number; value: number };

function bucketByDay(rows: Array<{ created_at?: string | null; approval_at?: string | null; deal_value?: number | null; amount?: number | null }>, valueKey: "deal_value" | "amount" = "deal_value", dateKey: "created_at" | "approval_at" = "created_at"): Bucket[] {
  const map = new Map<string, Bucket>();
  for (const r of rows) {
    const raw = (r as Record<string, unknown>)[dateKey] as string | null | undefined;
    if (!raw) continue;
    const d = new Date(raw);
    const key = d.toISOString().slice(0, 10);
    const b = map.get(key) ?? { date: key, count: 0, value: 0 };
    b.count += 1;
    b.value += Number((r as Record<string, unknown>)[valueKey] ?? 0);
    map.set(key, b);
  }
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}

async function assertRole(context: { supabase: import("@supabase/supabase-js").SupabaseClient; userId: string }, role: "super_admin" | "team_leader"): Promise<boolean> {
  const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: role });
  return !!data;
}

/* --------------------------- Admin Analytics --------------------------- */

export const getAdminAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => rangeSchema.parse(d ?? {}))
  .handler(async ({ context, data }) => {
    if (!(await assertRole(context, "super_admin"))) throw new Error("Admin only");
    const { fromISO, toISO, prevFromISO } = resolveRange(data);
    const s = context.supabase;

    const [
      salesRes,
      prevSalesRes,
      allSalesRes,
      projectsRes,
      customersRes,
      usersRes,
      commTxnRes,
      profilesRes,
      withdrawalsRes,
      flatsRes,
    ] = await Promise.all([
      s.from("sales").select("id, deal_value, sale_status, approval_status, created_at, approval_at, project_id, team_id, seller_id, leader_id, customer_id").gte("created_at", fromISO).lte("created_at", toISO),
      s.from("sales").select("id, deal_value, approval_status, created_at").gte("created_at", prevFromISO).lt("created_at", fromISO),
      s.from("sales").select("id, deal_value, approval_status").eq("approval_status", "approved"),
      s.from("projects").select("id, name, total_flats, available_flats, reserved_flats, sold_flats, status"),
      s.from("customers").select("id, status, created_at"),
      s.from("user_roles").select("user_id, role"),
      s.from("commission_transactions").select("id, sale_amount, leader_gross, member_amount, tip_amount, bonus_amount, net_leader, status, created_at, project_id, team_id"),
      s.from("profiles").select("id, wallet_balance, locked_balance, total_earnings, lifetime_withdrawals"),
      s.from("withdrawals").select("id, amount, status, requested_at, completed_at"),
      s.from("flats").select("id, status"),
    ]);

    const sales = salesRes.data ?? [];
    const prevSales = prevSalesRes.data ?? [];
    const allApproved = allSalesRes.data ?? [];
    const projects = projectsRes.data ?? [];
    const customers = customersRes.data ?? [];
    const users = usersRes.data ?? [];
    const txns = commTxnRes.data ?? [];
    const profiles = profilesRes.data ?? [];
    const withdrawals = withdrawalsRes.data ?? [];
    const flats = flatsRes.data ?? [];

    const approvedInRange = sales.filter((x) => x.approval_status === "approved");
    const totalRevenue = allApproved.reduce((a, b) => a + Number(b.deal_value || 0), 0);
    const rangeRevenue = approvedInRange.reduce((a, b) => a + Number(b.deal_value || 0), 0);
    const prevRevenue = prevSales.filter((x) => x.approval_status === "approved").reduce((a, b) => a + Number(b.deal_value || 0), 0);
    const revenueGrowth = prevRevenue > 0 ? ((rangeRevenue - prevRevenue) / prevRevenue) * 100 : 0;

    const totalFlats = flats.length;
    const availableFlats = flats.filter((f) => f.status === "available").length;
    const reservedFlats = flats.filter((f) => f.status === "reserved").length;
    const soldFlats = flats.filter((f) => f.status === "sold").length;

    const totalLeaders = users.filter((u) => u.role === "team_leader").length;
    const totalMembers = users.filter((u) => u.role === "member").length;

    const totalCommissionPaid = txns.filter((t) => t.status !== "reversed").reduce((a, b) => a + Number(b.net_leader || 0) + Number(b.member_amount || 0), 0);
    const pendingCommission = txns.filter((t) => t.status === "pending").reduce((a, b) => a + Number(b.net_leader || 0) + Number(b.member_amount || 0), 0);
    const totalWalletBalance = profiles.reduce((a, b) => a + Number(b.wallet_balance || 0) + Number(b.locked_balance || 0), 0);
    const totalWithdrawals = withdrawals.filter((w) => w.status === "completed").reduce((a, b) => a + Number(b.amount || 0), 0);
    const pendingWithdrawals = withdrawals.filter((w) => ["pending", "approved", "processing"].includes(w.status)).reduce((a, b) => a + Number(b.amount || 0), 0);

    const salesSeries = bucketByDay(sales as never, "deal_value", "created_at");

    // Sales by project
    const projMap = new Map(projects.map((p) => [p.id, p.name]));
    const salesByProject = new Map<string, { name: string; count: number; value: number }>();
    for (const sale of approvedInRange) {
      const key = sale.project_id ?? "unknown";
      const entry = salesByProject.get(key) ?? { name: projMap.get(key) ?? "—", count: 0, value: 0 };
      entry.count += 1;
      entry.value += Number(sale.deal_value || 0);
      salesByProject.set(key, entry);
    }

    const values = approvedInRange.map((x) => Number(x.deal_value || 0));
    const avgSaleValue = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    const highestSale = values.length ? Math.max(...values) : 0;
    const lowestSale = values.length ? Math.min(...values) : 0;
    const cancelled = sales.filter((x) => ["cancelled", "rejected", "expired"].includes(x.sale_status)).length;
    const approvalRate = sales.length ? (approvedInRange.length / sales.length) * 100 : 0;
    const cancellationRate = sales.length ? (cancelled / sales.length) * 100 : 0;

    // Customer funnel
    const newLeads = customers.filter((c) => new Date(c.created_at ?? 0).getTime() >= new Date(fromISO).getTime()).length;
    const qualified = customers.filter((c) => ["qualified", "interested", "hot"].includes(String(c.status))).length;
    const meetingStage = customers.filter((c) => String(c.status).includes("meeting")).length;
    const closed = customers.filter((c) => String(c.status) === "closed").length;
    const lost = customers.filter((c) => ["lost", "not_interested", "dormant"].includes(String(c.status))).length;

    return {
      range: { from: fromISO, to: toISO },
      kpi: {
        totalRevenue,
        rangeRevenue,
        revenueGrowth,
        totalSales: allApproved.length,
        rangeSales: approvedInRange.length,
        totalProjects: projects.length,
        totalFlats,
        availableFlats,
        reservedFlats,
        soldFlats,
        totalCustomers: customers.length,
        totalLeaders,
        totalMembers,
        totalCommissionPaid,
        pendingCommission,
        totalWalletBalance,
        totalWithdrawals,
        pendingWithdrawals,
        avgSaleValue,
        highestSale,
        lowestSale,
        approvalRate,
        cancellationRate,
      },
      salesSeries,
      salesByProject: Array.from(salesByProject.values()).sort((a, b) => b.value - a.value),
      projects,
      funnel: { newLeads, qualified, meetingStage, closed, lost },
    };
  });

/* --------------------------- Leader Analytics --------------------------- */

export const getLeaderAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => rangeSchema.parse(d ?? {}))
  .handler(async ({ context, data }) => {
    const { fromISO, toISO } = resolveRange(data);
    const s = context.supabase;
    const uid = context.userId;

    // find team where I'm leader
    const { data: team } = await s.from("teams").select("id, name, letter").eq("leader_id", uid).maybeSingle();
    const teamId = team?.id ?? null;

    const [salesRes, membersRes, txnRes, customersRes] = await Promise.all([
      s.from("sales").select("id, deal_value, sale_status, approval_status, created_at, project_id, seller_id, customer_id").eq("team_id", teamId ?? "00000000-0000-0000-0000-000000000000").gte("created_at", fromISO).lte("created_at", toISO),
      s.from("profiles").select("id, full_name, display_code, wallet_balance, total_earnings, total_sales").eq("team_id", teamId ?? "00000000-0000-0000-0000-000000000000"),
      s.from("commission_transactions").select("id, net_leader, member_amount, tip_amount, sale_amount, status, member_id, created_at").eq("team_id", teamId ?? "00000000-0000-0000-0000-000000000000").gte("created_at", fromISO).lte("created_at", toISO),
      s.from("customers").select("id, status, assigned_member_id, created_at").eq("team_id", teamId ?? "00000000-0000-0000-0000-000000000000"),
    ]);

    const sales = salesRes.data ?? [];
    const members = membersRes.data ?? [];
    const txns = txnRes.data ?? [];
    const customers = customersRes.data ?? [];

    const approved = sales.filter((x) => x.approval_status === "approved");
    const revenue = approved.reduce((a, b) => a + Number(b.deal_value || 0), 0);
    const leaderCommission = txns.reduce((a, b) => a + Number(b.net_leader || 0), 0);
    const memberCommission = txns.reduce((a, b) => a + Number(b.member_amount || 0), 0);

    // per-member ranking
    const perMember = new Map<string, { id: string; name: string; sales: number; revenue: number; commission: number }>();
    for (const m of members) perMember.set(m.id, { id: m.id, name: m.full_name, sales: 0, revenue: 0, commission: 0 });
    for (const s2 of approved) {
      if (!s2.seller_id) continue;
      const e = perMember.get(s2.seller_id);
      if (!e) continue;
      e.sales += 1;
      e.revenue += Number(s2.deal_value || 0);
    }
    for (const t of txns) {
      if (!t.member_id) continue;
      const e = perMember.get(t.member_id);
      if (!e) continue;
      e.commission += Number(t.member_amount || 0);
    }

    return {
      team,
      range: { from: fromISO, to: toISO },
      kpi: {
        totalMembers: members.length,
        salesCount: approved.length,
        revenue,
        leaderCommission,
        memberCommission,
        customers: customers.length,
        avgSaleValue: approved.length ? revenue / approved.length : 0,
        approvalRate: sales.length ? (approved.length / sales.length) * 100 : 0,
      },
      salesSeries: bucketByDay(sales as never, "deal_value", "created_at"),
      leaderboard: Array.from(perMember.values()).sort((a, b) => b.revenue - a.revenue),
      funnel: {
        newLeads: customers.filter((c) => new Date(c.created_at ?? 0).getTime() >= new Date(fromISO).getTime()).length,
        qualified: customers.filter((c) => ["qualified", "interested", "hot"].includes(String(c.status))).length,
        closed: customers.filter((c) => String(c.status) === "closed").length,
        lost: customers.filter((c) => ["lost", "not_interested", "dormant"].includes(String(c.status))).length,
      },
    };
  });

/* --------------------------- Member Analytics --------------------------- */

export const getMemberAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => rangeSchema.parse(d ?? {}))
  .handler(async ({ context, data }) => {
    const { fromISO, toISO, prevFromISO } = resolveRange(data);
    const s = context.supabase;
    const uid = context.userId;

    const [salesRes, prevSalesRes, txnRes, custRes, profileRes, meetingsRes, wdRes] = await Promise.all([
      s.from("sales").select("id, deal_value, sale_status, approval_status, created_at, project_id").eq("seller_id", uid).gte("created_at", fromISO).lte("created_at", toISO),
      s.from("sales").select("id, deal_value, approval_status").eq("seller_id", uid).gte("created_at", prevFromISO).lt("created_at", fromISO),
      s.from("commissions").select("id, amount, status, recipient_kind, created_at").eq("user_id", uid).gte("created_at", fromISO).lte("created_at", toISO),
      s.from("customers").select("id, status, created_at").eq("assigned_member_id", uid),
      s.from("profiles").select("wallet_balance, locked_balance, total_earnings, lifetime_withdrawals, total_sales, referral_count").eq("id", uid).maybeSingle(),
      s.from("customer_meetings").select("id, status, scheduled_at").gte("scheduled_at", fromISO).lte("scheduled_at", toISO),
      s.from("withdrawals").select("id, amount, status, requested_at").eq("user_id", uid),
    ]);

    const sales = salesRes.data ?? [];
    const prevSales = prevSalesRes.data ?? [];
    const txns = txnRes.data ?? [];
    const customers = custRes.data ?? [];
    const profile = profileRes.data;
    const meetings = meetingsRes.data ?? [];
    const withdrawals = wdRes.data ?? [];

    const approved = sales.filter((x) => x.approval_status === "approved");
    const revenue = approved.reduce((a, b) => a + Number(b.deal_value || 0), 0);
    const prevRevenue = prevSales.filter((x) => x.approval_status === "approved").reduce((a, b) => a + Number(b.deal_value || 0), 0);
    const revenueGrowth = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : 0;
    const commissionEarned = txns.filter((t) => t.status === "credited").reduce((a, b) => a + Number(b.amount || 0), 0);
    const commissionPending = txns.filter((t) => t.status === "pending").reduce((a, b) => a + Number(b.amount || 0), 0);

    return {
      range: { from: fromISO, to: toISO },
      kpi: {
        salesCount: approved.length,
        revenue,
        revenueGrowth,
        commissionEarned,
        commissionPending,
        customers: customers.length,
        newLeads: customers.filter((c) => new Date(c.created_at ?? 0).getTime() >= new Date(fromISO).getTime()).length,
        closed: customers.filter((c) => String(c.status) === "closed").length,
        avgDealSize: approved.length ? revenue / approved.length : 0,
        meetingsScheduled: meetings.length,
        meetingsCompleted: meetings.filter((m) => String(m.status) === "completed").length,
        walletBalance: Number(profile?.wallet_balance ?? 0),
        lifetimeEarnings: Number(profile?.total_earnings ?? 0),
        lifetimeWithdrawn: Number(profile?.lifetime_withdrawals ?? 0),
        pendingWithdrawals: withdrawals.filter((w) => ["pending", "approved", "processing"].includes(w.status)).reduce((a, b) => a + Number(b.amount || 0), 0),
      },
      salesSeries: bucketByDay(sales as never, "deal_value", "created_at"),
      commissionSeries: bucketByDay(txns as never, "amount", "created_at"),
    };
  });

/* ----------------------------- Leaderboards ---------------------------- */

export const getLeaderboards = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => rangeSchema.parse(d ?? {}))
  .handler(async ({ context, data }) => {
    const { fromISO, toISO } = resolveRange(data);
    const s = context.supabase;

    const [salesRes, profilesRes, projectsRes, teamsRes] = await Promise.all([
      s.from("sales").select("id, deal_value, approval_status, seller_id, leader_id, team_id, project_id, created_at").eq("approval_status", "approved").gte("created_at", fromISO).lte("created_at", toISO),
      s.from("profiles").select("id, full_name, display_code, team_id"),
      s.from("projects").select("id, name, total_flats, sold_flats, available_flats"),
      s.from("teams").select("id, name, letter, leader_id"),
    ]);

    const sales = salesRes.data ?? [];
    const profiles = profilesRes.data ?? [];
    const projects = projectsRes.data ?? [];
    const teams = teamsRes.data ?? [];

    const profileMap = new Map(profiles.map((p) => [p.id, p]));

    // Member leaderboard
    const memberBoard = new Map<string, { id: string; name: string; team: string | null; sales: number; revenue: number }>();
    for (const sale of sales) {
      if (!sale.seller_id) continue;
      const p = profileMap.get(sale.seller_id);
      const key = sale.seller_id;
      const entry = memberBoard.get(key) ?? { id: key, name: p?.full_name ?? "—", team: null, sales: 0, revenue: 0 };
      entry.sales += 1;
      entry.revenue += Number(sale.deal_value || 0);
      memberBoard.set(key, entry);
    }

    // Leader leaderboard
    const leaderBoard = new Map<string, { id: string; name: string; team: string | null; sales: number; revenue: number }>();
    for (const sale of sales) {
      if (!sale.leader_id) continue;
      const p = profileMap.get(sale.leader_id);
      const t = teams.find((tt) => tt.id === sale.team_id);
      const entry = leaderBoard.get(sale.leader_id) ?? { id: sale.leader_id, name: p?.full_name ?? "—", team: t?.name ?? null, sales: 0, revenue: 0 };
      entry.sales += 1;
      entry.revenue += Number(sale.deal_value || 0);
      leaderBoard.set(sale.leader_id, entry);
    }

    // Project leaderboard
    const projectBoard = new Map<string, { id: string; name: string; sales: number; revenue: number; occupancy: number }>();
    for (const p of projects) {
      const occ = p.total_flats ? (Number(p.sold_flats || 0) / Number(p.total_flats)) * 100 : 0;
      projectBoard.set(p.id, { id: p.id, name: p.name, sales: 0, revenue: 0, occupancy: occ });
    }
    for (const sale of sales) {
      if (!sale.project_id) continue;
      const entry = projectBoard.get(sale.project_id);
      if (!entry) continue;
      entry.sales += 1;
      entry.revenue += Number(sale.deal_value || 0);
    }

    return {
      range: { from: fromISO, to: toISO },
      members: Array.from(memberBoard.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 50),
      leaders: Array.from(leaderBoard.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 50),
      projects: Array.from(projectBoard.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 50),
    };
  });
