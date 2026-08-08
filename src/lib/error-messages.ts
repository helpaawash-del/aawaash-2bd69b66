/**
 * Turns raw server / Postgrest / Zod errors into a sentence an admin can act on,
 * while keeping the technical detail in the dev console.
 */
export function friendlyError(err: unknown, fallback = "Something went wrong. Please try again."): string {
  if (import.meta.env.DEV) console.error(err);

  const raw = err instanceof Error ? err.message : typeof err === "string" ? err : "";
  if (!raw) return fallback;

  const lower = raw.toLowerCase();

  if (lower.includes("duplicate key") || lower.includes("23505")) {
    if (lower.includes("slug")) return "That slug is already used by another project. Pick a different one.";
    return "A record with these details already exists.";
  }
  if (lower.includes("violates foreign key") || lower.includes("23503")) {
    return "This is still linked to other records, so it can't be changed or removed yet.";
  }
  if (lower.includes("invalid input syntax for type date")) {
    return "One of the dates isn't valid. Use the date picker and try again.";
  }
  if (lower.includes("invalid input syntax")) {
    return "One of the values isn't in the expected format. Please check and try again.";
  }
  if (lower.includes("row-level security") || lower.includes("permission denied") || lower.includes("admin only") || lower.includes("forbidden")) {
    return "You don't have permission to make this change.";
  }
  if (lower.includes("not null") || lower.includes("23502")) {
    return "A required field is missing. Please fill in everything marked required.";
  }
  if (lower.includes("failed to fetch") || lower.includes("networkerror") || lower.includes("load failed")) {
    return "Network problem — the change wasn't saved. Check your connection and try again.";
  }
  if (lower.includes("unauthorized") || raw.includes("401")) {
    return "Your session expired. Sign in again to continue.";
  }

  // Zod validation errors arrive as a JSON array of issues.
  if (raw.trim().startsWith("[")) {
    try {
      const issues = JSON.parse(raw) as Array<{ message?: string; path?: unknown[] }>;
      const first = issues[0];
      if (first?.message) {
        const field = Array.isArray(first.path) && first.path.length ? `${String(first.path[0]).replace(/_/g, " ")}: ` : "";
        return `${field}${first.message}`;
      }
    } catch {
      /* fall through */
    }
    return "Some of the information isn't valid. Please review the highlighted fields.";
  }

  // Short, already-human messages thrown by our own server functions.
  if (raw.length <= 140 && !lower.includes("error:") && !raw.includes("{")) return raw;

  return fallback;
}
