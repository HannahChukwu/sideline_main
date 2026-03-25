import { NextResponse } from "next/server";

export interface LiveGame {
  id: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  period: string;
  clock: string;
  status: "live" | "final" | "upcoming";
  startTime?: string;
  startDate?: string;   // MM/DD/YYYY from NCAA
  ncaaUrl?: string;
}

// ── NCAA API types ────────────────────────────────────────────────────────────
interface NcaaTeam {
  score: string;
  winner: boolean;
  names: { short: string; full: string; char6: string; seo: string };
  rank?: number;
}
interface NcaaGame {
  gameID?: string;
  gameState: string;
  currentPeriod?: string;
  contestClock?: string;
  startDate: string;
  startTime?: string;
  away: NcaaTeam;
  home: NcaaTeam;
  url?: string;
}
interface NcaaResponse {
  games?: Array<{ game: NcaaGame }>;
}

// ── Sport config ──────────────────────────────────────────────────────────────
const NCAA_SPORTS = [
  { path: "basketball-men/d1",   label: "Basketball" },
  { path: "basketball-women/d1", label: "Women's Basketball" },
  { path: "football/fbs",        label: "Football" },
  { path: "baseball/d1",         label: "Baseball" },
  { path: "softball/d1",         label: "Softball" },
  { path: "soccer-men/d1",       label: "Soccer" },
  { path: "volleyball-women/d1", label: "Volleyball" },
];

// Fetch a single NCAA scoreboard URL
async function fetchNcaaUrl(url: string, label: string): Promise<LiveGame[]> {
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(4000),
  });
  if (!res.ok) return [];
  const data: NcaaResponse = await res.json();
  return (data.games ?? []).map(({ game: g }): LiveGame => {
    const state = (g.gameState ?? "").toLowerCase();
    let status: LiveGame["status"] = "upcoming";
    if (state === "final" || state === "f/ot") status = "final";
    else if (state.includes("progress") || state === "live") status = "live";
    return {
      id: g.gameID ?? `${label}-${g.startDate}-${g.home?.names?.char6}`,
      sport: label,
      homeTeam: g.home?.names?.short ?? g.home?.names?.full ?? "Home",
      awayTeam: g.away?.names?.short ?? g.away?.names?.full ?? "Away",
      homeScore: parseInt(g.home?.score ?? "0", 10) || 0,
      awayScore: parseInt(g.away?.score ?? "0", 10) || 0,
      period: g.currentPeriod ?? (status === "final" ? "Final" : ""),
      clock: g.contestClock ?? "",
      status,
      startTime:  status === "upcoming" ? (g.startTime ?? g.startDate) : undefined,
      startDate:  g.startDate,
      ncaaUrl:    g.url,
    };
  });
}

// For each sport, fetch current + one prior page (page=2) to get recent past games
async function fetchSport(path: string, label: string): Promise<LiveGame[]> {
  const base = `https://ncaa-api.henrygd.me/scoreboard/${path}/current/current/all-conf`;
  const [page1, page2] = await Promise.allSettled([
    fetchNcaaUrl(base, label),
    fetchNcaaUrl(`${base}?page=2`, label),
  ]);
  return [
    ...(page1.status === "fulfilled" ? page1.value : []),
    ...(page2.status === "fulfilled" ? page2.value : []),
  ];
}

// ── Fallback simulation ───────────────────────────────────────────────────────
function buildFallback(): LiveGame[] {
  const m = new Date().getMinutes();
  const s = new Date().getSeconds();
  const today = new Date().toLocaleDateString("en-US");
  const yesterday = new Date(Date.now() - 86400000).toLocaleDateString("en-US");
  const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toLocaleDateString("en-US");

  return [
    { id: "sim-bball-live", sport: "Basketball", homeTeam: "Falcons", awayTeam: "Eagles",
      homeScore: 48 + Math.floor(m / 3), awayScore: 42 + Math.floor(m / 4),
      period: m < 20 ? "Q1" : m < 40 ? "Q2" : "Q3",
      clock: `${7 - (m % 8)}:${String(59 - (s % 60)).padStart(2, "0")}`,
      status: "live", startDate: today },
    { id: "sim-bball-1", sport: "Basketball", homeTeam: "Falcons", awayTeam: "Tigers",
      homeScore: 78, awayScore: 71, period: "Final", clock: "", status: "final", startDate: today },
    { id: "sim-soccer-1", sport: "Soccer", homeTeam: "Falcons", awayTeam: "Wolves",
      homeScore: 2, awayScore: 1, period: "Final", clock: "", status: "final", startDate: today },
    { id: "sim-fb-1", sport: "Football", homeTeam: "Falcons", awayTeam: "Bears",
      homeScore: 34, awayScore: 21, period: "Final", clock: "", status: "final", startDate: yesterday },
    { id: "sim-bball-2", sport: "Basketball", homeTeam: "Falcons", awayTeam: "Hawks",
      homeScore: 65, awayScore: 68, period: "Final", clock: "", status: "final", startDate: yesterday },
    { id: "sim-baseball-1", sport: "Baseball", homeTeam: "Falcons", awayTeam: "Rams",
      homeScore: 7, awayScore: 4, period: "Final", clock: "", status: "final", startDate: yesterday },
    { id: "sim-vball-1", sport: "Volleyball", homeTeam: "Falcons", awayTeam: "Lynx",
      homeScore: 3, awayScore: 1, period: "Final", clock: "", status: "final", startDate: twoDaysAgo },
    { id: "sim-swim-1", sport: "Swimming", homeTeam: "Falcons", awayTeam: "Stingrays",
      homeScore: 212, awayScore: 178, period: "Final", clock: "", status: "final", startDate: twoDaysAgo },
    { id: "sim-vb-up", sport: "Volleyball", homeTeam: "Falcons", awayTeam: "Bears",
      homeScore: 0, awayScore: 0, period: "", clock: "", status: "upcoming", startTime: "7:00 PM", startDate: today },
  ];
}

// ── Route handler ─────────────────────────────────────────────────────────────
export async function GET() {
  let games: LiveGame[] = [];
  let source: "ncaa" | "fallback" = "ncaa";

  try {
    const results = await Promise.allSettled(
      NCAA_SPORTS.map((s) => fetchSport(s.path, s.label))
    );
    games = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));

    // Deduplicate by id
    const seen = new Set<string>();
    games = games.filter((g) => { if (seen.has(g.id)) return false; seen.add(g.id); return true; });

    if (games.length === 0) { games = buildFallback(); source = "fallback"; }
    else {
      // Sort: live → upcoming → final (most recent date first within each group)
      const order = { live: 0, upcoming: 1, final: 2 };
      games.sort((a, b) => {
        const statusDiff = order[a.status] - order[b.status];
        if (statusDiff !== 0) return statusDiff;
        return (b.startDate ?? "").localeCompare(a.startDate ?? "");
      });
    }
  } catch {
    games = buildFallback();
    source = "fallback";
  }

  return NextResponse.json(
    { games, updatedAt: new Date().toISOString(), source },
    { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=30" } }
  );
}
