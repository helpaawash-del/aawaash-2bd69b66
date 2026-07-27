import { describe, expect, it } from "vitest";
import {
  PASSCODE_MAX_FAILURES,
  PASSCODE_WINDOW_MS,
  evaluateRateLimit,
  formatRetryAfter,
  passcodeMatches,
} from "@/lib/admin-passcode.server";

const NOW = 1_800_000_000_000;

describe("admin passcode comparison", () => {
  it("accepts the exact passcode", () => {
    expect(passcodeMatches("4821", "4821")).toBe(true);
  });

  it("rejects wrong passcodes, including well-known defaults", () => {
    expect(passcodeMatches("0000", "4821")).toBe(false);
    expect(passcodeMatches("1234", "4821")).toBe(false);
    expect(passcodeMatches("", "4821")).toBe(false);
    // Length differences must not throw (hashes keep the compare constant-length).
    expect(passcodeMatches("48210000", "4821")).toBe(false);
  });
});

describe("admin passcode rate limiting", () => {
  it("allows the first attempt with a full budget", () => {
    const d = evaluateRateLimit([], NOW);
    expect(d.blocked).toBe(false);
    expect(d.remaining).toBe(PASSCODE_MAX_FAILURES);
    expect(d.retryAfterMs).toBe(0);
  });

  it("counts down remaining attempts as failures accumulate", () => {
    for (let n = 1; n < PASSCODE_MAX_FAILURES; n++) {
      const failures = Array.from({ length: n }, (_, i) => NOW - i * 1000);
      const d = evaluateRateLimit(failures, NOW);
      expect(d.blocked).toBe(false);
      expect(d.remaining).toBe(PASSCODE_MAX_FAILURES - n);
    }
  });

  it("locks out once the failure budget is spent", () => {
    const failures = Array.from({ length: PASSCODE_MAX_FAILURES }, (_, i) => NOW - i * 1000);
    const d = evaluateRateLimit(failures, NOW);
    expect(d.blocked).toBe(true);
    expect(d.remaining).toBe(0);
    expect(d.retryAfterMs).toBeGreaterThan(0);
    expect(d.retryAfterMs).toBeLessThanOrEqual(PASSCODE_WINDOW_MS);
  });

  it("stays locked while extra failures keep arriving", () => {
    const failures = Array.from({ length: PASSCODE_MAX_FAILURES + 7 }, (_, i) => NOW - i * 500);
    expect(evaluateRateLimit(failures, NOW).blocked).toBe(true);
  });

  it("releases the lock after the rolling window expires", () => {
    const failures = Array.from({ length: PASSCODE_MAX_FAILURES }, (_, i) => NOW - i * 1000);
    const later = NOW + PASSCODE_WINDOW_MS + 1;
    const d = evaluateRateLimit(failures, later);
    expect(d.blocked).toBe(false);
    expect(d.remaining).toBe(PASSCODE_MAX_FAILURES);
  });

  it("ignores failures older than the window", () => {
    const old = Array.from({ length: 20 }, (_, i) => NOW - PASSCODE_WINDOW_MS - i * 1000);
    const d = evaluateRateLimit([...old, NOW - 5_000], NOW);
    expect(d.blocked).toBe(false);
    expect(d.remaining).toBe(PASSCODE_MAX_FAILURES - 1);
  });

  it("formats a human retry hint", () => {
    expect(formatRetryAfter(30_000)).toBe("about a minute");
    expect(formatRetryAfter(9 * 60_000)).toBe("about 9 minutes");
  });
});
