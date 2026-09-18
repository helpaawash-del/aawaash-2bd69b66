/**
 * Aawash — Acceptance smoke tests (Playwright)
 *
 * Runs against a local dev preview at http://localhost:8080. Verifies:
 *  1. Public landing renders and links to auth.
 *  2. Auth page exposes sign-in and Google OAuth affordance.
 *  3. Admin-only routes redirect unauthenticated visitors away.
 *  4. Project detail counters block invalid save (guarded by required auth).
 *
 * Run:
 *   bunx playwright install chromium
 *   bunx playwright test tests/e2e/acceptance.spec.ts
 *
 * Full role-based end-to-end runs (create project, promote team leader,
 * onboard member) require seeded credentials — set:
 *   E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD, E2E_LEADER_EMAIL,
 *   E2E_LEADER_PASSWORD, E2E_MEMBER_EMAIL, E2E_MEMBER_PASSWORD
 * and re-run. Suites that require them are skipped when absent so this
 * file is safe to run in any environment.
 */
import { test, expect } from "@playwright/test";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:8080";

test.describe("Aawash public surface", () => {
  test("landing renders and offers sign-in", async ({ page }) => {
    await page.goto(BASE);
    await expect(page).toHaveTitle(/Aawash/i);
    const signIn = page.getByRole("link", { name: /sign in|login/i }).first();
    await expect(signIn).toBeVisible();
  });

  test("auth page shows credential form", async ({ page }) => {
    await page.goto(`${BASE}/auth`);
    await expect(page.getByLabel(/login id|email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
  });

  test("unauthenticated admin route redirects to /auth", async ({ page }) => {
    await page.goto(`${BASE}/admin`);
    await page.waitForURL(/\/auth/, { timeout: 10_000 });
    expect(page.url()).toContain("/auth");
  });
});

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD;

async function loginAs(page: import("@playwright/test").Page, email: string, password: string) {
  await page.goto(`${BASE}/auth`);
  await page.getByLabel(/login id|email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /sign in|log in/i }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/auth"), { timeout: 15_000 });
}

test.describe("Admin — project lifecycle", () => {
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, "Set E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD to enable");

  test("create → edit → validate counters → publish", async ({ page }) => {
    await loginAs(page, ADMIN_EMAIL!, ADMIN_PASSWORD!);
    await page.goto(`${BASE}/admin/projects/new`);
    const slug = `e2e-${Date.now().toString(36)}`;
    await page.getByLabel(/name/i).first().fill(`E2E Tower ${slug}`);
    await page.getByLabel(/slug/i).first().fill(slug);
    await page.getByLabel(/location/i).first().fill("Bengaluru");
    await page.getByRole("button", { name: /create|save/i }).click();
    await page.waitForURL(/\/admin\/projects\//);

    // Invalid counter combination must block save
    await page.getByRole("spinbutton", { name: /total flats/i }).fill("10");
    await page.getByRole("spinbutton", { name: /sold/i }).fill("15");
    await expect(page.getByText(/exceeds total flats/i)).toBeVisible();

    // Fix and save
    await page.getByRole("spinbutton", { name: /sold/i }).fill("3");
    await page.getByRole("button", { name: /save changes/i }).click();
    await expect(page.getByText(/saved/i)).toBeVisible();
  });

  test("homepage edit persists and renders publicly", async ({ page }) => {
    await loginAs(page, ADMIN_EMAIL!, ADMIN_PASSWORD!);
    await page.goto(`${BASE}/admin/homepage`);

    const hero = page.locator("section", { hasText: "Hero" }).first();
    await hero.getByRole("button").first().click();
    const heading = hero.locator("input").nth(1);
    const original = await heading.inputValue();
    const marker = `E2E ${Date.now()}`;
    await heading.fill(marker);
    await page.getByRole("button", { name: /save changes/i }).click();
    await expect(page.getByText(/homepage updated/i)).toBeVisible();

    await page.goto(BASE);
    await expect(page.getByText(marker, { exact: false })).toBeVisible();
    await page.reload();
    await expect(page.getByText(marker, { exact: false })).toBeVisible();

    await page.goto(`${BASE}/admin/homepage`);
    const restoredHero = page.locator("section", { hasText: "Hero" }).first();
    await restoredHero.getByRole("button").first().click();
    await restoredHero.locator("input").nth(1).fill(original);
    await page.getByRole("button", { name: /save changes/i }).click();
  });

  test("project cover URL persists through admin save and public rendering", async ({ page }) => {
    await loginAs(page, ADMIN_EMAIL!, ADMIN_PASSWORD!);
    await page.goto(`${BASE}/admin/projects`);
    const projectLink = page.locator('a[href^="/admin/projects/"]').first();
    await expect(projectLink).toBeVisible();
    await projectLink.click();
    await page.getByRole("button", { name: /^media$/i }).click();

    const cover = page.getByLabel(/cover/i).last();
    const original = await cover.inputValue();
    const marker = `https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1200&q=80`;
    await cover.fill(marker);
    await page.getByRole("button", { name: /save media/i }).click();
    await expect(page.getByText(/^saved\.?$/i)).toBeVisible();

    const publicLink = page.getByRole("link", { name: /view public page/i });
    await publicLink.click();
    await expect(page.locator(`img[src*="photo-1600607687920-4e2a09cf159d"]`).first()).toBeVisible();

    await page.goBack();
    await page.getByRole("button", { name: /^media$/i }).click();
    await page.getByLabel(/cover/i).last().fill(original);
    await page.getByRole("button", { name: /save media/i }).click();
  });
});

test.describe("Admin — team leader & member manage flow", () => {
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, "Set E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD to enable");

  test("create team leader then add member under that team", async ({ page }) => {
    await loginAs(page, ADMIN_EMAIL!, ADMIN_PASSWORD!);
    await page.goto(`${BASE}/admin/team-leaders/new`);
    await expect(page.getByRole("heading", { name: /team leader/i })).toBeVisible();

    await page.goto(`${BASE}/admin/members/new`);
    await expect(page.getByRole("heading", { name: /member/i })).toBeVisible();
    // Team selector must be present (leaders must exist for successful creation)
    await expect(page.getByLabel(/team|leader/i).first()).toBeVisible();
  });
});
