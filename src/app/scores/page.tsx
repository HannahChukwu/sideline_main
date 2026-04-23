"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  Radio, Clock, CheckCircle, Wifi, WifiOff, RefreshCw, Trophy,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { cn } from "@/lib/utils";
import type { LiveGame } from "@/app/api/live-scores/route";

// ── Constants ─────────────────────────────────────────────────────────────────

type Tab = "all" | "live" | "upcoming" | "results";

const SPORT_ICONS: Record<string, string> = {
  "Basketball":         "🏀",
  "Women's Basketball": "🏀",
  "Football":           "🏈",
  "Baseball":           "⚾",
  "Softball":           "🥎",
  "Soccer":             "⚽",
  "Volleyball":         "🏐",
  "Swimming":           "🏊",
  "Track & Field":      "🏃",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateStr?: string): string {
  if (!dateStr) return "Recent";
  const parts = dateStr.split("/");
  if (parts.length !== 3) return dateStr;
  const d       = new Date(Number(parts[2]), Number(parts[0]) - 1, Number(parts[1]));
  const today   = new Date(); today.setHours(0, 0, 0, 0);
  const gameDay = new Date(d); gameDay.setHours(0, 0, 0, 0);
  const diff    = today.getTime() - gameDay.getTime();
  if (diff === 0)                           return "Today";
  if (diff === 86400000)                    return "Yesterday";
  if (diff === -86400000)                   return "Tomorrow";
  if (diff < 0 && diff > -7 * 86400000)    return d.toLocaleDateString("en-US", { weekday: "long" });
  if (diff > 0 && diff <= 6 * 86400000)    return d.toLocaleDateString("en-US", { weekday: "long" });
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

// ── Live Ticker ───────────────────────────────────────────────────────────────
// Full-width scrolling bar pinned below navbar — always shows ALL live games

function LiveTicker({ games }: { games: LiveGame[] }) {
  if (games.length === 0) return null;

  // Ensure enough items to fill the viewport before looping
  const minItems = Math.ceil(12 / Math.max(games.length, 1));
  const padded   = Array.from({ length: minItems }, () => games).flat();
  const items    = [...padded, ...padded]; // double for seamless loop
  const dur      = Math.max(18, padded.length * 4.5);

  return (
    <div className="fixed top-[53px] left-0 right-0 z-40 overflow-hidden border-b border-green-500/20 bg-background/96 backdrop-blur-md">
      {/* Subtle green wash */}
      <div className="absolute inset-0 bg-green-500/[0.055] pointer-events-none" />

      {/* Fade edges */}
      <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-20 z-10 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-20 z-10 bg-gradient-to-l from-background to-transparent" />

      {/* "LIVE" label pinned on left */}
      <div className="absolute left-4 top-0 bottom-0 z-20 flex items-center gap-2 pointer-events-none">
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          <span className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-75" />
          <span className="relative h-1.5 w-1.5 rounded-full bg-green-400" />
        </span>
        <span className="text-[10px] font-bold text-green-400 uppercase tracking-widest whitespace-nowrap">
          Live
        </span>
      </div>

      {/* Scrolling strip */}
      <div
        className="flex animate-swim-left pl-20"
        style={{ "--swim-dur": `${dur}s` } as React.CSSProperties}
      >
        {items.map((g, i) => (
          <div
            key={`${g.id}-${i}`}
            className="flex items-center gap-2.5 shrink-0 px-5 py-2 border-r border-green-500/10"
          >
            <span className="text-sm leading-none">{SPORT_ICONS[g.sport] ?? "🏆"}</span>
            <span className="text-xs font-semibold text-foreground/70 whitespace-nowrap max-w-[72px] truncate">
              {g.homeTeam}
            </span>
            <div className="flex items-center gap-1 bg-white/5 rounded-md px-2 py-0.5">
              <span className="text-sm font-black tabular-nums text-foreground leading-none">
                {g.homeScore ?? "–"}
              </span>
              <span className="text-foreground/18 text-xs select-none mx-0.5">–</span>
              <span className="text-sm font-black tabular-nums text-foreground leading-none">
                {g.awayScore ?? "–"}
              </span>
            </div>
            <span className="text-xs font-semibold text-foreground/70 whitespace-nowrap max-w-[72px] truncate">
              {g.awayTeam}
            </span>
            {g.clock ? (
              <span className="text-[10px] font-mono text-green-400 whitespace-nowrap">{g.clock}</span>
            ) : g.period ? (
              <span className="text-[10px] text-green-400/60 whitespace-nowrap">{g.period}</span>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Live card (prominent 2-col grid) ─────────────────────────────────────────

function LiveCard({ game, index }: { game: LiveGame; index: number }) {
  const prevScores = useRef({ home: game.homeScore, away: game.awayScore });
  const [homeFlash, setHomeFlash] = useState(false);
  const [awayFlash, setAwayFlash] = useState(false);

  useEffect(() => {
    if (game.homeScore !== prevScores.current.home) {
      setHomeFlash(true);
      setTimeout(() => setHomeFlash(false), 1200);
    }
    if (game.awayScore !== prevScores.current.away) {
      setAwayFlash(true);
      setTimeout(() => setAwayFlash(false), 1200);
    }
    prevScores.current = { home: game.homeScore, away: game.awayScore };
  }, [game.homeScore, game.awayScore]);

  const homeAhead = Number(game.homeScore) > Number(game.awayScore);
  const awayAhead = Number(game.awayScore) > Number(game.homeScore);
  const tied      = !homeAhead && !awayAhead;

  return (
    <div
      className="relative rounded-2xl border border-green-500/30 overflow-hidden animate-card-enter"
      style={{ animationDelay: `${index * 60}ms`, animationFillMode: "both" }}
    >
      {/* Background — dark green-tinted gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-green-500/[0.09] via-card to-card" />

      {/* Top glow stripe */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-green-400/50 to-transparent" />

      <div className="relative p-5">
        {/* Header: sport label + live badge */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <span className="text-lg leading-none">{SPORT_ICONS[game.sport] ?? "🏆"}</span>
            <span className="text-[11px] font-semibold text-foreground/40 uppercase tracking-wider">
              {game.sport}
            </span>
          </div>
          <div className="flex items-center gap-1.5 bg-green-500/12 border border-green-500/25 rounded-full px-2.5 py-1">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-75" />
              <span className="relative h-1.5 w-1.5 rounded-full bg-green-400" />
            </span>
            <span className="text-[10px] font-bold text-green-400 uppercase tracking-widest">Live</span>
          </div>
        </div>

        {/* Scoreboard: home | divider | away */}
        <div className="grid grid-cols-[1fr_36px_1fr] items-stretch gap-0 mb-4">
          {/* Home */}
          <div className={cn(
            "rounded-l-xl p-3.5 transition-colors duration-300",
            homeAhead ? "bg-white/[0.06]" : "bg-transparent",
          )}>
            <div className={cn(
              "text-xs font-semibold mb-1.5 leading-tight truncate",
              homeAhead ? "text-foreground/80" : "text-foreground/40",
            )}>
              {game.homeTeam}
            </div>
            <div className={cn(
              "text-[32px] font-black tabular-nums leading-none transition-colors",
              homeAhead ? "text-foreground" : tied ? "text-foreground/50" : "text-foreground/28",
              homeFlash && "animate-score-flash",
            )}>
              {game.homeScore ?? "–"}
            </div>
            {homeAhead && (
              <div className="mt-1.5 text-[9px] font-bold text-green-400 uppercase tracking-wider">
                Leading
              </div>
            )}
          </div>

          {/* Center divider */}
          <div className="flex flex-col items-center justify-center gap-1">
            <div className="flex-1 w-px bg-gradient-to-b from-transparent via-white/10 to-transparent" />
            <span className="text-[9px] text-foreground/20 uppercase tracking-widest font-bold shrink-0">
              at
            </span>
            <div className="flex-1 w-px bg-gradient-to-b from-transparent via-white/10 to-transparent" />
          </div>

          {/* Away */}
          <div className={cn(
            "rounded-r-xl p-3.5 text-right transition-colors duration-300",
            awayAhead ? "bg-white/[0.06]" : "bg-transparent",
          )}>
            <div className={cn(
              "text-xs font-semibold mb-1.5 leading-tight truncate",
              awayAhead ? "text-foreground/80" : "text-foreground/40",
            )}>
              {game.awayTeam}
            </div>
            <div className={cn(
              "text-[32px] font-black tabular-nums leading-none transition-colors",
              awayAhead ? "text-foreground" : tied ? "text-foreground/50" : "text-foreground/28",
              awayFlash && "animate-score-flash",
            )}>
              {game.awayScore ?? "–"}
            </div>
            {awayAhead && (
              <div className="mt-1.5 text-[9px] font-bold text-green-400 uppercase tracking-wider">
                Leading
              </div>
            )}
          </div>
        </div>

        {/* Period / clock */}
        {(game.period || game.clock) && (
          <div className="flex items-center justify-between pt-3 border-t border-green-500/12">
            <span className="text-[11px] text-foreground/35">{game.period}</span>
            {game.clock && (
              <span className="text-[12px] font-mono font-bold text-green-400 tabular-nums">
                {game.clock}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Matchup row (upcoming + results) ─────────────────────────────────────────

function MatchupRow({ game, index }: { game: LiveGame; index: number }) {
  const isFinal    = game.status === "final";
  const isUpcoming = game.status === "upcoming";
  const homeWon    = isFinal && Number(game.homeScore) > Number(game.awayScore);
  const awayWon    = isFinal && Number(game.awayScore) > Number(game.homeScore);

  return (
    <div
      className={cn(
        "grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-150 animate-card-enter cursor-default",
        isUpcoming
          ? "border border-blue-500/15 bg-blue-500/[0.03] hover:border-blue-500/28 hover:bg-blue-500/[0.07]"
          : "border border-border/50 bg-card/50 hover:border-border hover:bg-card/90",
      )}
      style={{ animationDelay: `${Math.min(index, 8) * 28}ms`, animationFillMode: "both" }}
    >
      {/* Home team */}
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="text-base shrink-0 leading-none">{SPORT_ICONS[game.sport] ?? "🏆"}</span>
        <div className="min-w-0">
          <div className={cn(
            "text-sm font-semibold truncate leading-tight",
            isFinal
              ? homeWon ? "text-foreground" : "text-foreground/35"
              : "text-foreground",
          )}>
            {game.homeTeam}
          </div>
          {homeWon && (
            <span className="mt-0.5 inline-block text-[9px] font-bold text-primary bg-primary/12 rounded px-1.5 py-px leading-none">
              W
            </span>
          )}
        </div>
      </div>

      {/* Center: time or score */}
      <div className="shrink-0 flex flex-col items-center min-w-[92px]">
        {isUpcoming ? (
          <>
            <span className="text-[12px] font-bold text-blue-400 tabular-nums">
              {game.startTime ?? "TBD"}
            </span>
            <span className="text-[9px] text-foreground/22 uppercase tracking-widest mt-0.5">vs</span>
          </>
        ) : (
          <div className="flex items-center gap-1.5">
            <span className={cn(
              "text-lg font-black tabular-nums w-7 text-right leading-none",
              homeWon ? "text-foreground" : isFinal ? "text-foreground/25" : "text-foreground",
            )}>
              {game.homeScore}
            </span>
            <span className="text-foreground/15 text-xs select-none font-bold">–</span>
            <span className={cn(
              "text-lg font-black tabular-nums w-7 leading-none",
              awayWon ? "text-foreground" : isFinal ? "text-foreground/25" : "text-foreground",
            )}>
              {game.awayScore}
            </span>
          </div>
        )}
      </div>

      {/* Away team */}
      <div className="flex flex-col items-end min-w-0">
        <div className={cn(
          "text-sm font-semibold truncate leading-tight text-right",
          isFinal
            ? awayWon ? "text-foreground" : "text-foreground/35"
            : "text-foreground/80",
        )}>
          {game.awayTeam}
        </div>
        {awayWon && (
          <span className="mt-0.5 inline-block text-[9px] font-bold text-primary bg-primary/12 rounded px-1.5 py-px leading-none">
            W
          </span>
        )}
      </div>
    </div>
  );
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({ label, count, type }: {
  label: string;
  count: number;
  type: "live" | "upcoming" | "final";
}) {
  const isNear = label === "Today" || label === "Yesterday" || label === "Tomorrow";

  return (
    <div className="flex items-center gap-3 py-0.5">
      <span className={cn(
        "text-[11px] font-bold uppercase tracking-wider flex items-center gap-2 shrink-0",
        type === "live"     ? "text-green-400" :
        type === "upcoming" ? "text-blue-400" :
        isNear ? "text-foreground/65" : "text-foreground/28",
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
      <span className="text-[10px] text-foreground/18 tabular-nums shrink-0">
        {count} game{count !== 1 ? "s" : ""}
      </span>
    </div>
  );
}

// ── Tab button ────────────────────────────────────────────────────────────────

function TabBtn({
  active, onClick, children, count, liveCount,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  count?: number;
  liveCount?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-3.5 h-9 rounded-lg text-sm font-semibold shrink-0 transition-all",
        active
          ? "bg-white/10 text-foreground ring-1 ring-white/14"
          : "text-foreground/40 hover:text-foreground/70 hover:bg-white/5",
      )}
    >
      {children}
      {liveCount !== undefined && liveCount > 0 ? (
        <span className="min-w-[18px] h-[18px] rounded-full text-[10px] font-bold flex items-center justify-center px-1 bg-green-500/20 text-green-400 border border-green-500/30">
          {liveCount}
        </span>
      ) : count !== undefined && count > 0 ? (
        <span className={cn(
          "min-w-[18px] h-[18px] rounded-full text-[10px] font-bold flex items-center justify-center px-1",
          active ? "bg-primary/20 text-primary" : "bg-white/8 text-foreground/40",
        )}>
          {count}
        </span>
      ) : null}
    </button>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-6">
      {/* Live placeholder */}
      <div className="space-y-3">
        <div className="h-3 w-24 rounded bg-white/6 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[0, 1].map((i) => (
            <div key={i} className="h-40 rounded-2xl bg-card animate-pulse border border-border/30" />
          ))}
        </div>
      </div>
      {/* Row placeholders */}
      <div className="space-y-2">
        <div className="h-3 w-16 rounded bg-white/6 animate-pulse" />
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="h-14 rounded-xl bg-card animate-pulse border border-border/20"
            style={{ opacity: 1 - i * 0.14 }}
          />
        ))}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ScoresPage() {
  const [games,       setGames]       = useState<LiveGame[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [source,      setSource]      = useState<"ncaa" | "fallback" | null>(null);
  const [sportFilter, setSportFilter] = useState("All");
  const [activeTab,   setActiveTab]   = useState<Tab>("all");
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

  // Ticker uses ALL live games — unfiltered, maximum info density
  const allLiveGames  = useMemo(() => games.filter((g) => g.status === "live"), [games]);
  const hasLiveTicker = allLiveGames.length > 0;

  const availableSports = useMemo(
    () => ["All", ...Array.from(new Set(games.map((g) => g.sport))).sort()],
    [games],
  );

  // Sport-filtered views
  const filtered      = sportFilter === "All" ? games : games.filter((g) => g.sport === sportFilter);
  const liveGames     = filtered.filter((g) => g.status === "live");
  const upcomingGames = filtered.filter((g) => g.status === "upcoming");
  const pastGames     = filtered.filter((g) => g.status === "final");

  const upcomingByDate = useMemo(() => groupByDate(upcomingGames), [upcomingGames]);
  const pastByDate     = useMemo(() => groupByDate(pastGames),     [pastGames]);

  const hasAnyGames   = liveGames.length > 0 || upcomingGames.length > 0 || pastGames.length > 0;

  const showLive     = activeTab === "all" || activeTab === "live";
  const showUpcoming = activeTab === "all" || activeTab === "upcoming";
  const showResults  = activeTab === "all" || activeTab === "results";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Full-width live ticker — fixed below navbar */}
      <LiveTicker games={allLiveGames} />

      <main className={cn(
        "max-w-3xl mx-auto px-4 pb-16 space-y-6 transition-[padding] duration-300",
        hasLiveTicker ? "pt-[124px]" : "pt-24",
      )}>

        {/* ── Page header ───────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Radio className="w-4 h-4 text-primary shrink-0" />
            <h1 className="text-xl font-bold tracking-tight">NCAA Scores</h1>
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
              <span className="text-[11px] font-semibold text-foreground/38">
                {source === "ncaa" ? "NCAA Live" : "Simulated"}
              </span>
            </div>
            <button
              onClick={() => fetchGames(true)}
              className="p-1.5 rounded-lg hover:bg-white/6 text-foreground/38 hover:text-foreground transition-colors"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin")} />
            </button>
          </div>
        </div>

        {/* ── Tab navigation ────────────────────────────────────────── */}
        <div className="flex items-center gap-1 border-b border-white/7 pb-0 overflow-x-auto no-scrollbar">
          <TabBtn
            active={activeTab === "all"}
            onClick={() => setActiveTab("all")}
            count={filtered.length}
          >
            All
          </TabBtn>
          <TabBtn
            active={activeTab === "live"}
            onClick={() => setActiveTab("live")}
            liveCount={liveGames.length}
          >
            Live
          </TabBtn>
          <TabBtn
            active={activeTab === "upcoming"}
            onClick={() => setActiveTab("upcoming")}
            count={upcomingGames.length}
          >
            Upcoming
          </TabBtn>
          <TabBtn
            active={activeTab === "results"}
            onClick={() => setActiveTab("results")}
            count={pastGames.length}
          >
            Results
          </TabBtn>
        </div>

        {/* ── Sport filter pills ────────────────────────────────────── */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
          {availableSports.map((s) => (
            <button
              key={s}
              onClick={() => setSportFilter(s)}
              className={cn(
                "h-7 px-2.5 rounded-lg text-xs font-semibold shrink-0 transition-all flex items-center gap-1.5",
                sportFilter === s
                  ? "bg-primary/15 text-primary border border-primary/30"
                  : "text-foreground/42 hover:text-foreground/80 border border-white/8 hover:border-white/14 hover:bg-white/5",
              )}
            >
              {SPORT_ICONS[s] && (
                <span className="text-sm leading-none">{SPORT_ICONS[s]}</span>
              )}
              {s}
            </button>
          ))}
        </div>

        {/* ── Content ───────────────────────────────────────────────── */}
        {loading ? (
          <Skeleton />
        ) : (
          <div className="space-y-8">

            {/* Live Now */}
            {showLive && liveGames.length > 0 && (
              <section className="space-y-3">
                <SectionHeader label="Live Now" count={liveGames.length} type="live" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {liveGames.map((g, i) => (
                    <LiveCard key={g.id} game={g} index={i} />
                  ))}
                </div>
              </section>
            )}

            {/* Upcoming — grouped by date */}
            {showUpcoming && upcomingByDate.size > 0 && (
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

            {/* Results — grouped by date, most recent first */}
            {showResults && pastByDate.size > 0 && (
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

            {/* Empty state */}
            {!hasAnyGames && (
              <div className="py-24 text-center space-y-3">
                <Trophy className="w-8 h-8 mx-auto text-foreground/15" />
                <p className="text-sm text-foreground/35">
                  No games for {sportFilter === "All" ? "any sport" : sportFilter}.
                </p>
              </div>
            )}

            {/* Tab-specific empty state */}
            {hasAnyGames && (
              <>
                {showLive && !liveGames.length && activeTab === "live" && (
                  <div className="py-16 text-center space-y-2">
                    <div className="w-8 h-8 mx-auto rounded-full border-2 border-foreground/10 flex items-center justify-center">
                      <span className="text-foreground/20 text-sm">–</span>
                    </div>
                    <p className="text-sm text-foreground/30">No live games right now.</p>
                  </div>
                )}
                {showUpcoming && !upcomingGames.length && activeTab === "upcoming" && (
                  <div className="py-16 text-center space-y-2">
                    <Clock className="w-8 h-8 mx-auto text-foreground/12" />
                    <p className="text-sm text-foreground/30">No upcoming games scheduled.</p>
                  </div>
                )}
                {showResults && !pastGames.length && activeTab === "results" && (
                  <div className="py-16 text-center space-y-2">
                    <CheckCircle className="w-8 h-8 mx-auto text-foreground/12" />
                    <p className="text-sm text-foreground/30">No results yet.</p>
                  </div>
                )}
              </>
            )}

          </div>
        )}

      </main>
    </div>
  );
}
