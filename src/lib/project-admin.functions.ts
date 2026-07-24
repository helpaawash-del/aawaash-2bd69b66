import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Enterprise Project Management Console — admin CRUD for
 * projects / buildings / floors / flats, plus archive/restore/duplicate.
 * All writes gated on super_admin via has_role() RPC.
 */

async function assertAdmin(ctx: {
  supabase: import("@supabase/supabase-js").SupabaseClient;
  userId: string;
}) {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "super_admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Admin only");
}

/* ============================= PROJECTS ============================= */

export const adminListProjects = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ includeArchived: z.boolean().optional() }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    let query = context.supabase
      .from("projects")
      .select(
        "id, name, slug, location, address, project_type, construction_status, visibility, thumbnail_url, cover_url, hero_banner_url, tag, price_from, total_buildings, total_floors, total_flats, available_flats, reserved_flats, sold_flats, completion_percent, display_priority, is_deleted, created_at, updated_at",
      );
    if (!data.includeArchived) query = query.eq("is_deleted", false);
    const { data: rows, error } = await query
      .order("display_priority", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const adminGetProject = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: row, error } = await context.supabase
      .from("projects")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

const projectSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/, "lowercase-with-dashes"),
  name: z.string().min(2).max(120),
  location: z.string().min(1).max(120),
  address: z.string().max(240).nullish(),
  project_type: z.string().min(2).max(40),
  construction_status: z.string().min(2).max(40),
  visibility: z.enum(["public", "internal", "draft", "archived"]).default("public"),
  display_priority: z.coerce.number().int().min(0).max(1000).default(0),
  short_description: z.string().max(240).nullish(),
  description: z.string().max(4000).nullish(),
  tag: z.string().max(40).nullish(),
  price_from: z.coerce.number().nonnegative().default(0),
  price_min: z.coerce.number().nonnegative().nullish(),
  price_max: z.coerce.number().nonnegative().nullish(),
  latitude: z.coerce.number().min(-90).max(90).nullish(),
  longitude: z.coerce.number().min(-180).max(180).nullish(),
  google_map_url: z.string().url().max(500).nullish().or(z.literal("").transform(() => null)),
  thumbnail_url: z.string().url().max(500).nullish().or(z.literal("").transform(() => null)),
  hero_banner_url: z.string().url().max(500).nullish().or(z.literal("").transform(() => null)),
  cover_url: z.string().url().max(500).nullish().or(z.literal("").transform(() => null)),
  logo_url: z.string().url().max(500).nullish().or(z.literal("").transform(() => null)),
  launch_date: z.string().nullish().or(z.literal("").transform(() => null)),
  possession_date: z.string().nullish().or(z.literal("").transform(() => null)),
  completion_percent: z.coerce.number().int().min(0).max(100).default(0),
  seo_title: z.string().max(160).nullish(),
  seo_description: z.string().max(320).nullish(),
  three_d_tour_url: z.string().url().max(500).nullish().or(z.literal("").transform(() => null)),
  virtual_walkthrough_url: z.string().url().max(500).nullish().or(z.literal("").transform(() => null)),
  gallery: z
    .union([
      z.array(z.string().url().max(1000)).max(12),
      z.string().transform((s) => {
        if (!s) return [];
        try {
          const parsed = JSON.parse(s);
          return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : [];
        } catch { return []; }
      }),
    ])
    .optional(),
  total_flats: z.coerce.number().int().min(0).max(100000).optional(),
  available_flats: z.coerce.number().int().min(0).max(100000).optional(),
  reserved_flats: z.coerce.number().int().min(0).max(100000).optional(),
  sold_flats: z.coerce.number().int().min(0).max(100000).optional(),
})
.refine(
  (v) => {
    const t = v.total_flats;
    if (t == null) return true;
    const parts = (v.available_flats ?? 0) + (v.reserved_flats ?? 0) + (v.sold_flats ?? 0);
    return parts <= t;
  },
  { message: "Available + reserved + sold cannot exceed total flats", path: ["total_flats"] },
);

export const adminUpsertProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => projectSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const payload = { ...data } as Record<string, unknown>;
    if (data.id) {
      const { data: row, error } = await context.supabase
        .from("projects")
        .update(payload as never)
        .eq("id", data.id)
        .select("id, slug")
        .maybeSingle();
      if (error) throw new Error(error.message);
      return { ok: true as const, project: row };
    }
    const { data: row, error } = await context.supabase
      .from("projects")
      .insert(payload as never)
      .select("id, slug")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { ok: true as const, project: row };
  });

export const adminArchiveProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("projects")
      .update({ is_deleted: true, visibility: "archived" })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const adminRestoreProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("projects")
      .update({ is_deleted: false, visibility: "internal" })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/** Duplicate a project (optionally with buildings/floors/flats). New rows are created draft/internal. */
