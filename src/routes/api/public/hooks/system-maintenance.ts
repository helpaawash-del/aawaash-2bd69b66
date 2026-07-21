import { createFileRoute } from "@tanstack/react-router";

/**
 * Aawash scheduled maintenance hook.
 * Called by pg_cron via `net.http_post` with the Supabase anon apikey header.
 * The route lives under `/api/public/*` so it bypasses auth on the published site;
 * the handler still authenticates the caller via the `apikey` header.
 */
export const Route = createFileRoute("/api/public/hooks/system-maintenance")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apikey =
          request.headers.get("apikey") ||
          request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

        const expected =
          process.env.SUPABASE_PUBLISHABLE_KEY ||
          process.env.SUPABASE_ANON_KEY;

        if (!apikey || !expected || apikey !== expected) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "content-type": "application/json" },
          });
        }

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data, error } = await supabaseAdmin.rpc("system_run_maintenance");
          if (error) throw error;
          return Response.json({ ok: true, result: data });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Maintenance failed";
          console.error("system-maintenance", err);
          return new Response(JSON.stringify({ ok: false, error: message }), {
            status: 500,
            headers: { "content-type": "application/json" },
          });
        }
      },
    },
  },
});
