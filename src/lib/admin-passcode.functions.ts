import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getAdminPasscodeSession, passcodeMatches } from "./admin-passcode.server";

export const isAdminPanelUnlocked = createServerFn({ method: "GET" }).handler(async () => {
  const session = await getAdminPasscodeSession();
  return { unlocked: session.data.unlocked === true };
});

export const unlockAdminPanel = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ passcode: z.string().trim().length(4) }).parse(data))
  .handler(async ({ data }) => {
    const expected = process.env.ADMIN_PANEL_PASSCODE ?? "0000";
    if (!passcodeMatches(data.passcode, expected)) {
      return { ok: false as const, tokenHash: null, email: null };
    }
    const session = await getAdminPasscodeSession();
    await session.update({ unlocked: true });

    // The passcode IS the admin credential: mint a Supabase session for the
    // super admin so the admin panel's authenticated server fns work without
    // a second (user-facing) sign-in.
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: roleRow } = await supabaseAdmin
        .from("user_roles")
        .select("user_id")
        .eq("role", "super_admin")
        .limit(1)
        .maybeSingle();
      if (!roleRow?.user_id) return { ok: true as const, tokenHash: null, email: null };

      const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(roleRow.user_id);
      const email = userRes?.user?.email ?? null;
      if (!email) return { ok: true as const, tokenHash: null, email: null };

      const { data: link } = await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email,
      });
      return {
        ok: true as const,
        tokenHash: link?.properties?.hashed_token ?? null,
        email,
      };
    } catch {
      return { ok: true as const, tokenHash: null, email: null };
    }
  });


export const lockAdminPanel = createServerFn({ method: "POST" }).handler(async () => {
  const session = await getAdminPasscodeSession();
  await session.clear();
  return { ok: true as const };
});