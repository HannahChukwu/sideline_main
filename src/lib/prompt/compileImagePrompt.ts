import type { GenerationRequest } from "@/lib/pipeline/types";

function formatMatchLine(req: GenerationRequest) {
  const teamName = req.team.teamName.toUpperCase();
  const opp = req.event.opponent.toUpperCase();
  return `${teamName} vs ${opp}`;
}

function formatDateLine(req: GenerationRequest) {
  if (req.event.dateText || req.event.timeText) {
    const parts = [req.event.dateText, req.event.timeText].filter(Boolean);
    return parts.join(" • ");
  }
  if (req.event.dateTime) {
    const d = new Date(req.event.dateTime);
    const date = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    return `${date} • ${time}`;
  }
  return "TBD";
}

export function compileImagePrompt(req: GenerationRequest) {
  const title =
    req.postType === "gameday"
      ? "FRIDAY NIGHT LIGHTS"
      : req.postType === "hype"
      ? "GAME DAY HYPE"
      : "ANNOUNCEMENT";

  const location = req.event.location?.trim() || "Home Stadium";

  return [
    "Create an Instagram post for Sideline Studio (sports graphics, fast, modern, high-energy). Make it feel like a game day hype graphic for a school team.",
    "",
    "Format",
    "- 1080×1350 (4:5), safe margins for text",
    "- Bold, modern sports typography, crisp hierarchy",
    "- Dark background with subtle grid/dots + speed lines",
    "- Accent glow in electric violet/purple (Sideline vibe)",
    "- Photoreal or high-quality cutout athlete silhouette + dynamic lighting",
    "- Clean, premium, minimal clutter",
    "",
    "Text on the graphic (exact copy)",
    "- Top small label: GAME DAY",
    `- Main headline: ${title}`,
    `- Match line: ${formatMatchLine(req)}`,
    `- Date/time: ${formatDateLine(req)}`,
    `- Location: ${location}`,
    "- CTA pill/button style: BE THERE",
    "- Footer small: Powered by SIDELINE",
    "",
    "Brand elements",
    '- Include a simple abstract “SIDELINE” mark/wordmark area (no need to match a real logo perfectly; keep it minimal and sharp).',
    "- Add 2–3 micro-stats in tiny type (optional): LIVE • HYPE • FAST",
    "",
    "Style references",
    "- Modern Nike/Jordan-style sports poster",
    "- Neon glow + cinematic contrast",
    "- Subtle texture, not noisy",
    "",
    "Output",
    "- Deliver a single finished graphic, ready to post on Instagram.",
    "- No extra mockups, no device frames, no watermarks, no illegible tiny text.",
    "",
    `Team context: ${req.team.schoolName} — ${req.team.teamName} (${req.team.sport})`,
    `Featured athletes: ${req.athletes.map((a) => a.fullName).join(", ") || "None"}`,
  ].join("\n");
}

