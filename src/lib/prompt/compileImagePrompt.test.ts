import { describe, expect, it } from "vitest";
import type { GenerationRequest } from "@/lib/pipeline/types";
import { compileImagePrompt } from "./compileImagePrompt";

function baseReq(overrides: Partial<GenerationRequest> = {}): GenerationRequest {
  return {
    team: {
      id: "t1",
      schoolName: "Ridgeline High",
      teamName: "Lions",
      sport: "Football",
      season: "2025-2026",
    },
    athletes: [{ id: "a1", teamId: "t1", fullName: "Jordan Miles" }],
    event: {
      id: "e1",
      opponent: "Wildcats",
      dateTime: null,
    },
    postType: "gameday",
    createdAt: "2026-01-01T12:00:00.000Z",
    ...overrides,
  };
}

describe("compileImagePrompt", () => {
  it.each([
    ["gameday", "FRIDAY NIGHT LIGHTS"],
    ["hype", "GAME DAY HYPE"],
    ["announcement", "ANNOUNCEMENT"],
  ] as const)("uses headline for postType %s", (postType, headline) => {
    const out = compileImagePrompt(baseReq({ postType }));
    expect(out).toContain(`Main headline: ${headline}`);
  });

  it("uses dateText and timeText when present", () => {
    const out = compileImagePrompt(
      baseReq({
        event: {
          id: "e1",
          opponent: "Wildcats",
          dateTime: "2026-03-15T19:00:00.000Z",
          dateText: "Mar 15",
          timeText: "7pm",
        },
      })
    );
    expect(out).toContain("Date/time: Mar 15 • 7pm");
  });

  it("formats dateTime when no text fields", () => {
    const out = compileImagePrompt(
      baseReq({
        event: {
          id: "e1",
          opponent: "Wildcats",
          dateTime: "2026-03-15T19:00:00.000Z",
        },
      })
    );
    expect(out).toMatch(/Date\/time: .+ • .+/);
    expect(out).not.toContain("Date/time: TBD");
  });

  it("uses TBD when no schedule info", () => {
    const out = compileImagePrompt(baseReq());
    expect(out).toContain("Date/time: TBD");
  });

  it("defaults empty location to Home Stadium in prompt line", () => {
    const out = compileImagePrompt(baseReq({ event: { id: "e1", opponent: "X", dateTime: null } }));
    expect(out).toContain("Location: Home Stadium");
  });

  it("trims location", () => {
    const out = compileImagePrompt(
      baseReq({
        event: { id: "e1", opponent: "X", dateTime: null, location: "  Field  " },
      })
    );
    expect(out).toContain("Location: Field");
  });

  it("lists None when no athletes", () => {
    const out = compileImagePrompt(baseReq({ athletes: [] }));
    expect(out).toContain("Featured athletes: None");
  });

  it("uppercases match line", () => {
    const out = compileImagePrompt(
      baseReq({
        team: {
          id: "t1",
          schoolName: "Ridgeline High",
          teamName: "lions",
          sport: "Football",
          season: "2025-2026",
        },
        event: { id: "e1", opponent: "wildcats", dateTime: null },
      })
    );
    expect(out).toContain("Match line: LIONS vs WILDCATS");
  });
});
