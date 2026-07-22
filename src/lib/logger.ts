/**
 * Aawash — structured JSON logger.
 *
 * Server-side use. Emits single-line JSON with timestamp, level, category,
 * and optional correlation id. Cloudflare Workers / Lovable Cloud collect
 * stdout automatically; downstream log processors can parse the JSON.
 *
 * NEVER log secrets, access tokens, or full request bodies.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogCategory =
  | "app"
  | "auth"
  | "security"
  | "finance"
  | "cms"
  | "media"
  | "api"
  | "audit"
  | "performance"
  | "cron";

export type LogEntry = {
  ts: string;
  level: LogLevel;
  category: LogCategory;
  message: string;
  requestId?: string;
  userId?: string;
  [extra: string]: unknown;
};

function emit(entry: LogEntry) {
  const line = JSON.stringify(entry);
  if (entry.level === "error") {
    console.error(line);
  } else if (entry.level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export function log(
  level: LogLevel,
  category: LogCategory,
  message: string,
  meta: Record<string, unknown> = {},
) {
  emit({ ts: new Date().toISOString(), level, category, message, ...meta });
}

export const logger = {
  debug: (cat: LogCategory, msg: string, meta?: Record<string, unknown>) => log("debug", cat, msg, meta),
  info:  (cat: LogCategory, msg: string, meta?: Record<string, unknown>) => log("info", cat, msg, meta),
  warn:  (cat: LogCategory, msg: string, meta?: Record<string, unknown>) => log("warn", cat, msg, meta),
  error: (cat: LogCategory, msg: string, meta?: Record<string, unknown>) => log("error", cat, msg, meta),
};

export function newRequestId(): string {
  // 128-bit hex, sufficient for correlation
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
