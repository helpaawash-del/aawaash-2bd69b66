import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Aawash Wallet & Withdrawal engine.
 * All balance mutations are executed by SECURITY DEFINER SQL functions,
 * ensuring atomic, auditable, ledger-backed operations.
 */

export function isWithinWithdrawalWindow(d: Date = new Date()): boolean {
  const day = d.getDate();
  return day >= 25 && day <= 30;
}

export function nextWindowLabel(d: Date = new Date()): string {
  if (isWithinWithdrawalWindow(d)) return "Window open — closes on the 30th";
  const day = d.getDate();
  if (day < 25) return `Opens on the 25th (${25 - day} day(s) left)`;
  // after 30 → next month
  const next = new Date(d.getFullYear(), d.getMonth() + 1, 25);
  const diff = Math.max(0, Math.ceil((next.getTime() - d.getTime()) / 86_400_000));
  return `Opens on the 25th (${diff} day(s) left)`;
}

/* ------------------------------ Overview ------------------------------ */

export const getWalletOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const [profileRes, ledgerRes, wdRes, monthCommRes, todayCommRes] = await Promise.all([
      supabase
        .from("profiles")
        .select(
          "id, full_name, display_code, wallet_balance, pending_balance, locked_balance, total_earnings, lifetime_withdrawals, last_settlement_at",
        )
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("commission_ledger")
        .select("id, ref_number, source, credit, debit, running_balance, remarks, created_at, sale_id, transaction_id, withdrawal_id")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(150),
      supabase
        .from("withdrawals")
        .select("*")
        .eq("user_id", userId)
        .order("requested_at", { ascending: false })
        .limit(1),
      (async () => {
        const start = new Date();
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        return supabase
          .from("commissions")
          .select("amount, status")
          .eq("user_id", userId)
          .gte("created_at", start.toISOString());
      })(),
      (async () => {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        return supabase
          .from("commissions")
          .select("amount, status")
          .eq("user_id", userId)
          .gte("created_at", start.toISOString());
      })(),
    ]);

    const monthlyEarnings = (monthCommRes.data ?? []).reduce((s, c) => s + Number(c.amount || 0), 0);
    const todayEarnings = (todayCommRes.data ?? []).reduce((s, c) => s + Number(c.amount || 0), 0);
    const profile = profileRes.data;

    return {
      profile,
      ledger: ledgerRes.data ?? [],
      lastWithdrawal: wdRes.data?.[0] ?? null,
      monthlyEarnings,
      todayEarnings,
      withinWindow: isWithinWithdrawalWindow(),
      windowLabel: nextWindowLabel(),
    };
  });

/* --------------------------- User withdrawal --------------------------- */

const withdrawalRequestSchema = z.object({
  amount: z.number().positive().max(1_00_00_00_000),
  bank_holder: z.string().trim().min(2).max(120),
  bank_account_number: z
    .string()
    .trim()
    .regex(/^[0-9]{6,20}$/, "Enter a valid account number"),
  bank_ifsc: z
    .string()
    .trim()
    .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/i, "Enter a valid IFSC"),
  bank_name: z.string().trim().min(2).max(120),
  bank_branch: z.string().trim().max(120).optional().nullable(),
  upi_id: z.string().trim().max(120).optional().nullable(),
  remarks: z.string().trim().max(500).optional().nullable(),
});

export const requestWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => withdrawalRequestSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { data: id, error } = await context.supabase.rpc("wallet_request_withdrawal", {
      p_amount: data.amount,
      p_bank_holder: data.bank_holder,
      p_bank_account_number: data.bank_account_number,
      p_bank_ifsc: data.bank_ifsc.toUpperCase(),
      p_bank_name: data.bank_name,
      p_bank_branch: data.bank_branch ?? undefined,
      p_upi_id: data.upi_id ?? undefined,
      p_remarks: data.remarks ?? undefined,
    });
    if (error) throw new Error(error.message);
    return { id: id as string };
  });

export const cancelMyWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), reason: z.string().trim().max(500).optional() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.rpc("wallet_cancel_withdrawal", {
      p_id: data.id,
      p_reason: data.reason ?? "Cancelled by user",
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

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

/* ----------------------------- Admin ops ------------------------------ */

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

export const listAllWithdrawals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        status: z
          .enum([
            "all",
            "pending",
            "approved",
            "processing",
            "completed",
            "rejected",
            "cancelled",
            "expired",
            "returned",
          ])
          .default("all"),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    let q = context.supabase
      .from("withdrawals")
      .select("*, user:profiles!withdrawals_user_id_fkey(id, full_name, display_code, mobile_number, login_id, team_id)")
      .order("requested_at", { ascending: false })
      .limit(200);
    if (data.status !== "all") q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

const idAndNotesSchema = z.object({
  id: z.string().uuid(),
  notes: z.string().trim().max(500).optional().nullable(),
});

export const approveWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idAndNotesSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.rpc("wallet_approve_withdrawal", {
      p_id: data.id,
      p_notes: data.notes ?? undefined,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const markWithdrawalProcessing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idAndNotesSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.rpc("wallet_mark_processing", {
      p_id: data.id,
      p_notes: data.notes ?? undefined,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const completeWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idAndNotesSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.rpc("wallet_complete_withdrawal", {
      p_id: data.id,
      p_notes: data.notes ?? undefined,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const rejectWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), reason: z.string().trim().min(2).max(500) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.rpc("wallet_reject_withdrawal", {
      p_id: data.id,
      p_reason: data.reason,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const cancelWithdrawalAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), reason: z.string().trim().min(2).max(500) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.rpc("wallet_cancel_withdrawal", {
      p_id: data.id,
      p_reason: data.reason,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
