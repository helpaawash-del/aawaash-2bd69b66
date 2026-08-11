import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { mergeHomepage, type HomepageDoc } from "@/lib/homepage-content";

const HOMEPAGE_KEY = "homepage";

const itemSchema = z.object({
  title: z.string().max(400).default(""),
  body: z.string().max(2000).optional(),
});

const sectionSchema = z.object({
  enabled: z.boolean().default(true),
  eyebrow: z.string().max(200).optional(),
  title: z.string().max(400).optional(),
  accent: z.string().max(200).optional(),
  subtitle: z.string().max(1200).optional(),
  image: z.string().max(2000).optional(),
  items: z.array(itemSchema).max(40).optional(),
});

const docSchema = z.record(z.string().max(60), sectionSchema);

/** Public read — anon SELECT policy on cms_global_content covers this. */
export const getHomepageContent = createServerFn({ method: "GET" }).handler(
  async (): Promise<HomepageDoc> => {
    const { createClient } = await import("@supabase/supabase-js");
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const client = createClient(process.env["SUPABASE_URL"]!, key, {
      auth: { persistSession: false, autoRefreshToken: false },
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
    const { data } = await client
      .from("cms_global_content")
      .select("value")
      .eq("key", HOMEPAGE_KEY)
      .maybeSingle();
    return mergeHomepage(data?.value);
  },
);

export const saveHomepageContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ doc: docSchema }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error: roleError } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "super_admin",
    });
    if (roleError) throw new Error(roleError.message);
    if (!isAdmin) throw new Error("Admin only");

    const { data: row, error } = await context.supabase
      .from("cms_global_content")
      .upsert(
        {
          key: HOMEPAGE_KEY,
          value: data.doc as never,
          label: "Public homepage",
          category: "homepage",
          updated_by: context.userId,
        },
        { onConflict: "key" },
      )
      .select("key")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Homepage content was not saved — please retry.");
    return { ok: true as const };
  });
