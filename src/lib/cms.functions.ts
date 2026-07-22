import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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

/* ---------------- Pages ---------------- */

export const cmsListPages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ search: z.string().optional(), status: z.string().optional() }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    let q = context.supabase.from("cms_pages").select("*").order("updated_at", { ascending: false });
    if (data.status && data.status !== "all") q = q.eq("status", data.status);
    if (data.search) q = q.or(`title.ilike.%${data.search}%,slug.ilike.%${data.search}%`);
    const { data: rows, error } = await q;
    if (error) throw error;
    return rows ?? [];
  });

export const cmsGetPage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: page, error } = await context.supabase.from("cms_pages").select("*").eq("id", data.id).maybeSingle();
    if (error) throw error;
    if (!page) throw new Error("Page not found");
    const versions = await context.supabase
      .from("cms_page_versions")
      .select("id, version_number, note, created_at, created_by")
      .eq("page_id", data.id)
      .order("version_number", { ascending: false })
      .limit(50);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let currentBlocks: any[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let currentSeo: Record<string, any> = {};
    if (page.current_version_id) {
      const { data: v } = await context.supabase
        .from("cms_page_versions")
        .select("blocks, seo")
        .eq("id", page.current_version_id)
        .maybeSingle();
      if (v) {
        currentBlocks = Array.isArray(v.blocks) ? (v.blocks as unknown[]) : [];
        currentSeo = (v.seo && typeof v.seo === "object" ? v.seo : {}) as Record<string, unknown>;
      }
    }
    return { page, versions: versions.data ?? [], blocks: currentBlocks, seo: currentSeo };
  });

export const cmsCreatePage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      slug: z.string().min(1).regex(/^[a-z0-9-/_]+$/, "lowercase, digits, - _ /"),
      title: z.string().min(1),
      seo_title: z.string().optional(),
      seo_description: z.string().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: page, error } = await context.supabase
      .from("cms_pages")
      .insert({
        slug: data.slug,
        title: data.title,
        seo_title: data.seo_title ?? data.title,
        seo_description: data.seo_description,
        created_by: context.userId,
        updated_by: context.userId,
      })
      .select()
      .single();
    if (error) throw error;
    // seed first version with empty blocks
    const { data: vid } = await context.supabase.rpc("cms_save_draft", {
      _page_id: page.id,
      _blocks: [],
      _seo: {},
      _note: "Initial version",
    });
    return { id: page.id, version_id: vid };
  });

export const cmsSaveDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      page_id: z.string().uuid(),
      blocks: z.any(),
      seo: z.any().optional(),
      note: z.string().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: vid, error } = await context.supabase.rpc("cms_save_draft", {
      _page_id: data.page_id,
      _blocks: data.blocks ?? [],
      _seo: data.seo ?? {},
      _note: data.note ?? "",
    });
    if (error) throw error;
    return { version_id: vid };
  });

export const cmsPublishPage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ page_id: z.string().uuid(), note: z.string().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: vid, error } = await context.supabase.rpc("cms_publish_page", {
      _page_id: data.page_id,
      _note: data.note ?? "",
    });
    if (error) throw error;
    return { version_id: vid };
  });

export const cmsSetPageStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ page_id: z.string().uuid(), status: z.enum(["draft", "published", "archived"]) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("cms_pages").update({ status: data.status, updated_by: context.userId }).eq("id", data.page_id);
    if (error) throw error;
    return { ok: true };
  });

export const cmsUpdatePageMeta = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      page_id: z.string().uuid(),
      title: z.string().optional(),
      slug: z.string().optional(),
      seo_title: z.string().nullable().optional(),
      seo_description: z.string().nullable().optional(),
      seo_keywords: z.string().nullable().optional(),
      og_image: z.string().nullable().optional(),
      canonical_url: z.string().nullable().optional(),
      visibility: z.enum(["public", "private", "scheduled"]).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { page_id, ...patch } = data;
    const { error } = await context.supabase.from("cms_pages").update({ ...patch, updated_by: context.userId }).eq("id", page_id);
    if (error) throw error;
    return { ok: true };
  });

