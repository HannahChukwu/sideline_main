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
    expect(prompt).toContain("Additional creative direction from the designer: add arena smoke.");
    expect(prompt).toContain("Apply these designer refinements exactly");
    expect(prompt).toContain("do not distort the athlete");
  });

  it("injects brand style preset into Visual Style field", () => {
    const prompt = buildMasterSportsPrompt({
      type: "highlight",
      sport: "Football",
      homeTeam: "Knights",
      awayTeam: "Bears",
      preset: "nike",
      format: "story",
    });

    expect(prompt).toContain("ESPN / Nike campaign style");
    expect(prompt).toContain("explosive iconic game-day energy");
    expect(prompt).toContain("Composition Focus: full body power stance or dynamic action pose");
    expect(prompt).toContain("professional, Instagram-ready layout (9:16 ratio)");
  });

  it("adds strict photo-preservation rules when athlete reference image exists", () => {
    const prompt = buildMasterSportsPrompt({
      type: "gameday",
      sport: "Squash",
      homeTeam: "Trinity",
      awayTeam: "Harvard",
      preset: "new_balance",
      referenceImageCount: 2,
      strictPhotoLock: true,
    });

    expect(prompt).toContain("CRITICAL PHOTO PRESERVATION RULES");
    expect(prompt).toContain("Use image 2 as the primary base");
    expect(prompt).toContain("STRICT ATHLETE LOCK");
    expect(prompt).toContain("design-over-photo task");
    expect(prompt).toContain("Realism bias");
  });

  it("appends manual visualStyle to brand style when both are set", () => {
    const prompt = buildMasterSportsPrompt({
      type: "poster",
      sport: "Soccer",
      homeTeam: "Lions",
      awayTeam: "Tigers",
      preset: "jordan",
      visualStyle: "retro poster overlay",
    });

    expect(prompt).toContain("Jordan Brand prestige");
    expect(prompt).toContain("retro poster overlay");
  });

  it("uses ESPN preset brand style", () => {
    const prompt = buildMasterSportsPrompt({
      type: "final-score",
      sport: "Basketball",
      homeTeam: "Blue Devils",
      awayTeam: "Tar Heels",
      preset: "espn",
    });

    expect(prompt).toContain("ESPN broadcast championship graphic");
    expect(prompt).toContain("Headline: FINAL");
    expect(prompt).toContain("Realism bias");
  });
});
