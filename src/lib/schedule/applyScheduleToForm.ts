import type { Team } from "@/lib/pipeline/types";
import type { ScheduleRow } from "@/lib/supabase/schedules";

export type ScheduleFormPatch = {
  homeTeam: string;
  awayTeam: string;
  sport: string;
  eventDate: string;
  venue: string;
  gameTime: string;
  homeScore: string;
  awayScore: string;
};

function ourProgramName(team: Team): string {
  const parts = [team.schoolName?.trim(), team.teamName?.trim()].filter(Boolean);
  return parts.join(" ").trim() || team.teamName || "Home";
}

function eventDateFromRow(row: ScheduleRow): string {
  if (row.date_time) {
    const d = new Date(row.date_time);
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  const raw = row.date_text?.trim() ?? "";
  if (raw) {
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    const iso = raw.match(/\d{4}-\d{2}-\d{2}/);
    if (iso) return iso[0];
  }
  return "";
}

function gameTimeFromRow(row: ScheduleRow): string {
  const t = row.time_text?.trim();
  if (t) return t;
  if (row.date_time) {
    const d = new Date(row.date_time);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    }
  }
  return "";
}

/**
 * Maps a stored schedule row + team to poster form fields (your program vs opponent).
 */
export function applyScheduleRowToPosterForm(team: Team, row: ScheduleRow): ScheduleFormPatch {
  const ours = ourProgramName(team);
  const opp = row.opponent.trim() || "Opponent";

  return {
    homeTeam: ours,
    awayTeam: opp,
    sport: team.sport,
    eventDate: eventDateFromRow(row),
    venue: row.location?.trim() ?? "",
    gameTime: gameTimeFromRow(row),
    homeScore: row.final && row.home_score != null ? String(row.home_score) : "",
    awayScore: row.final && row.away_score != null ? String(row.away_score) : "",
  };
}

export function formatScheduleRowOptionLabel(team: Team, row: ScheduleRow): string {
  const when = eventDateFromRow(row) || row.date_text?.trim() || "TBD";
  const time = row.time_text?.trim();
  const at = time ? ` ${time}` : "";
  return `${when}${at} · vs ${row.opponent.trim() || "TBD"}`;
}
