import { describe, expect, it } from "vitest";
import { ROLE_LABELS, ROLE_ROUTES, type Role } from "./types";

describe("role constants", () => {
  it("maps each role to a route and label", () => {
    const roles: Role[] = ["designer", "athlete", "student"];
    for (const r of roles) {
      expect(ROLE_ROUTES[r]).toMatch(/^\//);
      expect(ROLE_LABELS[r].length).toBeGreaterThan(0);
    }
  });
});
