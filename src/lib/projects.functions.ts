import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

/**
 * Public + authenticated Project catalogue server functions.
 * Public reads use a server-side publishable client so signed-out visitors
 * can browse the landing page and /projects without authentication.
 */

const PROJECT_LIST_COLUMNS =
  "id, slug, name, location, address, latitude, longitude, google_map_url, project_type, construction_status, visibility, display_priority, short_description, description, tag, price_from, price_min, price_max, area_min, area_max, total_buildings, total_floors, total_flats, available_flats, reserved_flats, sold_flats, total_units, sold_units, completion_percent, hero_hue, thumbnail_url, hero_banner_url, cover_url, logo_url, launch_date, possession_date, gallery_count, video_count, model_count, floor_plan_count, amenities, seo_title, seo_description, gallery, three_d_tour_url, virtual_walkthrough_url, extra, created_at";

function makePublicClient() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

const filterSchema = z
  .object({
    q: z.string().max(120).optional(),
    location: z.string().max(120).optional(),
    project_type: z.string().max(40).optional(),
    construction_status: z.string().max(40).optional(),
    priceMin: z.number().nonnegative().optional(),
    priceMax: z.number().nonnegative().optional(),
    availability: z.enum(["available", "sold_out", "any"]).optional(),
    sort: z
      .enum(["newest", "oldest", "alphabetical", "priority", "price_low", "price_high"])
      .optional(),
    limit: z.number().int().positive().max(100).optional(),
  })
  .partial();

export type ProjectFilters = z.infer<typeof filterSchema>;

/** PUBLIC — list projects visible to signed-out visitors (visibility='public'). */
export const listPublicProjects = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => filterSchema.parse(d ?? {}))
  .handler(async ({ data }) => {
    const supabase = makePublicClient();
    let query = supabase
      .from("projects")
      .select(PROJECT_LIST_COLUMNS)
      .eq("is_deleted", false)
      .eq("visibility", "public");

    if (data.q) {
      const t = data.q.trim();
      query = query.or(
        `name.ilike.%${t}%,location.ilike.%${t}%,address.ilike.%${t}%,description.ilike.%${t}%`,
      );
    }
    if (data.location) query = query.ilike("location", `%${data.location}%`);
    if (data.project_type) query = query.eq("project_type", data.project_type);
    if (data.construction_status) query = query.eq("construction_status", data.construction_status);
    if (data.priceMin !== undefined) query = query.gte("price_from", data.priceMin);
    if (data.priceMax !== undefined) query = query.lte("price_from", data.priceMax);
    if (data.availability === "available") query = query.gt("available_flats", 0);
    if (data.availability === "sold_out") query = query.eq("available_flats", 0);

    switch (data.sort) {
      case "oldest":
        query = query.order("created_at", { ascending: true });
        break;
      case "alphabetical":
        query = query.order("name", { ascending: true });
        break;
      case "priority":
        query = query
          .order("display_priority", { ascending: false })
          .order("created_at", { ascending: false });
        break;
      case "price_low":
        query = query.order("price_from", { ascending: true });
        break;
      case "price_high":
        query = query.order("price_from", { ascending: false });
        break;
      case "newest":
      default:
        query = query
          .order("display_priority", { ascending: false })
          .order("created_at", { ascending: false });
    }

    if (data.limit) query = query.limit(data.limit);

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

/** PUBLIC — single project by slug (visibility='public'). */
export const getPublicProject = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ slug: z.string().min(1).max(120) }).parse(d))
  .handler(async ({ data }) => {
    const supabase = makePublicClient();
    const { data: row, error } = await supabase
      .from("projects")
      .select(PROJECT_LIST_COLUMNS)
      .eq("slug", data.slug)
      .eq("is_deleted", false)
      .eq("visibility", "public")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

/** PUBLIC — aggregated statistics across the catalogue. */
export const getPublicProjectStats = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = makePublicClient();
  const { data, error } = await supabase
    .from("projects")
    .select(
      "total_buildings, total_flats, available_flats, reserved_flats, sold_flats, completion_percent",
    )
    .eq("is_deleted", false)
    .eq("visibility", "public");
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  const acc = rows.reduce(
    (a, r) => ({
      projects: a.projects + 1,
      buildings: a.buildings + (r.total_buildings ?? 0),
      total: a.total + (r.total_flats ?? 0),
      available: a.available + (r.available_flats ?? 0),
      reserved: a.reserved + (r.reserved_flats ?? 0),
      sold: a.sold + (r.sold_flats ?? 0),
      completionSum: a.completionSum + (r.completion_percent ?? 0),
    }),
    { projects: 0, buildings: 0, total: 0, available: 0, reserved: 0, sold: 0, completionSum: 0 },
  );
  return {
    projects: acc.projects,
    buildings: acc.buildings,
    total_flats: acc.total,
    available_flats: acc.available,
    reserved_flats: acc.reserved,
    sold_flats: acc.sold,
    avg_completion: acc.projects ? Math.round(acc.completionSum / acc.projects) : 0,
    occupancy_pct: acc.total ? Math.round((acc.sold / acc.total) * 100) : 0,
  };
});

