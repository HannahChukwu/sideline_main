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
  const school = team.schoolName?.trim();
  if (school) return school;
  return team.teamName?.trim() || "Home";
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function normalizeOpponent(team: Team, rawOpponent: string): string {
  const raw = rawOpponent.trim();
  if (!raw) return "Opponent";

  const oursCandidates = [
    ourProgramName(team),
    team.teamName?.trim() ?? "",
    team.schoolName?.trim() ?? "",
    team.sport?.trim() ?? "",
  ].filter(Boolean);

  const oursNormalized = oursCandidates.map((c) => normalizeText(c));
  const appearsToBeOurs = (value: string) => {
    const n = normalizeText(value);
    if (!n) return false;
    return oursNormalized.some((ours) => ours && (n.includes(ours) || ours.includes(n)));
  };

  const split = raw
    .split(/\s+(?:vs\.?|v\.?|@|at)\s+/i)
    .map((s) => s.trim())
    .filter(Boolean);

  let opponent = raw;
  if (split.length > 1) {
    const first = split[0] ?? "";
    const last = split[split.length - 1] ?? "";
    if (appearsToBeOurs(first) && !appearsToBeOurs(last)) opponent = last;
    else if (appearsToBeOurs(last) && !appearsToBeOurs(first)) opponent = first;
    else opponent = last;
  }

  opponent = opponent.replace(/^(?:vs\.?|v\.?|@|at)\s+/i, "").trim();

  for (const ours of oursCandidates) {
    const re = new RegExp(`^${escapeRegex(ours)}\\s+`, "i");
    opponent = opponent.replace(re, "").trim();
  }

  return opponent || "Opponent";
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
  const opp = normalizeOpponent(team, row.opponent);

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
  const opp = normalizeOpponent(team, row.opponent);
  return `${when}${at} · vs ${opp}`;
}
