# Aawash — Database Reference

All tables live in the `public` schema unless noted. Every table has `id uuid pk`, `created_at`, `updated_at` (with update trigger). Only domain columns are listed.

## Identity & Access
- **profiles** — mirrors `auth.users`. Domain: `full_name`, `mobile`, `login_id`, `address`, `remarks`, `joining_date`, `status`, wallet buckets (`available_balance`, `pending_balance`, `locked_balance`, `lifetime_earnings`), `team_id`, `assigned_leader_id`. Guarded by `profiles_guard_self_update` trigger — users may not self-mutate financial/identity/role columns.
- **user_roles** — `(user_id, role app_role)` unique. Read via `has_role(uuid, app_role)` SECURITY DEFINER.
- **teams** — `name`, `identifier` (e.g. `A6`), `leader_id → profiles.id`, `member_limit`.

## CRM
- **customers** — contact, address, `assigned_member_id`, `team_id`, `status`, `source`, `tags[]`. Access centralized by `can_access_customer(uuid)`.
- **customer_documents / customer_notes / customer_meetings / customer_timeline** — child rows. RLS delegates entirely to `can_access_customer(customer_id)`.
- **customer_tags_catalog** — Super Admin managed tag palette.

## Inventory
- **projects** — marketing + operational metadata (48 cols): status, address, cover image, brochure, hero video, geo.
- **buildings** — `project_id`, `name`, floor count, tower metadata.
- **floors** — `building_id`, `floor_number`, layout data.
- **flats** — `floor_id`, `flat_number`, `type`, `carpet_area`, `base_price`, `status` (`available|hold|sold`).
- **flat_locks** — soft holds with expiry.

## Sales & Commissions
- **sales** — `customer_id`, `flat_id`, `seller_id`, `team_id`, `deal_value`, `booking_amount`, `approval_status`, `approved_by`, `approved_at`. Guarded by `sales_guard_self_update` — seller cannot alter deal_value/approval_status.
- **sale_payments / sale_documents / sale_audit_log** — cascading child rows.
- **commission_slabs** — configurable ranges from ₹0 to ₹10Cr+.
- **commission_settings** — singleton knobs (member share 30%, tip share 0.5%).
- **commissions** — canonical amounts per sale/role.
- **commission_ledger** — immutable per-user credit/debit entries, links to `withdrawals.id` when consumed.
- **commission_audit_log** — history of engine runs.
- **commission_transactions** — external transactional view (31 cols).

## Wallet & Withdrawals
- **withdrawals** — `user_id`, `amount`, `bank_name`, `account_number`, `ifsc`, `upi_id`, `status`, `requested_at`, `processed_at`, `admin_notes`. All state moves via `wallet_*_withdrawal` RPCs.

## Referrals
- **tip_persons** — Member's referral contacts (mobile, share % capped at 0.5%).
- **referrals** — attribution linking `tip_person`/`customer`/`sale`.

## CMS
- **cms_pages** — slug, title, blocks (jsonb), `status` (`draft|published`), publisher.
- **cms_page_versions** — Super Admin only; full snapshot per publish/save.
- **cms_brand_settings / cms_global_content** — singletons.
- **cms_audit_log** — publish/rollback trail.

## DAM
- **assets** — files (28 cols): `bucket`, `path`, `mime`, `size`, `width`, `height`, `duration`, `is_public`, `folder_id`, `current_version_id`.
- **asset_folders** — nested tree, Super Admin only.
- **asset_versions** — every upload/replace.
- **asset_usage** — reverse index (`target_table`, `target_id`).
- **asset_audit_log** — actor-verified (`actor_id = auth.uid()` enforced).

## System
- **system_settings** — singleton config (withdrawal window, team limits, feature flags, maintenance mode).
- **system_job_runs** — background job telemetry.
- **audit_logs** — cross-cutting event log (`actor_id`, `action`, `target_type`, `target_id`, `metadata`).
- **notifications** — per-user, real-time.

## Key RPCs
| Function | Purpose |
|---|---|
| `has_role(uuid, app_role)` | Role check (used everywhere) |
| `can_access_customer(uuid)` | CRM access gate |
| `wallet_request_withdrawal / approve / mark_processing / complete / reject` | Wallet lifecycle |
| `wallet_admin_adjust` | Audited manual balance change |
| `sales_approve` | Approve sale + trigger commissions |
| `admin_merge_customers / admin_bulk_reassign_customers` | CRM ops |
| `cms_save_draft / cms_publish_page / cms_rollback_page` | CMS lifecycle |
| `asset_replace / asset_rollback / asset_dashboard_stats` | DAM ops |
| `system_get_health / system_run_integrity_checks / system_run_maintenance` | Ops |

## RLS Summary
- Every `public` table has RLS **enabled**.
- Grants: `authenticated` for user-facing tables; `service_role` on everything; `anon` only where explicit anon-read policies exist (published CMS pages, public projects).
- No `USING (true)` write policies remain.
- Financial mutations only through SECURITY DEFINER RPCs.

## Triggers
- `set_updated_at` on every table with `updated_at`.
- `profiles_guard_self_update` — reverts guarded columns for self-updates.
- `sales_guard_self_update` — same for `deal_value` / `approval_status`.
- Notification fan-out triggers on `sales`, `withdrawals`, `commissions`.
