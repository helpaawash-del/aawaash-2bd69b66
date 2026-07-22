import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Aawash CRM server functions.
 * All state-changing endpoints run under `requireSupabaseAuth`.
 * RLS enforces per-role visibility (admin / leader team / member own).
 */

/* ---------------- helpers ---------------- */

async function getCallerRole(supabase: import("@supabase/supabase-js").SupabaseClient, userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .order("role", { ascending: true })
    .limit(1)
    .maybeSingle();
  return (data?.role ?? "member") as "super_admin" | "team_leader" | "member";
}

async function getCallerTeam(supabase: import("@supabase/supabase-js").SupabaseClient, userId: string) {
  const { data } = await supabase
    .from("profiles")
    .select("team_id, full_name")
    .eq("id", userId)
    .maybeSingle();
  return data ?? { team_id: null, full_name: null };
}

/* ---------------- schemas ---------------- */

const customerCoreSchema = z.object({
  full_name: z.string().trim().min(2).max(120),
  mobile_number: z.string().regex(/^\d{10}$/, "Mobile must be 10 digits"),
  alt_mobile_number: z
    .string()
    .regex(/^\d{10}$/, "Alt mobile must be 10 digits")
    .optional()
    .or(z.literal("")),
  email: z.string().trim().email().max(160).optional().or(z.literal("")),
  address: z.string().trim().max(400).optional().or(z.literal("")),
  city: z.string().trim().max(80).optional().or(z.literal("")),
  state: z.string().trim().max(80).optional().or(z.literal("")),
  pin_code: z.string().trim().max(10).optional().or(z.literal("")),
  occupation: z.string().trim().max(80).optional().or(z.literal("")),
  company: z.string().trim().max(120).optional().or(z.literal("")),
  monthly_income: z.number().nonnegative().optional().nullable(),
  budget_min: z.number().nonnegative().optional().nullable(),
  budget_max: z.number().nonnegative().optional().nullable(),
  preferred_project_id: z.string().uuid().optional().nullable(),
  preferred_area: z.string().trim().max(120).optional().or(z.literal("")),
  preferred_config: z.string().trim().max(40).optional().or(z.literal("")),
  lead_source: z.string().trim().max(80).optional().or(z.literal("")),
  priority: z.enum(["low", "normal", "high", "vip"]).optional(),
  tags: z.array(z.string().trim().max(40)).max(20).optional(),
  purchase_probability: z.number().int().min(0).max(100).optional().nullable(),
  expected_purchase_date: z.string().optional().nullable(),
  next_followup_at: z.string().optional().nullable(),
  notes: z.string().trim().max(4000).optional().or(z.literal("")),
});

const CUSTOMER_STATUSES = [
  "new_lead","contacted","meeting_scheduled","meeting_completed",
  "interested","flat_selected","price_discussion","documentation",
  "booking_amount","booking_confirmed","agreement","registration",
  "sale_completed","commission_generated","closed",
  "not_interested","on_hold","cancelled","lost","future_followup",
] as const;

/* ---------------- create ---------------- */

