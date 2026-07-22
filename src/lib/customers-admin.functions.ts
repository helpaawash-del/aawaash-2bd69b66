import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Admin-scoped Customer CRM server functions.
 * All calls require `super_admin` role.
 */

async function assertAdmin(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  userId: string,
) {
  const { data } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "super_admin",
  });
  if (!data) throw new Error("Forbidden: super admin only");
}

/* ---------------- list ---------------- */

const listSchema = z.object({
  search: z.string().optional(),
  status: z.string().optional(),
  team_id: z.string().uuid().optional().nullable(),
  leader_id: z.string().uuid().optional().nullable(),
  member_id: z.string().uuid().optional().nullable(),
  source: z.string().optional(),
  archived: z.enum(["active", "archived", "all"]).optional(),
  limit: z.number().int().min(1).max(500).optional(),
});

export const adminListCustomers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => listSchema.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);

    let q = context.supabase
      .from("customers")
      .select(
        "id, customer_code, full_name, mobile_number, alt_mobile_number, email, status, priority, tags, city, state, lead_source, budget_min, budget_max, next_followup_at, last_contact_at, assigned_member_id, assigned_leader_id, team_id, preferred_project_id, is_archived, updated_at, created_at",
      )
      .order("updated_at", { ascending: false })
      .limit(data.limit ?? 200);

    if (!data.archived || data.archived === "active") q = q.eq("is_archived", false);
    else if (data.archived === "archived") q = q.eq("is_archived", true);

    if (data.status && data.status !== "all")
      q = q.eq("status", data.status as never);
    if (data.team_id) q = q.eq("team_id", data.team_id);
    if (data.leader_id) q = q.eq("assigned_leader_id", data.leader_id);
    if (data.member_id) q = q.eq("assigned_member_id", data.member_id);
    if (data.source && data.source !== "all") q = q.eq("lead_source", data.source);
    if (data.search?.trim()) {
      const s = data.search.trim();
      q = q.or(
        `full_name.ilike.%${s}%,mobile_number.ilike.%${s}%,alt_mobile_number.ilike.%${s}%,customer_code.ilike.%${s}%,email.ilike.%${s}%,city.ilike.%${s}%`,
      );
    }

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const memberIds = Array.from(
      new Set(
        (rows ?? [])
          .flatMap((r) => [r.assigned_member_id, r.assigned_leader_id])
          .filter(Boolean) as string[],
      ),
    );
    const projectIds = Array.from(
      new Set((rows ?? []).map((r) => r.preferred_project_id).filter(Boolean) as string[]),
    );
    const teamIds = Array.from(
      new Set((rows ?? []).map((r) => r.team_id).filter(Boolean) as string[]),
    );

    const [{ data: people }, { data: projects }, { data: teams }] = await Promise.all([
      memberIds.length
        ? context.supabase
            .from("profiles")
            .select("id, full_name, login_id")
            .in("id", memberIds)
        : Promise.resolve({ data: [] as Array<{ id: string; full_name: string; login_id: string }> }),
      projectIds.length
        ? context.supabase.from("projects").select("id, name").in("id", projectIds)
        : Promise.resolve({ data: [] as Array<{ id: string; name: string }> }),
      teamIds.length
        ? context.supabase.from("teams").select("id, letter, name").in("id", teamIds)
        : Promise.resolve({ data: [] as Array<{ id: string; letter: string; name: string }> }),
    ]);

    const memberMap = new Map((people ?? []).map((p) => [p.id, p]));
    const projectMap = new Map((projects ?? []).map((p) => [p.id, p]));
    const teamMap = new Map((teams ?? []).map((t) => [t.id, t]));

    return (rows ?? []).map((r) => ({
      ...r,
      member_name: memberMap.get(r.assigned_member_id ?? "")?.full_name ?? null,
      leader_name: memberMap.get(r.assigned_leader_id ?? "")?.full_name ?? null,
      project_name: projectMap.get(r.preferred_project_id ?? "")?.name ?? null,
      team_letter: teamMap.get(r.team_id ?? "")?.letter ?? null,
      team_name: teamMap.get(r.team_id ?? "")?.name ?? null,
    }));
  });

/* ---------------- filter dictionaries ---------------- */

