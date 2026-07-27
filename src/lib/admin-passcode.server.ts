import { useSession, getRequest } from "@tanstack/react-start/server";
import { createHash, timingSafeEqual } from "node:crypto";

type AdminPasscodeSession = { unlocked?: boolean };

/* ------------------------------------------------------------------ */
/*  Session                                                            */
/* ------------------------------------------------------------------ */

function getSessionConfig() {
  const password = process.env.ADMIN_PASSCODE_SESSION_SECRET;
  if (!password) throw new Error("Admin passcode session is not configured");
  return {
    password,
    name: "aawash-admin-passcode",
    maxAge: 60 * 60 * 12,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
    },
  };
}

export function passcodeMatches(input: string, expected: string): boolean {
  const a = createHash("sha256").update(input, "utf8").digest();
  const b = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(a, b);
}

export async function getAdminPasscodeSession() {
  return useSession<AdminPasscodeSession>(getSessionConfig());
}

/* ------------------------------------------------------------------ */
/*  Brute-force protection                                             */
/* ------------------------------------------------------------------ */

/** Failures allowed inside the rolling window before the gate locks. */
export const PASSCODE_MAX_FAILURES = 5;
/** Rolling window, in milliseconds, that failures are counted over. */
export const PASSCODE_WINDOW_MS = 15 * 60 * 1000;

export type RateLimitDecision = {
  blocked: boolean;
  /** Failures still allowed before the lock kicks in. */
  remaining: number;
  /** Milliseconds until the caller may try again (0 when not blocked). */
  retryAfterMs: number;
};

/**
 * Pure rolling-window decision so the policy is unit-testable without a DB.
 * `failureTimes` are epoch-ms timestamps of recent FAILED attempts (any order).
 */
export function evaluateRateLimit(failureTimes: number[], now = Date.now()): RateLimitDecision {
  const recent = failureTimes.filter((t) => now - t < PASSCODE_WINDOW_MS).sort((a, b) => a - b);
  const remaining = Math.max(0, PASSCODE_MAX_FAILURES - recent.length);
  if (recent.length < PASSCODE_MAX_FAILURES) {
    return { blocked: false, remaining, retryAfterMs: 0 };
  }
  // Locked until the oldest counted failure ages out of the window.
  const oldestCounted = recent[recent.length - PASSCODE_MAX_FAILURES];
  const retryAfterMs = Math.max(1000, oldestCounted + PASSCODE_WINDOW_MS - now);
  return { blocked: true, remaining: 0, retryAfterMs };
}

export function formatRetryAfter(ms: number): string {
  const minutes = Math.ceil(ms / 60000);
  if (minutes <= 1) return "about a minute";
  return `about ${minutes} minutes`;
}

/** Stable, non-reversible key for the caller (proxy IP + user agent). */
export function requestFingerprint(): string {
  let ip = "unknown";
  let ua = "";
  try {
    const headers = getRequest().headers;
    ip =
      headers.get("cf-connecting-ip") ||
      headers.get("x-real-ip") ||
      (headers.get("x-forwarded-for") ?? "").split(",")[0].trim() ||
      "unknown";
    ua = headers.get("user-agent") ?? "";
  } catch {
    /* no request context (tests) */
  }
  const salt = process.env.ADMIN_PASSCODE_SESSION_SECRET ?? "aawash";
  return createHash("sha256").update(`${salt}|${ip}|${ua}`, "utf8").digest("hex");
}

/** Recent failure timestamps for this caller. */
export async function readRecentFailures(identifierHash: string): Promise<number[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const since = new Date(Date.now() - PASSCODE_WINDOW_MS).toISOString();
  const { data } = await supabaseAdmin
    .from("admin_passcode_attempts")
    .select("created_at")
    .eq("identifier_hash", identifierHash)
    .eq("success", false)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(50);
  return (data ?? []).map((r) => new Date(r.created_at).getTime());
}

export async function recordAttempt(identifierHash: string, success: boolean): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("admin_passcode_attempts")
      .insert({ identifier_hash: identifierHash, success });
    if (success) {
      // A correct passcode clears the counter for this caller.
      await supabaseAdmin
        .from("admin_passcode_attempts")
        .delete()
        .eq("identifier_hash", identifierHash)
        .eq("success", false);
    }
  } catch {
    /* logging must never block the gate */
  }
}
