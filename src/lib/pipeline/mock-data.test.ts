import { describe, expect, it } from "vitest";
import { MOCK_ATHLETES, MOCK_TEAMS } from "./mock-data";

describe("pipeline mock-data", () => {
  it("links athletes to teams", () => {
    expect(MOCK_TEAMS.length).toBeGreaterThan(0);
    const teamIds = new Set(MOCK_TEAMS.map((t) => t.id));
    for (const a of MOCK_ATHLETES) {
      expect(teamIds.has(a.teamId)).toBe(true);
    }
  });
});
