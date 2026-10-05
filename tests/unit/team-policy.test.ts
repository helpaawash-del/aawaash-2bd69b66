import { describe, expect, it } from "vitest";
import { TEAM_LEADER_LIMIT, canAssignMemberToTeam } from "@/lib/team-policy";

describe("team policy", () => {
  it("keeps exactly three Team Leader slots", () => {
    expect(TEAM_LEADER_LIMIT).toBe(3);
  });

  it("allows member assignment at counts above 50 when the team has a leader", () => {
    expect(canAssignMemberToTeam(true)).toBe(true);
  });

  it("requires a Team Leader before assigning members", () => {
    expect(canAssignMemberToTeam(false)).toBe(false);
  });
});