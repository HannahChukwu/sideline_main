import type { GenerationRequest } from "@/lib/pipeline/types";

export function compileCaptionPrompt(req: GenerationRequest) {
  const team = `${req.team.schoolName} ${req.team.teamName}`;
  const opponent = req.event.opponent;
  const when =
    req.event.dateText || req.event.timeText
      ? [req.event.dateText, req.event.timeText].filter(Boolean).join(" • ")
      : req.event.dateTime
      ? new Date(req.event.dateTime).toLocaleString()
      : "TBD";
  const where = req.event.location ?? "Home Stadium";

  return [
    "Write an Instagram caption for a school sports match announcement.",
    "Tone: energetic, modern, hype, but clean and premium (Sideline Studio vibe).",
    "Keep it concise (1–3 short paragraphs).",
    "Include a short CTA (e.g. “Be there.”).",
    "Include 3–8 relevant hashtags (avoid spam).",
    "",
    `Team: ${team}`,
    `Opponent: ${opponent}`,
    `When: ${when}`,
    `Where: ${where}`,
    req.captionNotes ? `Notes: ${req.captionNotes}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

