import { describe, expect, it } from "vitest";
import type { GenerationRequest } from "@/lib/pipeline/types";
import { buildCopyFromRequest } from "./buildCopyFromRequest";

function baseReq(overrides: Partial<GenerationRequest> = {}): GenerationRequest {
  return {
    team: {
      id: "t1",
      schoolName: "Ridgeline High",
      teamName: "Lions",
      sport: "Football",
      season: "2025-2026",
    },
    athletes: [],
    event: { id: "e1", opponent: "wildcats", dateTime: null },
    postType: "gameday",
    createdAt: "2026-01-01T12:00:00.000Z",
    ...overrides,
  };
}

describe("buildCopyFromRequest", () => {
  it("maps gameday headline and match line", () => {
    const copy = buildCopyFromRequest(baseReq({ postType: "gameday" }));
    expect(copy).toEqual(
      expect.objectContaining({
        topLabel: "GAME DAY",
        headline: "FRIDAY NIGHT LIGHTS",
        matchLine: "LIONS vs WILDCATS",
        cta: "BE THERE",
        footer: "Powered by SIDELINE",
      })
    );
  });

  it.each([
    ["hype", "GAME DAY HYPE"],
    ["announcement", "ANNOUNCEMENT"],
  ] as const)("postType %s → headline %s", (postType, headline) => {
    const copy = buildCopyFromRequest(baseReq({ postType }));
    expect(copy.headline).toBe(headline);
  });

  it("uses dateText/timeText for dateTime field", () => {
    const copy = buildCopyFromRequest(
      baseReq({
        event: {
          id: "e1",
          opponent: "X",
          dateTime: null,
          dateText: "Mar 1",
          timeText: "6pm",
        },
      })
    );
    expect(copy.dateTime).toBe("Mar 1 • 6pm");
  });

  it("formats ISO dateTime when no text fields", () => {
    const copy = buildCopyFromRequest(
      baseReq({
        event: {
          id: "e1",
          opponent: "X",
          dateTime: "2026-03-15T19:30:00.000Z",
        },
      })
    );
    expect(copy.dateTime).toMatch(/Mar/);
  });

  it("uses TBD when no schedule", () => {
    const copy = buildCopyFromRequest(baseReq());
    expect(copy.dateTime).toBe("TBD");
  });

  it("defaults location", () => {
    const copy = buildCopyFromRequest(baseReq());
    expect(copy.location).toBe("Home Stadium");
  });
});