export const createCustomer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => customerCoreSchema.parse(d))
  .handler(async ({ data, context }) => {
    const me = await getCallerTeam(context.supabase, context.userId);

    // Duplicate check (soft): search all rows the caller can read
    const { data: dupes } = await context.supabase
      .from("customers")
      .select("id, customer_code, full_name, mobile_number, alt_mobile_number, email, assigned_member_id")
      .or(
        [
          `mobile_number.eq.${data.mobile_number}`,
          data.alt_mobile_number ? `alt_mobile_number.eq.${data.alt_mobile_number}` : "",
          data.email ? `email.eq.${data.email}` : "",
        ]
          .filter(Boolean)
          .join(","),
      )
      .limit(5);

    if (dupes && dupes.length > 0) {
      return { ok: false as const, duplicates: dupes };
    }

    // Resolve assigned leader (leader of caller's team, if any)
    let assignedLeader: string | null = null;
    if (me.team_id) {
      const { data: t } = await context.supabase
        .from("teams")
        .select("leader_id")
        .eq("id", me.team_id)
        .maybeSingle();
      assignedLeader = t?.leader_id ?? null;
    }

    const insertRow = {
      full_name: data.full_name,
      mobile_number: data.mobile_number,
      alt_mobile_number: data.alt_mobile_number || null,
      email: data.email || null,
      address: data.address || null,
      city: data.city || null,
      state: data.state || null,
      pin_code: data.pin_code || null,
      occupation: data.occupation || null,
      company: data.company || null,
      monthly_income: data.monthly_income ?? null,
      budget_min: data.budget_min ?? null,
      budget_max: data.budget_max ?? null,
      preferred_project_id: data.preferred_project_id || null,
      preferred_area: data.preferred_area || null,
      preferred_config: data.preferred_config || null,
      lead_source: data.lead_source || null,
      priority: data.priority ?? "normal",
      tags: data.tags ?? [],
      purchase_probability: data.purchase_probability ?? null,
      expected_purchase_date: data.expected_purchase_date || null,
      next_followup_at: data.next_followup_at || null,
      notes: data.notes || null,
      assigned_member_id: context.userId,
      assigned_leader_id: assignedLeader,
      team_id: me.team_id,
      created_by: context.userId,
      updated_by: context.userId,
      status: "new_lead" as const,
    };

    const { data: created, error } = await context.supabase
      .from("customers")
      .insert(insertRow)
      .select("id, customer_code")
      .single();
    if (error) throw new Error(error.message);

    await context.supabase.from("customer_timeline").insert({
      customer_id: created.id,
      actor_id: context.userId,
      event: "lead_created",
      detail: `New lead created by ${me.full_name ?? "user"}`,
    });

    return { ok: true as const, id: created.id, code: created.customer_code };
  });

/* ---------------- update ---------------- */

const updateSchema = customerCoreSchema.partial().extend({
  id: z.string().uuid(),
  status: z.enum(CUSTOMER_STATUSES).optional(),
  is_archived: z.boolean().optional(),
});

export const updateCustomer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => updateSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;

    // Load prior for change detection
    const { data: prior } = await context.supabase
      .from("customers")
      .select("status, assigned_member_id, team_id")
      .eq("id", id)
      .maybeSingle();
    if (!prior) throw new Error("Customer not found or access denied.");

    // Normalize empty strings to null
    const patch: Record<string, unknown> = { updated_by: context.userId };
    for (const [k, v] of Object.entries(rest)) {
      if (v === "" ) patch[k] = null;
      else patch[k] = v;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await context.supabase.from("customers").update(patch as any).eq("id", id);
    if (error) throw new Error(error.message);

    if (rest.status && rest.status !== prior.status) {
      await context.supabase.from("customer_timeline").insert({
        customer_id: id,
        actor_id: context.userId,
        event: "status_changed",
        detail: `Status → ${rest.status.replace(/_/g, " ")}`,
        metadata: { from: prior.status, to: rest.status },
      });
    } else {
      await context.supabase.from("customer_timeline").insert({
        customer_id: id,
        actor_id: context.userId,
        event: "customer_updated",
        detail: "Customer details updated",
      });
    }

    return { ok: true as const };
  });

/* ---------------- list ---------------- */

const listSchema = z.object({
  scope: z.enum(["mine", "team", "all"]).optional(),
  status: z.string().optional(),
  search: z.string().optional(),
  limit: z.number().int().min(1).max(200).optional(),
});

