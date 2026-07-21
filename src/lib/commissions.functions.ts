import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Commission Engine — the single financial authority.
 * All wallet credits/debits, ledger entries, and bonuses go through the
 * SECURITY DEFINER RPCs defined in the database. These server functions
 * expose read + admin control surfaces only.
 */

async function getRole(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  userId: string,
) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  return (data?.role ?? "member") as "super_admin" | "team_leader" | "member";
}

/* ---------------- Slabs (Admin) ---------------- */

export const listCommissionSlabs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: slabs, error }, { data: settings }] = await Promise.all([
      context.supabase.from("commission_slabs").select("*").order("sort_order", { ascending: true }),
      context.supabase.from("commission_settings").select("*").eq("id", 1).maybeSingle(),
    ]);
    if (error) throw new Error(error.message);
    const role = await getRole(context.supabase, context.userId);
    return { slabs: slabs ?? [], settings, role };
  });

const slabSchema = z.object({
  id: z.string().uuid().optional(),
  label: z.string().trim().min(1).max(80),
  min_amount: z.number().nonnegative(),
  max_amount: z.number().positive().nullable().optional(),
  percent: z.number().min(0).max(100),
  bonus_enabled: z.boolean().default(false),
  active: z.boolean().default(true),
  sort_order: z.number().int().default(0),
});

export const upsertCommissionSlab = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => slabSchema.parse(d))
  .handler(async ({ data, context }) => {
    const role = await getRole(context.supabase, context.userId);
    if (role !== "super_admin") throw new Error("Admin only");
    const payload = {
      label: data.label,
      min_amount: data.min_amount,
      max_amount: data.max_amount ?? null,
      percent: data.percent,
      bonus_enabled: data.bonus_enabled,
      active: data.active,
      sort_order: data.sort_order,
    };
    if (data.id) {
      const { error } = await context.supabase.from("commission_slabs").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true as const, id: data.id };
    }
    const { data: row, error } = await context.supabase
      .from("commission_slabs")
      .insert({ ...payload, created_by: context.userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true as const, id: row.id as string };
  });

export const deleteCommissionSlab = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const role = await getRole(context.supabase, context.userId);
    if (role !== "super_admin") throw new Error("Admin only");
    const { error } = await context.supabase.from("commission_slabs").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

const settingsSchema = z.object({
  member_share_pct: z.number().min(0).max(100),
  tip_share_pct: z.number().min(0).max(100),
  bonus_threshold: z.number().nonnegative(),
});

export const updateCommissionSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => settingsSchema.parse(d))
  .handler(async ({ data, context }) => {
    const role = await getRole(context.supabase, context.userId);
    if (role !== "super_admin") throw new Error("Admin only");
    const { error } = await context.supabase
      .from("commission_settings")
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq("id", 1);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/* ---------------- Transactions & Ledger (Read) ---------------- */

const listSchema = z.object({
  scope: z.enum(["mine", "team", "all"]).default("mine"),
  status: z.string().optional(),
  q: z.string().trim().max(120).optional(),
  limit: z.number().int().min(1).max(200).default(50),
});

export const listCommissionTransactions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => listSchema.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const role = await getRole(context.supabase, context.userId);
    let q = context.supabase
      .from("commission_transactions")
      .select(
        `id, txn_number, sale_id, project_id, leader_id, member_id, team_id,
         sale_amount, slab_pct, leader_gross, member_amount, tip_amount, bonus_amount, net_leader,
         status, wallet_status, approval_status, created_at`,
      )
      .order("created_at", { ascending: false })
      .limit(data.limit);

    if (data.scope === "mine") {
      q = q.or(`leader_id.eq.${context.userId},member_id.eq.${context.userId}`);
    } else if (data.scope === "team") {
      const { data: prof } = await context.supabase
        .from("profiles")
        .select("team_id")
        .eq("id", context.userId)
        .maybeSingle();
      if (prof?.team_id) q = q.eq("team_id", prof.team_id);
    } else if (data.scope === "all" && role !== "super_admin") {
      throw new Error("Admin only");
    }
    if (data.status) q = q.eq("status", data.status);
    if (data.q) q = q.ilike("txn_number", `%${data.q}%`);

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const projectIds = Array.from(new Set((rows ?? []).map((r) => r.project_id).filter(Boolean))) as string[];
    const userIds = Array.from(
      new Set((rows ?? []).flatMap((r) => [r.leader_id, r.member_id]).filter(Boolean)),
    ) as string[];
    const [{ data: projects }, { data: profs }] = await Promise.all([
      projectIds.length
        ? context.supabase.from("projects").select("id, name, slug").in("id", projectIds)
        : Promise.resolve({ data: [] as { id: string; name: string; slug: string }[] }),
      userIds.length
        ? context.supabase.from("profiles").select("id, full_name, login_id").in("id", userIds)
        : Promise.resolve({ data: [] as { id: string; full_name: string; login_id: string }[] }),
    ]);
    const pMap = new Map((projects ?? []).map((p) => [p.id, p]));
    const uMap = new Map((profs ?? []).map((p) => [p.id, p]));

    return {
      role,
      rows: (rows ?? []).map((r) => ({
        ...r,
        project: r.project_id ? pMap.get(r.project_id) ?? null : null,
        leader: r.leader_id ? uMap.get(r.leader_id) ?? null : null,
        member: r.member_id ? uMap.get(r.member_id) ?? null : null,
      })),
    };
  });

