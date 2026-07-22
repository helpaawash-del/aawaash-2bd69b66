# Aawash — Architecture Documentation

## Overview
Aawash is an enterprise real-estate sales, CRM, and commission platform built on TanStack Start (React 19 + Vite 7) with Lovable Cloud (Supabase) as the backend. It targets a Cloudflare Workers edge runtime.

## Application Layers
1. **Presentation** — `src/routes/**`, `src/components/**` (shadcn/ui + Tailwind v4 tokens).
2. **Client integration** — `src/integrations/supabase/client.ts` (browser).
3. **Server functions** — `src/lib/*.functions.ts` (typed RPC via `createServerFn`).
4. **HTTP routes** — `src/routes/api/**` (public webhooks under `/api/public/*`).
5. **Server-only helpers** — `src/integrations/supabase/client.server.ts` (service role, handler-scoped).
6. **Database** — Postgres via Supabase with RLS + SECURITY DEFINER RPCs as the single authority for financial mutations.
7. **Cross-cutting** — `src/lib/env-validation.ts`, `src/lib/logger.ts`.

## Folder Structure
```
src/
  routes/                 File-based routing (TanStack)
    __root.tsx
    _authenticated/       Auth-gated subtree (managed by integration)
      admin.*.tsx         Super Admin console
      leader.*.tsx        Team Leader console
      member.*.tsx        Member console
    api/public/           Webhooks, health, cron
  components/
    aawash/               Domain components (admin, analytics, cms, ...)
    ui/                   shadcn primitives
  lib/                    Server functions + shared utilities
  integrations/supabase/  Auto-generated client + middleware
  styles.css              Design tokens (@theme)
supabase/migrations/      Immutable SQL history
docs/                     This documentation
```

## Routing
- File-based via TanStack Router. Protected surface lives under `_authenticated/`.
- Role-scoped prefixes: `admin.*`, `leader.*`, `member.*`.
- Public marketing/landing at top-level (index, projects, about, contact).
- Server routes strictly under `src/routes/api/`.

## Authentication Flow
1. Supabase email/password (Google OAuth optional). Signup handled by admin only (no anon signups).
2. `_authenticated/route.tsx` (integration-managed) redirects unauthenticated users to `/auth`.
3. Session bearer token attached to all `createServerFn` calls via `functionMiddleware` in `src/start.ts`.
4. Root subscriber invalidates the router on `onAuthStateChange`.

## Authorization Flow
- Roles stored in `public.user_roles` (`app_role` enum: `super_admin`, `team_leader`, `member`, plus specialty roles).
- `public.has_role(uuid, app_role)` — SECURITY DEFINER, stable, used in every RLS policy that needs role checks.
- Server functions call `context.supabase.rpc('has_role', ...)` before invoking `supabaseAdmin`.
- `can_access_customer(uuid)` centralizes ownership checks for the CRM subtree.

## Database Relationships (high level)
- `profiles` 1—1 `auth.users`. `teams` 1—N `profiles` (member_of). Team leader references `teams.leader_id`.
- `customers` N—1 `profiles` (assigned_member_id) and N—1 `teams`.
- `sales` N—1 `customers`, `flats`, `profiles`; `sale_payments`, `sale_documents`, `sale_audit_log` cascade.
- `commissions` / `commission_ledger` reference `sales` and `profiles`; `withdrawals` reference `profiles` and `commission_ledger`.
- `projects` → `buildings` → `floors` → `flats` (with `flat_locks` for temporary holds).
- CMS: `cms_pages` ↔ `cms_page_versions`; brand + global content singletons.
- DAM: `assets` ↔ `asset_versions`, `asset_folders`, `asset_usage`, `asset_audit_log`.

## Business Logic

### Commission Flow
1. Sale approved by Super Admin → `sales_approve()` locks the flat, writes `commissions` and `commission_ledger` rows.
2. Commission slabs (`commission_slabs`) matched on `deal_value` — default enterprise slabs (₹0—10Cr+).
3. Team Leader receives full slab %; Member receives exactly **30%** of leader amount; Tip Person receives exactly **0.5%** of the member amount.
4. Amounts credit to `profiles.pending_balance` and roll into `available_balance` after settlement day.

### Wallet Flow (4-bucket)
- `available_balance` — withdrawable now.
- `pending_balance` — earned but not yet settled.
- `locked_balance` — inside an open withdrawal request.
- `lifetime_earnings` — cumulative credited (never decreases).
All mutations occur through `wallet_*` RPCs; UI never patches balance columns (enforced by `profiles_guard_self_update`).

### Withdrawal Flow
- Window enforced by `wallet_request_withdrawal`: only day 25—30 of each month.
- Lifecycle: `pending → approved → processing → completed` (or `rejected`).
- Admin console at `/admin/withdrawals` transitions state via `wallet_*_withdrawal` RPCs; every state change writes to `audit_logs`.

### CRM Flow
- Members create customers → assigned to member + team automatically.
- `customer_documents/notes/meetings/timeline` inherit ownership via `can_access_customer()`.
- Admin can merge (keep target) and bulk-reassign via `admin_merge_customers` / `admin_bulk_reassign_customers`.

### Project Flow
- Admin creates project → buildings → floors → flats (bulk create supported).
- `project-admin.functions.ts` provides deep-duplication of a project's entire structure.
- Inventory grid consumes real-time `flats.status`.

### Media Flow
- Uploads via `dam.functions.ts` write to `assets` and create an `asset_versions` row.
- Rollback via `asset_rollback` RPC swaps the current version pointer.
- Usage tracked in `asset_usage` (target_table + target_id).

### Analytics Flow
- Role-scoped aggregates in `analytics.functions.ts` (admin/leader/member).
- Reports console at `/admin/reports` composes charts + CSV/PDF exports from the same functions.

### Notification Flow
- `notifications` table with per-user RLS. Real-time subscription in the admin/leader/member shells.

## Future Extension Points
- **Payment gateway** — connect Stripe/Razorpay for direct wallet payouts (wallet RPCs already atomic).
- **Additional roles** — extend `app_role` enum + `has_role` policies.
- **Localization** — Tailwind tokens + shadcn already RTL-ready; wrap strings with an i18n layer.
- **Mobile app** — server functions are transport-agnostic; a React Native shell can reuse them via HTTP.
- **Data warehouse** — daily maintenance cron already exists; add a Supabase → warehouse sync job alongside it.