export const adminDuplicateProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        includeBuildings: z.boolean().default(true),
        includeFloors: z.boolean().default(true),
        includeFlats: z.boolean().default(true),
        nameSuffix: z.string().max(40).default(" (Copy)"),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: src, error: sErr } = await context.supabase
      .from("projects")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (sErr) throw new Error(sErr.message);
    if (!src) throw new Error("Project not found");

    const suffix = Math.random().toString(36).slice(2, 7);
    const newProject = {
      ...src,
      id: undefined,
      name: `${src.name}${data.nameSuffix}`,
      slug: `${src.slug}-${suffix}`,
      visibility: "draft",
      is_deleted: false,
      total_buildings: 0,
      total_floors: 0,
      total_flats: 0,
      available_flats: 0,
      reserved_flats: 0,
      sold_flats: 0,
      total_units: 0,
      sold_units: 0,
      created_at: undefined,
      updated_at: undefined,
    } as Record<string, unknown>;
    delete newProject.id;
    delete newProject.created_at;
    delete newProject.updated_at;

    const { data: created, error: cErr } = await context.supabase
      .from("projects")
      .insert(newProject as never)
      .select("id, slug")
      .maybeSingle();
    if (cErr) throw new Error(cErr.message);
    if (!created) throw new Error("Failed to duplicate project");

    if (!data.includeBuildings) return { ok: true as const, project: created };

    const { data: buildings } = await context.supabase
      .from("buildings")
      .select("*")
      .eq("project_id", data.id);
    const bMap = new Map<string, string>();
    for (const b of buildings ?? []) {
      const payload = { ...b, id: undefined, project_id: created.id, total_flats: 0, created_at: undefined, updated_at: undefined } as Record<string, unknown>;
      delete payload.id;
      delete payload.created_at;
      delete payload.updated_at;
      const { data: nb } = await context.supabase.from("buildings").insert(payload as never).select("id").maybeSingle();
      if (nb) bMap.set(b.id as string, nb.id as string);
    }

    if (!data.includeFloors) return { ok: true as const, project: created };
    const { data: floors } = await context.supabase.from("floors").select("*").eq("project_id", data.id);
    const flMap = new Map<string, string>();
    for (const f of floors ?? []) {
      const newBid = bMap.get(f.building_id as string);
      if (!newBid) continue;
      const payload = { ...f, id: undefined, project_id: created.id, building_id: newBid, total_flats: 0, created_at: undefined, updated_at: undefined } as Record<string, unknown>;
      delete payload.id;
      delete payload.created_at;
      delete payload.updated_at;
      const { data: nf } = await context.supabase.from("floors").insert(payload as never).select("id").maybeSingle();
      if (nf) flMap.set(f.id as string, nf.id as string);
    }

    if (!data.includeFlats) return { ok: true as const, project: created };
    const { data: flats } = await context.supabase.from("flats").select("*").eq("project_id", data.id);
    for (const flat of flats ?? []) {
      const newBid = bMap.get(flat.building_id as string);
      const newFid = flMap.get(flat.floor_id as string);
      if (!newBid || !newFid) continue;
      const payload = { ...flat, id: undefined, project_id: created.id, building_id: newBid, floor_id: newFid, status: "available", booking_status: "open", created_at: undefined, updated_at: undefined } as Record<string, unknown>;
      delete payload.id;
      delete payload.created_at;
      delete payload.updated_at;
      await context.supabase.from("flats").insert(payload as never);
    }

    return { ok: true as const, project: created };
  });

/* ============================= BUILDINGS ============================= */

export const adminListBuildings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ project_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: rows, error } = await context.supabase
      .from("buildings")
      .select("*")
      .eq("project_id", data.project_id)
      .order("ordering", { ascending: true });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

const buildingSchema = z.object({
  id: z.string().uuid().optional(),
  project_id: z.string().uuid(),
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(80),
  description: z.string().max(500).nullish(),
  total_floors: z.coerce.number().int().min(0).default(0),
  ordering: z.coerce.number().int().min(0).default(0),
  cover_url: z.string().url().max(500).nullish().or(z.literal("").transform(() => null)),
});

export const adminUpsertBuilding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => buildingSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.id) {
      const { data: row, error } = await context.supabase
        .from("buildings")
        .update(data as never)
        .eq("id", data.id)
        .select()
        .maybeSingle();
      if (error) throw new Error(error.message);
      return row;
    }
    const { data: row, error } = await context.supabase
      .from("buildings")
      .insert(data as never)
      .select()
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const adminDeleteBuilding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("buildings").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/* ============================= FLOORS ============================= */

const floorSchema = z.object({
  id: z.string().uuid().optional(),
  project_id: z.string().uuid(),
  building_id: z.string().uuid(),
  number: z.coerce.number().int().min(-5).max(200),
  name: z.string().max(60).nullish(),
  ordering: z.coerce.number().int().min(0).default(0),
  floor_plan_url: z.string().url().max(500).nullish().or(z.literal("").transform(() => null)),
});

