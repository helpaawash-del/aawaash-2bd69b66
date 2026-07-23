import type { QueryClient } from "@tanstack/react-query";

/**
 * Canonical query keys touched by admin mutations.
 * Centralized so every quick-action mutation invalidates the same set.
 */
export const ADMIN_KEYS = {
  overview: ["admin", "overview"] as const,
  health: ["admin", "health"] as const,
  projects: ["admin", "projects"] as const,
  teamLeaders: ["admin", "team-leaders"] as const,
  teamLimits: ["admin", "team-limits"] as const,
  members: ["admin", "members"] as const,
  finance: ["admin", "finance"] as const,
  withdrawals: ["admin", "withdrawals"] as const,
};

type Scope =
  | "leader"
  | "member"
  | "wallet"
  | "project"
  | "withdrawal"
  | "team-refresh";

/**
 * Invalidate + refetch the query buckets impacted by an admin mutation.
 * Use this after every admin quick action so the correct pages refresh.
 */
export async function invalidateAdmin(qc: QueryClient, scope: Scope): Promise<void> {
  const keys: readonly (readonly unknown[])[] = (() => {
    switch (scope) {
      case "leader":
        return [ADMIN_KEYS.teamLeaders, ADMIN_KEYS.teamLimits, ADMIN_KEYS.members, ADMIN_KEYS.overview];
      case "member":
        return [ADMIN_KEYS.members, ADMIN_KEYS.teamLeaders, ADMIN_KEYS.overview];
      case "wallet":
        return [ADMIN_KEYS.teamLeaders, ADMIN_KEYS.members, ADMIN_KEYS.overview, ADMIN_KEYS.finance];
      case "project":
        return [ADMIN_KEYS.projects, ADMIN_KEYS.overview];
      case "withdrawal":
        return [ADMIN_KEYS.withdrawals, ADMIN_KEYS.finance, ADMIN_KEYS.members, ADMIN_KEYS.teamLeaders, ADMIN_KEYS.overview];
      case "team-refresh":
        return [ADMIN_KEYS.teamLeaders, ADMIN_KEYS.teamLimits, ADMIN_KEYS.members];
    }
  })();

  await Promise.all(keys.map((queryKey) => qc.invalidateQueries({ queryKey: queryKey as unknown[] })));
  await Promise.all(keys.map((queryKey) => qc.refetchQueries({ queryKey: queryKey as unknown[], type: "active" })));
}
