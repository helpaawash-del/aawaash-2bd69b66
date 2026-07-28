/**
 * "Remember me" persistence.
 *
 * Supabase always persists the session in localStorage. When the user opts out
 * of "Remember me", we mark the preference and drop the session as soon as the
 * app boots in a brand-new browser session (i.e. the tab marker is gone).
 */

const REMEMBER_KEY = "aawaash.remember";
const TAB_KEY = "aawaash.tab-alive";

export function setRememberPreference(remember: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(REMEMBER_KEY, remember ? "1" : "0");
    window.sessionStorage.setItem(TAB_KEY, "1");
  } catch {
    /* storage unavailable — ignore */
  }
}

export function getRememberPreference(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(REMEMBER_KEY) !== "0";
  } catch {
    return true;
  }
}

/** Signs out non-remembered sessions when the browser session has ended. */
export async function enforceSessionPersistence() {
  if (typeof window === "undefined") return;
  try {
    const remembered = window.localStorage.getItem(REMEMBER_KEY);
    const tabAlive = window.sessionStorage.getItem(TAB_KEY);
    window.sessionStorage.setItem(TAB_KEY, "1");
    if (remembered === "0" && !tabAlive) {
      const { supabase } = await import("@/integrations/supabase/client");
      await supabase.auth.signOut();
    }
  } catch {
    /* ignore */
  }
}
