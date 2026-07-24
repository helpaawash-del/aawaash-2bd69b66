import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Enterprise Financial Management Console — admin-only aggregations.
 * All balance mutations go through SECURITY DEFINER RPCs. Reads only here.
 */

async function assertAdmin(ctx: {
  supabase: import("@supabase/supabase-js").SupabaseClient;
  userId: string;
}) {
  const { data } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "super_admin",
  });
  if (!data) throw new Error("Admin only");
}

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function startOfMonth(d = new Date()) {
  const x = new Date(d.getFullYear(), d.getMonth(), 1);
  x.setHours(0, 0, 0, 0);
  return x;
}
function startOfYear(d = new Date()) {
  const x = new Date(d.getFullYear(), 0, 1);
  x.setHours(0, 0, 0, 0);
  return x;
}

/* ---------------------- Financial Dashboard ---------------------- */

export const getFinancialDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const sb = context.supabase;
    const now = new Date();
    const dayISO = startOfDay(now).toISOString();
    const monthISO = startOfMonth(now).toISOString();
    const yearISO = startOfYear(now).toISOString();

    const [
      salesAll,
      txnsAll,
      wdAll,
      wallets,
      ledger30d,
    ] = await Promise.all([
      sb.from("sales").select("id, deal_value, sale_status, created_at").neq("sale_status", "cancelled"),
      sb.from("commission_transactions").select("id, sale_amount, net_leader, member_amount, tip_amount, bonus_amount, status, approval_status, wallet_status, created_at"),
      sb.from("withdrawals").select("id, amount, status, requested_at, completed_at"),
      sb.from("profiles").select("wallet_balance, pending_balance, locked_balance, total_earnings, lifetime_withdrawals"),
      sb
        .from("commission_ledger")
        .select("credit, debit, created_at")
        .gte("created_at", new Date(now.getTime() - 30 * 86400000).toISOString())
        .order("created_at", { ascending: true }),
    ]);

    const sales = salesAll.data ?? [];
    const txns = txnsAll.data ?? [];
    const wds = wdAll.data ?? [];
    const w = wallets.data ?? [];

    const revenue = {
      total: sales.reduce((s, r) => s + Number(r.deal_value || 0), 0),
      today: sales.filter((r) => r.created_at >= dayISO).reduce((s, r) => s + Number(r.deal_value || 0), 0),
      month: sales.filter((r) => r.created_at >= monthISO).reduce((s, r) => s + Number(r.deal_value || 0), 0),
      year: sales.filter((r) => r.created_at >= yearISO).reduce((s, r) => s + Number(r.deal_value || 0), 0),
      count: sales.length,
      avg: sales.length ? sales.reduce((s, r) => s + Number(r.deal_value || 0), 0) / sales.length : 0,
    };

    const commissionTotal = txns.reduce(
      (s, r) => s + Number(r.net_leader || 0) + Number(r.member_amount || 0) + Number(r.tip_amount || 0) + Number(r.bonus_amount || 0),
      0,
    );
    const commissionPending = txns
      .filter((r) => r.approval_status !== "approved" && r.status !== "reversed")
      .reduce((s, r) => s + Number(r.net_leader || 0) + Number(r.member_amount || 0), 0);
    const commissionApproved = txns
      .filter((r) => r.approval_status === "approved" && r.wallet_status !== "credited")
      .reduce((s, r) => s + Number(r.net_leader || 0) + Number(r.member_amount || 0), 0);
    const commissionPaid = txns
      .filter((r) => r.wallet_status === "credited")
      .reduce((s, r) => s + Number(r.net_leader || 0) + Number(r.member_amount || 0), 0);
    const bonusPaid = txns.reduce((s, r) => s + Number(r.bonus_amount || 0), 0);

    const wallet = {
      balance: w.reduce((s, r) => s + Number(r.wallet_balance || 0), 0),
      pending: w.reduce((s, r) => s + Number(r.pending_balance || 0), 0),
      locked: w.reduce((s, r) => s + Number(r.locked_balance || 0), 0),
      lifetime: w.reduce((s, r) => s + Number(r.total_earnings || 0), 0),
      lifetimeWithdrawn: w.reduce((s, r) => s + Number(r.lifetime_withdrawals || 0), 0),
    };

    const wd = {
      pending: wds.filter((r) => ["pending", "approved", "processing"].includes(r.status ?? "")).reduce((s, r) => s + Number(r.amount || 0), 0),
      pendingCount: wds.filter((r) => ["pending", "approved", "processing"].includes(r.status ?? "")).length,
      completed: wds.filter((r) => r.status === "completed").reduce((s, r) => s + Number(r.amount || 0), 0),
      completedCount: wds.filter((r) => r.status === "completed").length,
      rejected: wds.filter((r) => r.status === "rejected").reduce((s, r) => s + Number(r.amount || 0), 0),
      rejectedCount: wds.filter((r) => r.status === "rejected").length,
    };

    // 30-day ledger flow buckets
    const flowMap = new Map<string, { day: string; credit: number; debit: number }>();
    (ledger30d.data ?? []).forEach((r) => {
      const day = new Date(r.created_at as string).toISOString().slice(0, 10);
      const cur = flowMap.get(day) ?? { day, credit: 0, debit: 0 };
      cur.credit += Number(r.credit || 0);
      cur.debit += Number(r.debit || 0);
      flowMap.set(day, cur);
    });
    const flow = Array.from(flowMap.values()).sort((a, b) => a.day.localeCompare(b.day));

    return {
      revenue,
      commission: {
        total: commissionTotal,
        pending: commissionPending,
        approved: commissionApproved,
        paid: commissionPaid,
        bonus: bonusPaid,
      },
      wallet,
      withdrawals: wd,
      net: commissionPaid + bonusPaid,
      flow,
    };
  });

