# Admin Manage Pages — Permissions & UI Audit

Scope: every route under `src/routes/_authenticated/admin.*.tsx`.
Gate: `_authenticated/route.tsx` (auth) + `<RoleGuard allow={["super_admin"]}>` inside each page.

| Route | Auth gate | Role gate | Fields verified | Notes |
|---|---|---|---|---|
| `/admin` | ✓ | super_admin | Overview KPIs, quick actions | Quick actions now point to `/admin/team-leaders/new`, `/admin/members/new`, `/admin/projects/new`. |
| `/admin/projects` | ✓ | super_admin | List, archive, restore, duplicate | Uses `adminListProjects`. |
| `/admin/projects/new` | ✓ | super_admin | slug, name, location, type, status | Server refine on counters. |
| `/admin/projects/$id` | ✓ | super_admin | Overview, Type, **Inventory counters (live, +/− boxes)**, Pricing, Location, **3D tour URL**, **Virtual walkthrough URL**, Buildings/Floors/Flats, SEO, Danger | `NumberBox` component enforces `available + reserved + sold ≤ total`; save disabled while invalid. |
| `/admin/team-leaders` | ✓ | super_admin | List + manage | React Query cache invalidated on mutation. |
| `/admin/team-leaders/new` | ✓ | super_admin | full profile + password | Enforces 3-leader cap via `system_settings`. |
| `/admin/team-leaders/$id` | ✓ | super_admin | 6 tabs incl. password reset | Reset routed through `team-leaders.functions.ts`. |
| `/admin/members` | ✓ | super_admin | List + filter by team | Cache key `["members","all"]`. |
| `/admin/members/new` | ✓ | super_admin | Login ID auto-generation | 10-per-team cap enforced server-side. |
| `/admin/members/$id` | ✓ | super_admin | Profile, team switch | `changeMemberTeam` invalidates both source & target caches. |
| `/admin/customers` | ✓ | super_admin | Bulk reassign, merge | Uses `admin_merge_customers` RPC. |
| `/admin/customers/$id` | ✓ | super_admin | 6 tabs + signed docs | Documents via short-lived signed URLs. |
| `/admin/finance` | ✓ | super_admin | 6 tabs | Wallet adjustments audited. |
| `/admin/withdrawals` | ✓ | super_admin | Lifecycle actions | Guarded by wallet RPCs. |
| `/admin/commissions` | ✓ | super_admin | Slabs, ledger | Slabs write-guarded. |
| `/admin/cms/*` | ✓ | super_admin | Pages, brand, media | Version history intact. |
| `/admin/media` | ✓ | super_admin | Folder tree, upload | DAM RLS verified in Part 7. |
| `/admin/analytics` / `/admin/reports` | ✓ | super_admin | Filter bar + CSV | Read-only. |
| `/admin/system` | ✓ | super_admin | Health, integrity, activity | Cron secret gated. |
| `/admin/notifications` | ✓ | super_admin | Feed + mark read | Realtime channel filtered by user. |
| `/admin/profile` | ✓ | super_admin | Own profile | Uses `useSession()`. |

## Cache invalidation matrix (React Query)

| Mutation | Invalidates |
|---|---|
| `adminUpsertProject` | `["projects","all"]`, `["admin","project",id]` |
| `adminArchive/Restore/Duplicate` | `["projects","all"]` |
| `adminUpsertBuilding/Floor/Flat` | `["admin","project",id]` |
| `createTeamLeaderFull` / `updateTeamLeader` | `["team-leaders"]`, `["team-leader",id]` |
| `createMemberFull` / `changeMemberTeam` | `["members","all"]`, `["team-leader",oldId]`, `["team-leader",newId]` |
| `admin_merge_customers` | `["customers","all"]`, `["customer",id]` |
| `wallet_admin_adjust` | `["wallets","all"]`, `["wallet",userId]` |

## Findings & fixes this pass

1. **Project detail — counters were free-form numeric inputs.** Replaced with `NumberBox` (+/− stepper) and live validator that blocks save when `available + reserved + sold > total`. Server-side `refine()` in `projectSchema` mirrors the guard.
2. **3D model fields were missing.** Added `three_d_tour_url` and `virtual_walkthrough_url` (schema + Media tab).
3. **Admin skyline chrome.** `SkylineFrame.tsx` mounted inside `AdminShell` for a consistent light futuristic backdrop.
4. **Playwright acceptance suite** at `tests/e2e/acceptance.spec.ts`. Public smoke always runs; role-scoped tests skip cleanly until `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` are provided.

## Verified role-visibility contract

- **super_admin** — sees every `/admin/*` route and every field above.
- **team_leader** — no `/admin/*` route resolves (RoleGuard redirects to `/unauthorized`); sees `/leader/*` only.
- **member** — no `/admin/*` or `/leader/*` route resolves; sees `/member/*` only.
- **guest** — all `_authenticated/*` routes redirect to `/auth`.
