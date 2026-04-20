import type { GenerationPreset } from "@/lib/prompt/generationPresets";
import { getGenerationPresetConfig } from "@/lib/prompt/generationPresets";

type BuildMasterSportsPromptInput = {
  type: "gameday" | "final-score" | "poster" | "highlight";
  sport: string;
  homeTeam: string;
  awayTeam: string;
  eventDate?: string;
  gameTime?: string;
  venue?: string;
  format?: "story" | "post" | "banner";
  mood?: string;
  lighting?: string;
  visualStyle?: string;
  composition?: string;
  customPrompt?: string;
  preset?: GenerationPreset;
  refinements?: string[];
  styleModifier?: string;
  referenceImageCount?: number;
};

function formatHeadline(type: BuildMasterSportsPromptInput["type"]): string {
  if (type === "gameday") return "GAME DAY";
  if (type === "final-score") return "FINAL";
  if (type === "highlight") return "PLAYER OF THE GAME";
  return "POSTER";
}

function formatRatio(format?: BuildMasterSportsPromptInput["format"]): string {
  if (format === "story") return "9:16";
  if (format === "banner") return "16:9";
  return "1:1 or 4:5";
}

export function buildMasterSportsPrompt(input: BuildMasterSportsPromptInput): string {
  const preset = getGenerationPresetConfig(input.preset ?? "custom");
  const moodEnergy = input.mood?.trim() || preset.moodEnergy || "high-energy collegiate athletics";
  const lighting = input.lighting?.trim() || preset.lighting || "dramatic";
  const visualStyle = input.visualStyle?.trim() || preset.visualStyle || "premium sports media design";
  const compositionFocus = input.composition?.trim() || preset.compositionFocus || "action pose";
  const styleModifier = input.styleModifier?.trim() || preset.styleModifier;

  const home = input.homeTeam.trim() || "Home Team";
  const away = input.awayTeam.trim() || "Away Team";
  const dateText = input.eventDate?.trim() || "TBD";
  const timeText = input.gameTime?.trim() || "TBD";
  const venueText = input.venue?.trim() || "TBD";
  const sportText = input.sport.trim() || "Sport";
  const headline = formatHeadline(input.type);
  const ratioText = formatRatio(input.format);

  const refinements =
    input.refinements && input.refinements.length > 0
      ? `Apply these user refinements exactly: ${input.refinements.join("; ")}.`
      : "";

  const customPrompt = input.customPrompt?.trim()
    ? `Additional creative direction from designer: ${input.customPrompt.trim()}.`
    : "";

  const refs =
    (input.referenceImageCount ?? 0) > 0
      ? `Reference images are provided. Image 1 is the athlete and must remain identity-accurate. ` +
        `Image 2 and image 3 may be logos/marks when available.`
      : "";

  const optionalStyleModifier = styleModifier
    ? `Optional style modifier to blend in: ${styleModifier}.`
    : "";

  return [
    "Create a high-end collegiate athletic social media graphic using the provided image as the main subject.",
    "Do NOT significantly alter the athlete's body, pose, or identity - keep the photo realistic and sharp.",
    "",
    "Style inspiration: modern sports media design similar to elite programs and professional teams",
    "(bold typography, layered composition, dramatic lighting, clean but powerful layout).",
    "",
    "Design Direction:",
    `Mood/Energy: ${moodEnergy}`,
    `Lighting: ${lighting}`,
    `Visual Style: ${visualStyle}`,
    `Composition Focus: ${compositionFocus}`,
    "",
    "Graphic Elements:",
    "- Add bold, large typography integrated with the athlete (text can overlap subject slightly).",
    "- Use team colors subtly in gradients, glows, or accents.",
    "- Include depth using shadows, blur, grain, or light streaks.",
    "- Add dynamic elements if appropriate: motion blur, light flares, particles, halftone textures.",
    "- Keep background clean but stylized (soft gradients, abstract shapes, or venue-inspired elements).",
    "",
    "Content to include:",
    `- Headline: ${headline}`,
    `- Subtext: ${home} vs ${away}`,
    `- Date & Time: ${dateText} | ${timeText}`,
    `- Venue: ${venueText}`,
    `- Sport: ${sportText}`,
    "",
    "Typography Style:",
    "- Bold, modern athletic fonts.",
    "- High contrast (large headline, smaller supporting text).",
    "- Clean alignment with strong hierarchy.",
    "",
    "Composition Rules:",
    "- Athlete is the focal point.",
    "- Text should feel integrated, not just placed on top.",
    "- Use negative space intentionally.",
    `- Maintain a professional, Instagram-ready layout (${ratioText} ratio).`,
    "",
    "Output:",
    "- Polished, professional sports graphic.",
    "- Suitable for Instagram post/story.",
    "- No clutter, no over-editing of the player.",
    "",
    optionalStyleModifier,
    refs,
    customPrompt,
    refinements,
    "If negative prompting is supported, apply this constraint list:",
    "Do not distort the athlete, do not change facial features, avoid over-editing skin, avoid unrealistic anatomy, avoid cluttered layout, avoid too many fonts.",
  ]
    .filter(Boolean)
    .join("\n");
}
