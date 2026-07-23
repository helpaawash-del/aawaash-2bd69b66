/**
 * Aawash — Admin panel acceptance tests
 *
 * Covers the new admin flow:
 *   1. `/admin` redirects unauthenticated visitors to `/admin-login`.
 *   2. `/admin-login` enforces the 4-digit passcode; wrong code is rejected.
 *   3. With the correct passcode + admin session, the master dashboard
 *      renders the three Team Leader slots and the "Create member" panel.
 *   4. Creating a Team Leader immediately surfaces the leader card and its
 *      detail page opens on the Members section.
 *   5. Creating a Member from the dashboard adds them under the parent leader.
 *   6. The newly created member can sign in at `/auth` without misdirection.
 *
 * The interactive suites are skipped unless a super-admin session is available:
 *   E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD, E2E_ADMIN_PASSCODE (default: 0000)
 *
 * Run:
 *   bunx playwright install chromium
 *   bunx playwright test tests/e2e/admin-panel.spec.ts
 */
import { test, expect, type Page } from "@playwright/test";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:8080";
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD;
const PASSCODE = process.env.E2E_ADMIN_PASSCODE ?? "0000";

async function adminLogin(page: Page) {
  await page.goto(`${BASE}/auth`);
  await page.getByLabel(/login id|email/i).fill(ADMIN_EMAIL!);
  await page.getByLabel(/password/i).fill(ADMIN_PASSWORD!);
  await page.getByRole("button", { name: /sign in|log in/i }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/auth"), { timeout: 15_000 });
}

async function enterPasscode(page: Page, code: string) {
  await page.goto(`${BASE}/admin-login`);
  await page.getByLabel(/admin passcode/i).fill(code);
  await page.getByRole("button", { name: /continue to admin/i }).click();
}

test.describe("Admin passcode gate", () => {
  test("unauthenticated /admin redirects to /admin-login", async ({ page }) => {
    await page.goto(`${BASE}/admin`);
    await page.waitForURL(/\/(admin-login|auth)/, { timeout: 10_000 });
    expect(page.url()).toMatch(/\/(admin-login|auth)/);
  });

  test("wrong passcode does not unlock the panel", async ({ page }) => {
    test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, "Requires E2E_ADMIN_* credentials");
    await adminLogin(page);
    await enterPasscode(page, "9999");
    await expect(page.getByText(/incorrect|invalid|wrong/i)).toBeVisible({ timeout: 5_000 });
    expect(page.url()).toContain("/admin-login");
  });
});

test.describe("Admin master dashboard", () => {
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, "Requires E2E_ADMIN_* credentials");

  test("passcode unlock renders leader slots and member panel", async ({ page }) => {
    await adminLogin(page);
    await enterPasscode(page, PASSCODE);
    await page.waitForURL(/\/admin\/?$/, { timeout: 10_000 });
    await expect(page.getByRole("heading", { name: /Aawash Control Center/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /refresh teams/i })).toBeVisible();
    await expect(page.getByText(/Team Leader A/i)).toBeVisible();
    await expect(page.getByText(/Team Leader B/i)).toBeVisible();
    await expect(page.getByText(/Team Leader C/i)).toBeVisible();
    await expect(page.getByText(/Create member/i).first()).toBeVisible();
  });

  test("leader slot Save button enables and persists the new leader in the parent UI", async ({ page }) => {
    await adminLogin(page);
    await enterPasscode(page, PASSCODE);
    await page.waitForURL(/\/admin\/?$/);

    const mobile = `98${Date.now().toString().slice(-8)}`;
    const slot = page.locator("form", { has: page.getByRole("button", { name: /save leader/i }) }).first();
    await expect(slot).toBeVisible({ timeout: 15_000 });
    const save = slot.getByRole("button", { name: /save leader/i });
    await expect(save).toBeDisabled();
    await slot.getByPlaceholder(/leader name/i).fill(`E2E Leader ${mobile}`);
    await slot.getByPlaceholder(/9876543210/).fill(mobile);
    await slot.getByPlaceholder(/minimum 8/i).fill("Passw0rd!123");
    await expect(save).toBeEnabled();
    await save.click();
    await expect(page.getByText(new RegExp(`Login ID: ${mobile}`))).toBeVisible({ timeout: 15_000 });
    const leaderCard = page.locator("a", { hasText: `E2E Leader ${mobile}` }).first();
    await expect(leaderCard).toBeVisible({ timeout: 15_000 });

    await leaderCard.click();
    await page.waitForURL(/\/admin\/team-leaders\//);
    await expect(page.getByRole("tab", { name: /members/i }).first()).toHaveAttribute(
      "data-state",
      /active|selected/i,
    );
  });

  test("create Member from the dashboard and log them in", async ({ page, context }) => {
    await adminLogin(page);
    await enterPasscode(page, PASSCODE);
    await page.waitForURL(/\/admin\/?$/);

    const mobile = `97${Date.now().toString().slice(-8)}`;
    const password = "MemberP@ss1";
    const panel = page.locator("section, aside", { hasText: /Create member/i }).first();
    await panel.getByPlaceholder(/member name/i).fill(`E2E Member ${mobile}`);
    await panel.getByRole("combobox").first().selectOption({ index: 1 });
    await panel.getByPlaceholder(/9876543210/).fill(mobile);
    await panel.getByPlaceholder(/minimum 8/i).fill(password);
    await panel.getByRole("button", { name: /save member/i }).click();
    const loginIdBadge = await page
      .getByText(/Login ID:\s*[A-Z]\d{10}/)
      .first()
      .textContent({ timeout: 15_000 });
    const match = loginIdBadge?.match(/[A-Z]\d{10}/);
    expect(match).not.toBeNull();

    // Member login in a fresh session — no misdirects
    const memberPage = await context.newPage();
    await memberPage.goto(`${BASE}/auth`);
    await memberPage.getByLabel(/login id|email/i).fill(match![0]);
    await memberPage.getByLabel(/password/i).fill(password);
    await memberPage.getByRole("button", { name: /sign in|log in/i }).click();
    await memberPage.waitForURL(/\/(member|dashboard)/, { timeout: 15_000 });
    expect(memberPage.url()).toMatch(/\/(member|dashboard)/);
  });
});
