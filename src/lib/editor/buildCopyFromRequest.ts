import type { PostCopy } from "@/components/editor/PostCanvas";
import type { GenerationRequest } from "@/lib/pipeline/types";

export function buildCopyFromRequest(req: GenerationRequest): PostCopy {
  const teamName = req.team.teamName.toUpperCase();
  const opp = req.event.opponent.toUpperCase();
  const title =
    req.postType === "gameday"
      ? "FRIDAY NIGHT LIGHTS"
      : req.postType === "hype"
      ? "GAME DAY HYPE"
      : "ANNOUNCEMENT";

  const dateTime =
    req.event.dateText || req.event.timeText
      ? [req.event.dateText, req.event.timeText].filter(Boolean).join(" • ")
      : req.event.dateTime
      ? new Date(req.event.dateTime).toLocaleString(undefined, {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })
      : "TBD";

  return {
    topLabel: "GAME DAY",
    headline: title,
    matchLine: `${teamName} vs ${opp}`,
    dateTime,
    location: req.event.location ?? "Home Stadium",
    cta: "BE THERE",
    footer: "Powered by SIDELINE",
  };
}