export const adminUpsertFloor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => floorSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.id) {
      const { data: row, error } = await context.supabase
        .from("floors")
        .update(data as never)
        .eq("id", data.id)
        .select()
        .maybeSingle();
      if (error) throw new Error(error.message);
      return row;
    }
    const { data: row, error } = await context.supabase
      .from("floors")
      .insert(data as never)
      .select()
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const adminDeleteFloor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("floors").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/* ============================= FLATS ============================= */

const flatStatusEnum = z.enum(["available", "reserved", "sold", "not_released", "blocked"]);

const flatSchema = z.object({
  id: z.string().uuid().optional(),
  project_id: z.string().uuid(),
  building_id: z.string().uuid(),
  floor_id: z.string().uuid(),
  unit_code: z.string().min(1).max(40),
  configuration: z.string().max(60).nullish(),
  bedrooms: z.coerce.number().int().min(0).default(0),
  bathrooms: z.coerce.number().int().min(0).default(0),
  balconies: z.coerce.number().int().min(0).default(0),
  area_sqft: z.coerce.number().nonnegative().nullish(),
  facing: z.string().max(40).nullish(),
  price: z.coerce.number().nonnegative().nullish(),
  status: flatStatusEnum.default("available"),
  floor_plan_url: z.string().url().max(500).nullish().or(z.literal("").transform(() => null)),
  admin_notes: z.string().max(500).nullish(),
});

export const adminUpsertFlatFull = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => flatSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.id) {
      const { data: row, error } = await context.supabase
        .from("flats")
        .update(data as never)
        .eq("id", data.id)
        .select()
        .maybeSingle();
      if (error) throw new Error(error.message);
      return row;
    }
    const { data: row, error } = await context.supabase
      .from("flats")
      .insert(data as never)
      .select()
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const adminDeleteFlat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("flats").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const adminBulkCreateFlats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        project_id: z.string().uuid(),
        building_id: z.string().uuid(),
        floor_id: z.string().uuid(),
        prefix: z.string().min(1).max(20),
        start: z.coerce.number().int().min(1),
        count: z.coerce.number().int().min(1).max(50),
        bedrooms: z.coerce.number().int().min(0).default(2),
        bathrooms: z.coerce.number().int().min(0).default(2),
        balconies: z.coerce.number().int().min(0).default(1),
        area_sqft: z.coerce.number().nonnegative().nullish(),
        price: z.coerce.number().nonnegative().nullish(),
        configuration: z.string().max(60).nullish(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const rows = Array.from({ length: data.count }).map((_, i) => ({
      project_id: data.project_id,
      building_id: data.building_id,
      floor_id: data.floor_id,
      unit_code: `${data.prefix}${data.start + i}`,
      bedrooms: data.bedrooms,
      bathrooms: data.bathrooms,
      balconies: data.balconies,
      area_sqft: data.area_sqft ?? null,
      price: data.price ?? null,
      configuration: data.configuration ?? null,
      status: "available",
      booking_status: "open",
    }));
    const { error } = await context.supabase.from("flats").insert(rows as never);
    if (error) throw new Error(error.message);
    return { ok: true as const, created: rows.length };
  });

/* ============================= FLAT AUDIT LOG ============================= */

/**
 * List recent flat status changes for a project. Joins actor profile so the
 * admin UI can render "who changed what, when". Requires super_admin.
 */
export const adminListFlatStatusAudit = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ project_id: z.string().uuid(), limit: z.number().int().min(1).max(200).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);

    // Pull flat ids for the project (audit_logs.entity_id references the flat).
    const { data: flats, error: flatsErr } = await context.supabase
      .from("flats")
      .select("id, unit_code")
      .eq("project_id", data.project_id);
    if (flatsErr) throw new Error(flatsErr.message);

    const flatMap = new Map((flats ?? []).map((f) => [f.id as string, f.unit_code as string]));
    const flatIds = Array.from(flatMap.keys());
    if (flatIds.length === 0) return { entries: [] as Array<Record<string, unknown>> };

    const { data: rows, error } = await context.supabase
      .from("audit_logs")
      .select("id, actor_id, action, entity_id, previous_value, new_value, metadata, created_at")
      .eq("entity_type", "flat")
      .eq("action", "flat_status_changed")
      .in("entity_id", flatIds)
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 50);
    if (error) throw new Error(error.message);

    const actorIds = Array.from(new Set((rows ?? []).map((r) => r.actor_id).filter((v): v is string => !!v)));
    const actors = actorIds.length
      ? (await context.supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", actorIds)).data ?? []
      : [];
    const actorMap = new Map(actors.map((a) => [a.id as string, a.full_name as string | null]));

    return {
      entries: (rows ?? []).map((r) => ({
        id: r.id as string,
        created_at: r.created_at as string,
        actor_id: r.actor_id as string | null,
        actor_name: r.actor_id ? actorMap.get(r.actor_id as string) ?? null : null,
        flat_id: r.entity_id as string,
        unit_code: flatMap.get(r.entity_id as string) ?? "—",
        from_status: (r.previous_value as { status?: string } | null)?.status ?? null,
        to_status: (r.new_value as { status?: string } | null)?.status ?? null,
      })),
    };
  });
