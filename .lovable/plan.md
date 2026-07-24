This is a large multi-area change. I'll ship it in ordered phases so nothing regresses, and confirm a few points before starting.

## Phase 1 — Global theme + app-like shell
- New theme in `src/styles.css`: base **white** with **dark purple** primary (`oklch(~0.35 0.18 295)`) + violet accent + soft lilac surfaces, glassmorphism tokens, gradient meshes, subtle glow shadows.
- Typography stays Sora / Manrope; tighten radii, add "app card" utility.
- Motion: gentle spring/scale hover, page fade-in.

## Phase 2 — Dock (real fix)
- Rebuild `BottomNav.tsx` as a floating pill with 5 slots (Home, Projects, Sales, Wallet, Account) plus a raised center "Home" bubble — app style.
- Fix routing per role (member → `/member/*`, leader → `/leader/*`, admin → `/admin/*`, guest → public). Debug why buttons don't fire (likely `pointer-events` under overlays / z-index / role-gated link targets that 404). Add active-state pill, haptic-style press animation, backdrop blur, safe-area padding.
- Keep loading skeleton + a11y from previous pass.

## Phase 3 — Sign In redesign
- `src/routes/auth.tsx`: split-screen on desktop, single-column on mobile. Left: animated skyline/skyscraper SVG (generated PNG), floating orbs, subtle grid; Right: glass card with segmented Member/Leader/Admin, purple gradient CTA, micro-animations.

## Phase 4 — Admin Quick Actions rework
- Replace "Create user" and "Add customer" tiles with **Create Team Leader** and **Create Member**.
- Wire every quick-action tile to a real route; audit and fix broken ones. Wallet tile keeps the quick panel; add explicit "Open wallets page" link.

## Phase 5 — Team Leader flow
- `/admin/team-leaders/new` — full creation form (name, mobile/ID, password, team, email, joining date, avatar, address, remarks).
- `/admin/team-leaders` — list with **Manage** button per leader.
- `/admin/team-leaders/$id` — editable profile + members list under this leader with inline manage buttons. Save button persists changes and invalidates admin caches so dashboard updates instantly.

## Phase 6 — Member flow
- `/admin/members/new` — full creation with **Team Leader selector** (drives team_id + login-id prefix).
- `/admin/members` — grouped by Team (Team A / Team B / Team C headers), each member row with **Manage**.
- `/admin/members/$id` — editable profile with sales, earnings, and tips chart; Save persists + invalidates.

## Phase 7 — Dedicated feature pages
Create app-style pages (reuse existing server fns where possible):
- `/wallet` — balances (4-bucket), bank details view + add/edit, withdrawal request (respect 25–30 window).
- `/sales` — role-scoped performance/sales list + KPIs.
- `/commission` — commission ledger + summary.
- `/crm` — customer CRM (leader/member scope).
Each has a matching admin surface already; these are the user-facing pages.

## Phase 8 — Projects
- Public `/projects` and `/projects/$slug` polished with hero, gallery, 3D model viewer, and **BookMyShow-style flat grid** (seat-like boxes with color states: available / sold / locked / blocked).
- Admin `/admin/projects` grid of projects with **Manage** → `/admin/projects/$id` (already exists) upgraded to include the same interactive flat grid where admin can toggle status (available ↔ sold ↔ blocked) directly. Persist via existing `inventory.functions.ts` / `project-admin.functions.ts` (extend if needed).

## Technical notes
- All colors via semantic tokens — no hardcoded hex in components.
- All mutations use `invalidateAdmin()` from `src/lib/admin-cache.ts` and refetch on mount.
- Role-based dock target resolution in a single helper to keep buttons correct everywhere.
- Generate 2–3 lightweight PNG assets (skyline, apartment vector, orb) via image-gen; upload via `lovable-assets`.

## Quick clarifications before I build
1. **Dark-purple shade** — deep royal (`~#3B1E7A`) or vibrant neon-violet (`~#6D28D9`)? I'll default to deep royal with violet accent unless you say otherwise.
2. **Wallet page audience** — a single `/wallet` that adapts by role (member/leader), or keep the existing `/member/wallet` and `/leader/withdrawals` and just polish them?
3. **Flat grid statuses** — is 4 states enough (Available, Sold, Locked, Blocked), or do you need Reserved / Hold too?

I'll start implementing Phase 1 → 8 as soon as you confirm (or say "go" and I'll use the defaults above).