// Digital Asset Management (DAM) server functions.
// Single source of truth for every media asset in Aawash.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";

const BUCKET = "cms-media";

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

const KINDS = [
  "image", "video", "pdf", "svg", "gif", "doc", "archive", "model", "lottie", "icon", "other",
] as const;

// Infer kind from filename / mime.
export function classifyAsset(filename: string, mime?: string | null): typeof KINDS[number] {
  const n = filename.toLowerCase();
  const m = (mime || "").toLowerCase();
  if (m.startsWith("image/svg") || n.endsWith(".svg")) return "svg";
  if (m === "image/gif" || n.endsWith(".gif")) return "gif";
  if (m.startsWith("image/") || /\.(jpe?g|png|webp|avif|bmp|tiff|ico)$/.test(n)) return "image";
  if (m.startsWith("video/") || /\.(mp4|mov|webm|mkv|m4v)$/.test(n)) return "video";
  if (m === "application/pdf" || n.endsWith(".pdf")) return "pdf";
  if (/\.(docx?|xlsx?|pptx?|odt|rtf|txt|csv)$/.test(n)) return "doc";
  if (/\.(zip|rar|7z|tar|gz)$/.test(n)) return "archive";
  if (/\.(glb|gltf|obj|fbx|usdz|stl)$/.test(n)) return "model";
  if (n.endsWith(".lottie") || (n.endsWith(".json") && n.includes("lottie"))) return "lottie";
  return "other";
}

/* ----------------- Dashboard ----------------- */

export const damDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: stats } = await context.supabase.rpc("asset_dashboard_stats");
    const { data: recent } = await context.supabase
      .from("assets")
      .select("id, filename, kind, storage_path, created_at, size")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(8);
    const { data: unused } = await context.supabase
      .from("assets")
      .select("id, filename, kind, storage_path, created_at")
      .eq("status", "active")
      .eq("usage_count", 0)
      .order("created_at", { ascending: false })
      .limit(8);
    // Sign preview URLs for images only
    const sign = async (rows: unknown) => {
      const list = (rows ?? []) as Array<{ id: string; storage_path: string; kind: string }>;
      return Promise.all(
        list.map(async (r) => {
          if (r.kind !== "image" && r.kind !== "svg" && r.kind !== "gif") return { ...r, signed_url: null };
          const { data: s } = await context.supabase.storage.from(BUCKET).createSignedUrl(r.storage_path, 3600);
          return { ...r, signed_url: s?.signedUrl ?? null };
        }),
      );
    };
    return {
      stats: (stats as Json) ?? {},
      recent: await sign(recent),
      unused: await sign(unused),
    };
  });

/* ----------------- Folders ----------------- */

export const damListFolders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data } = await context.supabase
      .from("asset_folders")
      .select("*")
      .order("path");
    return (data ?? []) as Array<{
      id: string; name: string; slug: string; parent_id: string | null; path: string;
      is_pinned: boolean; is_favorite: boolean; color: string | null;
    }>;
  });

export const damCreateFolder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ name: z.string().min(1).max(80), parent_id: z.string().uuid().nullable().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const slug = data.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || `f-${Date.now()}`;
    let parentPath = "";
    if (data.parent_id) {
      const { data: p } = await context.supabase.from("asset_folders").select("path").eq("id", data.parent_id).maybeSingle();
      parentPath = (p as { path?: string } | null)?.path ?? "";
    }
    const path = parentPath ? `${parentPath}/${slug}` : slug;
    const { data: row, error } = await context.supabase
      .from("asset_folders")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert({ name: data.name, slug, parent_id: data.parent_id ?? null, path, created_by: context.userId } as any)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await context.supabase.from("asset_audit_log").insert({ folder_id: (row as { id: string }).id, action: "folder_created", actor: context.userId });
    return { id: (row as { id: string }).id };
  });

