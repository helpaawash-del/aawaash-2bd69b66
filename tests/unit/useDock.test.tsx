import { describe, it, expect, beforeEach, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

import { useDock } from "@/hooks/useDock";

function mockMatchMedia(matches: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
      onchange: null,
    })),
  );
}

describe("useDock", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it("defaults to expanded on wide viewports", () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useDock());
    expect(result.current.open).toBe(true);
    expect(result.current.width).toBe(148);
  });

  it("stays collapsed on narrow viewports regardless of preference", () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => useDock());
    expect(result.current.canExpand).toBe(false);
    expect(result.current.open).toBe(false);
    expect(result.current.width).toBe(80);
  });

  it("persists the collapse preference to localStorage", () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useDock());
    act(() => result.current.toggle());
    expect(localStorage.getItem("aawaash.dock.expanded")).toBe("0");
    expect(result.current.open).toBe(false);
  });

  it("restores a stored collapsed preference", () => {
    localStorage.setItem("aawaash.dock.expanded", "0");
    mockMatchMedia(true);
    const { result } = renderHook(() => useDock());
    expect(result.current.expanded).toBe(false);
    expect(result.current.open).toBe(false);
  });

  it("persists and restores the selected section", () => {
    mockMatchMedia(true);
    const first = renderHook(() => useDock());
    act(() => first.result.current.setSection("sales"));
    expect(localStorage.getItem("aawaash.dock.section")).toBe("sales");

    const second = renderHook(() => useDock());
    expect(second.result.current.section).toBe("sales");
  });
});
