/**
 * Aawash — Left dock (WaveRail) transition checks.
 *
 * Verifies the dock expands/collapses correctly across breakpoints and
 * orientations, persists its state in localStorage, and keeps the active
 * section highlighted across reloads.
 *
 * Requires a signed-in leader/member. Set E2E_LEADER_EMAIL and
 * E2E_LEADER_PASSWORD (or E2E_MEMBER_*) to run; skipped otherwise.
 *
 *   bunx playwright test tests/e2e/left-dock.spec.ts
 */
import { test, expect, type Page } from "@playwright/test";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:8080";
const EMAIL = process.env.E2E_LEADER_EMAIL ?? process.env.E2E_MEMBER_EMAIL;
const PASSWORD = process.env.E2E_LEADER_PASSWORD ?? process.env.E2E_MEMBER_PASSWORD;
const HOME = process.env.E2E_LEADER_EMAIL ? "/leader" : "/member";

const DESKTOP = { width: 1440, height: 900 };
const TABLET_PORTRAIT = { width: 834, height: 1112 };
const TABLET_LANDSCAPE = { width: 1112, height: 834 };
const PHONE_PORTRAIT = { width: 390, height: 844 };
const PHONE_LANDSCAPE = { width: 844, height: 390 };

async function signIn(page: Page) {
  await page.goto(`${BASE}/auth`);
  await page.getByRole("textbox", { name: "Login ID" }).fill(EMAIL!);
  await page.locator('input[aria-label="Password"]').fill(PASSWORD!);
  await page.getByRole("button", { name: /sign in|log in/i }).first().click();
  await page.waitForURL(/\/(leader|member|admin)/, { timeout: 20_000 });
}

async function railWidth(page: Page) {
  return (await page.getByTestId("dock").boundingBox())!.width;
}

test.describe("Left dock transitions", () => {
  test.skip(!EMAIL || !PASSWORD, "Set E2E_LEADER_EMAIL / E2E_LEADER_PASSWORD to run dock tests.");

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await signIn(page);
    await page.goto(`${BASE}${HOME}`);
    await expect(page.getByTestId("dock")).toBeVisible();
  });

  test("expands on desktop and collapses below the lg breakpoint", async ({ page }) => {
    await expect(page.getByTestId("dock")).toHaveAttribute("data-dock-open", "true");
    const expanded = await railWidth(page);
    expect(expanded).toBeGreaterThan(110);

    await page.setViewportSize(PHONE_PORTRAIT);
    await expect(page.getByTestId("dock")).toHaveAttribute("data-dock-open", "false");
    await page.waitForTimeout(600); // allow the width transition to settle
    expect(await railWidth(page)).toBeLessThan(expanded);

    await page.setViewportSize(DESKTOP);
    await expect(page.getByTestId("dock")).toHaveAttribute("data-dock-open", "true");
    await page.waitForTimeout(600);
    expect(await railWidth(page)).toBeCloseTo(expanded, 0);
  });

  for (const [name, size] of [
    ["tablet portrait", TABLET_PORTRAIT],
    ["tablet landscape", TABLET_LANDSCAPE],
    ["phone landscape", PHONE_LANDSCAPE],
  ] as const) {
    test(`dock stays on-screen and does not overlap content — ${name}`, async ({ page }) => {
      await page.setViewportSize(size);
      await page.waitForTimeout(600);
      const dock = (await page.getByTestId("dock").boundingBox())!;
      const content = (await page.getByTestId("dock-content").boundingBox())!;
      expect(dock.x).toBeCloseTo(0, 0);
      expect(dock.width).toBeLessThan(size.width / 2);
      // main column starts to the right of the rail
      expect(content.x + content.width).toBeGreaterThan(dock.width);
      await expect(page.getByRole("navigation").first()).toBeVisible();
    });
  }

  test("collapse preference persists across reloads", async ({ page }) => {
    await page.getByTestId("dock-toggle").click();
    await expect(page.getByTestId("dock")).toHaveAttribute("data-dock-open", "false");

    await page.reload();
    await expect(page.getByTestId("dock")).toHaveAttribute("data-dock-open", "false");
    expect(await page.evaluate(() => localStorage.getItem("aawaash.dock.expanded"))).toBe("0");

    await page.getByTestId("dock-toggle").click();
    await expect(page.getByTestId("dock")).toHaveAttribute("data-dock-open", "true");
    await page.reload();
    await expect(page.getByTestId("dock")).toHaveAttribute("data-dock-open", "true");
  });

  test("active dock item is highlighted and restored after reload", async ({ page }) => {
    const items = page.locator("[data-dock-item]");
    await expect(items.first()).toBeVisible();

    const target = items.nth(1);
    const key = await target.getAttribute("data-dock-item");
    await target.click();
    await expect(page.locator(`[data-dock-item="${key}"]`)).toHaveAttribute("data-active", "true");
    expect(await page.evaluate(() => localStorage.getItem("aawaash.dock.section"))).toBe(key);

    await page.reload();
    await expect(page.locator(`[data-dock-item="${key}"]`)).toHaveAttribute("data-active", "true");
    await expect(page.locator('[data-dock-item][data-active="true"]')).toHaveCount(1);
  });
});
