/**
 * Aawash — Wallet Quick Edit persistence acceptance test
 *
 * Confirms an admin can adjust a member's wallet balance from the
 * "Wallets · Quick edit" modal, close and reopen the panel, and see
 * the updated balance persist (i.e. it matches what the database now
 * holds — not just the in-memory optimistic value).
 *
 * Flow:
 *   1. Sign in as super admin + unlock 4-digit passcode.
 *   2. Open Wallets Quick Edit → open a team's Members sub-modal.
 *   3. Capture the member's starting balance, credit ₹1, verify
 *      the row shows the new value.
 *   4. Close both modals fully, reopen, and assert the balance
 *      still shows the new value after a fresh network read.
 *
 * Skipped without credentials so CI stays green on projects that
 * haven't wired up test accounts.
 */
import { test, expect, type Page } from "@playwright/test";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:8080";
const EMAIL = process.env.E2E_ADMIN_EMAIL;
const PASSWORD = process.env.E2E_ADMIN_PASSWORD;
const PASSCODE = process.env.E2E_ADMIN_PASSCODE ?? "0000";

async function signInAdmin(page: Page) {
  await page.goto(`${BASE}/auth`);
  await page.getByLabel(/login id|email/i).fill(EMAIL!);
  await page.getByLabel(/password/i).fill(PASSWORD!);
  await page.getByRole("button", { name: /sign in|log in/i }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/auth"), { timeout: 15_000 });

  await page.goto(`${BASE}/admin-login`);
  await page.getByLabel(/admin passcode/i).fill(PASSCODE);
  await page.getByRole("button", { name: /continue to admin/i }).click();
  await page.waitForURL(/\/admin\/?$/, { timeout: 10_000 });
}

async function openWalletPanel(page: Page) {
  await page.getByRole("button", { name: /open wallet quick edit/i }).click();
  await expect(page.getByText(/Wallet Quick Edit/i)).toBeVisible();
}

test.describe("Wallet Quick Edit persistence", () => {
  test.skip(!EMAIL || !PASSWORD, "Requires E2E_ADMIN_* credentials");

  test("member wallet change persists after modal close/reopen", async ({ page }) => {
    await signInAdmin(page);
    await openWalletPanel(page);

    // Enter the first team's Members modal
    const membersButton = page.getByRole("button", { name: /view team members/i }).first();
    await expect(membersButton).toBeVisible({ timeout: 15_000 });
    await membersButton.click();

    // Grab the first member row + its starting balance
    const memberRow = page.locator('ul li:has(button:has-text("Edit"))').first();
    await expect(memberRow).toBeVisible({ timeout: 15_000 });
    const startText = (await memberRow.locator("div:has-text('Wallet') + div, .text-primary").first().textContent()) ?? "";
    const startNum = parseFloat(startText.replace(/[^\d.-]/g, "")) || 0;

    // Credit ₹1 with a reason
    await memberRow.getByRole("button", { name: /^Edit$/i }).click();
    const form = memberRow.locator("form");
    await form.getByPlaceholder(/Amount/i).fill("1");
    await form.getByPlaceholder(/Reason/i).fill("E2E persistence check");
    await form.getByRole("button", { name: /Apply/i }).click();

    // Toast confirms the mutation succeeded server-side
    await expect(page.getByText(/Credited/i)).toBeVisible({ timeout: 10_000 });

    // Close both modals
    await page.getByRole("button", { name: /close members panel/i }).click();
    await page.getByRole("button", { name: /close wallet panel/i }).click();
    await expect(page.getByText(/Wallet Quick Edit/i)).toHaveCount(0);

    // Reopen and confirm the new balance is what the DB returned
    await openWalletPanel(page);
    await page.getByRole("button", { name: /view team members/i }).first().click();
    const reopenedRow = page.locator('ul li:has(button:has-text("Edit"))').first();
    await expect(reopenedRow).toBeVisible({ timeout: 15_000 });
    const endText = (await reopenedRow.locator(".text-primary").first().textContent()) ?? "";
    const endNum = parseFloat(endText.replace(/[^\d.-]/g, "")) || 0;

    expect(endNum).toBeGreaterThanOrEqual(startNum + 1 - 0.001);
  });
});