export const damRenameFolder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), name: z.string().min(1).max(80) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const slug = data.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await context.supabase.from("asset_folders").update({ name: data.name, slug } as any).eq("id", data.id);
    return { ok: true };
  });

export const damDeleteFolder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    // detach assets first
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await context.supabase.from("assets").update({ folder_id: null } as any).eq("folder_id", data.id);
    await context.supabase.from("asset_folders").delete().eq("id", data.id);
    await context.supabase.from("asset_audit_log").insert({ folder_id: data.id, action: "folder_deleted", actor: context.userId });
    return { ok: true };
  });

export const damToggleFolderPin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), pinned: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await context.supabase.from("asset_folders").update({ is_pinned: data.pinned } as any).eq("id", data.id);
    return { ok: true };
  });

/* ----------------- Asset listing ----------------- */

export type DamAssetRow = {
  id: string;
  asset_code: string;
  filename: string;
  original_name: string;
  kind: string;
  storage_path: string;
  size: number | null;
  mime: string | null;
  width: number | null;
  height: number | null;
  duration_seconds: number | null;
  alt: string | null;
  caption: string | null;
  description: string | null;
  tags: string[];
  folder_id: string | null;
  usage_count: number;
  current_version: number;
  status: string;
  created_at: string;
  updated_at: string;
  uploaded_by: string | null;
  signed_url: string | null;
};

export const damListAssets = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    search: z.string().optional(),
    kind: z.string().optional(),
    folder_id: z.string().uuid().nullable().optional(),
    unused: z.boolean().optional(),
    status: z.enum(["active", "archived", "deleted"]).optional(),
    tag: z.string().optional(),
    sort: z.enum(["recent", "oldest", "name", "size", "usage"]).optional(),
    limit: z.number().int().min(1).max(500).optional(),
  }).parse(d ?? {}))
  .handler(async ({ data, context }): Promise<DamAssetRow[]> => {
    await assertAdmin(context.supabase, context.userId);
    let q = context.supabase.from("assets").select("*").limit(data.limit ?? 200);
    q = q.eq("status", data.status ?? "active");
    if (data.kind && data.kind !== "all") q = q.eq("kind", data.kind);
    if (data.folder_id !== undefined) {
      if (data.folder_id === null) q = q.is("folder_id", null);
      else q = q.eq("folder_id", data.folder_id);
    }
    if (data.unused) q = q.eq("usage_count", 0);
    if (data.tag) q = q.contains("tags", [data.tag]);
    if (data.search) q = q.or(`filename.ilike.%${data.search}%,original_name.ilike.%${data.search}%,alt.ilike.%${data.search}%,asset_code.ilike.%${data.search}%,description.ilike.%${data.search}%`);
    switch (data.sort ?? "recent") {
      case "oldest": q = q.order("created_at", { ascending: true }); break;
      case "name": q = q.order("filename", { ascending: true }); break;
      case "size": q = q.order("size", { ascending: false, nullsFirst: false }); break;
      case "usage": q = q.order("usage_count", { ascending: false }); break;
      default: q = q.order("created_at", { ascending: false });
    }
    const { data: rows } = await q;
    const list = (rows ?? []) as unknown as Array<Omit<DamAssetRow, "signed_url">>;
    return Promise.all(list.map(async (r) => {
      const previewable = ["image", "svg", "gif"].includes(r.kind);
      let signed: string | null = null;
      if (previewable || r.kind === "video" || r.kind === "pdf" || r.kind === "model" || r.kind === "lottie") {
        const { data: s } = await context.supabase.storage.from(BUCKET).createSignedUrl(r.storage_path, 3600);
        signed = s?.signedUrl ?? null;
      }
      return { ...r, signed_url: signed };
    }));
  });

