/**
 * Aawash — production environment validation.
 *
 * Called from server handlers/health endpoints to verify that every
 * required secret is present and shaped correctly. Never throws at module
 * scope (Cloudflare Workers inject env per-request); call inside a handler.
 */

export type EnvCheck = {
  name: string;
  present: boolean;
  valid: boolean;
  hint?: string;
};

type Rule = {
  name: string;
  required: boolean;
  validate?: (value: string) => boolean;
  hint?: string;
};

const RULES: Rule[] = [
  { name: "SUPABASE_URL", required: true, validate: (v) => /^https:\/\/.+\.supabase\.co$/.test(v), hint: "Managed by Lovable Cloud." },
  { name: "SUPABASE_PUBLISHABLE_KEY", required: true, validate: (v) => v.length > 20, hint: "Publishable anon/api key." },
  { name: "SUPABASE_SERVICE_ROLE_KEY", required: true, validate: (v) => v.length > 20, hint: "Server-only, never expose." },
  { name: "ADMIN_PANEL_PASSCODE", required: true, validate: (v) => /^\d{4,}$/.test(v.trim()) && !["0000", "1234", "1111"].includes(v.trim()), hint: "Admin panel passcode; must be set and not a well-known default." },
  { name: "SYSTEM_MAINTENANCE_SECRET", required: true, validate: (v) => v.length >= 32, hint: "Shared secret for the cron webhook." },
];

export function validateEnvironment(): { ok: boolean; checks: EnvCheck[] } {
  const checks: EnvCheck[] = RULES.map((rule) => {
    const raw = process.env[rule.name];
    const present = typeof raw === "string" && raw.length > 0;
    const valid = present && (!rule.validate || rule.validate(raw!));
    return { name: rule.name, present, valid, hint: rule.hint };
  });
  const ok = checks.every((c) => c.valid);
  return { ok, checks };
}

/** Redact a secret for safe logging. */
export function redact(value: string | undefined): string {
  if (!value) return "<missing>";
  if (value.length <= 8) return "***";
  return `${value.slice(0, 4)}…${value.slice(-2)}`;
}
