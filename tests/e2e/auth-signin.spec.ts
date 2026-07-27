/**
 * Aawaash — Sign-in page: visual regression + login behaviour.
 *
 * Visual: pins the rebuilt /auth design (curved hero, leaf medallion,
 * "Welcome Back" headline, glass Sign In card) across phone / tablet /
 * desktop viewports. Snapshots are the reference; re-baseline only when
 * the design intentionally changes:
 *
 *   bunx playwright test tests/e2e/auth-signin.spec.ts --update-snapshots
 *
 * Behaviour: proves the redesign did not change the Login ID + password
 * flow — validation, error messaging, password reveal, and a real
 * credential round-trip when E2E_LOGIN_ID / E2E_PASSWORD are provided.
 */
import { test, expect, type Page } from "@playwright/test";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:8080";
const LOGIN_ID = process.env.E2E_LOGIN_ID;
const PASSWORD = process.env.E2E_PASSWORD;

const VIEWPORTS = [
  { name: "phone", width: 390, height: 844 },
  { name: "phone-large", width: 430, height: 932 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
] as const;

/** Freeze card-in / shake / spinner motion so pixels are deterministic. */
const FREEZE_MOTION = `
  *, *::before, *::after {
    animation: none !important;
    transition: none !important;
    caret-color: transparent !important;
  }
`;

async function openAuth(page: Page) {
  await page.addStyleTag({ content: FREEZE_MOTION }).catch(() => undefined);
  await page.goto(`${BASE}/auth`, { waitUntil: "domcontentloaded" });
  // The page self-checks the session before rendering either form.
  await expect(page.getByRole("heading", { name: /welcome/i })).toBeVisible({ timeout: 15_000 });
  await page.addStyleTag({ content: FREEZE_MOTION });
  await page.evaluate(() => document.fonts?.ready);
  await page.waitForTimeout(250);
}

test.describe("sign-in page — visual regression", () => {
  for (const vp of VIEWPORTS) {
    test(`matches the reference design at ${vp.name} (${vp.width}x${vp.height})`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await openAuth(page);

      // Design landmarks must be present at every size.
      await expect(page.getByRole("link", { name: /aawaash home/i })).toBeVisible();
      await expect(page.getByRole("img", { name: /green residential tower/i })).toBeVisible();
      await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();

      await expect(page).toHaveScreenshot(`auth-${vp.name}.png`, {
        maxDiffPixelRatio: 0.01,
        animations: "disabled",
      });
    });
  }

  test("the glass card keeps its layout and does not overflow the viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openAuth(page);

    const card = page.getByRole("heading", { name: /sign in/i }).locator("xpath=ancestor::div[1]/..");
    const box = (await card.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(390 + 1);

    const hasHorizontalScroll = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(hasHorizontalScroll).toBe(false);
  });
});

test.describe("sign-in page — login behaviour is unchanged", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openAuth(page);
  });

  test("exposes exactly the original Login ID + password controls", async ({ page }) => {
    await expect(page.getByLabel("Login ID")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: /^sign in$/i })).toBeVisible();
    // No social / remember-me controls were introduced by the redesign.
    await expect(page.getByRole("button", { name: /google|facebook|apple/i })).toHaveCount(0);
    await expect(page.getByRole("checkbox")).toHaveCount(0);
  });

  test("uppercases the Login ID as it is typed", async ({ page }) => {
    const id = page.getByLabel("Login ID");
    await id.fill("a9876543210");
    await expect(id).toHaveValue("A9876543210");
  });

  test("rejects a malformed Login ID without calling the backend", async ({ page }) => {
    let authCalls = 0;
    page.on("request", (r) => {
      if (r.url().includes("/auth/v1/token")) authCalls++;
    });

    await page.getByLabel("Login ID").fill("12");
    await page.getByLabel("Password").fill("secret123");
    await page.getByRole("button", { name: /^sign in$/i }).click();

    await expect(page.getByRole("alert")).toHaveText(/invalid login credentials/i);
    expect(authCalls).toBe(0);
  });

  test("rejects a short password without calling the backend", async ({ page }) => {
    let authCalls = 0;
    page.on("request", (r) => {
      if (r.url().includes("/auth/v1/token")) authCalls++;
    });

    await page.getByLabel("Login ID").fill("9876543210");
    await page.getByLabel("Password").fill("123");
    await page.getByRole("button", { name: /^sign in$/i }).click();

    await expect(page.getByRole("alert")).toHaveText(/invalid login credentials/i);
    expect(authCalls).toBe(0);
  });

  test("shows a generic error for wrong credentials and stays on /auth", async ({ page }) => {
    await page.getByLabel("Login ID").fill("9999999999");
    await page.getByLabel("Password").fill("definitely-wrong-password");
    await page.getByRole("button", { name: /^sign in$/i }).click();

    await expect(page.getByRole("alert")).toHaveText(/invalid login credentials/i, { timeout: 15_000 });
    // Must not leak whether the account exists, and must not navigate away.
    await expect(page).toHaveURL(/\/auth/);
  });

  test("password reveal toggle works", async ({ page }) => {
    const pwd = page.getByLabel("Password");
    await pwd.fill("secret123");
    await expect(pwd).toHaveAttribute("type", "password");
    await page.getByRole("button", { name: /show password/i }).click();
    await expect(pwd).toHaveAttribute("type", "text");
    await page.getByRole("button", { name: /hide password/i }).click();
    await expect(pwd).toHaveAttribute("type", "password");
  });

  test("back to home link still navigates to the landing page", async ({ page }) => {
    await page.getByRole("link", { name: /back to home/i }).click();
    await expect(page).toHaveURL(new RegExp(`${BASE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/?$`));
  });

  test("valid credentials sign in and leave /auth", async ({ page }) => {
    test.skip(!LOGIN_ID || !PASSWORD, "Set E2E_LOGIN_ID / E2E_PASSWORD to run the happy path.");

    await page.getByLabel("Login ID").fill(LOGIN_ID!);
    await page.getByLabel("Password").fill(PASSWORD!);
    await page.getByRole("button", { name: /^sign in$/i }).click();

    await expect(page.getByText(/signed in/i)).toBeVisible({ timeout: 15_000 });
    await expect(page).not.toHaveURL(/\/auth/, { timeout: 15_000 });
  });

  test("preserves the ?redirect target after a successful sign-in", async ({ page }) => {
    test.skip(!LOGIN_ID || !PASSWORD, "Set E2E_LOGIN_ID / E2E_PASSWORD to run the happy path.");

    await page.goto(`${BASE}/auth?redirect=%2Fmember%2Fwallet`, { waitUntil: "domcontentloaded" });
    await page.getByLabel("Login ID").fill(LOGIN_ID!);
    await page.getByLabel("Password").fill(PASSWORD!);
    await page.getByRole("button", { name: /^sign in$/i }).click();

    await expect(page).toHaveURL(/\/member\/wallet/, { timeout: 15_000 });
  });
});
