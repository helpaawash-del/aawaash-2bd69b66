import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Aawash Enterprise Synchronization Engine — server functions.
 * All privileged operations validate super_admin role via database RPCs
 * (`has_role` + SECURITY DEFINER functions).
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

export type SystemHealth = {
  users_total: number;
  users_active: number;
  projects_total: number;
  flats_total: number;
  flats_available: number;
  flats_reserved: number;
  flats_sold: number;
  customers_total: number;
  sales_pending: number;
  sales_approved_30d: number;
  withdrawals_pending: number;
  wallet_available_total: number;
  wallet_locked_total: number;
  notifications_unread: number;
  active_flat_locks: number;
  expired_flat_locks: number;
  last_job_run: {
    job_name: string;
    status: string;
    started_at: string;
    finished_at: string | null;
    duration_ms: number | null;
  } | null;
  generated_at: string;
};

export const getSystemHealth = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase.rpc("system_get_health");
    if (error) throw new Error(error.message);
    return data as SystemHealth;
  });

export const runIntegrityChecks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase.rpc("system_run_integrity_checks");
    if (error) throw new Error(error.message);
    return data as {
      generated_at: string;
      flat_count_issues: unknown[];
      wallet_balance_issues: unknown[];
      commission_math_issues: unknown[];
      summary: {
        flat_count_issues: number;
        wallet_balance_issues: number;
        commission_math_issues: number;
      };
    };
  });

export const runMaintenance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase.rpc("system_run_maintenance");
    if (error) throw new Error(error.message);
    return data as Record<string, unknown>;
  });

export const listJobRuns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("system_job_runs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getActivityFeed = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("audit_logs")
      .select("id, action, entity_type, entity_id, actor_id, created_at, metadata, new_value")
      .order("created_at", { ascending: false })
      .limit(75);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getSystemSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("system_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

const settingsSchema = z.object({
  company_name: z.string().trim().min(1).max(120),
  company_email: z.string().trim().email().max(160).optional().nullable(),
  company_phone: z.string().trim().max(40).optional().nullable(),
  company_address: z.string().trim().max(400).optional().nullable(),
  maintenance_mode: z.boolean(),
  maintenance_message: z.string().trim().max(500).optional().nullable(),
  notifications_enabled: z.boolean(),
});

export const updateSystemSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => settingsSchema.parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("system_settings")
      .update({ ...data, updated_by: context.userId })
      .eq("id", 1);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
