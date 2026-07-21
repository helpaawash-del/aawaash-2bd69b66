import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(ctx: {
  supabase: import("@supabase/supabase-js").SupabaseClient;
  userId: string;
}) {
  const { data } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "super_admin",
  });
  if (!data) throw new Error("Forbidden: Super Admin only");
}

export type AdminKpi = {
  projects_total: number;
  flats_total: number;
  flats_available: number;
  flats_reserved: number;
  flats_sold: number;
  customers_total: number;
  team_leaders: number;
  members: number;
  sales_today: number;
  sales_month: number;
  withdrawals_pending: number;
  commissions_pending: number;
  wallet_available_total: number;
  revenue_total: number;
  notifications_unread: number;
  activity: Array<{
    id: string;
    action: string;
    entity_type: string | null;
    entity_id: string | null;
    actor_id: string | null;
    created_at: string;
  }>;
  generated_at: string;
};

export const getAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {

    await assertAdmin(context);
    const supabase = context.supabase;

    const { data: health } = await supabase.rpc("system_get_health");
    const h = (health ?? {}) as Record<string, number | string | null>;

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      { count: leaders },
      { count: members },
      { count: salesToday },
      { count: salesMonth },
      revenue,
      wallet,
      { data: activity },
    ] = await Promise.all([
      supabase.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "team_leader"),
      supabase.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "member"),
      supabase.from("sales").select("*", { count: "exact", head: true }).gte("created_at", todayStart.toISOString()),
      supabase.from("sales").select("*", { count: "exact", head: true }).gte("created_at", monthStart.toISOString()),
      supabase.from("sales").select("deal_value").eq("sale_status", "approved"),
      supabase.from("profiles").select("wallet_balance"),
      supabase
        .from("audit_logs")
        .select("id, action, entity_type, entity_id, actor_id, created_at")
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    const revenue_total = (revenue.data ?? []).reduce(
      (sum, r: { deal_value: number | null }) => sum + Number(r.deal_value ?? 0),
      0,
    );

    const wallet_available_total = (wallet.data ?? []).reduce(
      (sum, r: { wallet_balance: number | null }) => sum + Number(r.wallet_balance ?? 0),
      0,
    );

    return {
      projects_total: Number(h.projects_total ?? 0),
      flats_total: Number(h.flats_total ?? 0),
      flats_available: Number(h.flats_available ?? 0),
      flats_reserved: Number(h.flats_reserved ?? 0),
      flats_sold: Number(h.flats_sold ?? 0),
      customers_total: Number(h.customers_total ?? 0),
      team_leaders: leaders ?? 0,
      members: members ?? 0,
      sales_today: salesToday ?? 0,
      sales_month: salesMonth ?? 0,
      withdrawals_pending: Number(h.withdrawals_pending ?? 0),
      commissions_pending: Number(h.sales_pending ?? 0),
      wallet_available_total,
      revenue_total,
      notifications_unread: Number(h.notifications_unread ?? 0),
      activity: activity ?? [],
      generated_at: new Date().toISOString(),
    };
  });

/** Lightweight global search across core entities. */
export const globalAdminSearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ q: z.string().trim().min(1).max(120) }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const q = data.q;
    const like = `%${q.replace(/[%_]/g, (m) => `\\${m}`)}%`;

    const [projects, customers, sales, profiles] = await Promise.all([
      context.supabase
        .from("projects")
        .select("id, name, slug, location")
        .or(`name.ilike.${like},location.ilike.${like},slug.ilike.${like}`)
        .limit(6),
      context.supabase
        .from("customers")
        .select("id, full_name, mobile_number, status")
        .or(`full_name.ilike.${like},mobile_number.ilike.${like},email.ilike.${like}`)
        .limit(6),

      context.supabase
        .from("sales")
        .select("id, sale_number, sale_status, buyer_name")
        .or(`sale_number.ilike.${like},buyer_name.ilike.${like}`)
        .limit(6),

      context.supabase
        .from("profiles")
        .select("id, full_name, login_id, mobile_number")
        .or(`full_name.ilike.${like},login_id.ilike.${like},mobile_number.ilike.${like}`)
        .limit(6),
    ]);

    return {
      projects: projects.data ?? [],
      customers: customers.data ?? [],
      sales: sales.data ?? [],
      users: profiles.data ?? [],
    };
  });
