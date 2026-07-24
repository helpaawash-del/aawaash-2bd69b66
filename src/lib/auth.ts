/**
 * Aawash auth helpers (browser-side)
 * ---------------------------------------------------------
 * - Login IDs are the user-facing credential:
 *     Super Admin / Team Leader → 10-digit mobile (e.g. 9876543210)
 *     Member                    → TeamLetter + 10-digit mobile (e.g. A9876543210)
 * - Supabase Auth requires an email, so we deterministically synthesize
 *   an internal email per user. Users never see this address.
 */

export const AAWASH_AUTH_EMAIL_DOMAIN = "auth.aawash.app";

/** Validate a raw Login ID typed at the login screen. */
export function validateLoginId(input: string): {
  ok: boolean;
  normalized: string;
  reason?: string;
} {
  const trimmed = input.trim().toUpperCase();
  if (!trimmed) return { ok: false, normalized: "", reason: "Login ID is required" };

  // Team Leader / Super Admin: 10 digits only
  if (/^\d{10}$/.test(trimmed)) return { ok: true, normalized: trimmed };

  // Member: single team letter + 10 digits
  if (/^[A-Z]\d{10}$/.test(trimmed)) return { ok: true, normalized: trimmed };

  return {
    ok: false,
    normalized: trimmed,
    reason: "Enter a valid Login ID (mobile, or TeamLetter+mobile)",
  };
}

/** Convert a Login ID into the internal synthesized email. */
export function loginIdToEmail(loginId: string): string {
  return `${loginId.toLowerCase()}@${AAWASH_AUTH_EMAIL_DOMAIN}`;
}

export type AppRole = "super_admin" | "team_leader" | "member";

/**
 * Normalize a redirect target to an internal, router-safe path.
 * TanStack `navigate({ to })` rejects absolute URLs, so we strip the
 * origin if a caller accidentally forwarded `window.location.href`.
 * Only same-app paths are accepted; anything external falls back to `null`.
 */
export function toInternalPath(input: string | null | undefined): string | null {
  if (!input) return null;
  const raw = String(input).trim();
  if (!raw) return null;
  if (raw.startsWith("/") && !raw.startsWith("//")) return raw;
  try {
    const url = new URL(raw, "http://x.local");
    return `${url.pathname}${url.search}${url.hash}` || null;
  } catch {
    return null;
  }
}

/** Where each role lands after signing in. */
export function homePathForRole(role: AppRole | null | undefined): string {
  switch (role) {
    case "super_admin":
      return "/admin";
    case "team_leader":
      return "/leader";
    case "member":
      return "/member";
    default:
      return "/dashboard";
  }
}

/** Human label for a role. */
export function roleLabel(role: AppRole | null | undefined): string {
  switch (role) {
    case "super_admin":
      return "Super Admin";
    case "team_leader":
      return "Team Leader";
    case "member":
      return "Member";
    default:
      return "Member";
  }
}
