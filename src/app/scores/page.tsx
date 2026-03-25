"use client";

import { useState, useEffect, useRef } from "react";
import {
  Radio, Clock, CheckCircle, ChevronRight,
  Wifi, WifiOff, RefreshCw, Filter,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { cn } from "@/lib/utils";
import type { LiveGame } from "@/app/api/live-scores/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

const SPORT_ICONS: Record<string, string> = {
  "Basketball": "🏀",
  "Women's Basketball": "🏀",
  "Football": "🏈",
  "Baseball": "⚾",
  "Softball": "🥎",
  "Soccer": "⚽",
  "Volleyball": "🏐",
  "Swimming": "🏊",
  "Track & Field": "🏃",
};

function formatDate(dateStr?: string): string {
  if (!dateStr) return "Recent";
  // NCAA returns MM/DD/YYYY
  const parts = dateStr.split("/");
  if (parts.length !== 3) return dateStr;
  const d = new Date(Number(parts[2]), Number(parts[0]) - 1, Number(parts[1]));
  const today    = new Date(); today.setHours(0,0,0,0);
  const gameDay  = new Date(d); gameDay.setHours(0,0,0,0);
  const diff = today.getTime() - gameDay.getTime();
  if (diff === 0)          return "Today";
  if (diff === 86400000)   return "Yesterday";
  if (diff <= 6 * 86400000) {
    return d.toLocaleDateString("en-US", { weekday: "long" });
  }
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function groupByDate(games: LiveGame[]): Map<string, LiveGame[]> {
  const map = new Map<string, LiveGame[]>();
  for (const g of games) {
    if (g.status === "live") continue; // live games shown separately
    const key = formatDate(g.startDate);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(g);
  }
  return map;
}

// ── Swimming score card ───────────────────────────────────────────────────────
function SwimCard({ game, index }: { game: LiveGame; index: number }) {
  const isLive = game.status === "live";
  const icon   = SPORT_ICONS[game.sport] ?? "🏆";

  return (
    <div
      className={cn(
        "shrink-0 w-52 rounded-2xl border p-4 cursor-default transition-all duration-200",
        "hover:scale-[1.03] hover:shadow-2xl hover:shadow-black/40",
        isLive
          ? "border-green-500/30 bg-gradient-to-b from-green-500/[0.08] to-card"
          : "border-border/50 bg-card",
      )}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Sport + status */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-lg leading-none">{icon}</span>
        {isLive ? (
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 animate-ping opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-400" />
            </span>
            <span className="text-[10px] font-bold text-green-400 uppercase tracking-widest">Live</span>
          </div>
        ) : (
          <span className={cn(
            "text-[10px] font-semibold uppercase tracking-wider",
            game.status === "upcoming" ? "text-blue-400" : "text-muted-foreground/50"
          )}>
            {game.status === "upcoming" ? game.startTime ?? "Soon" : "Final"}
          </span>
        )}
      </div>

      {/* Teams + scores */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-foreground truncate flex-1">{game.homeTeam}</span>
          {game.status !== "upcoming" && (
            <span className={cn(
              "text-xl font-black tabular-nums shrink-0",
              isLive ? "text-foreground" : "text-foreground/85"
            )}>{game.homeScore}</span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-muted-foreground truncate flex-1">{game.awayTeam}</span>
          {game.status !== "upcoming" && (
            <span className="text-xl font-black tabular-nums shrink-0 text-muted-foreground/70">{game.awayScore}</span>
          )}
        </div>
      </div>

      {/* Period / clock for live */}
      {isLive && game.period && (
        <div className="mt-3 pt-2 border-t border-green-500/15 flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">{game.period}</span>
          {game.clock && <span className="text-[10px] font-mono text-green-400">{game.clock}</span>}
        </div>
      )}

      <div className="mt-2 text-[10px] text-muted-foreground/40 font-medium uppercase tracking-wider">
        {game.sport}
      </div>
    </div>
  );
}

// ── Swim lane (horizontally auto-scrolling row) ───────────────────────────────
function SwimLane({ games, speed = 40 }: { games: LiveGame[]; speed?: number }) {
  const items = [...games, ...games]; // duplicate for seamless loop
  return (
    <div className="relative overflow-hidden">
      {/* Fade edges */}
      <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-16 z-10 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-16 z-10 bg-gradient-to-l from-background to-transparent" />

      <div
        className="flex gap-3 animate-swim-left"
        style={{ "--swim-dur": `${speed}s` } as React.CSSProperties}
      >
        {items.map((g, i) => (
          <SwimCard key={`${g.id}-${i}`} game={g} index={i} />
        ))}
      </div>
    </div>
  );
}

// ── Past game row ─────────────────────────────────────────────────────────────
function PastGameRow({ game, index }: { game: LiveGame; index: number }) {
  const icon = SPORT_ICONS[game.sport] ?? "🏆";
  const homeWon = game.homeScore > game.awayScore;

  return (
    <div
      className="flex items-center gap-4 px-4 py-3 rounded-xl border border-border/30 bg-card hover:border-border/60 hover:bg-card/80 transition-all duration-150 animate-card-enter"
      style={{ animationDelay: `${index * 35}ms`, animationFillMode: "both" }}
    >
      <span className="text-base shrink-0">{icon}</span>
      <span className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wider w-28 shrink-0 hidden sm:block">{game.sport}</span>

      {/* Home team */}
      <div className={cn("flex-1 text-sm font-semibold truncate", homeWon ? "text-foreground" : "text-muted-foreground/70")}>
        {game.homeTeam}
      </div>

      {/* Score */}
      <div className="flex items-center gap-2 shrink-0">
        <span className={cn("text-base font-black tabular-nums w-6 text-right", homeWon ? "text-foreground" : "text-muted-foreground/60")}>
          {game.homeScore}
        </span>
        <span className="text-muted-foreground/20 text-xs">–</span>
        <span className={cn("text-base font-black tabular-nums w-6", !homeWon ? "text-foreground" : "text-muted-foreground/60")}>
          {game.awayScore}
        </span>
      </div>

      {/* Away team */}
      <div className={cn("flex-1 text-sm truncate text-right", !homeWon ? "text-foreground font-semibold" : "text-muted-foreground/70")}>
        {game.awayTeam}
      </div>

      <CheckCircle className="w-3 h-3 text-muted-foreground/25 shrink-0" />
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
const ALL_SPORTS = ["All", "Basketball", "Women's Basketball", "Football", "Baseball", "Softball", "Soccer", "Volleyball"];

export default function ScoresPage() {
  const [games,        setGames]        = useState<LiveGame[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [source,       setSource]       = useState<"ncaa" | "fallback" | null>(null);
  const [sportFilter,  setSportFilter]  = useState("All");
  const [lastUpdated,  setLastUpdated]  = useState<Date | null>(null);
  const [refreshing,   setRefreshing]   = useState(false);

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

  const filtered = sportFilter === "All" ? games : games.filter((g) => g.sport === sportFilter);
  const liveGames     = filtered.filter((g) => g.status === "live");
  const upcomingGames = filtered.filter((g) => g.status === "upcoming");
  const pastGames     = filtered.filter((g) => g.status === "final");
  const dateGroups    = groupByDate(pastGames.length ? pastGames : filtered.filter((g) => g.status === "final"));

  // Available sports from actual data
  const availableSports = ["All", ...Array.from(new Set(games.map((g) => g.sport))).sort()];

  // Swimming lane games = live + recent finals
  const swimGames = [...liveGames, ...pastGames.slice(0, 20)];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 pt-24 pb-8 space-y-10">
        {/* Page title row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-primary" />
            <h1 className="text-lg font-bold">NCAA Scores</h1>
          </div>
          <div className="flex items-center gap-3">
            {lastUpdated && (
              <span className="text-[10px] text-muted-foreground/40 hidden sm:block">
                Updated {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
            <div className="flex items-center gap-1.5">
              {source === "ncaa"
                ? <Wifi className="w-3.5 h-3.5 text-green-400" />
                : <WifiOff className="w-3.5 h-3.5 text-muted-foreground/40" />}
              <span className="text-[10px] font-semibold text-muted-foreground/50">
                {source === "ncaa" ? "NCAA Live" : "Simulated"}
              </span>
            </div>
            <button
              onClick={() => fetchGames(true)}
              className="p-1.5 rounded-lg hover:bg-white/5 text-muted-foreground/50 hover:text-foreground transition-colors"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin")} />
            </button>
          </div>
        </div>

        {/* ── Live games ─────────────────────────────────────────────────── */}
        {liveGames.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-5 px-1">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 animate-ping opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-400" />
              </span>
              <span className="text-xs font-bold text-green-400 uppercase tracking-widest">
                {liveGames.length} Live Right Now
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {liveGames.map((g, i) => (
                <div
                  key={g.id}
                  className="rounded-2xl border border-green-500/30 bg-gradient-to-b from-green-500/[0.07] to-card p-4 animate-card-enter"
                  style={{ animationDelay: `${i * 60}ms`, animationFillMode: "both" }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{SPORT_ICONS[g.sport] ?? "🏆"}</span>
                      <span className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider">{g.sport}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 animate-ping opacity-75" />
                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-400" />
                      </span>
                      <span className="text-[10px] font-bold text-green-400">LIVE</span>
                    </div>
                  </div>
                  <div className="space-y-1.5 mb-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-foreground">{g.homeTeam}</span>
                      <span className="text-2xl font-black tabular-nums text-foreground">{g.homeScore}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">{g.awayTeam}</span>
                      <span className="text-2xl font-black tabular-nums text-muted-foreground/70">{g.awayScore}</span>
                    </div>
                  </div>
                  {g.period && (
                    <div className="flex justify-between text-[10px] pt-2 border-t border-green-500/15">
                      <span className="text-muted-foreground">{g.period}</span>
                      {g.clock && <span className="font-mono text-green-400">{g.clock}</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Swimming score lane (live + recent) ────────────────────────── */}
        {swimGames.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4 px-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-muted-foreground/60 uppercase tracking-widest">Scores Feed</span>
                <span className="text-[10px] text-muted-foreground/30">· hover to pause</span>
              </div>
              <span className="text-[10px] text-muted-foreground/30 tabular-nums">{swimGames.length} games</span>
            </div>
            <SwimLane games={swimGames} speed={Math.max(30, swimGames.length * 2.5)} />
          </section>
        )}

        {/* ── Sport filter ────────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1 no-scrollbar">
            <Filter className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
            {availableSports.map((s) => (
              <button
                key={s}
                onClick={() => setSportFilter(s)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-all flex items-center gap-1.5",
                  sportFilter === s
                    ? "bg-primary/15 text-primary border border-primary/25"
                    : "text-muted-foreground hover:text-foreground border border-transparent hover:bg-white/5"
                )}
              >
                {SPORT_ICONS[s] && <span className="text-sm leading-none">{SPORT_ICONS[s]}</span>}
                {s}
              </button>
            ))}
          </div>

          {/* ── Upcoming ─────────────────────────────────────────────────── */}
          {upcomingGames.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">Upcoming</span>
                <span className="text-[10px] text-muted-foreground/40">({upcomingGames.length})</span>
              </div>
              <div className="space-y-2">
                {upcomingGames.map((g, i) => (
                  <div
                    key={g.id}
                    className="flex items-center gap-4 px-4 py-3 rounded-xl border border-blue-500/15 bg-blue-500/[0.03] animate-card-enter"
                    style={{ animationDelay: `${i * 30}ms`, animationFillMode: "both" }}
                  >
                    <span className="text-base shrink-0">{SPORT_ICONS[g.sport] ?? "🏆"}</span>
                    <span className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wider w-28 shrink-0 hidden sm:block">{g.sport}</span>
                    <span className="flex-1 text-sm font-semibold text-foreground">{g.homeTeam}</span>
                    <span className="text-xs font-bold text-blue-400 shrink-0">{g.startTime ?? "TBD"}</span>
                    <span className="flex-1 text-sm text-muted-foreground text-right">{g.awayTeam}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Past results grouped by date ─────────────────────────────── */}
          {loading ? (
            <div className="space-y-2">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-14 rounded-xl bg-card animate-pulse border border-border/20" />
              ))}
            </div>
          ) : dateGroups.size === 0 ? (
            <div className="py-20 text-center text-muted-foreground/30">
              <CheckCircle className="w-8 h-8 mx-auto mb-3" />
              <p className="text-sm">No results yet for {sportFilter === "All" ? "any sport" : sportFilter}.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {Array.from(dateGroups.entries()).map(([date, dayGames]) => (
                <div key={date}>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xs font-bold text-foreground/60 uppercase tracking-widest">{date}</span>
                    <div className="flex-1 h-px bg-border/30" />
                    <span className="text-[10px] text-muted-foreground/30">{dayGames.length} game{dayGames.length !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="space-y-2">
                    {dayGames.map((g, i) => (
                      <PastGameRow key={g.id} game={g} index={i} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </main>
    </div>
  );
}
