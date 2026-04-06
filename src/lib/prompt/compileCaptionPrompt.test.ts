import { describe, expect, it } from "vitest";
import type { GenerationRequest } from "@/lib/pipeline/types";
import { compileCaptionPrompt } from "./compileCaptionPrompt";

function baseReq(overrides: Partial<GenerationRequest> = {}): GenerationRequest {
  return {
    team: {
      id: "t1",
      schoolName: "Ridgeline",
      teamName: "Lions",
      sport: "Football",
      season: "2025-2026",
    },
    athletes: [],
    event: { id: "e1", opponent: "Wildcats", dateTime: null },
    postType: "gameday",
    createdAt: "2026-01-01T12:00:00.000Z",
    ...overrides,
  };
}

describe("compileCaptionPrompt", () => {
  it("joins dateText and timeText", () => {
    const out = compileCaptionPrompt(
      baseReq({
        event: {
          id: "e1",
          opponent: "Wildcats",
          dateTime: null,
          dateText: "Friday",
          timeText: "7:00pm",
        },
      })
    );
    expect(out).toContain("When: Friday • 7:00pm");
  });

  it("uses dateTime when text fields absent", () => {
    const out = compileCaptionPrompt(
      baseReq({
        event: {
          id: "e1",
          opponent: "Wildcats",
          dateTime: "2026-06-01T18:00:00.000Z",
        },
      })
    );
    expect(out).toMatch(/When: .+/);
    expect(out).not.toContain("When: TBD");
  });

  it("uses TBD when no when info", () => {
    const out = compileCaptionPrompt(baseReq());
    expect(out).toContain("When: TBD");
  });

  it("defaults where to Home Stadium", () => {
    const out = compileCaptionPrompt(baseReq());
    expect(out).toContain("Where: Home Stadium");
  });

  it("includes caption notes when set", () => {
    const out = compileCaptionPrompt(baseReq({ captionNotes: "Bring signs!" }));
    expect(out).toContain("Notes: Bring signs!");
  });

  it("omits notes line when absent", () => {
    const out = compileCaptionPrompt(baseReq());
    expect(out).not.toContain("Notes:");
  });
});
