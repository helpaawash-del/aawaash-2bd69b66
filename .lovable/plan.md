# Project details and homepage editing upgrade

## Scope
- Store project-specific Flats presentation data in the existing `projects.extra` JSON field, avoiding a new table and keeping public reads within the existing RLS-protected project record.
- Add three editable unit cards for 1 BHK, 2 BHK, and 3 BHK. Each card supports an image, title, area label, and four amenity points.
- Render the Flats cards after Amenities as a touch-friendly swipe carousel with buttons and keyboard support.
- Reorder project detail content to Availability, Gallery, then 3D Model, and restyle Availability as a light, minimal app-like inventory board.
- Add project-admin controls for editing Flats cards and image uploads, then save through the existing admin project function with strict persistence checks.
- Add skipped authenticated Playwright coverage for homepage text editing and Projects cover-image replacement, including public rendering and database persistence through the existing authenticated client/session.

## Technical details
- Extend public/admin project selects and the admin Zod schema to preserve `extra`.
- Normalize `extra` before validation so form submissions remain reliable and do not send malformed string values.
- Keep existing realtime invalidation for project and flat changes.
- Verify TypeScript, production build, and focused E2E tests after implementation.