/** AUTHENTICATED — includes non-public visibility (internal) for signed-in staff. */
export const listAllProjects = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => filterSchema.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    let query = context.supabase
      .from("projects")
      .select(PROJECT_LIST_COLUMNS)
      .eq("is_deleted", false);

    if (data.q) {
      const t = data.q.trim();
      query = query.or(
        `name.ilike.%${t}%,location.ilike.%${t}%,address.ilike.%${t}%,description.ilike.%${t}%`,
      );
    }
    if (data.project_type) query = query.eq("project_type", data.project_type);
    if (data.construction_status) query = query.eq("construction_status", data.construction_status);
    if (data.availability === "available") query = query.gt("available_flats", 0);
    if (data.availability === "sold_out") query = query.eq("available_flats", 0);

    query = query
      .order("display_priority", { ascending: false })
      .order("created_at", { ascending: false });

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

/* -------------------- Favorites (authenticated) -------------------- */

export const listMyFavorites = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("project_favorites")
      .select("project_id")
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => r.project_id);
  });

export const toggleFavorite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ project_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const existing = await context.supabase
      .from("project_favorites")
      .select("id")
      .eq("user_id", context.userId)
      .eq("project_id", data.project_id)
      .maybeSingle();
    if (existing.data) {
      await context.supabase.from("project_favorites").delete().eq("id", existing.data.id);
      return { favorited: false as const };
    }
    await context.supabase
      .from("project_favorites")
      .insert({ user_id: context.userId, project_id: data.project_id });
    return { favorited: true as const };
  });

/* -------------------- Admin CRUD (super_admin) -------------------- */

const upsertSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().min(2).max(80).regex(/^[a-z0-9-]+$/, "lowercase-with-dashes"),
  name: z.string().min(2).max(120),
  location: z.string().min(2).max(120),
  address: z.string().max(240).optional().nullable(),
  project_type: z.string().min(2).max(40),
  construction_status: z.string().min(2).max(40),
  visibility: z.enum(["public", "internal", "draft", "archived"]).default("public"),
  display_priority: z.number().int().min(0).max(1000).default(0),
  short_description: z.string().max(240).optional().nullable(),
  description: z.string().max(4000).optional().nullable(),
  tag: z.string().max(40).optional().nullable(),
  price_from: z.number().nonnegative().default(0),
  price_min: z.number().nonnegative().optional().nullable(),
  price_max: z.number().nonnegative().optional().nullable(),
  total_buildings: z.number().int().min(0).default(1),
  total_floors: z.number().int().min(0).default(0),
  total_flats: z.number().int().min(0).default(0),
  available_flats: z.number().int().min(0).default(0),
  reserved_flats: z.number().int().min(0).default(0),
  sold_flats: z.number().int().min(0).default(0),
  completion_percent: z.number().int().min(0).max(100).default(0),
  thumbnail_url: z.string().url().max(500).optional().nullable(),
  hero_banner_url: z.string().url().max(500).optional().nullable(),
});

export const upsertProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => upsertSchema.parse(d))
  .handler(async ({ data, context }) => {
    // Verify super_admin
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "super_admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    // Consistency validation
    if (data.total_flats > 0 &&
      data.available_flats + data.reserved_flats + data.sold_flats > data.total_flats) {
      throw new Error("Available + Reserved + Sold cannot exceed Total Flats");
    }

    const payload = { ...data, total_units: data.total_flats, sold_units: data.sold_flats };
    if (data.id) {
      const { data: row, error } = await context.supabase
        .from("projects")
        .update(payload)
        .eq("id", data.id)
        .select("id, slug")
        .maybeSingle();
      if (error) throw new Error(error.message);
      return { ok: true as const, project: row };
    }
    const { data: row, error } = await context.supabase
      .from("projects")
      .insert(payload)
      .select("id, slug")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { ok: true as const, project: row };
  });

export const softDeleteProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "super_admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { error } = await context.supabase
      .from("projects")
      .update({ is_deleted: true, visibility: "archived" })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