/* ---------------------- Wallets Registry ---------------------- */

export const listAllWallets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        q: z.string().trim().max(120).optional(),
        role: z.enum(["all", "super_admin", "team_leader", "member"]).default("all"),
        limit: z.number().int().min(1).max(500).default(200),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context);

    let q = context.supabase
      .from("profiles")
      .select(
        "id, full_name, login_id, display_code, mobile_number, wallet_balance, pending_balance, locked_balance, total_earnings, lifetime_withdrawals, last_settlement_at, team_id",
      )
      .order("wallet_balance", { ascending: false })
      .limit(data.limit);
    if (data.q) q = q.or(`full_name.ilike.%${data.q}%,login_id.ilike.%${data.q}%,mobile_number.ilike.%${data.q}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    // filter by role via user_roles
    let filtered = rows ?? [];
    if (data.role !== "all") {
      const { data: roleRows } = await context.supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", filtered.map((r) => r.id));
      const roleSet = new Set((roleRows ?? []).filter((r) => r.role === data.role).map((r) => r.user_id));
      filtered = filtered.filter((r) => roleSet.has(r.id));
    }
    return filtered;
  });

export const getWalletLedger = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ user_id: z.string().uuid(), limit: z.number().int().min(1).max(500).default(100) }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const [{ data: profile }, { data: ledger }, { data: recent }] = await Promise.all([
      context.supabase
        .from("profiles")
        .select("id, full_name, login_id, display_code, mobile_number, wallet_balance, pending_balance, locked_balance, total_earnings, lifetime_withdrawals")
        .eq("id", data.user_id)
        .maybeSingle(),
      context.supabase
        .from("commission_ledger")
        .select("*")
        .eq("user_id", data.user_id)
        .order("created_at", { ascending: false })
        .limit(data.limit),
      context.supabase
        .from("withdrawals")
        .select("id, amount, status, requested_at, completed_at, ref_number")
        .eq("user_id", data.user_id)
        .order("requested_at", { ascending: false })
        .limit(20),
    ]);
    if (!profile) throw new Error("Wallet not found");
    return { profile, ledger: ledger ?? [], withdrawals: recent ?? [] };
  });

/* ---------------------- Admin Adjustments ---------------------- */

const adjustSchema = z.object({
  user_id: z.string().uuid(),
  amount: z.number().positive().max(1_00_00_00_000),
  direction: z.enum(["credit", "debit"]),
  kind: z.enum(["bonus", "correction", "refund", "penalty", "compensation", "adjustment"]),
  reason: z.string().trim().min(3).max(500),
});

export const adjustWallet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => adjustSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { data: id, error } = await context.supabase.rpc("wallet_admin_adjust", {
      p_user_id: data.user_id,
      p_amount: data.amount,
      p_direction: data.direction,
      p_kind: data.kind,
      p_reason: data.reason,
    });
    if (error) throw new Error(error.message);
    return { id: id as string };
  });

/* ---------------------- Revenue Breakdown ---------------------- */

export const getRevenueBreakdown = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const sb = context.supabase;
    const [{ data: sales }, { data: projects }, { data: profiles }, { data: teams }] = await Promise.all([
      sb.from("sales").select("id, deal_value, project_id, seller_id, leader_id, team_id, created_at, sale_status").neq("sale_status", "cancelled"),
      sb.from("projects").select("id, name"),
      sb.from("profiles").select("id, full_name, login_id"),
      sb.from("teams").select("id, name"),
    ]);
    const pMap = new Map((projects ?? []).map((p) => [p.id, p.name]));
    const uMap = new Map((profiles ?? []).map((p) => [p.id, p]));
    const tMap = new Map((teams ?? []).map((t) => [t.id, t.name]));

    type SaleRow = NonNullable<typeof sales>[number];
    const groupBy = <K,>(getKey: (r: SaleRow) => K, label: (k: K) => string) => {
      const map = new Map<string, { label: string; total: number; count: number }>();
      (sales ?? []).forEach((r) => {
        const key = String(getKey(r) ?? "—");
        const cur = map.get(key) ?? { label: label(getKey(r)), total: 0, count: 0 };
        cur.total += Number(r.deal_value || 0);
        cur.count += 1;
        map.set(key, cur);
      });
      return Array.from(map.values()).sort((a, b) => b.total - a.total);
    };

    const byProject = groupBy((r) => r.project_id, (k) => pMap.get(k as string) ?? "Unassigned");
    const byTeam = groupBy((r) => r.team_id, (k) => tMap.get(k as string) ?? "No team");
    const byLeader = groupBy((r) => r.leader_id, (k) => (uMap.get(k as string)?.full_name ?? "—"));
    const byMember = groupBy((r) => r.seller_id, (k) => (uMap.get(k as string)?.full_name ?? "—"));

    const monthMap = new Map<string, number>();
    (sales ?? []).forEach((r) => {
      const key = String(r.created_at).slice(0, 7);
      monthMap.set(key, (monthMap.get(key) ?? 0) + Number(r.deal_value || 0));
    });
    const byMonth = Array.from(monthMap.entries())
      .map(([month, total]) => ({ month, total }))
      .sort((a, b) => a.month.localeCompare(b.month));

    const values = (sales ?? []).map((r) => Number(r.deal_value || 0));
    const highest = values.length ? Math.max(...values) : 0;
    const lowest = values.length ? Math.min(...values) : 0;
    const average = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;

    return { byProject, byTeam, byLeader, byMember, byMonth, highest, lowest, average };
  });

/* ---------------------- Full Ledger (Admin) ---------------------- */

export const listAllLedger = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ q: z.string().trim().max(120).optional(), limit: z.number().int().min(1).max(500).default(200) }).parse(d ?? {}),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    let q = context.supabase
      .from("commission_ledger")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.q) q = q.or(`ref_number.ilike.%${data.q}%,source.ilike.%${data.q}%,remarks.ilike.%${data.q}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const userIds = Array.from(new Set((rows ?? []).map((r) => r.user_id).filter(Boolean))) as string[];
    const { data: profs } = userIds.length
      ? await context.supabase.from("profiles").select("id, full_name, login_id").in("id", userIds)
      : { data: [] as { id: string; full_name: string; login_id: string }[] };
    const uMap = new Map((profs ?? []).map((p) => [p.id, p]));
    return (rows ?? []).map((r) => ({ ...r, user: r.user_id ? uMap.get(r.user_id) ?? null : null }));
  });

