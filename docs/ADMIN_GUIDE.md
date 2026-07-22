# Aawash — Admin Panel Guide

The Super Admin console is the single authority for platform operations. Navigate via the left sidebar (desktop) or bottom drawer (mobile).

## Access
- Route: `/admin` (auto-redirects unauthenticated users to `/auth`).
- Requires `super_admin` role. Attempting any admin route without the role returns 403 server-side.

## Sections

### Dashboard (`/admin`)
KPIs (revenue, sales, active members, pending withdrawals), sales trend chart, system health strip, recent audit activity, global search (⌘K), notifications bell.

### Team Leaders (`/admin/team-leaders`)
- **Create**: `+ New Team Leader` → auto-generates Login ID from mobile + team identifier. Sets initial password; leader must change on first login.
- **Edit**: Inline in detail page (Overview tab).
- **Reset password**: Detail page → Overview → Reset action.
- **Limits**: Header dialog to change global cap (default 3 leaders, 10 members/leader).

### Members (`/admin/members`)
- **Create**: `+ New Member` → pick team → mobile → auto Login ID `[TEAM][MOBILE]`.
- Toggle status (active/disabled). Reassign team from detail view.

### Projects (`/admin/projects`)
- List with cover, status, unit counts.
- `+ New Project` at `/admin/projects/new`. Detail at `/admin/projects/$id` with tabs: Overview · Structure · Inventory · Media · Content.
- Bulk create flats per floor; visual inventory grid (color-coded).
- **Duplicate**: Overview tab → Duplicate project (copies buildings/floors/flats).

### Customers (`/admin/customers`)
- Filters: source, status, team, tags. Bulk select for reassignment.
- Detail (6 tabs): Overview · Sales · Documents · Meetings · Notes · Timeline.
- **Merge**: pick duplicates → choose winner → source rows archived.
- Documents stored in private `customer-documents` bucket; downloads via 10-minute signed URLs.

### Sales & Approvals
- List at `/admin/sales`. Approve/Reject actions call `sales_approve` — this locks the flat, runs the commission engine, credits wallets.
- Direct financial edits are impossible; even admin adjustments flow through audited RPCs.

### Finance (`/admin/finance`)
Six tabs: Overview · Wallets · Ledger · Bonuses · Revenue · Reports. Manual adjustments open a confirmation dialog and write to `audit_logs`.

### Withdrawals (`/admin/withdrawals`)
Queue view. State machine: `pending → approved → processing → completed` (or `rejected`). Each transition requires notes; UI is disabled outside allowed transitions.

### CMS
- Pages `/admin/cms/pages` — list + status filter. Visual builder at `/admin/cms/pages/$id` with block palette, live preview, autosave draft.
- History drawer shows every version; rollback with one click.
- Brand tokens at `/admin/cms/brand`. Global site content at `/admin/cms/global`. Media library at `/admin/cms/media` (redirects to DAM).

### Media (DAM) `/admin/media`
Folder tree (Super Admin only), drag-and-drop uploads, multi-select, replace-with-version, rollback, usage index (`Where used`).

### Reports (`/admin/reports`)
10 tabs — Executive, Sales, Financial, Commission, Projects, Inventory, Leaders, Members, CRM, Activity. Date-range filter, CSV per tab, print-to-PDF.

### Analytics (`/admin/analytics`)
Executive BI dashboards — sales funnel, project performance, team leaderboards.

### System (`/admin/system`)
Health KPIs, one-click integrity run, maintenance mode toggle, cron job telemetry.

### Settings (`/admin/settings`)
Company info, commission slabs (₹0—10Cr+), withdrawal window (default 25—30), team limits, feature flags, active sessions.

### Audit Logs
Global filter by actor, action, target. Immutable — no delete surface anywhere.

## Standard Workflows

**Create Team Leader → Member → Sale**
1. `/admin/team-leaders/new` → set name, mobile, initial password.
2. `/admin/members/new` → pick that leader's team.
3. Member logs in, creates customer + sale draft.
4. `/admin/sales/$id` → Approve. Wallet credit is instant.

**Process a Withdrawal**
1. Between the 25th and 30th, member requests withdrawal → funds move to `locked_balance`.
2. `/admin/withdrawals` → Approve → Mark processing → after bank transfer, Complete (attach reference).
3. On reject: funds return to `available_balance`; audit row written automatically.

**Publish a CMS Page**
1. Open page in builder → edit blocks → autosave draft.
2. Click Publish → creates a new version, sets pointer, invalidates public cache.
3. To roll back: History drawer → Restore.
