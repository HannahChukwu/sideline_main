import { describe, expect, it } from "vitest";
import { buildMasterSportsPrompt } from "./buildMasterSportsPrompt";

describe("buildMasterSportsPrompt", () => {
  it("builds prompt with provided values and content blocks", () => {
    const prompt = buildMasterSportsPrompt({
      type: "gameday",
      sport: "Basketball",
      homeTeam: "Falcons",
      awayTeam: "Eagles",
      eventDate: "2026-11-12",
      gameTime: "7:00 PM",
      venue: "Main Arena",
      format: "post",
      mood: "electric",
      lighting: "dramatic spotlight",
      visualStyle: "premium",
      composition: "full body",
      customPrompt: "add arena smoke",
      refinements: ["stronger headline", "deeper shadows"],
      referenceImageCount: 1,
    });

    expect(prompt).toContain("Mood/Energy: electric");
    expect(prompt).toContain("Headline: GAME DAY");
    expect(prompt).toContain("Subtext: Falcons vs Eagles");
    expect(prompt).toContain("Date & Time: 2026-11-12 | 7:00 PM");
    expect(prompt).toContain("Venue: Main Arena");
    expect(prompt).toContain("Additional creative direction from designer: add arena smoke.");
    expect(prompt).toContain("Apply these user refinements exactly");
    expect(prompt).toContain("Do not distort the athlete");
  });

  it("uses preset defaults when optional fields are empty", () => {
    const prompt = buildMasterSportsPrompt({
      type: "highlight",
      sport: "Football",
      homeTeam: "Knights",
      awayTeam: "Bears",
      preset: "hype",
      format: "story",
    });

    expect(prompt).toContain("Mood/Energy: maximum hype, explosive game-day energy, fast and intense");
    expect(prompt).toContain("Composition Focus: action pose");
    expect(prompt).toContain("Optional style modifier to blend in: ESPN / Nike campaign style.");
    expect(prompt).toContain("professional, Instagram-ready layout (9:16 ratio)");
  });

  it("adds strict photo-preservation rules when athlete reference image exists", () => {
    const prompt = buildMasterSportsPrompt({
      type: "gameday",
      sport: "Squash",
      homeTeam: "Trinity",
      awayTeam: "Harvard",
      preset: "prestige",
      referenceImageCount: 2,
      strictPhotoLock: true,
    });

    expect(prompt).toContain("CRITICAL PHOTO PRESERVATION RULES");
    expect(prompt).toContain("Use image 2 as the primary base photo");
    expect(prompt).toContain("STRICT ATHLETE LOCK");
    expect(prompt).toContain("design-over-photo task");
    expect(prompt).toContain("Prioritize photorealism and editorial sports design quality.");
  });
});
