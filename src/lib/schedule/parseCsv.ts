import type { ColumnMapping } from "@/lib/schedule/columnMapping";

export type CsvParseResult = {
  headers: string[];
  rows: Record<string, string>[];
};

export type ImportedGameEvent = {
  opponent: string;
  dateTime: string | null; // ISO when possible
  dateText?: string;
  timeText?: string;
  location?: string;
  homeAway?: "home" | "away" | "neutral" | string;
  sourceRow: Record<string, string>;
};

function detectDelimiter(sample: string): "," | "\t" | ";" {
  const comma = (sample.match(/,/g) ?? []).length;
  const tab = (sample.match(/\t/g) ?? []).length;
  const semi = (sample.match(/;/g) ?? []).length;
  if (tab > comma && tab > semi) return "\t";
  if (semi > comma) return ";";
  return ",";
}

function splitCsvLine(line: string, delimiter: string) {
  const out: string[] = [];
  let cur = "";
  let i = 0;
  let inQuotes = false;

  while (i < line.length) {
    const ch = line[i];
    if (ch === '"') {
      const next = line[i + 1];
      if (inQuotes && next === '"') {
        cur += '"';
        i += 2;
        continue;
      }
      inQuotes = !inQuotes;
      i += 1;
      continue;
    }
    if (!inQuotes && ch === delimiter) {
      out.push(cur.trim());
      cur = "";
      i += 1;
      continue;
    }
    cur += ch;
    i += 1;
  }

  out.push(cur.trim());
  return out;
}

function cleanCell(value: string) {
  const v = value.trim();
  // strip wrapping quotes if present
  if (v.startsWith('"') && v.endsWith('"') && v.length >= 2) {
    return v.slice(1, -1).trim();
  }
  return v;
}

export function parseCsv(text: string): CsvParseResult {
  const trimmed = text.replace(/^\uFEFF/, "").trim();
  const lines = trimmed
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return { headers: [], rows: [] };

  const delimiter = detectDelimiter(lines.slice(0, 5).join("\n"));
  const headers = splitCsvLine(lines[0], delimiter).map(cleanCell);
  const rows: Record<string, string>[] = [];

  for (const line of lines.slice(1)) {
    const cols = splitCsvLine(line, delimiter).map(cleanCell);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = cols[idx] ?? "";
    });
    // ignore fully-empty rows
    if (Object.values(row).some((v) => v.trim().length > 0)) rows.push(row);
  }

  return { headers, rows };
}

function parseHomeAway(raw: string): ImportedGameEvent["homeAway"] {
  const v = raw.trim().toLowerCase();
  if (!v) return undefined;
  if (v === "h" || v === "home") return "home";
  if (v === "a" || v === "away") return "away";
  if (v === "n" || v === "neutral") return "neutral";
  return raw.trim();
}

function coerceDateTime(dateText?: string, timeText?: string): string | null {
  const d = (dateText ?? "").trim();
  const t = (timeText ?? "").trim();
  if (!d && !t) return null;

  // Try combined parse first (works for many CSV exports)
  const combined = [d, t].filter(Boolean).join(" ");
  const dt1 = new Date(combined);
  if (!Number.isNaN(dt1.getTime())) return dt1.toISOString();

  // Try date-only
  const dt2 = new Date(d);
  if (!Number.isNaN(dt2.getTime())) return dt2.toISOString();

  return null;
}

export function rowsToImportedEvents(
  rows: Record<string, string>[],
  mapping: ColumnMapping
): ImportedGameEvent[] {
  const dateKey = mapping.date;
  const timeKey = mapping.time;
  const oppKey = mapping.opponent;
  const locKey = mapping.location;
  const haKey = mapping.homeAway;

  const events: ImportedGameEvent[] = [];

  for (const row of rows) {
    const opponent = (oppKey ? row[oppKey] : "")?.trim();
    if (!opponent) continue;

    const dateText = (dateKey ? row[dateKey] : "")?.trim();
    const timeText = (timeKey ? row[timeKey] : "")?.trim();
    const dateTime = coerceDateTime(dateText, timeText);

    const location = (locKey ? row[locKey] : "")?.trim() || undefined;
    const homeAwayRaw = (haKey ? row[haKey] : "")?.trim();
    const homeAway = parseHomeAway(homeAwayRaw);

    events.push({
      opponent,
      dateTime,
      dateText: dateText || undefined,
      timeText: timeText || undefined,
      location,
      homeAway,
      sourceRow: row,
    });
  }

  return events;
}

