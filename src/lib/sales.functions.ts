import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Aawash Sales Workflow Engine — server functions.
 * Atomic operations go through SECURITY DEFINER RPCs
 * (create_draft_sale / approve_sale / reject_sale / cancel_sale /
 *  submit_sale_for_approval) so every multi-table state change is
 * transactional and cannot leave inventory, commissions, notifications,
 * timeline, or audit logs in a partial state.
 */

/* ------------------------- schemas ------------------------- */

const draftSchema = z.object({
  customer_id: z.string().uuid(),
  flat_id: z.string().uuid(),
  sale_amount: z.number().positive(),
  booking_amount: z.number().nonnegative().default(0),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
  lock_minutes: z.number().int().min(30).max(10080).default(1440),
});

const idSchema = z.object({ id: z.string().uuid() });
const reasonSchema = z.object({
  id: z.string().uuid(),
  reason: z.string().trim().min(3).max(500),
});
const approveSchema = z.object({
  id: z.string().uuid(),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

const listFilterSchema = z.object({
  status: z.string().optional(),
  approval_status: z.string().optional(),
  project_id: z.string().uuid().optional(),
  q: z.string().trim().max(120).optional(),
  scope: z.enum(["mine", "team", "all", "pending"]).default("mine"),
  limit: z.number().int().min(1).max(200).default(50),
});

const docSchema = z.object({
  sale_id: z.string().uuid(),
  kind: z.enum([
    "identity_proof",
    "address_proof",
    "pan",
    "aadhaar",
    "income",
    "loan",
    "agreement",
    "registration",
    "receipt",
    "other",
  ]),
  label: z.string().trim().max(120).optional().or(z.literal("")),
  file_url: z.string().trim().url().optional().or(z.literal("")),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

const paymentSchema = z.object({
  sale_id: z.string().uuid(),
  stage: z.enum([
    "booking",
    "first_installment",
    "second_installment",
    "third_installment",
    "final",
    "registration",
    "other",
  ]),
  amount: z.number().positive(),
  method: z.string().trim().max(60).optional().or(z.literal("")),
  reference: z.string().trim().max(120).optional().or(z.literal("")),
  receipt_url: z.string().trim().url().optional().or(z.literal("")),
  received_on: z.string().optional(),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

/* ------------------------- helpers ------------------------- */

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

/* ------------------------- mutations ------------------------- */

export const createDraftSale = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => draftSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: saleId, error } = await context.supabase.rpc("create_draft_sale", {
      p_customer_id: data.customer_id,
      p_flat_id: data.flat_id,
      p_sale_amount: data.sale_amount,
      p_booking_amount: data.booking_amount ?? 0,
      p_notes: data.notes || undefined,
      p_lock_minutes: data.lock_minutes ?? 1440,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const, id: saleId as string };
  });

export const submitSaleForApproval = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("submit_sale_for_approval", {
      p_sale_id: data.id,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const approveSale = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => approveSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("approve_sale", {
      p_sale_id: data.id,
      p_notes: data.notes || null,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const rejectSale = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => reasonSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("reject_sale", {
      p_sale_id: data.id,
      p_reason: data.reason,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const cancelSale = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => reasonSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("cancel_sale", {
      p_sale_id: data.id,
      p_reason: data.reason,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const updateSaleDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        sale_amount: z.number().positive().optional(),
        booking_amount: z.number().nonnegative().optional(),
        booking_date: z.string().optional().nullable(),
        agreement_date: z.string().optional().nullable(),
        registration_date: z.string().optional().nullable(),
        notes: z.string().trim().max(2000).optional().or(z.literal("")),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = {};
    if (data.sale_amount != null) {
      patch.deal_value = data.sale_amount;
    }
    if (data.booking_amount != null) patch.booking_amount = data.booking_amount;
    if (data.sale_amount != null && data.booking_amount != null) {
      patch.remaining_amount = Math.max(data.sale_amount - data.booking_amount, 0);
    }
    if (data.booking_date !== undefined) patch.booking_date = data.booking_date;
    if (data.agreement_date !== undefined) patch.agreement_date = data.agreement_date;
    if (data.registration_date !== undefined) patch.registration_date = data.registration_date;
    if (data.notes !== undefined) patch.notes = data.notes;
    if (Object.keys(patch).length === 0) return { ok: true as const };
    const { error } = await context.supabase.from("sales").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/* ------------------------- documents & payments ------------------------- */

export const addSaleDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => docSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("sale_documents").insert({
      sale_id: data.sale_id,
      kind: data.kind,
      label: data.label || null,
      file_url: data.file_url || null,
      notes: data.notes || null,
      uploaded_by: context.userId,
    });
    if (error) throw new Error(error.message);
    await context.supabase.from("sale_audit_log").insert({
      sale_id: data.sale_id,
      actor_id: context.userId,
      action: "document_added",
      to_value: { kind: data.kind, label: data.label ?? null },
    });
    return { ok: true as const };
  });

export const verifySaleDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["verified", "rejected"]),
        notes: z.string().trim().max(500).optional().or(z.literal("")),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const role = await getRole(context.supabase, context.userId);
    if (role !== "super_admin") throw new Error("Only Super Admin may verify documents");
    const { error } = await context.supabase
      .from("sale_documents")
      .update({
        status: data.status,
        verified_by: context.userId,
        verified_at: new Date().toISOString(),
        notes: data.notes || null,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const recordSalePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => paymentSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("sale_payments").insert({
      sale_id: data.sale_id,
      stage: data.stage,
      amount: data.amount,
      method: data.method || null,
      reference: data.reference || null,
      receipt_url: data.receipt_url || null,
      received_on: data.received_on || new Date().toISOString().slice(0, 10),
      notes: data.notes || null,
      recorded_by: context.userId,
    });
    if (error) throw new Error(error.message);

    // Update aggregate booking amount if this is the booking stage
    if (data.stage === "booking") {
      const { data: sale } = await context.supabase
        .from("sales")
        .select("deal_value, booking_amount")
        .eq("id", data.sale_id)
        .maybeSingle();
      if (sale) {
        const newBooking = Number(sale.booking_amount || 0) + data.amount;
        await context.supabase
          .from("sales")
          .update({
            booking_amount: newBooking,
            remaining_amount: Math.max(Number(sale.deal_value || 0) - newBooking, 0),
            sale_status: "booking_received",
          })
          .eq("id", data.sale_id);
      }
    }

    await context.supabase.from("sale_audit_log").insert({
      sale_id: data.sale_id,
      actor_id: context.userId,
      action: "payment_recorded",
      to_value: { stage: data.stage, amount: data.amount },
    });
    return { ok: true as const };
  });

/* ------------------------- reads ------------------------- */

export const listSales = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => listFilterSchema.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const role = await getRole(context.supabase, context.userId);

    let query = context.supabase
      .from("sales")
      .select(
        `id, sale_number, customer_id, project_id, flat_id, unit_label, buyer_name, buyer_mobile,
         deal_value, booking_amount, remaining_amount, sale_status, approval_status,
         seller_id, leader_id, team_id, created_at, booking_date, approval_at`,
      )
      .order("created_at", { ascending: false })
      .limit(data.limit);

    if (data.scope === "mine") query = query.eq("seller_id", context.userId);
    if (data.scope === "pending") query = query.eq("approval_status", "submitted");
    if (data.status) query = query.eq("sale_status", data.status);
    if (data.approval_status) query = query.eq("approval_status", data.approval_status);
    if (data.project_id) query = query.eq("project_id", data.project_id);
    if (data.q) {
      const q = data.q;
      query = query.or(
        `sale_number.ilike.%${q}%,buyer_name.ilike.%${q}%,buyer_mobile.ilike.%${q}%,unit_label.ilike.%${q}%`,
      );
    }

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);

    // Enrich with project/seller names
    const projectIds = Array.from(new Set((rows ?? []).map((r) => r.project_id).filter(Boolean))) as string[];
    const sellerIds = Array.from(new Set((rows ?? []).map((r) => r.seller_id).filter(Boolean))) as string[];
    const [{ data: projects }, { data: sellers }] = await Promise.all([
      projectIds.length
        ? context.supabase.from("projects").select("id, name, slug").in("id", projectIds)
        : Promise.resolve({ data: [] as { id: string; name: string; slug: string }[] }),
      sellerIds.length
        ? context.supabase
            .from("profiles")
            .select("id, full_name, login_id")
            .in("id", sellerIds)
        : Promise.resolve({ data: [] as { id: string; full_name: string; login_id: string }[] }),
    ]);
    const pMap = new Map((projects ?? []).map((p) => [p.id, p]));
    const sMap = new Map((sellers ?? []).map((s) => [s.id, s]));

    return {
      role,
      rows: (rows ?? []).map((r) => ({
        ...r,
        project: r.project_id ? pMap.get(r.project_id) ?? null : null,
        seller: r.seller_id ? sMap.get(r.seller_id) ?? null : null,
      })),
    };
  });

export const getSale = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idSchema.parse(d))
  .handler(async ({ data, context }) => {
    const role = await getRole(context.supabase, context.userId);
    const { data: sale, error } = await context.supabase
      .from("sales")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!sale) throw new Error("Sale not found");

    const [
      { data: project },
      { data: flat },
      { data: seller },
      { data: leader },
      { data: customer },
      { data: docs },
      { data: payments },
      { data: audit },
    ] = await Promise.all([
      sale.project_id
        ? context.supabase.from("projects").select("id, name, slug, location").eq("id", sale.project_id).maybeSingle()
        : Promise.resolve({ data: null }),
      sale.flat_id
        ? context.supabase
            .from("flats")
            .select("id, unit_code, area_sqft, bedrooms, configuration, price, status, floor_id, building_id")
            .eq("id", sale.flat_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      sale.seller_id
        ? context.supabase
            .from("profiles")
            .select("id, full_name, login_id, mobile_number")
            .eq("id", sale.seller_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      sale.leader_id
        ? context.supabase
            .from("profiles")
            .select("id, full_name, login_id")
            .eq("id", sale.leader_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      sale.customer_id
        ? context.supabase
            .from("customers")
            .select("id, customer_code, full_name, mobile_number, status")
            .eq("id", sale.customer_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      context.supabase
        .from("sale_documents")
        .select("*")
        .eq("sale_id", data.id)
        .order("created_at", { ascending: false }),
      context.supabase
        .from("sale_payments")
        .select("*")
        .eq("sale_id", data.id)
        .order("received_on", { ascending: false }),
      context.supabase
        .from("sale_audit_log")
        .select("id, action, actor_id, actor_role, reason, from_value, to_value, created_at")
        .eq("sale_id", data.id)
        .order("created_at", { ascending: false }),
    ]);

    return {
      role,
      sale,
      project,
      flat,
      seller,
      leader,
      customer,
      documents: docs ?? [],
      payments: payments ?? [],
      audit: audit ?? [],
    };
  });

export const salesDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const role = await getRole(context.supabase, context.userId);

    const base = context.supabase.from("sales").select("id, deal_value, sale_status, approval_status, created_at");
    const { data: rows, error } = await base;
    if (error) throw new Error(error.message);

    const list = rows ?? [];
    const bucket = (s: string) => list.filter((r) => r.sale_status === s).length;
    const approved = list.filter((r) => r.approval_status === "approved");
    const pending = list.filter((r) => r.approval_status === "submitted");
    const totalValue = approved.reduce((n, r) => n + Number(r.deal_value || 0), 0);

    return {
      role,
      totalSales: list.length,
      approvedCount: approved.length,
      pendingCount: pending.length,
      draftCount: bucket("draft") + bucket("flat_locked"),
      cancelledCount: list.filter((r) => r.sale_status === "cancelled").length,
      totalApprovedValue: totalValue,
    };
  });
