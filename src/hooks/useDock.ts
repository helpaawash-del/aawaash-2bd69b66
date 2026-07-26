import { useCallback, useEffect, useState } from "react";

/**
 * Dock (left rail) UI state with localStorage persistence.
 * - `expanded`  → user preference, restored on future visits
 * - `section`   → last selected nav item, restored across reloads
 */

const EXPANDED_KEY = "aawaash.dock.expanded";
const SECTION_KEY = "aawaash.dock.section";

/** Below this width the dock always renders in its compact icon-only form. */
const EXPAND_QUERY = "(min-width: 1024px)";

function readBool(key: string, fallback: boolean) {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? fallback : raw === "1";
  } catch {
    return fallback;
  }
}

export function useDock() {
  const [hydrated, setHydrated] = useState(false);
  const [expanded, setExpandedState] = useState(true);
  const [wide, setWide] = useState(false);
  const [section, setSectionState] = useState<string | null>(null);

  useEffect(() => {
    setExpandedState(readBool(EXPANDED_KEY, true));
    try {
      setSectionState(window.localStorage.getItem(SECTION_KEY));
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia(EXPAND_QUERY);
    const sync = () => setWide(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const setExpanded = useCallback((next: boolean) => {
    setExpandedState(next);
    try {
      window.localStorage.setItem(EXPANDED_KEY, next ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = useCallback(() => setExpanded(!expanded), [expanded, setExpanded]);

  const setSection = useCallback((key: string) => {
    setSectionState(key);
    try {
      window.localStorage.setItem(SECTION_KEY, key);
    } catch {
      /* ignore */
    }
  }, []);

  // Only expand where there is room for labels.
  const open = wide && expanded;

  return {
    hydrated,
    expanded,
    setExpanded,
    toggle,
    canExpand: wide,
    open,
    /** rail width in px for the current state */
    width: open ? 132 : 72,
    section,
    setSection,
  };
}

export type DockState = ReturnType<typeof useDock>;
