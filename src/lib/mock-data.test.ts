import { describe, expect, it } from "vitest";
import { ASSET_TYPES, MOCK_ASSETS, SPORTS } from "./mock-data";

describe("mock-data", () => {
  it("exports non-empty catalog data", () => {
    expect(MOCK_ASSETS.length).toBeGreaterThan(0);
    expect(SPORTS.length).toBeGreaterThan(0);
    expect(ASSET_TYPES.map((t) => t.value).sort()).toEqual(
      expect.arrayContaining(["gameday", "final-score", "poster", "highlight"])
    );
  });
});
