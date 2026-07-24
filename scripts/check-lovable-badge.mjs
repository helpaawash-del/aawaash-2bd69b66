#!/usr/bin/env node
/**
 * Playwright smoke-check: assert #lovable-badge is not visible on any route.
 *
 * Usage:
 *   node scripts/check-lovable-badge.mjs                # dev server (default http://localhost:8080)
 *   BASE_URL=https://aawaash.lovable.app node scripts/check-lovable-badge.mjs  # production
 *
 * Extra sanity: after asserting the badge is hidden, inject a fake
 * <div id="lovable-badge"> into the DOM and confirm the MutationObserver
 * keeps it hidden (display:none / zero box).
 */
import { chromium } from "playwright";

const BASE_URL = process.env.BASE_URL || "http://localhost:8080";
const ROUTES = ["/", "/projects", "/projects/savitri-enclave", "/auth", "/admin"];

const isHidden = (el) => {
  if (!el) return true;
  const cs = getComputedStyle(el);
  const rect = el.getBoundingClientRect();
  return (
    cs.display === "none" ||
    cs.visibility === "hidden" ||
    Number(cs.opacity) === 0 ||
    (rect.width === 0 && rect.height === 0)
  );
};

const run = async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const failures = [];

  for (const route of ROUTES) {
    const url = new URL(route, BASE_URL).toString();
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20_000 });
      await page.waitForTimeout(400);

      // 1) Initial badge (if present) must be hidden.
      const initiallyHidden = await page.evaluate((fn) => {
        const check = new Function("el", `return (${fn})(el)`);
        const el = document.getElementById("lovable-badge");
        return !el || check(el);
      }, isHidden.toString());
      if (!initiallyHidden) failures.push(`${route}: badge visible on initial render`);

      // 2) Inject a fake badge and verify the observer neutralizes it.
      const observedHidden = await page.evaluate(async (fn) => {
        const check = new Function("el", `return (${fn})(el)`);
        const injected = document.createElement("div");
        injected.id = "lovable-badge";
        injected.textContent = "Edit with Lovable";
        injected.style.cssText = "position:fixed;bottom:0;right:0;padding:12px;background:#000;color:#fff;z-index:99999;";
        document.body.appendChild(injected);
        await new Promise((r) => setTimeout(r, 250));
        const el = document.getElementById("lovable-badge");
        const hidden = !el || check(el);
        el?.remove();
        return hidden;
      }, isHidden.toString());
      if (!observedHidden) failures.push(`${route}: injected badge remained visible (observer missed it)`);

      console.log(`✓ ${route}`);
    } catch (err) {
      failures.push(`${route}: navigation failed — ${err.message}`);
    }
  }

  await browser.close();

  if (failures.length) {
    console.error(`\n✗ ${failures.length} failure(s):`);
    for (const f of failures) console.error("  - " + f);
    process.exit(1);
  }
  console.log(`\nAll ${ROUTES.length} routes passed against ${BASE_URL}.`);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
