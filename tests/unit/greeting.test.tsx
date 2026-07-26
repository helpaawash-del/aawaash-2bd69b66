import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { GreetingHeader } from "@/components/aawash/dashboard/PremiumKit";
import {
  GREETING_FALLBACK,
  firstNameOf,
  greetingName,
  hasUsableFirstName,
  normalizeFullName,
  timeGreeting,
} from "@/lib/greeting";

/* ---------------------------- pure helpers ---------------------------- */

describe("firstNameOf", () => {
  it("takes the first token of a multi-word name", () => {
    expect(firstNameOf("Ravi Kumar Sharma")).toBe("Ravi");
  });
  it("handles single names and messy whitespace", () => {
    expect(firstNameOf("Raaz")).toBe("Raaz");
    expect(firstNameOf("   Anita   Devi \n")).toBe("Anita");
    expect(firstNameOf("\u00a0Vikram\u00a0Singh")).toBe("Vikram");
  });
  it("returns empty for missing names", () => {
    expect(firstNameOf(null)).toBe("");
    expect(firstNameOf(undefined)).toBe("");
    expect(firstNameOf("   ")).toBe("");
  });
});

describe("greetingName", () => {
  it("renders nothing while the profile is loading (no Leader/Member flash)", () => {
    expect(greetingName("Ravi Kumar", true)).toBe("");
    expect(greetingName(null, true)).toBe("");
  });
  it("renders the first name once loaded", () => {
    expect(greetingName("Ravi Kumar", false)).toBe("Ravi.");
  });
  it("falls back gracefully when the name is empty or missing", () => {
    expect(greetingName("", false)).toBe(`${GREETING_FALLBACK}.`);
    expect(greetingName(null, false)).toBe(`${GREETING_FALLBACK}.`);
    expect(greetingName("   ", false)).toBe(`${GREETING_FALLBACK}.`);
  });
});

describe("timeGreeting", () => {
  const at = (h: number) => {
    const d = new Date();
    d.setHours(h, 0, 0, 0); // local-time setter
    return d;
  };
  it("uses the viewer's local clock", () => {
    expect(timeGreeting(at(2))).toBe("Good Night");
    expect(timeGreeting(at(8))).toBe("Good Morning");
    expect(timeGreeting(at(14))).toBe("Good Afternoon");
    expect(timeGreeting(at(19))).toBe("Good Evening");
    expect(timeGreeting(at(23))).toBe("Good Night");
  });
  it("does not read UTC hours", () => {
    // 23:30 UTC on this date -> local hours may differ; assert we follow local
    const d = new Date("2026-07-26T23:30:00Z");
    const expected = [
      "Good Night",
      "Good Morning",
      "Good Afternoon",
      "Good Evening",
    ].includes(timeGreeting(d))
      ? timeGreeting(d)
      : "Good Night";
    expect(timeGreeting(d)).toBe(expected);
    expect(timeGreeting(d)).toBe(
      d.getHours() < 5
        ? "Good Night"
        : d.getHours() < 12
          ? "Good Morning"
          : d.getHours() < 17
            ? "Good Afternoon"
            : d.getHours() < 21
              ? "Good Evening"
              : "Good Night",
    );
  });
});

describe("name validation at joining time", () => {
  it("normalises stored names so the first name is reliable", () => {
    expect(normalizeFullName("   Ravi    Kumar  ")).toBe("Ravi Kumar");
  });
  it("accepts real names and rejects junk", () => {
    expect(hasUsableFirstName("Ravi Kumar")).toBe(true);
    expect(hasUsableFirstName("D'Souza Maria")).toBe(true);
    expect(hasUsableFirstName("  ")).toBe(false);
    expect(hasUsableFirstName("123 Kumar")).toBe(false);
    expect(hasUsableFirstName("@@ Kumar")).toBe(false);
  });
});

/* ------------------------- dashboard rendering ------------------------- */

function renderGreeting(fullName: string | null, loading: boolean, role: "leader" | "member") {
  return render(
    <GreetingHeader
      eyebrow={<span>Team A</span>}
      greeting={timeGreeting(new Date(2026, 6, 26, 9))}
      name={greetingName(fullName, loading)}
      caption={role === "leader" ? "Team performance" : "Your workspace"}
    />,
  );
}

describe("dashboard greeting rendering", () => {
  it.each(["leader", "member"] as const)("shows the %s's first name", (role) => {
    renderGreeting("Ravi Kumar Sharma", false, role);
    expect(screen.getByTestId("greeting-name").textContent).toBe("Ravi.");
    expect(document.querySelector("h1")?.textContent).toContain("Good Morning");
  });

  it.each(["leader", "member"] as const)("shows a shimmer, not a role word, while %s loads", (role) => {
    renderGreeting(null, true, role);
    expect(screen.queryByTestId("greeting-name")).toBeNull();
    expect(screen.getByTestId("greeting-name-loading")).toBeTruthy();
    const h1 = document.querySelector("h1")?.textContent ?? "";
    expect(h1).not.toMatch(/Leader|Member/);
  });

  it.each(["leader", "member"] as const)("falls back for a %s with no name", (role) => {
    renderGreeting("", false, role);
    expect(screen.getByTestId("greeting-name").textContent).toBe("there.");
  });
});