export const damGetAsset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: asset } = await context.supabase.from("assets").select("*").eq("id", data.id).maybeSingle();
    if (!asset) throw new Error("Asset not found");
    const row = asset as unknown as Omit<DamAssetRow, "signed_url">;
    const { data: s } = await context.supabase.storage.from(BUCKET).createSignedUrl(row.storage_path, 3600);
    const { data: versions } = await context.supabase.from("asset_versions").select("*").eq("asset_id", data.id).order("version_number", { ascending: false });
    const versionsSigned = await Promise.all(
      ((versions ?? []) as Array<{ id: string; storage_path: string; version_number: number; size: number | null; mime: string | null; note: string | null; uploaded_by: string | null; created_at: string }>).map(async (v) => {
        const { data: vs } = await context.supabase.storage.from(BUCKET).createSignedUrl(v.storage_path, 3600);
        return { ...v, signed_url: vs?.signedUrl ?? null };
      }),
    );
    const { data: usage } = await context.supabase.from("asset_usage").select("*").eq("asset_id", data.id).order("created_at", { ascending: false });
    const { data: audit } = await context.supabase.from("asset_audit_log").select("*").eq("asset_id", data.id).order("created_at", { ascending: false }).limit(30);
    return {
      asset: { ...row, signed_url: s?.signedUrl ?? null } as DamAssetRow,
      versions: versionsSigned,
      usage: (usage ?? []) as Array<{ id: string; context: string; ref_id: string | null; ref_label: string | null; ref_url: string | null; created_at: string }>,
      audit: (audit ?? []) as Array<{ id: string; action: string; actor: string | null; meta: Json; created_at: string }>,
    };
  });

/* ----------------- Upload ----------------- */