export const adminGetCustomerFilters = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);

    const [{ data: teams }, { data: roleRows }, { data: profiles }, { data: tags }] =
      await Promise.all([
        context.supabase
          .from("teams")
          .select("id, letter, name, leader_id")
          .eq("is_deleted", false)
          .order("letter", { ascending: true }),
        context.supabase
          .from("user_roles")
          .select("user_id, role")
          .in("role", ["team_leader", "member"]),
        context.supabase
          .from("profiles")
          .select("id, full_name, login_id, team_id, is_active"),
        context.supabase
          .from("customer_tags_catalog")
          .select("id, label, color, is_active")
          .order("label", { ascending: true }),
      ]);

    const roleByUser = new Map<string, string>((roleRows ?? []).map((r) => [r.user_id, r.role as string]));
    const activeProfiles = (profiles ?? []).filter((p) => p.is_active !== false);
    const leaders = activeProfiles.filter((p) => roleByUser.get(p.id) === "team_leader");
    const members = activeProfiles.filter((p) => roleByUser.get(p.id) === "member");

    return {
      teams: teams ?? [],
      leaders,
      members,
      tags: tags ?? [],
    };
  });

/* ---------------- duplicate check ---------------- */

export const adminCheckDuplicates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        mobile_number: z.string().optional(),
        alt_mobile_number: z.string().optional(),
        email: z.string().optional(),
        exclude_id: z.string().uuid().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const parts: string[] = [];
    if (data.mobile_number) parts.push(`mobile_number.eq.${data.mobile_number}`);
    if (data.alt_mobile_number)
      parts.push(`alt_mobile_number.eq.${data.alt_mobile_number}`);
    if (data.email) parts.push(`email.eq.${data.email}`);
    if (!parts.length) return [];
    let q = context.supabase
      .from("customers")
      .select("id, customer_code, full_name, mobile_number, email, status, is_archived")
      .or(parts.join(","))
      .limit(10);
    if (data.exclude_id) q = q.neq("id", data.exclude_id);
    const { data: rows } = await q;
    return rows ?? [];
  });

/* ---------------- bulk reassign ---------------- */

export const adminBulkReassign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        customer_ids: z.array(z.string().uuid()).min(1).max(500),
        team_id: z.string().uuid().nullable().optional(),
        leader_id: z.string().uuid().nullable().optional(),
        member_id: z.string().uuid().nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: result, error } = await context.supabase.rpc(
      "admin_bulk_reassign_customers",
      {
        _customer_ids: data.customer_ids,
        _team_id: (data.team_id ?? null) as unknown as string,
        _leader_id: (data.leader_id ?? null) as unknown as string,
        _member_id: (data.member_id ?? null) as unknown as string,
      },
    );
    if (error) throw new Error(error.message);
    return result;
  });

/* ---------------- merge ---------------- */

export const adminMergeCustomers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        target_id: z.string().uuid(),
        source_id: z.string().uuid(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: result, error } = await context.supabase.rpc("admin_merge_customers", {
      _target_id: data.target_id,
      _source_id: data.source_id,
    });
    if (error) throw new Error(error.message);
    return result;
  });

/* ---------------- tags catalog ---------------- */

export const adminListTags = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data } = await context.supabase
      .from("customer_tags_catalog")
      .select("*")
      .order("label", { ascending: true });
    return data ?? [];
  });

export const adminUpsertTag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        label: z.string().trim().min(1).max(40),
        color: z.string().trim().max(24).optional().or(z.literal("")),
        description: z.string().trim().max(200).optional().or(z.literal("")),
        is_active: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    if (data.id) {
      const { error } = await context.supabase
        .from("customer_tags_catalog")
        .update({
          label: data.label,
          color: data.color || null,
          description: data.description || null,
          is_active: data.is_active ?? true,
        })
        .eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase.from("customer_tags_catalog").insert({
        label: data.label,
        color: data.color || null,
        description: data.description || null,
        is_active: data.is_active ?? true,
        created_by: context.userId,
      });
      if (error) throw new Error(error.message);
    }
    return { ok: true as const };
  });

export const adminDeleteTag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("customer_tags_catalog")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/* ---------------- documents ---------------- */

export const adminListDocuments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ customer_id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: rows, error } = await context.supabase
      .from("customer_documents")
      .select("*")
      .eq("customer_id", data.customer_id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const adminCreateDocumentSignedUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        customer_id: z.string().uuid(),
        filename: z.string().trim().min(1).max(200),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const safe = data.filename.replace(/[^\w.-]+/g, "_");
    const path = `${data.customer_id}/${Date.now()}_${safe}`;
    const { data: signed, error } = await context.supabase.storage
      .from("customer-documents")
      .createSignedUploadUrl(path);
    if (error) throw new Error(error.message);
    return { path, token: signed.token, signedUrl: signed.signedUrl };
  });

