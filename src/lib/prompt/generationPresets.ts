export const GENERATION_PRESET_VALUES = [
  "custom",
  "nike",
  "under_armour",
  "adidas",
  "jordan",
  "new_balance",
  "puma",
  "gatorade",
  "espn",
] as const;

export type GenerationPreset = (typeof GENERATION_PRESET_VALUES)[number];

export type GenerationPresetConfig = {
  value: GenerationPreset;
  label: string;
  badge: string;
  description: string;
  /** Injected directly as {visual_style} in the master prompt. */
  brandStyle: string;
  moodEnergy: string;
  lighting: string;
  compositionFocus: string;
  /** Maps to the local STYLES selector on the create page. */
  visualStyleKey: "illustrated" | "bold" | "cinematic" | "retro" | "minimal";
};

export const GENERATION_PRESETS: GenerationPresetConfig[] = [
  {
    value: "custom",
    label: "Custom",
    badge: "[Your Style]",
    description: "Use your own mood, lighting, and composition settings.",
    brandStyle: "premium collegiate sports media design, clean and modern",
    moodEnergy: "high-energy collegiate athletics",
    lighting: "dramatic, high contrast",
    compositionFocus: "action pose",
    visualStyleKey: "bold",
  },
  {
    value: "nike",
    label: "Nike",
    badge: "[Nike Look]",
    description: "Bold minimalist athlete-forward design. Clean white space, dynamic block typography, pure athletic authority.",
    brandStyle:
      "ESPN / Nike campaign style — bold minimalist athlete-forward design with intentional white space, massive block typography layered with the subject, and pure athletic confidence. Clean but powerful. No clutter.",
    moodEnergy: "explosive iconic game-day energy, globally aspirational athletic confidence",
    lighting: "high-contrast studio strobe with sharp edge shadows and crisp definition",
    compositionFocus: "full body power stance or dynamic action pose",
    visualStyleKey: "bold",
  },
  {
    value: "under_armour",
    label: "Under Armour",
    badge: "[Under Armour Look]",
    description: "Dark military-grade intensity. Raw power, aggressive texture, no-excuses athlete culture.",
    brandStyle:
      "Under Armour rugged intensity — dark military-grade design with aggressive texture overlays, raw athlete power, deep shadow work, and a relentless performance aesthetic. Grit over glamour.",
    moodEnergy: "relentless warrior mentality, predatory focus, no-excuses performance",
    lighting: "dramatic low-key underlighting with deep shadows and high-contrast chiaroscuro",
    compositionFocus: "intense action pose or face close-up with visible determination",
    visualStyleKey: "bold",
  },
  {
    value: "adidas",
    label: "Adidas",
    badge: "[Adidas Look]",
    description: "Street culture meets performance. Clean geometric design, urban energy, three-stripe DNA.",
    brandStyle:
      "Adidas Originals street culture — clean geometric composition with bold stripe motifs, urban athletic energy, bright primary color blocking, and a culturally confident design voice that bridges sport and style.",
    moodEnergy: "confident, culturally relevant, cool athletic authority with urban edge",
    lighting: "bright key light with clean geometric hard shadows",
    compositionFocus: "stylized full body with strong stance",
    visualStyleKey: "minimal",
  },
  {
    value: "jordan",
    label: "Jordan Brand",
    badge: "[Jordan Look]",
    description: "Legendary prestige. Black and gold luxury athletic design, iconic silhouette energy, hall-of-fame gravitas.",
    brandStyle:
      "Jordan Brand prestige — luxury black and gold athletic design with iconic silhouette energy, cinematic spotlight treatment, and an irreplaceable sense of legacy. Hall-of-fame gravitas, larger than life.",
    moodEnergy: "legendary, iconic, aspirational greatness, championship hall-of-fame energy",
    lighting: "cinematic dramatic spotlight with warm gold rim light accents and deep blacks",
    compositionFocus: "iconic full body silhouette or powerful face portrait",
    visualStyleKey: "cinematic",
  },
  {
    value: "new_balance",
    label: "New Balance",
    badge: "[New Balance Look]",
    description: "Clean prestige branding. Editorial sports photography treatment, refined craft, understated excellence.",
    brandStyle:
      "clean prestige sports branding — editorial sports photography treatment with refined typographic craft, intentional negative space, and an understated confidence that lets the athlete carry the design. No excess.",
    moodEnergy: "professional, composed confidence, premium editorial restraint",
    lighting: "clean studio-grade portrait lighting with natural skin and fabric detail preservation",
    compositionFocus: "full body editorial stance or composed portrait",
    visualStyleKey: "minimal",
  },
  {
    value: "puma",
    label: "Puma",
    badge: "[Puma Look]",
    description: "Kinetic velocity design. Bold color contrast, speed-driven composition, motion blur energy.",
    brandStyle:
      "Puma velocity motion design — kinetic speed-driven composition with bold saturated color contrast, motion blur trails, and a graphic energy that makes still images feel like they're moving.",
    moodEnergy: "fast, electric, unstoppable forward momentum",
    lighting: "stadium floodlights with motion-streaked color light trails",
    compositionFocus: "dynamic sprinting or explosive action pose with implied motion",
    visualStyleKey: "bold",
  },
  {
    value: "gatorade",
    label: "Gatorade",
    badge: "[Gatorade Look]",
    description: "Peak performance intensity. High-energy color overlays, sweat-soaked realism, neon splash culture.",
    brandStyle:
      "high-energy monochrome with bold color overlays — intense performance design inspired by Gatorade campaign aesthetics: liquid-color splash elements, neon performance tones, sweat-soaked realism, and raw physical effort as the design language.",
    moodEnergy: "peak physical intensity, grit and determination, fully fueled and relentless",
    lighting: "neon glow performance lighting with skin sheen highlights and vibrant color washes",
    compositionFocus: "face or upper body with visible physical effort and intensity",
    visualStyleKey: "illustrated",
  },
  {
    value: "espn",
    label: "ESPN",
    badge: "[ESPN Look]",
    description: "Broadcast championship authority. Stats-forward layout, authoritative sports media, big-game gravitas.",
    brandStyle:
      "ESPN broadcast championship graphic — authoritative sports media design with broadcast-quality layout, stats and score integration, clean lower-third text hierarchy, and the unmistakable visual weight of a major televised championship moment.",
    moodEnergy: "authoritative championship stakes, big-game gravitas, broadcast confidence",
    lighting: "broadcast-quality clean key light with cool blue-white toning",
    compositionFocus: "full body or dual-team composition with broadcast text layout",
    visualStyleKey: "minimal",
  },
];

export function getGenerationPresetConfig(preset: GenerationPreset): GenerationPresetConfig {
  return (
    GENERATION_PRESETS.find((p) => p.value === preset) ?? GENERATION_PRESETS[0]
  );
}
