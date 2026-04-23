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
  referenceImageCount?: number;
  strictPhotoLock?: boolean;
};

function formatHeadline(type: BuildMasterSportsPromptInput["type"]): string {
  if (type === "gameday")     return "GAME DAY";
  if (type === "final-score") return "FINAL";
  if (type === "highlight")   return "PLAYER OF THE GAME";
  return "POSTER";
}

function formatRatio(format?: BuildMasterSportsPromptInput["format"]): string {
  if (format === "story")  return "9:16";
  if (format === "banner") return "16:9";
  return "1:1 or 4:5";
}

export function buildMasterSportsPrompt(input: BuildMasterSportsPromptInput): string {
  const preset = getGenerationPresetConfig(input.preset ?? "custom");

  // Brand style from preset is the primary visual style driver.
  // Manual overrides from the form are layered on top.
  const moodEnergy       = input.mood?.trim()        || preset.moodEnergy;
  const lighting         = input.lighting?.trim()     || preset.lighting;
  const compositionFocus = input.composition?.trim()  || preset.compositionFocus;

  // {visual_style} = brand preset style (the key slot the user defined).
  // If the designer manually overrides the visual style field, that appends to the brand direction.
  const brandStyle  = preset.brandStyle;
  const manualStyle = input.visualStyle?.trim();
  const visualStyle = manualStyle
    ? `${brandStyle} — with this additional direction: ${manualStyle}`
    : brandStyle;

  const home      = input.homeTeam.trim()  || "Home Team";
  const away      = input.awayTeam.trim()  || "Away Team";
  const dateText  = input.eventDate?.trim() || "TBD";
  const timeText  = input.gameTime?.trim()  || "TBD";
  const venueText = input.venue?.trim()     || "TBD";
  const sportText = input.sport.trim()      || "Sport";
  const headline  = formatHeadline(input.type);
  const ratioText = formatRatio(input.format);

  const hasReference      = (input.referenceImageCount ?? 0) > 0;
  const hasAthleteRef     = (input.referenceImageCount ?? 0) >= 2;
  const strictPhotoLock   = Boolean(input.strictPhotoLock);
  const isPrestigePreset  = input.preset === "new_balance" || input.preset === "espn";

  // Reference image slot instructions
  const refBlock = hasReference
    ? [
        "Reference image slots provided in this order:",
        "  Image 1 = style reference (design language only, not identity transfer).",
        "  Image 2 = athlete source photo (primary subject — use as immutable base).",
        "  Image 3 = home team logo.",
        "  Image 4 = away team logo.",
      ].join("\n")
    : "";

  // Athlete photo preservation rules (when athlete reference is provided)
  const photoPreservationBlock = hasAthleteRef
    ? [
        "CRITICAL PHOTO PRESERVATION RULES:",
        "- Use image 2 as the primary base. Preserve exact identity, face shape, skin texture, body proportions, and pose.",
        "- This is a design-over-photo task — not a character generation task. Do NOT re-render or re-imagine the athlete.",
        "- Keep jersey details, equipment, and geometry consistent with the source photo.",
        "- Apply changes through: typography, layout, color grading, lighting accents, and graphic overlays only.",
      ].join("\n")
    : "";

  // Strict photo lock (when toggled on by the designer)
  const strictLockBlock = strictPhotoLock
    ? [
        "STRICT ATHLETE LOCK (highest priority override):",
        "- Do not alter pose, limb position, facial expression, skin tone, hair, body proportions, or clothing fit.",
        "- Treat the athlete in image 2 as immutable source photography. Professional graphic design treatment only.",
      ].join("\n")
    : "";

  // Realism bias for editorial presets
  const realismBlock = isPrestigePreset
    ? [
        "Realism bias:",
        "- Prioritize photorealism and editorial quality. Keep effects subtle and intentional.",
        "- Avoid fantasy glow overload, plastic skin, or synthetic anatomy.",
      ].join("\n")
    : "";

  const refinements = input.refinements?.length
    ? `Apply these designer refinements exactly: ${input.refinements.join("; ")}.`
    : "";

  const customPromptBlock = input.customPrompt?.trim()
    ? `Additional creative direction from the designer: ${input.customPrompt.trim()}.`
    : "";

  return [
    "Create a high-end collegiate athletic social media graphic using the provided image as the main subject.",
    "Do NOT significantly alter the athlete's body, pose, or identity—keep the photo realistic and sharp.",
    "",
    "Style inspiration: modern sports media design similar to elite programs and professional teams",
    "(bold typography, layered composition, dramatic lighting, clean but powerful layout).",
    "",
    "Design Direction:",
    `Mood/Energy: ${moodEnergy}`,
    `Lighting: ${lighting} (e.g. dramatic, high contrast, spotlight, neon glow)`,
    `Visual Style: ${visualStyle}`,
    `Composition Focus: ${compositionFocus} (e.g. face, full body, action pose)`,
    "",
    "Graphic Elements:",
    "- Add bold, large typography integrated with the athlete (text can overlap subject slightly).",
    "- Use team colors subtly in gradients, glows, or accents.",
    "- Include depth using shadows, blur, grain, or light streaks.",
    "- Add dynamic elements if appropriate: motion blur, light flares, particles, halftone textures.",
    "- Keep background clean but stylized (soft gradients, abstract shapes, or venue-inspired elements).",
    "",
    "Content to include:",
    `- Headline: ${headline} (e.g. "GAME DAY", "FINAL", "PLAYER OF THE GAME")`,
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
    refBlock,
    photoPreservationBlock,
    strictLockBlock,
    realismBlock,
    customPromptBlock,
    refinements,
    "Negative prompt constraints: do not distort the athlete, do not change facial features, avoid over-edited skin, avoid unrealistic anatomy, avoid cluttered layout, avoid too many fonts.",
  ]
    .filter(Boolean)
    .join("\n");
}
