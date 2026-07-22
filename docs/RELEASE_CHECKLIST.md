# Aawash — Pre-Release Verification Checklist

Use this document to sign off every module before deployment. Each row must be
manually verified against the live preview and, where applicable, against the
database using `supabase--read_query`.

Legend: ☐ = to verify · ✅ = verified · ⚠ = gap found (log in the "Gaps" column)

---

## 1. Cross-cutting

| Area | Check | Status | Gaps |
|---|---|---|---|
| Auth | `/auth` renders, bootstrap super-admin flow works when no admin exists | ☐ | |
| Auth | Login with team-leader mobile and member `A9876543210` format | ☐ | |
| Auth | Redirect param honored after sign-in | ☐ | |
| Auth | `_authenticated/route.tsx` gate blocks unauthenticated visits (curl w/o token → redirect) | ☐ | |
| Auth | `attachSupabaseAuth` middleware registered in `src/start.ts` | ☐ | |
| Roles | `has_role(uuid, app_role)` returns expected values for each seeded user | ☐ | |
| Roles | No role stored on `profiles` table (only `user_roles`) | ☐ | |
| RLS | `security--run_security_scan` returns 0 critical / 0 high | ☐ | |
| Cache | `router.invalidate()` + `queryClient.invalidateQueries` on every mutation | ☐ | |
| Errors | Every route with a loader has `errorComponent` + `notFoundComponent` | ☐ | |
| Loading | Every list page shows skeleton / spinner during first fetch | ☐ | |
| Empty state | Every list has a non-empty empty-state card (icon + copy + CTA) | ☐ | |
| Responsive | Every top-level page passes at 375 / 768 / 1280 CSS px | ☐ | |
| A11y | Icon-only buttons have `aria-label`; forms have visible labels | ☐ | |

---

## 2. Admin Dashboard (`/admin`)

| Section | Check | Status |
|---|---|---|
| Layout | `AdminShell` sidebar + sticky header + mobile drawer render | ☐ |
| KPI grid | Revenue, Projects, Members, Leaders, Withdrawals cards live from `getAdminOverview` | ☐ |
| Quick actions | Create Team Leader / Team Leaders / Create Member / Members / Wallet / CRM / Projects / Sales / Commissions / Withdrawals / Reports / Analytics — every link resolves | ☐ |
| Global search | Header search opens modal & routes to result | ☐ |
| Notifications | Bell dropdown lists unread; mark-read persists | ☐ |
| Profile menu | Sign-out clears session and redirects to `/auth` | ☐ |

---

## 3. Team Leader Management

| Route | Check | Status |
|---|---|---|
| `/admin/team-leaders` | Grid loads all leaders with stat cards | ☐ |
| `/admin/team-leaders/new` | Mobile uniqueness validation, 3-leader cap enforced | ☐ |
| `/admin/team-leaders/new` | `createTeamLeaderFull` creates auth user + profile + role + team | ☐ |
| `/admin/team-leaders/$id` | 6 tabs render: Overview / Members / Sales / Wallet / Reports / Settings | ☐ |
| `/admin/team-leaders/$id` | Reset password → new temp password shown once | ☐ |
| `/admin/team-leaders/$id` | Suspend / Activate toggles `profiles.status` | ☐ |
| `/admin/team-leaders/$id` | Delete removes leader (cascade check members reassignment) | ☐ |

---

## 4. Member Management

| Route | Check | Status |
|---|---|---|
| `/admin/members` | Flat + Grouped-by-team toggle | ☐ |
| `/admin/members` | Search by name / mobile / login ID | ☐ |
| `/admin/members` | Filter by team / status | ☐ |
| `/admin/members/new` | Login ID auto-generated `[TeamLetter][Mobile]` | ☐ |
| `/admin/members/new` | 10-per-team cap enforced (configurable via `system_settings`) | ☐ |
| `/admin/members/$id` | Personal Info editable + save | ☐ |
| `/admin/members/$id` | Change team → updates login ID prefix | ☐ |
| `/admin/members/$id` | Sales / Customers / Tips / Wallet tabs live | ☐ |
| `/admin/members/$id` | Delete tip person works with confirmation | ☐ |