export const adminRegisterDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        customer_id: z.string().uuid(),
        doc_type: z.string().trim().min(1).max(40),
        label: z.string().trim().max(120).optional().or(z.literal("")),
        storage_path: z.string().min(1),
        mime_type: z.string().optional().or(z.literal("")),
        size_bytes: z.number().int().optional(),
        replaces_id: z.string().uuid().optional().nullable(),
        notes: z.string().trim().max(500).optional().or(z.literal("")),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);

    let version = 1;
    if (data.replaces_id) {
      const { data: prev } = await context.supabase
        .from("customer_documents")
        .select("version")
        .eq("id", data.replaces_id)
        .maybeSingle();
      version = (prev?.version ?? 1) + 1;
      await context.supabase
        .from("customer_documents")
        .update({ is_current: false })
        .eq("id", data.replaces_id);
    } else {
      // supersede any current doc of same type
      await context.supabase
        .from("customer_documents")
        .update({ is_current: false })
        .eq("customer_id", data.customer_id)
        .eq("doc_type", data.doc_type)
        .eq("is_current", true);
    }

    const { data: row, error } = await context.supabase
      .from("customer_documents")
      .insert({
        customer_id: data.customer_id,
        doc_type: data.doc_type,
        label: data.label || null,
        storage_path: data.storage_path,
        mime_type: data.mime_type || null,
        size_bytes: data.size_bytes ?? null,
        version,
        replaces_id: data.replaces_id ?? null,
        is_current: true,
        uploaded_by: context.userId,
        notes: data.notes || null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    await context.supabase.from("customer_timeline").insert({
      customer_id: data.customer_id,
      actor_id: context.userId,
      event: "document_uploaded",
      detail: `Document uploaded: ${data.doc_type}${data.label ? ` (${data.label})` : ""}`,
      metadata: { document_id: row.id, version },
    });

    return { ok: true as const, id: row.id, version };
  });

export const adminGetDocumentUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ storage_path: z.string(), expires_in: z.number().int().optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: signed, error } = await context.supabase.storage
      .from("customer-documents")
      .createSignedUrl(data.storage_path, data.expires_in ?? 300);
    if (error) throw new Error(error.message);
    return { url: signed.signedUrl };
  });

export const adminDeleteDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: row } = await context.supabase
      .from("customer_documents")
      .select("customer_id, storage_path, doc_type")
      .eq("id", data.id)
      .maybeSingle();
    if (!row) throw new Error("Document not found");

    await context.supabase.storage.from("customer-documents").remove([row.storage_path]);
    const { error } = await context.supabase
      .from("customer_documents")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    await context.supabase.from("customer_timeline").insert({
      customer_id: row.customer_id,
      actor_id: context.userId,
      event: "document_deleted",
      detail: `Document removed: ${row.doc_type}`,
    });
    return { ok: true as const };
  });

/* ---------------- admin detail (sales + docs bundled) ---------------- */

export const adminGetCustomerDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: customer, error } = await context.supabase
      .from("customers")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!customer) throw new Error("Customer not found");

    const [
      { data: meetings },
      { data: notes },
      { data: timeline },
      { data: documents },
      { data: sales },
      { data: leader },
      { data: member },
      { data: team },
      { data: project },
    ] = await Promise.all([
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
        .limit(200),
      context.supabase
        .from("customer_documents")
        .select("*")
        .eq("customer_id", data.id)
        .order("created_at", { ascending: false }),
      context.supabase
        .from("sales")
        .select(
          "id, sale_number, deal_value, sale_status, approval_status, payment_status, sale_date, unit_label, project_id, seller_id, leader_id",
        )
        .eq("customer_id", data.id)
        .order("sale_date", { ascending: false }),
      customer.assigned_leader_id
        ? context.supabase
            .from("profiles")
            .select("id, full_name, login_id, mobile_number")
            .eq("id", customer.assigned_leader_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      customer.assigned_member_id
        ? context.supabase
            .from("profiles")
            .select("id, full_name, login_id, mobile_number")
            .eq("id", customer.assigned_member_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      customer.team_id
        ? context.supabase
            .from("teams")
            .select("id, letter, name")
            .eq("id", customer.team_id)
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
      documents: documents ?? [],
      sales: sales ?? [],
      leader: leader ?? null,
      member: member ?? null,
      team: team ?? null,
      project: project ?? null,
    };
  });
