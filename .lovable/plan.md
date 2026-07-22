## Part 6.7 — Website CMS & Visual Page Builder

The full spec (drag-and-drop builder + version history + rollback + theme editor + global content + media library + SEO per page + audit + notifications, all wired into every existing landing section) is multi-week work. Building it in a single turn would break the existing site. I'll ship it in **3 phases**. This plan covers **Phase 1 (foundation, this turn)**.

---

### What Phase 1 delivers (this turn)

**Database (migration)**
- `cms_pages` — id, slug (unique), title, status (draft/published/archived), visibility, seo_title, seo_description, seo_keywords, og_image, canonical_url, current_version_id, published_version_id, created_by, timestamps.
- `cms_page_versions` — id, page_id, version_number, blocks (JSONB — the whole section tree), seo (JSONB), created_by, note, created_at. Immutable — new row per save.
- `cms_media` — id, kind (image/video/pdf/svg/lottie/model), url (Storage path), filename, size, mime, category, tags, alt, uploaded_by.
- `cms_brand_settings` — singleton row: colors (primary/secondary/accent/success/warning/error/background/foreground/border/muted, all `oklch`), fonts (display/body), radius scale, shadow scale, gradients (JSONB).
- `cms_global_content` — key/value JSONB (company_name, logo_url, contact, address, emails, phones, socials, nav_labels, footer_links, copyright, hero_headlines, cta_labels, announcement_bar, testimonials, stats).
- `cms_audit_log` — page_id, actor_id, action, before/after JSONB, created_at.
- Private Storage bucket `cms-media` with signed-URL access; public read policy for `is_public=true` rows.
- RLS: all tables super_admin-only for write; anon SELECT on published pages, brand, global content, and public media only.
- RPCs: `cms_publish_page(page_id, note)`, `cms_rollback_page(page_id, version_id)`, `cms_save_draft(page_id, blocks, seo, note)`.

**Server functions (`src/lib/cms.functions.ts`)**
- Pages: list/get/create/duplicate/archive/restore/publish/unpublish/rollback/preview-by-version.
- Versions: list, diff-metadata, restore.
- Media: signed upload, register, list/filter/search, replace, delete.
- Brand: get/update (writes to `cms_brand_settings`).
- Global content: get/update-by-key.
- Public reader: `cmsGetPublishedPage(slug)`, `cmsGetBrand()`, `cmsGetGlobal()` (server publishable client, no auth).

**Admin UI (`/admin/cms/*`)**
- `admin.cms.tsx` — CMS dashboard: pages grid, recent edits, quick links to Brand/Global/Media/Header/Footer, draft counter.
- `admin.cms.pages.tsx` — Page list with status filter, search, create/duplicate/archive.
- `admin.cms.pages.$id.tsx` — Visual page editor:
  - Left: block palette (Hero, Features, Projects, Stats, Testimonials, CTA, FAQ, Rich Text, Media, Spacer, Custom HTML).
  - Middle: **dnd-kit** vertical block list — add, remove, duplicate, hide, reorder, collapse/expand.
  - Right: inspector panel — edits selected block's props (title, subtitle, body, images from media library, buttons, background, spacing, animation, alignment, theme variant).
  - Top: device toggle (mobile/tablet/desktop preview via iframe pointing at `/admin/cms/preview/$id?v=...`), Save Draft, Publish, Version History dropdown with restore.
- `admin.cms.brand.tsx` — Live theme editor writing to CSS variables via a runtime `<style>` tag; save persists to `cms_brand_settings`.
- `admin.cms.global.tsx` — Global content editor grouped by category (Company, Contact, Nav, Footer, Hero, CTAs, Stats, Testimonials, Announcement).
- `admin.cms.media.tsx` — Media library grid: upload, replace, delete, categorize, search, copy URL.
- `admin.cms.header.tsx` / `admin.cms.footer.tsx` — Structured editors for global header/footer JSON.
- `admin.cms.pages.$id.history.tsx` — Version list with author, timestamp, note, diff summary, "Restore" action.

**Preview route**
- `/admin/cms/preview/$id` — renders any version of any page using the same block renderer the public site will use. Read-only, gated to super_admin.

**Block renderer (`src/components/aawash/cms/BlockRenderer.tsx`)**
- Pure component: takes the blocks JSONB tree, renders each block type using existing design-system components (Hero, StatCard, SectionCard, etc.). This is the single renderer used by both the admin preview and (in Phase 2) the public site.

**Runtime theme + global content providers**
- `<BrandProvider>` in `__root.tsx` — fetches `cmsGetBrand()` once, injects CSS variables so live edits apply immediately.
- `<GlobalContentProvider>` — same pattern; exposes `useGlobalContent()` hook so any component (existing header, footer, contact page) can read `company_name`, `phones[0]`, `socials.linkedin` etc.

**AdminShell nav**
- New "CMS" group: Dashboard, Pages, Brand, Global Content, Media, Header, Footer.

**Notifications & audit**
- Every publish/archive/rollback/media upload writes to existing `notifications` and `audit_logs` tables (reuses the Part 5.5 hooks).

---

### What Phase 2 ships (next turn, on request)

- Migrate the **existing landing page**, **projects list**, **project detail**, **about**, **contact**, **FAQ**, **privacy**, **terms** to read from `cms_pages` + `cms_global_content` (no visual change — just swaps hardcoded strings/sections for CMS reads).
- Header + footer components consume `cms_global_content` + `cmsGetPublishedPage('_header')` / `'_footer'`.
- Public site publishes brand tokens on cold load.

### What Phase 3 ships (later)

- Scheduled visibility (`visible_from`/`visible_until` cron), campaign scheduling.
- Advanced permissions (Content Manager / Marketing Manager / Media Manager roles).
- Sitemap auto-generation from published pages.
- Rich-text editor upgrade (currently plain textarea + markdown-ish).

---

### Regression tests I'll run before implementing

- `bunx tsgo --noEmit` (typecheck).
- Playwright smoke: `/` loads, `/auth` loads, `/admin` gated redirect, `/admin/team-leaders` list, `/admin/customers` list, `/admin/finance` KPIs, `/admin/analytics` charts. Fail → fix before touching CMS code.

---

### Technical notes (for reference)

- Uses `@dnd-kit/core` + `@dnd-kit/sortable` (installed if not present).
- Blocks JSONB schema versioned with `schema_version` field so future block-type migrations are safe.
- `cms_page_versions` is append-only; rollback = copy an old version's blocks into a new version row and set `current_version_id`.
- Theme editor writes to `document.documentElement.style.setProperty('--primary', ...)` for live preview; persisted values are read at bootstrap and injected server-side (SSR) via inline `<style>` in `__root.tsx`.
- Media uses the same signed-URL pattern as the Customer CRM documents module (already proven in Part 6.5).

---

**Confirm to proceed with Phase 1**, or tell me to reshape the phase boundary (e.g. move the theme editor to Phase 2, ship the landing migration now, drop version history, etc.).