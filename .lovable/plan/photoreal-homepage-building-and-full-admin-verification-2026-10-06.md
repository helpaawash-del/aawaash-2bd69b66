# Photoreal homepage building and full admin verification

## Build
- Replace the homepage hero cutout with a transparent, photoreal building derived from the real Savitri Enclave façade, preserving believable materials and architecture.
- Keep the current responsive hero composition and optimize the replacement for fast mobile loading.

## Admin audit and fixes
- Verify homepage section visibility, text/list editing, image replacement/upload, saving, and public refresh behavior.
- Verify project creation and editing across overview, inventory, buildings, floors, flats, gallery, hero/cover media, 3D model, content, and public project pages.
- Verify team leader and member creation, profile edits, team reassignment, status changes, password reset, unlimited member handling, and the fixed three-leader rule.
- Audit remaining admin areas for editable controls, persistence errors, stale lists, upload wiring, validation, and access protection; repair concrete issues found.
- Ensure successful saves invalidate all relevant data so changes appear immediately in admin lists, dashboards, and public pages.

## Verification
- Add or update focused tests for rules and persistence paths changed during the audit.
- Run focused tests, app checks, and browser-based public/admin flows using an authenticated preview session where available.
- Confirm saved database values and verify the corresponding public output after save; clearly report any flow that cannot be safely exercised because an appropriate admin account is unavailable.

## Technical details
- Preserve Lovable Cloud security policies and server-side role checks.
- Keep the Team Leader cap fixed at three and member capacity unlimited.
- Use existing media storage and semantic design components rather than introducing a second upload or caching system.
