/**
 * Aawash — Visual regression for the leader & member dashboards.
 *
 * Guards against unintended layout/image changes on the dashboard hero
 * (building artwork) and the stat pods, with extra assertions on the
 * "Total sales" pod: it must keep its label above a plain numeric value
 * (no currency symbol, no extra hint text) and keep the same box size as
 * its sibling pods.
 *
 * Requires a signed-in leader/member. Set E2E_LEADER_EMAIL /
 * E2E_LEADER_PASSWORD (or E2E_MEMBER_*) to run; skipped otherwise.
 *
 *   bunx playwright test tests/e2e/dashboard-visual.spec.ts
 *   bunx playwright test tests/e2e/dashboard-visual.spec.ts --update-snapshots
 */
import { test, expect, type Page } from "@playwright/test";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:8080";
const EMAIL = process.env.E2E_LEADER_EMAIL ?? process.env.E2E_MEMBER_EMAIL;
const PASSWORD = process.env.E2E_LEADER_PASSWORD ?? process.env.E2E_MEMBER_PASSWORD;
const ROLE = process.env.E2E_LEADER_EMAIL ? "leader" : "member";
const HOME = `/${ROLE}`;

const DESKTOP = { width: 1440, height: 900 };
const PHONE = { width: 390, height: 844 };

/** Motion (birds, orb, skeleton shimmer) must be frozen for stable pixels. */
const FREEZE_MOTION = `
  *, *::before, *::after {
    animation: none !important;
    transition: none !important;
  }
`;

async function signIn(page: Page) {
  await page.goto(`${BASE}/auth`);
  await page.getByLabel(/email/i).first().fill(EMAIL!);
  await page.getByLabel(/password/i).first().fill(PASSWORD!);
  await page
    .getByRole("button", { name: /sign in|log in/i })
    .first()
    .click();
  await page.waitForURL(/\/(leader|member|admin)/, { timeout: 20_000 });
}

async function openDashboard(page: Page, viewport: { width: number; height: number }) {
  await page.setViewportSize(viewport);
  await page.goto(`${BASE}${HOME}`);
  // wait for data to settle so no pod is in its skeleton state
  await expect(page.locator('[data-testid="eco-pod"]').first()).toBeVisible();
  await expect(page.locator('[data-testid="eco-pod"][data-loading="true"]')).toHaveCount(0, {
    timeout: 20_000,
  });
  await page.addStyleTag({ content: FREEZE_MOTION });
  await page.waitForTimeout(300);
}

const salesPod = (page: Page) => page.locator('[data-testid="eco-pod"][data-pod="total-sales"]');

test.describe(`${ROLE} dashboard — visual regression`, () => {
  test.skip(!EMAIL || !PASSWORD, "Set E2E_LEADER_EMAIL / E2E_LEADER_PASSWORD to run visual tests.");

  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  for (const [name, size] of [
    ["desktop", DESKTOP],
    ["mobile", PHONE],
  ] as const) {
    test(`hero building artwork is unchanged — ${name}`, async ({ page }) => {
      await openDashboard(page, size);
      const scene = page.locator('[data-testid="eco-hero-scene"]');
      await expect(scene).toBeVisible();

      // the artwork must load (guards against a broken/replaced asset URL)
      const loaded = await page
        .locator('[data-testid="eco-hero-image"]')
        .evaluate((el) => (el as HTMLImageElement).complete && (el as HTMLImageElement).naturalWidth > 0);
      expect(loaded).toBe(true);

      await expect(scene).toHaveScreenshot(`hero-${ROLE}-${name}.png`, { maxDiffPixelRatio: 0.02 });
    });

    test(`Total sales pod is unchanged — ${name}`, async ({ page }) => {
      await openDashboard(page, size);
      const pod = salesPod(page);
      await expect(pod).toBeVisible();

      // label above the number
      await expect(pod.locator("[data-pod-label]")).toHaveText("Total sales");
      // value is a bare count: digits only, no currency symbol, no "closed" hint
      const value = (await pod.locator("[data-pod-value]").innerText()).trim();
      expect(value).toMatch(/^\d+$/);
      expect(value).not.toContain("₹");
      await expect(pod).not.toContainText(/closed/i);

      await expect(pod).toHaveScreenshot(`total-sales-pod-${ROLE}-${name}.png`, {
        maxDiffPixelRatio: 0.01,
      });
    });

    test(`stat pods keep identical box sizing — ${name}`, async ({ page }) => {
      await openDashboard(page, size);
      const pods = page.locator('[data-testid="eco-pod"]');
      const count = await pods.count();
      expect(count).toBeGreaterThan(1);

      const sales = (await salesPod(page).boundingBox())!;
      const siblings = [];
      for (let i = 0; i < count; i++) {
        const box = (await pods.nth(i).boundingBox())!;
        siblings.push(box);
      }
      // every pod in the hero column shares the sales pod's width and height
      const sameColumn = siblings.filter((b) => Math.abs(b.x - sales.x) < 2);
      for (const box of sameColumn) {
        expect(box.width).toBeCloseTo(sales.width, 0);
        expect(box.height).toBeCloseTo(sales.height, 0);
      }
    });
  }

  test("dashboard hero section layout is unchanged — desktop", async ({ page }) => {
    await openDashboard(page, DESKTOP);
    await expect(page.locator("section").first()).toHaveScreenshot(`hero-section-${ROLE}.png`, {
      maxDiffPixelRatio: 0.02,
    });
  });

  test("Total sales pod keeps its box while loading", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    // stall dashboard data so the skeleton state stays on screen
    await page.route("**/_serverFn/**", async (route) => {
      await new Promise((r) => setTimeout(r, 4000));
      await route.continue();
    });
    await page.goto(`${BASE}${HOME}`);
    const pod = salesPod(page);
    await expect(pod).toBeVisible();
    await expect(pod).toHaveAttribute("data-loading", "true");
    await expect(pod.locator("[data-pod-label]")).toHaveText("Total sales");
    await expect(pod.locator("[data-pod-value]")).toHaveCount(0);

    const box = (await pod.boundingBox())!;
    await page.unroute("**/_serverFn/**");
    await expect(pod).toHaveAttribute("data-loading", "false", { timeout: 20_000 });
    const settled = (await pod.boundingBox())!;
    // no layout shift between skeleton and loaded state
    expect(settled.width).toBeCloseTo(box.width, 0);
    expect(settled.height).toBeCloseTo(box.height, 0);
  });
});
