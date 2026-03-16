export type ScheduleColumnKey =
  | "date"
  | "time"
  | "opponent"
  | "location"
  | "homeAway";

export type ColumnMapping = Partial<Record<ScheduleColumnKey, string>>;

function normalizeHeader(raw: string) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9 ]/g, "");
}

const KEYWORDS: Record<ScheduleColumnKey, string[]> = {
  date: ["date", "game date", "start date", "event date", "day"],
  time: ["time", "start time", "game time"],
  opponent: ["opponent", "versus", "vs", "team", "away team", "home team"],
  location: ["location", "site", "venue", "field", "stadium", "where"],
  homeAway: ["homeaway", "home away", "venue", "ha"],
};

export function guessColumnMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  const normalized = headers.map((h) => ({ raw: h, norm: normalizeHeader(h) }));

  const used = new Set<string>();

  function pick(key: ScheduleColumnKey) {
    const candidates = KEYWORDS[key];
    for (const c of candidates) {
      const cn = normalizeHeader(c);
      const hit = normalized.find((h) => !used.has(h.raw) && h.norm === cn);
      if (hit) {
        mapping[key] = hit.raw;
        used.add(hit.raw);
        return;
      }
    }

    // fallback: contains match
    for (const c of candidates) {
      const cn = normalizeHeader(c);
      const hit = normalized.find(
        (h) => !used.has(h.raw) && h.norm.includes(cn)
      );
      if (hit) {
        mapping[key] = hit.raw;
        used.add(hit.raw);
        return;
      }
    }
  }

  pick("date");
  pick("time");
  pick("opponent");
  pick("location");
  pick("homeAway");

  return mapping;
}