export const listCustomers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => listSchema.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const role = await getCallerRole(context.supabase, context.userId);
    const scope = data.scope ?? (role === "member" ? "mine" : role === "team_leader" ? "team" : "all");

    let q = context.supabase
      .from("customers")
      .select(
        "id, customer_code, full_name, mobile_number, email, status, priority, tags, city, next_followup_at, last_contact_at, assigned_member_id, assigned_leader_id, team_id, preferred_project_id, updated_at, created_at",
      )
      .eq("is_archived", false)
      .order("updated_at", { ascending: false })
      .limit(data.limit ?? 100);

    if (scope === "mine") q = q.eq("assigned_member_id", context.userId);

    if (data.status && data.status !== "all") q = q.eq("status", data.status as (typeof CUSTOMER_STATUSES)[number]);

    if (data.search && data.search.trim()) {
      const s = data.search.trim();
      q = q.or(
        `full_name.ilike.%${s}%,mobile_number.ilike.%${s}%,customer_code.ilike.%${s}%,email.ilike.%${s}%,city.ilike.%${s}%`,
      );
    }

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const memberIds = Array.from(
      new Set(rows?.map((r) => r.assigned_member_id).filter(Boolean) as string[]),
    );
    let members: Array<{ id: string; full_name: string }> = [];
    if (memberIds.length) {
      const { data: mm } = await context.supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", memberIds);
      members = mm ?? [];
    }

    return (rows ?? []).map((r) => ({
      ...r,
      member_name: members.find((m) => m.id === r.assigned_member_id)?.full_name ?? null,
    }));
  });

/* ---------------- get one ---------------- */

export const getCustomer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: customer, error } = await context.supabase
      .from("customers")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!customer) throw new Error("Customer not found");

    const [{ data: meetings }, { data: notes }, { data: timeline }, { data: member }, { data: project }] =
      await Promise.all([
        context.supabase
          .from("customer_meetings")
          .select("*")
          .eq("customer_id", data.id)
          .order("scheduled_at", { ascending: false }),
        context.supabase
          .from("customer_notes")
          .select("*")
          .eq("customer_id", data.id)
          .order("is_pinned", { ascending: false })
          .order("created_at", { ascending: false }),
        context.supabase
          .from("customer_timeline")
          .select("*")
          .eq("customer_id", data.id)
          .order("created_at", { ascending: false })
          .limit(80),
        customer.assigned_member_id
          ? context.supabase
              .from("profiles")
              .select("id, full_name, login_id, mobile_number")
              .eq("id", customer.assigned_member_id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        customer.preferred_project_id
          ? context.supabase
              .from("projects")
              .select("id, name, slug, location")
              .eq("id", customer.preferred_project_id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

    return {
      customer,
      meetings: meetings ?? [],
      notes: notes ?? [],
      timeline: timeline ?? [],
      member: member ?? null,
      project: project ?? null,
    };
  });

/* ---------------- meetings ---------------- */

const meetingSchema = z.object({
  customer_id: z.string().uuid(),
  scheduled_at: z.string(),
  location: z.string().trim().max(200).optional().or(z.literal("")),
  meeting_type: z.enum(["call", "in_person", "site_visit", "virtual", "other"]),
  remarks: z.string().trim().max(1000).optional().or(z.literal("")),
  followup_at: z.string().optional().nullable(),
});

export const scheduleMeeting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => meetingSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("customer_meetings")
      .insert({
        customer_id: data.customer_id,
        scheduled_at: data.scheduled_at,
        location: data.location || null,
        meeting_type: data.meeting_type,
        remarks: data.remarks || null,
        followup_at: data.followup_at || null,
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    await context.supabase
      .from("customers")
      .update({
        status: "meeting_scheduled",
        next_followup_at: data.scheduled_at,
        updated_by: context.userId,
      })
      .eq("id", data.customer_id);

    await context.supabase.from("customer_timeline").insert({
      customer_id: data.customer_id,
      actor_id: context.userId,
      event: "meeting_scheduled",
      detail: `Meeting scheduled (${data.meeting_type.replace("_", " ")})`,
      metadata: { meeting_id: row.id, at: data.scheduled_at },
    });

    return { ok: true as const };
  });

const meetingUpdateSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["scheduled", "completed", "cancelled", "missed", "rescheduled"]),
  outcome: z.string().trim().max(600).optional().or(z.literal("")),
});

