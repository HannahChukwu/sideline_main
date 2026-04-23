"use client";

import { useState, useEffect, useMemo } from "react";
import { Radio, Clock, CheckCircle, Wifi, WifiOff, RefreshCw } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { cn } from "@/lib/utils";
import type { LiveGame } from "@/app/api/live-scores/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

const SPORT_ICONS: Record<string, string> = {
  "Basketball":        "🏀",
  "Women's Basketball":"🏀",
  "Football":          "🏈",
  "Baseball":          "⚾",
  "Softball":          "🥎",
  "Soccer":            "⚽",
  "Volleyball":        "🏐",
  "Swimming":          "🏊",
  "Track & Field":     "🏃",
};

function formatDate(dateStr?: string): string {
  if (!dateStr) return "Recent";
  const parts = dateStr.split("/");
  if (parts.length !== 3) return dateStr;
  const d = new Date(Number(parts[2]), Number(parts[0]) - 1, Number(parts[1]));
  const today   = new Date(); today.setHours(0, 0, 0, 0);
  const gameDay = new Date(d); gameDay.setHours(0, 0, 0, 0);
  const diff = today.getTime() - gameDay.getTime();
  if (diff === 0)           return "Today";
  if (diff === 86400000)    return "Yesterday";
  if (diff === -86400000)   return "Tomorrow";
  if (diff < 0 && diff > -7 * 86400000)
    return d.toLocaleDateString("en-US", { weekday: "long" });
  if (diff <= 6 * 86400000)
    return d.toLocaleDateString("en-US", { weekday: "long" });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function groupByDate(games: LiveGame[]): Map<string, LiveGame[]> {
  const map = new Map<string, LiveGame[]>();
  for (const g of games) {
    const key = formatDate(g.startDate);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(g);
  }
  return map;
}

// ── Live card ─────────────────────────────────────────────────────────────────

function LiveCard({ game, index }: { game: LiveGame; index: number }) {
  const homeAhead = Number(game.homeScore) >= Number(game.awayScore);

  return (
    <div
      className="rounded-2xl border border-green-500/25 bg-gradient-to-b from-green-500/[0.08] to-card p-5 animate-card-enter"
      style={{ animationDelay: `${index * 60}ms`, animationFillMode: "both" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-base leading-none">{SPORT_ICONS[game.sport] ?? "🏆"}</span>
          <span className="text-[11px] font-semibold text-foreground/50 uppercase tracking-wider">
            {game.sport}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-75" />
            <span className="relative h-1.5 w-1.5 rounded-full bg-green-400" />
          </span>
          <span className="text-[10px] font-bold text-green-400 uppercase tracking-widest">Live</span>
        </div>
      </div>

      {/* 3-column score */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div>
          <div className="text-sm font-bold text-foreground leading-tight line-clamp-2">
            {game.homeTeam}
          </div>
          {homeAhead && game.status === "live" && (
            <div className="mt-1 text-[9px] font-bold text-green-400 uppercase tracking-wider">Leading</div>
          )}
        </div>

        <div className="flex items-center gap-2 px-2">
          <span className={cn(
            "text-3xl font-black tabular-nums",
            homeAhead ? "text-foreground" : "text-foreground/45"
          )}>
            {game.homeScore}
          </span>
          <span className="text-foreground/20 text-sm font-light select-none">–</span>
          <span className={cn(
            "text-3xl font-black tabular-nums",
            !homeAhead ? "text-foreground" : "text-foreground/45"
          )}>
            {game.awayScore}
          </span>
        </div>

        <div className="text-right">
          <div className="text-sm font-bold text-foreground/80 leading-tight line-clamp-2">
            {game.awayTeam}
          </div>
          {!homeAhead && game.status === "live" && (
            <div className="mt-1 text-[9px] font-bold text-green-400 uppercase tracking-wider text-right">Leading</div>
          )}
        </div>
      </div>

      {/* Period / clock */}
      {game.period && (
        <div className="mt-4 pt-3 border-t border-green-500/15 flex items-center justify-between">
          <span className="text-[11px] text-foreground/40">{game.period}</span>
          {game.clock && (
            <span className="text-[11px] font-mono font-bold text-green-400">{game.clock}</span>
          )}
        </div>
      )}
    </div>
  );
}

// ── Matchup row (upcoming + final) ────────────────────────────────────────────

function MatchupRow({ game, index }: { game: LiveGame; index: number }) {
  const isFinal    = game.status === "final";
  const isUpcoming = game.status === "upcoming";
  const homeWon    = isFinal && Number(game.homeScore) > Number(game.awayScore);
  const awayWon    = isFinal && Number(game.awayScore) > Number(game.homeScore);

  return (
    <div
      className={cn(
        "grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-150 animate-card-enter",
        isUpcoming
          ? "border border-blue-500/15 bg-blue-500/[0.03] hover:border-blue-500/25 hover:bg-blue-500/[0.05]"
          : "border border-border/60 bg-white/[0.02] hover:border-border hover:bg-white/[0.04]"
      )}
      style={{ animationDelay: `${index * 28}ms`, animationFillMode: "both" }}
    >
      {/* Home team */}
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="text-sm shrink-0 leading-none">{SPORT_ICONS[game.sport] ?? "🏆"}</span>
        <div className="min-w-0">
          <span className={cn(
            "text-sm font-semibold truncate block leading-tight",
            homeWon
              ? "text-foreground"
              : awayWon
              ? "text-foreground/38"
              : "text-foreground"
          )}>
            {game.homeTeam}
          </span>
          {homeWon && (
            <span className="mt-0.5 inline-block text-[9px] font-bold text-primary bg-primary/12 rounded px-1 py-px">
              W
            </span>
          )}
        </div>
      </div>

      {/* Center: score or kickoff time */}
      <div className="shrink-0 flex flex-col items-center justify-center min-w-[84px]">
        {isUpcoming ? (
          <>
            <span className="text-[12px] font-bold text-blue-400 tabular-nums">
              {game.startTime ?? "TBD"}
            </span>
            <span className="text-[9px] text-foreground/25 uppercase tracking-widest mt-0.5">vs</span>
          </>
        ) : (
          <div className="flex items-center gap-1.5">
            <span className={cn(
              "text-lg font-black tabular-nums w-7 text-right leading-none",
              homeWon ? "text-foreground" : "text-foreground/30"
            )}>
              {game.homeScore}
            </span>
            <span className="text-foreground/18 text-xs font-bold select-none">–</span>
            <span className={cn(
              "text-lg font-black tabular-nums w-7 leading-none",
              awayWon ? "text-foreground" : "text-foreground/30"
            )}>
              {game.awayScore}
            </span>
          </div>
        )}
      </div>

      {/* Away team */}
      <div className="flex flex-col items-end min-w-0">
        <span className={cn(
          "text-sm font-semibold truncate block leading-tight text-right",
          awayWon
            ? "text-foreground"
            : homeWon
            ? "text-foreground/38"
            : "text-foreground/80"
        )}>
          {game.awayTeam}
        </span>
        {awayWon && (
          <span className="mt-0.5 inline-block text-[9px] font-bold text-primary bg-primary/12 rounded px-1 py-px">
            W
          </span>
        )}
      </div>
    </div>
  );
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({
  label,
  count,
  type,
}: {
  label: string;
  count: number;
  type: "live" | "upcoming" | "final";
}) {
  const isRecent = label === "Today" || label === "Yesterday";

  return (
    <div className="flex items-center gap-3 py-0.5">
      <span className={cn(
        "text-[11px] font-bold uppercase tracking-wider flex items-center gap-2 shrink-0",
        type === "live"
          ? "text-green-400"
          : type === "upcoming"
          ? "text-blue-400"
          : isRecent
          ? "text-foreground/65"
          : "text-foreground/30"
      )}>
        {type === "live" && (
          <span className="relative flex h-2 w-2">
            <span className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-75" />
            <span className="relative h-2 w-2 rounded-full bg-green-400" />
          </span>
        )}
        {type === "upcoming" && <Clock className="w-3 h-3" />}
        {label}
      </span>
      <div className="flex-1 h-px bg-white/7" />
      <span className="text-[10px] text-foreground/20 tabular-nums shrink-0">{count}</span>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ScoresPage() {
  const [games,       setGames]       = useState<LiveGame[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [source,      setSource]      = useState<"ncaa" | "fallback" | null>(null);
  const [sportFilter, setSportFilter] = useState("All");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshing,  setRefreshing]  = useState(false);

  async function fetchGames(showRefresh = false) {
    if (showRefresh) setRefreshing(true);
    try {
      const res  = await fetch("/api/live-scores");
      const data = await res.json();
      setGames(data.games ?? []);
      setSource(data.source ?? null);
      setLastUpdated(new Date());
    } catch { /* ignore */ }
    finally { setLoading(false); setRefreshing(false); }
  }

  useEffect(() => {
    fetchGames();
    const id = setInterval(() => fetchGames(), 30_000);
    return () => clearInterval(id);
  }, []);

  const availableSports = useMemo(
    () => ["All", ...Array.from(new Set(games.map((g) => g.sport))).sort()],
    [games]
  );

  const filtered     = sportFilter === "All" ? games : games.filter((g) => g.sport === sportFilter);
  const liveGames    = filtered.filter((g) => g.status === "live");
  const upcomingGames = filtered.filter((g) => g.status === "upcoming");
  const pastGames    = filtered.filter((g) => g.status === "final");

  const upcomingByDate = useMemo(() => groupByDate(upcomingGames), [upcomingGames]);
  const pastByDate     = useMemo(() => groupByDate(pastGames),     [pastGames]);

  const hasAnyGames = liveGames.length > 0 || upcomingGames.length > 0 || pastGames.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 pt-24 pb-16 space-y-7">

        {/* Page header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Radio className="w-4 h-4 text-primary shrink-0" />
            <h1 className="text-xl font-bold tracking-tight">NCAA Scores</h1>
            {liveGames.length > 0 && (
              <span className="ml-1 text-[11px] font-bold text-green-400 bg-green-500/10 border border-green-500/20 rounded-full px-2 py-0.5">
                {liveGames.length} Live
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {lastUpdated && (
              <span className="text-[11px] text-foreground/30 hidden sm:block tabular-nums">
                {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
            <div className="flex items-center gap-1.5">
              {source === "ncaa"
                ? <Wifi    className="w-3.5 h-3.5 text-green-400" />
                : <WifiOff className="w-3.5 h-3.5 text-foreground/30" />}
              <span className="text-[11px] font-semibold text-foreground/40">
                {source === "ncaa" ? "NCAA Live" : "Simulated"}
              </span>
            </div>
            <button
              onClick={() => fetchGames(true)}
              className="p-1.5 rounded-lg hover:bg-white/6 text-foreground/40 hover:text-foreground transition-colors"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin")} />
            </button>
          </div>
        </div>

        {/* Sport filter — sits at top, controls ALL sections */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {availableSports.map((s) => (
            <button
              key={s}
              onClick={() => setSportFilter(s)}
              className={cn(
                "h-8 px-3 rounded-lg text-xs font-semibold shrink-0 transition-all flex items-center gap-1.5",
                sportFilter === s
                  ? "bg-primary/15 text-primary border border-primary/30"
                  : "text-foreground/50 hover:text-foreground border border-white/10 hover:border-white/16 hover:bg-white/5"
              )}
            >
              {SPORT_ICONS[s] && (
                <span className="text-sm leading-none">{SPORT_ICONS[s]}</span>
              )}
              {s}
            </button>
          ))}
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-1.5">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="h-14 rounded-xl bg-card animate-pulse border border-border/30"
                style={{ opacity: 1 - i * 0.1 }}
              />
            ))}
          </div>
        )}

        {!loading && (
          <div className="space-y-8">

            {/* ── Live Now ─────────────────────────────────────────────── */}
            {liveGames.length > 0 && (
              <section className="space-y-3">
                <SectionHeader label="Live Now" count={liveGames.length} type="live" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {liveGames.map((g, i) => (
                    <LiveCard key={g.id} game={g} index={i} />
                  ))}
                </div>
              </section>
            )}

            {/* ── Upcoming — grouped by date ────────────────────────── */}
            {upcomingByDate.size > 0 && (
              <div className="space-y-6">
                {Array.from(upcomingByDate.entries()).map(([date, dayGames]) => (
                  <section key={`upcoming-${date}`} className="space-y-2">
                    <SectionHeader label={date} count={dayGames.length} type="upcoming" />
                    <div className="space-y-1.5">
                      {dayGames.map((g, i) => (
                        <MatchupRow key={g.id} game={g} index={i} />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}

            {/* ── Past results — grouped by date ────────────────────── */}
            {pastByDate.size > 0 && (
              <div className="space-y-6">
                {Array.from(pastByDate.entries()).map(([date, dayGames]) => (
                  <section key={`past-${date}`} className="space-y-2">
                    <SectionHeader label={date} count={dayGames.length} type="final" />
                    <div className="space-y-1.5">
                      {dayGames.map((g, i) => (
                        <MatchupRow key={g.id} game={g} index={i} />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}

            {/* ── Empty state ───────────────────────────────────────── */}
            {!hasAnyGames && (
              <div className="py-24 text-center space-y-3">
                <CheckCircle className="w-8 h-8 mx-auto text-foreground/15" />
                <p className="text-sm text-foreground/35">
                  No games for{" "}
                  {sportFilter === "All" ? "any sport" : sportFilter} right now.
                </p>
              </div>
            )}

          </div>
        )}

      </main>
    </div>
  );
}
