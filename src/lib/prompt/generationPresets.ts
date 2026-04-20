export type GenerationPreset = "custom" | "hype" | "result" | "commitment";

export type GenerationPresetConfig = {
  value: GenerationPreset;
  label: string;
  description: string;
  moodEnergy: string;
  lighting: string;
  visualStyle: string;
  compositionFocus: string;
  styleModifier?: string;
};

export const GENERATION_PRESETS: GenerationPresetConfig[] = [
  {
    value: "custom",
    label: "Custom",
    description: "Keep your own mood, lighting, and composition choices.",
    moodEnergy: "",
    lighting: "",
    visualStyle: "",
    compositionFocus: "",
  },
  {
    value: "hype",
    label: "Hype",
    description: "More effects, glow, and motion energy.",
    moodEnergy: "maximum hype, explosive game-day energy, fast and intense",
    lighting: "dramatic high-contrast spotlight with glow accents and flare",
    visualStyle: "high-energy sports media, layered, premium hype poster",
    compositionFocus: "action pose",
    styleModifier: "ESPN / Nike campaign style",
  },
  {
    value: "result",
    label: "Result",
    description: "Cleaner, stat-focused, polished final graphic.",
    moodEnergy: "confident, sharp, post-game authority with restrained energy",
    lighting: "clean contrast with focused key light and subtle depth",
    visualStyle: "clean prestige sports branding",
    compositionFocus: "full body",
    styleModifier: "clean prestige sports branding",
  },
  {
    value: "commitment",
    label: "Commitment / Player Feature",
    description: "Portrait-forward, minimal, athlete spotlight.",
    moodEnergy: "focused, determined, premium athlete feature tone",
    lighting: "cinematic portrait lighting with controlled highlights",
    visualStyle: "premium minimal portrait editorial sports design",
    compositionFocus: "face",
    styleModifier: "bold gold/black football hype graphic",
  },
];

export function getGenerationPresetConfig(preset: GenerationPreset): GenerationPresetConfig {
  return (
    GENERATION_PRESETS.find((p) => p.value === preset) ??
    GENERATION_PRESETS[0]
  );
}