export const updateMeetingStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => meetingUpdateSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: prior } = await context.supabase
      .from("customer_meetings")
      .select("customer_id")
      .eq("id", data.id)
      .maybeSingle();
    if (!prior) throw new Error("Meeting not found");

    const { error } = await context.supabase
      .from("customer_meetings")
      .update({ status: data.status, outcome: data.outcome || null })
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    if (data.status === "completed") {
      await context.supabase
        .from("customers")
        .update({
          status: "meeting_completed",
          last_contact_at: new Date().toISOString(),
          meeting_count: (
            (
              await context.supabase
                .from("customers")
                .select("meeting_count")
                .eq("id", prior.customer_id)
                .maybeSingle()
            ).data?.meeting_count ?? 0
          ) + 1,
          updated_by: context.userId,
        })
        .eq("id", prior.customer_id);
    }

    await context.supabase.from("customer_timeline").insert({
      customer_id: prior.customer_id,
      actor_id: context.userId,
      event: `meeting_${data.status}`,
      detail: `Meeting ${data.status.replace("_", " ")}`,
    });

    return { ok: true as const };
  });

/* ---------------- notes ---------------- */

const noteSchema = z.object({
  customer_id: z.string().uuid(),
  content: z.string().trim().min(1).max(2000),
  is_pinned: z.boolean().optional(),
});

export const addNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => noteSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("customer_notes").insert({
      customer_id: data.customer_id,
      author_id: context.userId,
      content: data.content,
      is_pinned: data.is_pinned ?? false,
    });
    if (error) throw new Error(error.message);

    await context.supabase.from("customer_timeline").insert({
      customer_id: data.customer_id,
      actor_id: context.userId,
      event: "note_added",
      detail: "Note added",
    });
    return { ok: true as const };
  });

/* ---------------- CRM overview ---------------- */

export const getCrmOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const role = await getCallerRole(context.supabase, context.userId);
    const me = await getCallerTeam(context.supabase, context.userId);

    let base = context.supabase.from("customers").select("id, status, next_followup_at, priority", { count: "exact" }).eq("is_archived", false);
    if (role === "member") base = base.eq("assigned_member_id", context.userId);
    else if (role === "team_leader" && me.team_id) base = base.eq("team_id", me.team_id);

    const { data: rows } = await base;
    const list = rows ?? [];

    const now = new Date();
    const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay); endOfDay.setDate(endOfDay.getDate() + 1);
    const endOfWeek = new Date(startOfDay); endOfWeek.setDate(endOfWeek.getDate() + 7);

    const s = {
      total: list.length,
      active: list.filter((r) => !["closed", "lost", "cancelled", "not_interested"].includes(r.status)).length,
      interested: list.filter((r) => ["interested", "flat_selected", "price_discussion"].includes(r.status)).length,
      pending_followups: list.filter((r) => r.next_followup_at && new Date(r.next_followup_at) < now).length,
      today_followups: list.filter((r) => {
        if (!r.next_followup_at) return false;
        const d = new Date(r.next_followup_at);
        return d >= startOfDay && d < endOfDay;
      }).length,
      week_followups: list.filter((r) => {
        if (!r.next_followup_at) return false;
        const d = new Date(r.next_followup_at);
        return d >= startOfDay && d < endOfWeek;
      }).length,
      bookings: list.filter((r) => ["booking_amount", "booking_confirmed", "agreement", "registration"].includes(r.status)).length,
      sales_completed: list.filter((r) => ["sale_completed", "commission_generated", "closed"].includes(r.status)).length,
      lost: list.filter((r) => ["lost", "cancelled", "not_interested"].includes(r.status)).length,
      vip: list.filter((r) => r.priority === "vip" || r.priority === "high").length,
    };
    const conversion = s.total > 0 ? Math.round((s.sales_completed / s.total) * 100) : 0;

    return { role, stats: { ...s, conversion } };
  });

/* ---------------- followups ---------------- */

export const listFollowups = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const role = await getCallerRole(context.supabase, context.userId);
    const me = await getCallerTeam(context.supabase, context.userId);

    let q = context.supabase
      .from("customers")
      .select(
        "id, customer_code, full_name, mobile_number, status, priority, next_followup_at, assigned_member_id",
      )
      .not("next_followup_at", "is", null)
      .eq("is_archived", false)
      .order("next_followup_at", { ascending: true })
      .limit(200);

    if (role === "member") q = q.eq("assigned_member_id", context.userId);
    else if (role === "team_leader" && me.team_id) q = q.eq("team_id", me.team_id);

    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return data ?? [];
  });
