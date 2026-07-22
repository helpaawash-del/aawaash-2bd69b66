import { createFileRoute } from "@tanstack/react-router";
import { validateEnvironment } from "@/lib/env-validation";

/**
 * Machine-readable health endpoint for uptime monitoring.
 * Public (no auth) — safe: reports only status booleans, never secret values.
 *
 * Response shape:
 *   { status: "ok"|"degraded"|"down", checks: { app, env, database, storage, auth } }
 * HTTP 200 when ok, 503 otherwise.
 */
export const Route = createFileRoute("/api/public/health")({
  server: {
    handlers: {
      GET: async () => {
        const started = Date.now();
        const env = validateEnvironment();

        const checks: Record<string, { ok: boolean; latency_ms?: number; error?: string }> = {
          app: { ok: true },
          env: { ok: env.ok, error: env.ok ? undefined : "missing_or_invalid_env" },
          database: { ok: false },
          storage: { ok: false },
          auth: { ok: false },
        };

        if (env.ok) {
          try {
            const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

            const t1 = Date.now();
            const { error: dbErr } = await supabaseAdmin
              .from("system_settings")
              .select("id")
              .limit(1);
            checks.database = { ok: !dbErr, latency_ms: Date.now() - t1, error: dbErr?.message };

            const t2 = Date.now();
            const { error: stErr } = await supabaseAdmin.storage.listBuckets();
            checks.storage = { ok: !stErr, latency_ms: Date.now() - t2, error: stErr?.message };

            // Auth is healthy if the admin client can reach the users endpoint.
            const t3 = Date.now();
            const { error: authErr } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1 });
            checks.auth = { ok: !authErr, latency_ms: Date.now() - t3, error: authErr?.message };
          } catch (e) {
            const message = e instanceof Error ? e.message : "unknown";
            checks.database = { ok: false, error: message };
          }
        }

        const allOk = Object.values(checks).every((c) => c.ok);
        const anyOk = Object.values(checks).some((c) => c.ok);
        const status = allOk ? "ok" : anyOk ? "degraded" : "down";

        return new Response(
          JSON.stringify({
            status,
            checks,
            env_checks: env.checks.map((c) => ({ name: c.name, present: c.present, valid: c.valid })),
            duration_ms: Date.now() - started,
            ts: new Date().toISOString(),
          }),
          {
            status: allOk ? 200 : 503,
            headers: {
              "content-type": "application/json",
              "cache-control": "no-store",
            },
          },
        );
      },
    },
  },
});
