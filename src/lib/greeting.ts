/**
 * Greeting helpers — pure, testable, shared by the Team Leader and Member
 * dashboards. Kept free of React/browser globals apart from `Date`, which
 * always resolves in the *viewer's own local timezone*.
 */

export type GreetingWord = "Good Morning" | "Good Afternoon" | "Good Evening" | "Good Night";

/** Time-of-day greeting based on the signed-in user's LOCAL clock. */
export function timeGreeting(now: Date = new Date()): GreetingWord {
  const h = now.getHours(); // local hours — never UTC
  if (h < 5) return "Good Night";
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  if (h < 21) return "Good Evening";
  return "Good Night";
}

/**
 * Extracts the first name from a stored full name.
 * Handles extra whitespace, tabs/newlines and titles-free single names.
 * Returns "" when nothing usable is present.
 */
export function firstNameOf(fullName?: string | null): string {
  if (!fullName) return "";
  const cleaned = String(fullName).replace(/[\s\u00a0]+/g, " ").trim();
  if (!cleaned) return "";
  const first = cleaned.split(" ")[0] ?? "";
  return first.trim();
}

/** Fallback used when a profile has no usable first name. */
export const GREETING_FALLBACK = "there";

/**
 * Name rendered next to the greeting.
 * - while the session/profile is still loading → "" (caller renders a shimmer,
 *   so no "Leader"/"Member" placeholder ever flashes)
 * - loaded with a name → "Ravi."
 * - loaded without a usable name → "there."
 */
export function greetingName(fullName: string | null | undefined, loading: boolean): string {
  if (loading) return "";
  const first = firstNameOf(fullName);
  return `${first || GREETING_FALLBACK}.`;
}

/** Normalises a name before it is saved, so the first name is always reliable. */
export function normalizeFullName(input: string): string {
  return String(input).replace(/[\s\u00a0]+/g, " ").trim();
}

/** True when a submitted full name contains a usable first name. */
export function hasUsableFirstName(input: string): boolean {
  return /^[\p{L}][\p{L}'.-]*$/u.test(firstNameOf(normalizeFullName(input)));
}