export const damCreateUploadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    filename: z.string().min(1).max(255),
    size: z.number().int().nonnegative().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const MAX = 200 * 1024 * 1024; // 200 MB
    if (data.size && data.size > MAX) throw new Error("File too large (max 200 MB)");
    const safe = data.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${new Date().getFullYear()}/${new Date().getMonth() + 1}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safe}`;
    const { data: signed, error } = await context.supabase.storage.from(BUCKET).createSignedUploadUrl(path);
    if (error) throw new Error(error.message);
    return { path, signed_url: signed.signedUrl, token: signed.token };
  });

export const damRegisterAsset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    storage_path: z.string(),
    filename: z.string(),
    size: z.number().optional(),
    mime: z.string().optional(),
    width: z.number().int().optional(),
    height: z.number().int().optional(),
    duration_seconds: z.number().optional(),
    folder_id: z.string().uuid().nullable().optional(),
    alt: z.string().optional(),
    tags: z.array(z.string()).optional(),
  }).parse(d))
  .handler(async ({ data, context }): Promise<{ id: string; asset_code: string }> => {
    await assertAdmin(context.supabase, context.userId);
    const kind = classifyAsset(data.filename, data.mime);
    const payload = {
      storage_path: data.storage_path,
      filename: data.filename,
      original_name: data.filename,
      kind,
      size: data.size ?? null,
      mime: data.mime ?? null,
      width: data.width ?? null,
      height: data.height ?? null,
      duration_seconds: data.duration_seconds ?? null,
      folder_id: data.folder_id ?? null,
      alt: data.alt ?? null,
      tags: data.tags ?? [],
      uploaded_by: context.userId,
      updated_by: context.userId,
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await context.supabase.from("assets").insert(payload as any).select("id, asset_code, storage_path, size, mime, width, height, duration_seconds").single();
    if (res.error) throw new Error(res.error.message);
    const row = res.data as { id: string; asset_code: string; storage_path: string; size: number | null; mime: string | null; width: number | null; height: number | null; duration_seconds: number | null };
    // seed version 1
    await context.supabase.from("asset_versions").insert({
      asset_id: row.id, version_number: 1, storage_path: row.storage_path,
      size: row.size, mime: row.mime, width: row.width, height: row.height, duration_seconds: row.duration_seconds,
      note: "Initial upload", uploaded_by: context.userId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    await context.supabase.from("asset_audit_log").insert({ asset_id: row.id, action: "uploaded", actor: context.userId, meta: { filename: data.filename, size: data.size } });
    return { id: row.id, asset_code: row.asset_code };
  });

/* ----------------- Mutations ----------------- */

export const damUpdateAsset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(),
    filename: z.string().min(1).optional(),
    alt: z.string().nullable().optional(),
    caption: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    tags: z.array(z.string()).optional(),
    folder_id: z.string().uuid().nullable().optional(),
    status: z.enum(["active", "archived"]).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { id, ...patch } = data;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await context.supabase.from("assets").update({ ...patch, updated_by: context.userId } as any).eq("id", id);
    if (res.error) throw new Error(res.error.message);
    await context.supabase.from("asset_audit_log").insert({ asset_id: id, action: "updated", actor: context.userId, meta: patch as Json });
    return { ok: true };
  });

export const damMoveAssets = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ ids: z.array(z.string().uuid()).min(1), folder_id: z.string().uuid().nullable() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await context.supabase.from("assets").update({ folder_id: data.folder_id, updated_by: context.userId } as any).in("id", data.ids);
    return { ok: true, count: data.ids.length };
  });

export const damDeleteAssets = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ ids: z.array(z.string().uuid()).min(1), hard: z.boolean().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    if (data.hard) {
      // remove storage + row
      const { data: rows } = await context.supabase.from("assets").select("id, storage_path").in("id", data.ids);
      const paths = ((rows ?? []) as Array<{ storage_path: string }>).map((r) => r.storage_path);
      if (paths.length) await context.supabase.storage.from(BUCKET).remove(paths);
      // remove version files too
      const { data: vers } = await context.supabase.from("asset_versions").select("storage_path").in("asset_id", data.ids);
      const vpaths = ((vers ?? []) as Array<{ storage_path: string }>).map((v) => v.storage_path).filter((p) => !paths.includes(p));
      if (vpaths.length) await context.supabase.storage.from(BUCKET).remove(vpaths);
      await context.supabase.from("assets").delete().in("id", data.ids);
      return { ok: true, hard: true };
    }
    for (const id of data.ids) {
      await context.supabase.rpc("asset_soft_delete", { _asset_id: id });
    }
    return { ok: true, hard: false };
  });

export const damRestoreAsset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.rpc("asset_restore", { _asset_id: data.id });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const damReplaceAsset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(),
    storage_path: z.string(),
    size: z.number().optional(),
    mime: z.string().optional(),
    width: z.number().int().optional(),
    height: z.number().int().optional(),
    duration_seconds: z.number().optional(),
    note: z.string().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: v, error } = await context.supabase.rpc("asset_replace", {
      _asset_id: data.id,
      _storage_path: data.storage_path,
      _size: data.size ?? null,
      _mime: data.mime ?? null,
      _width: data.width ?? null,
      _height: data.height ?? null,
      _duration: data.duration_seconds ?? null,
      _note: data.note ?? "",
    });
    if (error) throw new Error(error.message);
    return { version_number: v as number };
  });

export const damRollbackAsset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), version_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("asset_rollback", { _asset_id: data.id, _version_id: data.version_id });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ----------------- Audit ----------------- */

export const damRecentAudit = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data } = await context.supabase.from("asset_audit_log").select("*").order("created_at", { ascending: false }).limit(40);
    return (data ?? []) as Array<{ id: string; asset_id: string | null; folder_id: string | null; action: string; actor: string | null; meta: Json; created_at: string }>;
  });

/* ----------------- Signed URL fetch (single) ----------------- */

export const damGetSignedUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ path: z.string(), download: z.boolean().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: s, error } = await context.supabase.storage.from(BUCKET).createSignedUrl(
      data.path,
      3600,
      data.download ? { download: true } : undefined,
    );
    if (error) throw new Error(error.message);
    return { url: s.signedUrl };
  });
