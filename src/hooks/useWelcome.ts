import { useCallback, useEffect, useState } from "react";

/**
 * First-run welcome banner state.
 * - `done`    → banner dismissed / customization completed
 * - `style`   → how the hero greeting should read
 * Persisted in localStorage so returning users never see the banner again.
 */

const DONE_KEY = "aawaash.welcome.done";
const STYLE_KEY = "aawaash.welcome.greeting";

export type GreetingStyle = "time" | "name" | "minimal";

const STYLES: GreetingStyle[] = ["time", "name", "minimal"];

export function useWelcome() {
  const [hydrated, setHydrated] = useState(false);
  const [done, setDoneState] = useState(true); // assume returning user until hydrated
  const [style, setStyleState] = useState<GreetingStyle>("time");

  useEffect(() => {
    try {
      setDoneState(window.localStorage.getItem(DONE_KEY) === "1");
      const raw = window.localStorage.getItem(STYLE_KEY) as GreetingStyle | null;
      if (raw && STYLES.includes(raw)) setStyleState(raw);
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  const setStyle = useCallback((next: GreetingStyle) => {
    setStyleState(next);
    try {
      window.localStorage.setItem(STYLE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const complete = useCallback(() => {
    setDoneState(true);
    try {
      window.localStorage.setItem(DONE_KEY, "1");
    } catch {
      /* ignore */
    }
  }, []);

  const reset = useCallback(() => {
    setDoneState(false);
    try {
      window.localStorage.removeItem(DONE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  return { hydrated, done, show: hydrated && !done, style, setStyle, complete, reset };
}

export type WelcomeState = ReturnType<typeof useWelcome>;