export const getCommissionTransaction = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const role = await getRole(context.supabase, context.userId);
    const { data: txn, error } = await context.supabase
      .from("commission_transactions")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!txn) throw new Error("Not found");

    const [{ data: recipients }, { data: ledger }, { data: audit }, { data: sale }, { data: project }, { data: leader }, { data: member }, { data: tip }] =
      await Promise.all([
        context.supabase.from("commissions").select("*").eq("transaction_id", data.id),
        context.supabase
          .from("commission_ledger")
          .select("*")
          .eq("transaction_id", data.id)
          .order("created_at", { ascending: false }),
        role === "super_admin"
          ? context.supabase
              .from("commission_audit_log")
              .select("*")
              .eq("transaction_id", data.id)
              .order("created_at", { ascending: false })
          : Promise.resolve({ data: [] }),
        txn.sale_id
          ? context.supabase
              .from("sales")
              .select("id, sale_number, buyer_name, deal_value, sale_status")
              .eq("id", txn.sale_id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        txn.project_id
          ? context.supabase.from("projects").select("id, name, slug").eq("id", txn.project_id).maybeSingle()
          : Promise.resolve({ data: null }),
        txn.leader_id
          ? context.supabase.from("profiles").select("id, full_name, login_id").eq("id", txn.leader_id).maybeSingle()
          : Promise.resolve({ data: null }),
        txn.member_id
          ? context.supabase.from("profiles").select("id, full_name, login_id").eq("id", txn.member_id).maybeSingle()
          : Promise.resolve({ data: null }),
        txn.tip_person_id
          ? context.supabase
              .from("tip_persons")
              .select("id, tip_name, tip_mobile")
              .eq("id", txn.tip_person_id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
    return { role, txn, recipients: recipients ?? [], ledger: ledger ?? [], audit: audit ?? [], sale, project, leader, member, tip };
  });

export const myCommissionLedger = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ limit: z.number().int().min(1).max(200).default(50) }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("commission_ledger")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (error) throw new Error(error.message);

    const { data: profile } = await context.supabase
      .from("profiles")
      .select("wallet_balance, total_earnings")
      .eq("id", context.userId)
      .maybeSingle();

    return { rows: rows ?? [], wallet: profile };
  });

export const commissionDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const role = await getRole(context.supabase, context.userId);
    const { data } = await context.supabase
      .from("commission_transactions")
      .select("sale_amount, leader_gross, member_amount, tip_amount, bonus_amount, net_leader, status, created_at, leader_id, member_id");
    const list = data ?? [];
    const mine = list.filter((r) => r.leader_id === context.userId || r.member_id === context.userId);
    const asLeader = list.filter((r) => r.leader_id === context.userId);
    const asMember = list.filter((r) => r.member_id === context.userId);
    const sum = (arr: typeof list, k: keyof (typeof list)[number]) =>
      arr.reduce((n, r) => n + Number((r as Record<string, unknown>)[k as string] || 0), 0);
    return {
      role,
      totals: {
        transactions: list.length,
        activeValue: sum(list.filter((r) => r.status !== "reversed"), "sale_amount"),
        payoutLeader: sum(asLeader.filter((r) => r.status !== "reversed"), "net_leader"),
        payoutMember: sum(asMember.filter((r) => r.status !== "reversed"), "member_amount"),
        mineCount: mine.length,
      },
    };
  });

/* ---------------- Admin actions ---------------- */

export const grantManualBonus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        transaction_id: z.string().uuid(),
        amount: z.number().positive(),
        reason: z.string().trim().min(3).max(300),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("grant_manual_bonus", {
      p_txn_id: data.transaction_id,
      p_amount: data.amount,
      p_reason: data.reason,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
