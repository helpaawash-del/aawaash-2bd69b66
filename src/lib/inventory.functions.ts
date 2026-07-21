import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

/**
 * Building / Floor / Flat inventory server functions.
 * Public reads use a server-side publishable client so signed-out visitors can
 * browse. Writes are restricted to super_admin (verified server-side).
 */

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

export type FlatStatus = "available" | "reserved" | "sold" | "not_released" | "blocked";

export type PublicFlat = {
  id: string;
  unit_code: string;
  building_id: string;
  floor_id: string;
  area_sqft: number | null;
  bedrooms: number;
  bathrooms: number;
  balconies: number;
  configuration: string | null;
  facing: string | null;
  price: number | null;
  status: FlatStatus;
  booking_status: string;
  construction_stage: string | null;
  gallery: unknown;
  floor_plan_url: string | null;
};

export type PublicFloor = {
  id: string;
  building_id: string;
  number: number;
  name: string | null;
  total_flats: number;
  floor_plan_url: string | null;
};

export type PublicBuilding = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  total_floors: number;
  total_flats: number;
  cover_url: string | null;
};

export type ProjectInventory = {
  project_id: string;
  buildings: PublicBuilding[];
  floors: PublicFloor[];
  flats: PublicFlat[];
};

/** PUBLIC — full inventory tree for a project (by slug). */
export const getProjectInventory = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ slug: z.string().min(1).max(120) }).parse(d))
  .handler(async ({ data }): Promise<ProjectInventory | null> => {
    const supabase = makePublicClient();
    const { data: proj, error: pErr } = await supabase
      .from("projects")
      .select("id")
      .eq("slug", data.slug)
      .eq("is_deleted", false)
      .eq("visibility", "public")
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    if (!proj) return null;

    const [{ data: buildings, error: bErr }, { data: floors, error: fErr }, { data: flats, error: flErr }] =
      await Promise.all([
        supabase
          .from("buildings")
          .select("id, code, name, description, total_floors, total_flats, cover_url, ordering")
          .eq("project_id", proj.id)
          .order("ordering", { ascending: true }),
        supabase
          .from("floors")
          .select("id, building_id, number, name, total_flats, floor_plan_url")
          .eq("project_id", proj.id)
          .order("number", { ascending: true }),
        supabase
          .from("flats")
          .select(
            "id, unit_code, building_id, floor_id, area_sqft, bedrooms, bathrooms, balconies, configuration, facing, price, status, booking_status, construction_stage, gallery, floor_plan_url",
          )
          .eq("project_id", proj.id)
          .order("unit_code", { ascending: true }),
      ]);
    if (bErr) throw new Error(bErr.message);
    if (fErr) throw new Error(fErr.message);
    if (flErr) throw new Error(flErr.message);

    return {
      project_id: proj.id,
      buildings: (buildings ?? []) as PublicBuilding[],
      floors: (floors ?? []) as PublicFloor[],
      flats: (flats ?? []) as PublicFlat[],
    };
  });

/* -------------------- ADMIN (super_admin only) -------------------- */

async function assertSuperAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "super_admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

const flatStatusEnum = z.enum(["available", "reserved", "sold", "not_released", "blocked"]);

export const adminUpdateFlatStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        flat_id: z.string().uuid(),
        status: flatStatusEnum,
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("flats")
      .update({ status: data.status })
      .eq("id", data.flat_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminUpsertFlat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        project_id: z.string().uuid(),
        building_id: z.string().uuid(),
        floor_id: z.string().uuid(),
        unit_code: z.string().min(1).max(40),
        area_sqft: z.number().nonnegative().nullable().optional(),
        bedrooms: z.number().int().nonnegative().optional(),
        bathrooms: z.number().int().nonnegative().optional(),
        balconies: z.number().int().nonnegative().optional(),
        configuration: z.string().max(60).nullable().optional(),
        facing: z.string().max(40).nullable().optional(),
        price: z.number().nonnegative().nullable().optional(),
        status: flatStatusEnum.optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { error, data: row } = await context.supabase
      .from("flats")
      .upsert(data as never, { onConflict: "id" })
      .select()
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

/** Create a temporary lock so a flat cannot be double-sold while checkout runs. */
export const adminLockFlat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        flat_id: z.string().uuid(),
        minutes: z.number().int().positive().max(120).default(15),
        reason: z.string().max(200).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const expires = new Date(Date.now() + data.minutes * 60_000).toISOString();

    // Atomic-ish: only lock if flat is currently available
    const { data: flat, error: fErr } = await context.supabase
      .from("flats")
      .select("id, status, booking_status")
      .eq("id", data.flat_id)
      .maybeSingle();
    if (fErr) throw new Error(fErr.message);
    if (!flat) throw new Error("Flat not found");
    if (flat.status === "sold") throw new Error("Flat already sold");
    if (flat.booking_status === "locked") throw new Error("Flat already locked");

    const { error: uErr } = await context.supabase
      .from("flats")
      .update({ booking_status: "locked" })
      .eq("id", data.flat_id)
      .eq("booking_status", "open");
    if (uErr) throw new Error(uErr.message);

    const { error: lErr } = await context.supabase.from("flat_locks").insert({
      flat_id: data.flat_id,
      locked_by: context.userId,
      expires_at: expires,
      reason: data.reason ?? null,
    } as never);
    if (lErr) throw new Error(lErr.message);

    return { ok: true, expires_at: expires };
  });

export const adminReleaseFlat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ flat_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("flats")
      .update({ booking_status: "open" })
      .eq("id", data.flat_id);
    if (error) throw new Error(error.message);
    await context.supabase
      .from("flat_locks")
      .update({ released: true } as never)
      .eq("flat_id", data.flat_id)
      .eq("released", false);
    return { ok: true };
  });