/* ---------------------- Bonus History ---------------------- */

export const listBonusHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data: rows } = await context.supabase
      .from("commission_transactions")
      .select("id, txn_number, sale_id, project_id, leader_id, member_id, bonus_amount, status, approval_status, created_at")
      .gt("bonus_amount", 0)
      .order("created_at", { ascending: false })
      .limit(200);
    const list = rows ?? [];
    const userIds = Array.from(new Set(list.flatMap((r) => [r.leader_id, r.member_id]).filter(Boolean))) as string[];
    const projectIds = Array.from(new Set(list.map((r) => r.project_id).filter(Boolean))) as string[];
    const [{ data: profs }, { data: projects }] = await Promise.all([
      userIds.length ? context.supabase.from("profiles").select("id, full_name, login_id").in("id", userIds) : Promise.resolve({ data: [] }),
      projectIds.length ? context.supabase.from("projects").select("id, name").in("id", projectIds) : Promise.resolve({ data: [] }),
    ]);
    const uMap = new Map((profs ?? []).map((p: { id: string; full_name: string; login_id: string }) => [p.id, p]));
    const pMap = new Map((projects ?? []).map((p: { id: string; name: string }) => [p.id, p.name]));
    return list.map((r) => ({
      ...r,
      leader: r.leader_id ? uMap.get(r.leader_id) ?? null : null,
      member: r.member_id ? uMap.get(r.member_id) ?? null : null,
      project: r.project_id ? pMap.get(r.project_id) ?? null : null,
    }));
  });

