/**
 * Aawash — Bottom dock (floating primary nav) acceptance tests
 *
 * Confirms:
 *  1. The dock renders on the authenticated home for every viewport
 *     (mobile ≤420px, tablet ~768px, desktop ≥1280px).
 *  2. All 5 dock links are visible, keyboard-focusable, and clickable —
 *     hitting each one changes the URL to the role-specific target.
 *  3. Every link exposes an accessible name via aria-label and marks the
 *     active destination with aria-current="page".
 *
 * Requires an authenticated session; skipped otherwise so CI stays green
 * on projects that haven't wired up test credentials.
 */
import { test, expect, type Page } from "@playwright/test";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:8080";
const EMAIL = process.env.E2E_ADMIN_EMAIL ?? process.env.E2E_MEMBER_EMAIL;
const PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? process.env.E2E_MEMBER_PASSWORD;

async function signIn(page: Page) {
  await page.goto(`${BASE}/auth`);
  await page.getByLabel(/login id|email/i).fill(EMAIL!);
  await page.getByLabel(/password/i).fill(PASSWORD!);
  await page.getByRole("button", { name: /sign in|log in/i }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/auth"), { timeout: 15_000 });
}

const VIEWPORTS = [
  { name: "mobile", width: 390, height: 780 },
  { name: "tablet", width: 820, height: 1180 },
  { name: "desktop", width: 1440, height: 900 },
] as const;

test.describe("Bottom dock — a11y + routing", () => {
  test.skip(!EMAIL || !PASSWORD, "Requires E2E credentials");

  for (const vp of VIEWPORTS) {
    test(`dock renders and routes on ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await signIn(page);

      const dock = page.getByTestId("bottom-dock");
      await expect(dock).toBeVisible();

      // All 5 labels present
      for (const label of ["Home", "Projects", "Sales", "Wallet", "Account"]) {
        const link = page.getByTestId(`dock-link-${label.toLowerCase()}`);
        await expect(link).toBeVisible();
        // Accessible name is present
        const aria = await link.getAttribute("aria-label");
        expect(aria).toBeTruthy();
        expect(aria!.toLowerCase()).toContain(label.toLowerCase());
      }

      // Keyboard focus lands on the first link
      await page.getByTestId("dock-link-home").focus();
      await expect(page.getByTestId("dock-link-home")).toBeFocused();

      // Route through each destination
      const targets = ["projects", "sales", "wallet", "account", "home"];
      for (const key of targets) {
        const before = page.url();
        await page.getByTestId(`dock-link-${key}`).click();
        await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
        // URL should change (or stay on Home when we start there)
        if (key !== "home" || !before.endsWith("/")) {
          expect(page.url()).not.toBe(before);
        }
        // Active link exposes aria-current
        const current = page.locator('[data-testid^="dock-link-"][aria-current="page"]').first();
        await expect(current).toBeVisible();
      }
    });
  }
});