---

## 5. Customer CRM

| Route | Check | Status |
|---|---|---|
| `/admin/customers` | List loads with pagination | ☐ |
| `/admin/customers` | Search: name, mobile, email, tag | ☐ |
| `/admin/customers` | Filters: assigned member, status, tag, date range | ☐ |
| `/admin/customers` | Bulk reassign → `admin_bulk_reassign_customers` | ☐ |
| `/admin/customers` | Merge duplicates → `admin_merge_customers` (keep target) | ☐ |
| `/admin/customers` | CSV export includes all filtered rows | ☐ |
| `/admin/customers/$id` | 6 tabs: Profile / Notes / Meetings / Documents / Timeline / Sales | ☐ |
| `/admin/customers/$id` | Notes respect `visibility` (private only to author + super_admin) | ☐ |
| `/admin/customers/$id` | Documents upload to private bucket; signed URL preview works | ☐ |
| `/admin/customers/$id` | Meeting create / edit / delete | ☐ |
| `/admin/customers/$id` | Tag catalog editable | ☐ |
| Sync | New customer appears in assigned member's dashboard within one invalidate | ☐ |
| Sync | Customer → sale conversion updates commission ledger | ☐ |

---

## 6. Projects & Inventory

| Route | Check | Status |
|---|---|---|
| `/admin/projects` | Grid of project cards with cover image | ☐ |
| `/admin/projects` | Search by name / slug / city | ☐ |
| `/admin/projects` | Filter by status (draft / published / archived) | ☐ |
| `/admin/projects/new` | Slug validation (kebab, unique) | ☐ |
| `/admin/projects/new` | Duplicate project deep-clones buildings/floors/flats | ☐ |
| `/admin/projects/$id` — Overview | Name, tagline, price band, RERA fields editable & saved | ☐ |
| `/admin/projects/$id` — Buildings | CRUD buildings, floors, flats (bulk add) | ☐ |
| `/admin/projects/$id` — Inventory | Live counters: Available / Reserved / Sold | ☐ |
| `/admin/projects/$id` — Inventory | Click tile cycles Available → Reserved → Sold and persists | ☐ |
| `/admin/projects/$id` — Inventory | Filling-box inputs for bulk availability update with validation (≤ total) | ☐ |
| `/admin/projects/$id` — Media | Cover image upload (≤ 5 MB, jpg/png/webp) | ☐ |
| `/admin/projects/$id` — Media | Gallery upload (12-cap) | ☐ |
| `/admin/projects/$id` — Media | 3D model upload (.glb/.gltf ≤ 25 MB) with progress & fallback | ☐ |
| `/admin/projects/$id` — Permissions | Non-super-admin cannot edit media / pricing (role matrix in `permissions.ts`) | ☐ |
| Public `/projects` | Lists published projects with SEO tags | ☐ |
| Public `/projects/$slug` | og:image = cover URL; hero renders | ☐ |
| Sync | Sold flat count decreases available inventory & updates project card KPI | ☐ |

---

## 7. Sales Workflow

| Route | Check |
|---|---|
| `/sales-workflow` | Kanban / list of sales scoped by role | ☐ |
| `/sales-workflow/new` | Wizard: customer → flat → price → payment plan | ☐ |
| `/sales-workflow/$id` | Status transitions guarded server-side | ☐ |
| `/sales-workflow/$id` | Contact fields hidden unless `contact_visible = true` for TL | ☐ |
| Sync | Sale → commission ledger row; wallet balance updates | ☐ |

---

## 8. Commissions

| Check | Status |
|---|---|
| `/admin/commissions` — slab CRUD works | ☐ |
| `/admin/commissions` — audit log renders on every change | ☐ |
| `/commissions/$id` — ledger detail matches sale + slab | ☐ |
| Recalculation edge cases: cancelled sale reverses ledger | ☐ |

---

## 9. Wallet & Withdrawals