/* ---------------------- Wallet Reconciliation ---------------------- */

/**
 * Compares each user's stored wallet balances against the ledger-derived
 * expected balance so admins can spot drift caused by manual DB edits,
 * failed transactions, or missed adjustments.
 *
 * Rule of thumb:
 *   expected = SUM(credit) - SUM(debit) over commission_ledger for that user.
 *   stored   = wallet_balance + pending_balance + locked_balance
 *              + lifetime_withdrawals (money that already left the wallet).
 * A non-zero delta means the wallet totals no longer match the ledger.
 */
export const reconcileWallets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        onlyDiscrepancies: z.boolean().default(false),
        limit: z.number().int().min(1).max(1000).default(500),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context);

    const [{ data: profiles, error: pe }, { data: ledger, error: le }] = await Promise.all([
      context.supabase
        .from("profiles")
        .select(
          "id, full_name, login_id, display_code, wallet_balance, pending_balance, locked_balance, total_earnings, lifetime_withdrawals",
        )
        .limit(data.limit),
      context.supabase
        .from("commission_ledger")
        .select("user_id, credit, debit")
        .limit(50_000),
    ]);
    if (pe) throw new Error(pe.message);
    if (le) throw new Error(le.message);

    const sums = new Map<string, { credit: number; debit: number }>();
    for (const row of ledger ?? []) {
      if (!row.user_id) continue;
      const cur = sums.get(row.user_id) ?? { credit: 0, debit: 0 };
      cur.credit += Number(row.credit ?? 0);
      cur.debit += Number(row.debit ?? 0);
      sums.set(row.user_id, cur);
    }

    const rows = (profiles ?? []).map((p) => {
      const s = sums.get(p.id) ?? { credit: 0, debit: 0 };
      const expected = s.credit - s.debit;
      const stored =
        Number(p.wallet_balance ?? 0) +
        Number(p.pending_balance ?? 0) +
        Number(p.locked_balance ?? 0) +
        Number(p.lifetime_withdrawals ?? 0);
      const delta = Number((stored - expected).toFixed(2));
      return {
        user_id: p.id,
        full_name: p.full_name,
        login_id: p.login_id,
        display_code: p.display_code,
        wallet_balance: Number(p.wallet_balance ?? 0),
        pending_balance: Number(p.pending_balance ?? 0),
        locked_balance: Number(p.locked_balance ?? 0),
        lifetime_withdrawals: Number(p.lifetime_withdrawals ?? 0),
        ledger_credit: s.credit,
        ledger_debit: s.debit,
        ledger_net: expected,
        expected_total: expected,
        stored_total: stored,
        delta,
        status:
          Math.abs(delta) < 0.01
            ? ("matched" as const)
            : delta > 0
              ? ("stored_high" as const)
              : ("stored_low" as const),
      };
    });

    const filtered = data.onlyDiscrepancies
      ? rows.filter((r) => r.status !== "matched")
      : rows;

    filtered.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

    const totals = rows.reduce(
      (acc, r) => {
        acc.stored += r.stored_total;
        acc.expected += r.expected_total;
        if (r.status !== "matched") acc.discrepancies += 1;
        return acc;
      },
      { stored: 0, expected: 0, discrepancies: 0 },
    );

    return {
      rows: filtered,
      totals: {
        wallets_checked: rows.length,
        discrepancies: totals.discrepancies,
        stored_total: Number(totals.stored.toFixed(2)),
        expected_total: Number(totals.expected.toFixed(2)),
        delta_total: Number((totals.stored - totals.expected).toFixed(2)),
      },
    };
  });