export const cmsDuplicatePage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ page_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: src } = await context.supabase.from("cms_pages").select("*").eq("id", data.page_id).maybeSingle();
    if (!src) throw new Error("Page not found");
    const newSlug = `${src.slug}-copy-${Date.now().toString(36)}`;
    const { data: page, error } = await context.supabase
      .from("cms_pages")
      .insert({
        slug: newSlug,
        title: `${src.title} (Copy)`,
        seo_title: src.seo_title,
        seo_description: src.seo_description,
        created_by: context.userId,
        updated_by: context.userId,
      })
      .select()
      .single();
    if (error) throw error;
    if (src.current_version_id) {
      const { data: v } = await context.supabase.from("cms_page_versions").select("blocks, seo").eq("id", src.current_version_id).maybeSingle();
      if (v) {
        await context.supabase.rpc("cms_save_draft", {
          _page_id: page.id,
          _blocks: v.blocks,
          _seo: v.seo,
          _note: "Duplicated",
        });
      }
    }
    return { id: page.id };
  });

export const cmsRollbackPage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ page_id: z.string().uuid(), version_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: vid, error } = await context.supabase.rpc("cms_rollback_page", {
      _page_id: data.page_id,
      _version_id: data.version_id,
    });
    if (error) throw error;
    return { version_id: vid };
  });

export const cmsGetVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ version_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: v, error } = await context.supabase.from("cms_page_versions").select("*").eq("id", data.version_id).maybeSingle();
    if (error) throw error;
    return v;
  });

/* ---------------- Brand ---------------- */

export const cmsGetBrand = createServerFn({ method: "GET" }).handler(async () => {
  const { createClient } = await import("@supabase/supabase-js");
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  const client = createClient(process.env.SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
  const { data } = await client.from("cms_brand_settings").select("*").eq("id", 1).maybeSingle();
  return data;
});

export const cmsUpdateBrand = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      colors: z.any().optional(),
      fonts: z.any().optional(),
      radii: z.any().optional(),
      shadows: z.any().optional(),
      gradients: z.any().optional(),
      logo_url: z.string().nullable().optional(),
      logo_dark_url: z.string().nullable().optional(),
      favicon_url: z.string().nullable().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("cms_brand_settings")
      .upsert({ id: 1, ...data, updated_by: context.userId }, { onConflict: "id" });
    if (error) throw error;
    return { ok: true };
  });

/* ---------------- Global content ---------------- */

export const cmsGetGlobal = createServerFn({ method: "GET" }).handler(async () => {
  const { createClient } = await import("@supabase/supabase-js");
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  const client = createClient(process.env.SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
  const { data } = await client.from("cms_global_content").select("*").order("category");
  return data ?? [];
});

export const cmsUpdateGlobal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ key: z.string(), value: z.any() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("cms_global_content")
      .update({ value: data.value, updated_by: context.userId })
      .eq("key", data.key);
    if (error) throw error;
    return { ok: true };
  });

/* ---------------- Media ---------------- */

export const cmsListMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ search: z.string().optional(), kind: z.string().optional() }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    let q = context.supabase.from("cms_media").select("*").order("created_at", { ascending: false }).limit(200);
    if (data.kind && data.kind !== "all") q = q.eq("kind", data.kind);
    if (data.search) q = q.or(`filename.ilike.%${data.search}%,alt.ilike.%${data.search}%`);
    const { data: rows } = await q;
    // sign URLs
    const signed = await Promise.all(
      (rows ?? []).map(async (r) => {
        const { data: s } = await context.supabase.storage.from("cms-media").createSignedUrl(r.storage_path, 3600);
        return { ...r, signed_url: s?.signedUrl ?? null };
      }),
    );
    return signed;
  });

export const cmsCreateMediaUploadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ filename: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const path = `${Date.now()}-${data.filename.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { data: signed, error } = await context.supabase.storage
      .from("cms-media")
      .createSignedUploadUrl(path);
    if (error) throw error;
    return { path, token: signed.token, signed_url: signed.signedUrl };
  });

export const cmsRegisterMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      storage_path: z.string(),
      filename: z.string(),
      kind: z.enum(["image", "video", "pdf", "svg", "lottie", "model", "other"]).optional(),
      size: z.number().optional(),
      mime: z.string().optional(),
      alt: z.string().optional(),
      category: z.string().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: row, error } = await context.supabase
      .from("cms_media")
      .insert({ ...data, uploaded_by: context.userId })
      .select()
      .single();
    if (error) throw error;
    return row;
  });

export const cmsDeleteMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: row } = await context.supabase.from("cms_media").select("storage_path").eq("id", data.id).maybeSingle();
    if (row) await context.supabase.storage.from("cms-media").remove([row.storage_path]);
    await context.supabase.from("cms_media").delete().eq("id", data.id);
    return { ok: true };
  });

/* ---------------- Audit / dashboard ---------------- */

export const cmsRecentAudit = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data } = await context.supabase
      .from("cms_audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30);
    return data ?? [];
  });