| Check | Status |
|---|---|
| Member wallet — 4 buckets: Available / Pending / Locked / Lifetime | ☐ |
| Bank + UPI fields save on `withdrawals` | ☐ |
| Withdrawal window 25th–30th enforced by SQL function | ☐ |
| Admin `/admin/withdrawals` lifecycle: pending → approved → processing → completed / rejected | ☐ |
| `wallet_admin_adjust` writes to `commission_audit_log` | ☐ |
| Finance dashboard totals reconcile against `commission_ledger` sum | ☐ |

---

## 10. Reports, Analytics & BI

| Check | Status |
|---|---|
| `/admin/reports` — 10 tabs render | ☐ |
| CSV export on every tab | ☐ |
| Print-to-PDF layout preserves charts | ☐ |
| Filters: date range, project, team, member | ☐ |
| `/admin/analytics`, `/leader/analytics`, `/member/analytics` — role-scoped data | ☐ |

---

## 11. CMS & DAM

| Check | Status |
|---|---|
| `/admin/cms/pages` — draft / publish / rollback | ☐ |
| Version history restore works | ☐ |
| `/admin/cms/brand` — theme tokens persist and propagate via `BrandProvider` | ☐ |
| `/admin/media` — folder tree, drag-drop upload, usage tracker | ☐ |
| Asset delete blocked when `asset_usage` has references | ☐ |

---

## 12. System / Ops

| Check | Status |
|---|---|
| `/admin/system` — health cards live from `system_get_health` | ☐ |
| Integrity checks button runs `system_run_integrity_checks` | ☐ |
| `pg_cron` daily job hitting `/api/public/hooks/system-maintenance` succeeds (see `system_job_runs`) | ☐ |
| Webhook secret `SYSTEM_MAINTENANCE_SECRET` set | ☐ |
| `/api/public/health` returns 200 + build sha | ☐ |

---

## 13. Server-function inventory

For each file under `src/lib/*.functions.ts`, verify:

- [ ] Uses `.inputValidator()` with zod for every non-trivial input
- [ ] Uses `.middleware([requireSupabaseAuth])` unless intentionally public
- [ ] Privileged fns re-check role via `has_role` before importing `supabaseAdmin`
- [ ] No top-level `process.env.*` read (only inside handler)
- [ ] Returns serializable DTOs (no `Response`, no class instances)

Files to walk: `admin-overview`, `admin`, `analytics`, `auth`, `cms`,
`commissions`, `crm`, `customers-admin`, `dam`, `finance-admin`, `inventory`,
`leader`, `member`, `members-admin`, `project-admin`, `projects`, `sales`,
`system`, `team-leaders`, `wallet`.

---

## 14. Database sanity queries

Run before release (via `supabase--read_query`):

```sql
-- Orphan check
select count(*) from public.commission_ledger l
  left join public.sales s on s.id = l.sale_id
 where s.id is null;

-- Wallet reconciliation
select p.id, p.wallet_available,
       coalesce(sum(case when l.direction='credit' then l.amount else -l.amount end),0) as computed
  from public.profiles p
  left join public.commission_ledger l on l.user_id = p.id
 group by p.id
 having p.wallet_available <> coalesce(sum(case when l.direction='credit' then l.amount else -l.amount end),0);

-- Flats status sanity
select project_id,
       count(*) filter (where status='available') as available,
       count(*) filter (where status='reserved')  as reserved,
       count(*) filter (where status='sold')      as sold
  from public.flats group by project_id;

-- RLS coverage
select schemaname, tablename, rowsecurity
  from pg_tables where schemaname='public' and rowsecurity = false;
```

Any row returned in the first three ⇒ **do not release**. Fourth query must
return zero rows.

---

## 15. Final go/no-go

- [ ] All rows in sections 1–12 = ✅
- [ ] Section 13 server-function checklist walked file-by-file
- [ ] Section 14 SQL sanity queries all pass
- [ ] `bun run build` succeeds with zero TS errors
- [ ] Latest `security--run_security_scan` clean
- [ ] `CERTIFICATION.md` re-signed with today's date
