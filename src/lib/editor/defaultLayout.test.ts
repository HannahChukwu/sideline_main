import { describe, expect, it } from "vitest";
import { DEFAULT_POST_LAYOUT } from "./defaultLayout";

describe("DEFAULT_POST_LAYOUT", () => {
  it("is 1080×1350 with ordered text slots", () => {
    expect(DEFAULT_POST_LAYOUT.width).toBe(1080);
    expect(DEFAULT_POST_LAYOUT.height).toBe(1350);
    const keys = DEFAULT_POST_LAYOUT.elements.map((el) => el.key);
    expect(keys).toEqual([
      "topLabel",
      "headline",
      "matchLine",
      "dateTime",
      "location",
      "cta",
      "footer",
    ]);
  });
});
