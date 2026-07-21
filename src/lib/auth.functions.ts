import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { AAWASH_AUTH_EMAIL_DOMAIN } from "@/lib/auth";

/**
 * Public: does at least one super_admin exist?
 * Used by the auth screen to decide whether to show the one-time bootstrap
 * form. Once a super admin exists, the bootstrap path is permanently closed.
 */
export const superAdminExists = createServerFn({ method: "GET" }).handler(
  async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count, error } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "super_admin");
    if (error) throw new Error(error.message);
    return { exists: (count ?? 0) > 0 };
  },
);

const bootstrapSchema = z.object({
  fullName: z.string().trim().min(2).max(80),
  mobile: z.string().regex(/^\d{10}$/, "Mobile must be exactly 10 digits"),
  password: z.string().min(8).max(72),
});

/**
 * Public one-time endpoint: creates the very first Super Admin.
 * Refuses to run once any super_admin already exists.
 */
export const bootstrapSuperAdmin = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => bootstrapSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { count, error: countErr } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "super_admin");
    if (countErr) throw new Error(countErr.message);
    if ((count ?? 0) > 0) {
      throw new Error("A Super Admin already exists. Bootstrap is disabled.");
    }

    const loginId = data.mobile;
    const email = `${loginId.toLowerCase()}@${AAWASH_AUTH_EMAIL_DOMAIN}`;

    const { data: created, error: createErr } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password: data.password,
        email_confirm: true,
        user_metadata: {
          full_name: data.fullName,
          mobile_number: data.mobile,
          login_id: loginId,
          role: "super_admin",
        },
      });
    if (createErr || !created.user) {
      throw new Error(createErr?.message ?? "Failed to create Super Admin");
    }

    // The trigger inserts default 'member' role — replace with super_admin
    await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", created.user.id);
    await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: created.user.id, role: "super_admin" });

    return { ok: true as const, loginId };
  });

/**
 * Called after every successful sign-in to update last_login_at.
 * RLS restricts UPDATE to the user's own row.
 */
export const touchLastLogin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await supabase
      .from("profiles")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", userId);
    await supabase.from("audit_logs").insert({
      actor_id: userId,
      action: "login",
      entity_type: "session",
    });
    return { ok: true as const };
  });
