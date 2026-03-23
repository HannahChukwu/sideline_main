"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Heart, Activity, Zap, Radio, Clock, CheckCircle } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { LiveGame } from "@/app/api/live-scores/route";

const SPORTS_FILTER = ["All", "Basketball", "Soccer", "Track & Field", "Swimming", "Baseball", "Volleyball"];

// ─── Live Game Card ────────────────────────────────────────────────────────────

function LiveGameCard({ game }: { game: LiveGame }) {
  const isLive     = game.status === "live";
  const isFinal    = game.status === "final";
  const isUpcoming = game.status === "upcoming";

  return (
    <div className={cn(
      "rounded-xl border bg-card p-4 transition-all",
      isLive   && "border-green-500/30 bg-green-500/5",
      isFinal  && "border-border/50",
      isUpcoming && "border-border/30 opacity-80",
    )}>
      {/* Status badge */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {game.sport}
        </span>
        {isLive && (
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="live-dot absolute inline-flex h-full w-full rounded-full bg-green-400" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-400" />
            </span>
            <span className="text-[10px] font-bold text-green-400 uppercase tracking-wider">Live</span>
          </div>
        )}
        {isFinal && (
          <div className="flex items-center gap-1">
            <CheckCircle className="w-3 h-3 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground font-medium">Final</span>
          </div>
        )}
        {isUpcoming && (
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-blue-400" />
            <span className="text-[10px] text-blue-400 font-medium">{game.startTime}</span>
          </div>
        )}
      </div>

      {/* Teams & scores */}
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-semibold text-foreground">{game.homeTeam}</span>
            {!isUpcoming && (
              <span className={cn(
                "text-xl font-black tabular-nums",
                isLive ? "text-foreground" : "text-foreground/80"
              )}>
                {game.homeScore}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{game.awayTeam}</span>
            {!isUpcoming && (
              <span className="text-xl font-black tabular-nums text-muted-foreground">
                {game.awayScore}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Period / clock */}
      {isLive && (
        <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{game.period}</span>
          {game.clock && (
            <span className="text-xs font-mono text-green-400">{game.clock}</span>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Score Ticker ──────────────────────────────────────────────────────────────

function ScoreTicker({ games }: { games: LiveGame[] }) {
  const scoreGames = games.filter((g) => g.status !== "upcoming");
  if (scoreGames.length === 0) return null;

  const items = [...scoreGames, ...scoreGames]; // duplicate for seamless loop

  return (
    <div className="overflow-hidden border-y border-border/50 bg-card/50 py-3 mb-8">
      <div className="flex animate-ticker whitespace-nowrap">
        {items.map((g, i) => (
          <div key={`${g.id}-${i}`} className="flex items-center gap-3 shrink-0 px-6">
            {g.status === "live" && (
              <span className="relative flex h-1.5 w-1.5 shrink-0">
                <span className="live-dot absolute inline-flex h-full w-full rounded-full bg-green-400" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-400" />
              </span>
            )}
            <span className="text-xs text-muted-foreground uppercase tracking-wider">{g.sport}</span>
            <span className="text-sm font-semibold text-foreground">{g.homeTeam}</span>
            <span className="text-lg font-bold text-primary tabular-nums">{g.homeScore}</span>
            <span className="text-muted-foreground/30">—</span>
            <span className="text-lg font-bold text-muted-foreground tabular-nums">{g.awayScore}</span>
            <span className="text-sm font-semibold text-muted-foreground">{g.awayTeam}</span>
            {g.status === "live" && g.clock && (
              <span className="text-[10px] font-mono text-green-400">{g.period} {g.clock}</span>
            )}
            {g.status === "final" && (
              <span className="text-[10px] text-muted-foreground/60">Final</span>
            )}
            <span className="w-1 h-1 rounded-full bg-border shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Fan Asset Card ────────────────────────────────────────────────────────────

type FeedAsset = {
  id: string;
  title: string;
  type: "gameday" | "final-score" | "poster" | "highlight";
  sport: string;
  homeTeam: string;
  awayTeam: string;
  homeScore?: number;
  awayScore?: number;
  eventDate: string;
  imageUrl: string;
  likes: number;
  designerName: string;
};

function FanAssetCard({
  asset,
  liked,
  onLike,
}: {
  asset: FeedAsset;
  liked: boolean;
  onLike: (id: string) => void;
}) {
  return (
    <div className="group relative rounded-2xl overflow-hidden border border-border/50 bg-card hover:border-border transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-black/50">
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <Image
          src={asset.imageUrl}
          alt={asset.title}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          unoptimized
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

        {/* Score overlay */}
        {asset.type === "final-score" && asset.homeScore !== undefined && (
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <div className="text-[10px] text-white/50 uppercase tracking-widest mb-1">{asset.sport} · Final</div>
            <div className="flex items-baseline gap-4">
              <div className="text-center">
                <div className="text-[10px] text-white/60">{asset.homeTeam}</div>
                <div className="text-4xl font-black text-white tabular-nums">{asset.homeScore}</div>
              </div>
              <div className="text-white/30 text-xl mb-2">—</div>
              <div className="text-center">
                <div className="text-[10px] text-white/60">{asset.awayTeam}</div>
                <div className="text-4xl font-black text-white/60 tabular-nums">{asset.awayScore}</div>
              </div>
            </div>
          </div>
        )}

        {/* Non-score overlay */}
        {asset.type !== "final-score" && (
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <div className="text-[10px] text-white/50 uppercase tracking-widest mb-1">{asset.sport}</div>
            <div className="text-sm font-semibold text-white leading-snug">{asset.title}</div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-[9px] font-bold text-primary">{asset.designerName[0]?.toUpperCase()}</span>
          </div>
          <span className="text-xs text-muted-foreground">{asset.designerName}</span>
          <span className="text-muted-foreground/30">·</span>
          <span className="text-xs text-muted-foreground">
            {new Date(asset.eventDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
        </div>

        <button
          onClick={() => onLike(asset.id)}
          className={cn(
            "flex items-center gap-1.5 text-xs transition-all px-2 py-1 rounded-lg",
            liked
              ? "text-red-400 bg-red-500/10"
              : "text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
          )}
        >
          <Heart className={cn("w-3.5 h-3.5 transition-all", liked && "fill-red-400 scale-110")} />
          <span className="tabular-nums">{asset.likes}</span>
        </button>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function FanFeed() {
  const [sportFilter, setSportFilter] = useState("All");
  const [mounted, setMounted]         = useState(false);
  const [liveGames, setLiveGames]     = useState<LiveGame[]>([]);

  const assets     = useAppStore((s) => s.assets);
  const toggleLike = useAppStore((s) => s.toggleLike);
  const isLiked    = useAppStore((s) => s.isLiked);

  // Defer store reads to client (SSR safety)
  useEffect(() => { setMounted(true); }, []);

  // Poll live scores every 30 s
  useEffect(() => {
    async function fetchScores() {
      try {
        const res  = await fetch("/api/live-scores");
        const data = await res.json() as { games: LiveGame[] };
        setLiveGames(data.games);
      } catch {
        // silently ignore network errors
      }
    }
    fetchScores();
    const id = setInterval(fetchScores, 30_000);
    return () => clearInterval(id);
  }, []);

  const published = mounted
    ? assets.filter((a) => a.status === "published")
    : [];

  const filtered = sportFilter === "All"
    ? published
    : published.filter((a) => a.sport === sportFilter);

  // Featured: most liked published asset
  const featured = [...published].sort((a, b) => b.likes - a.likes)[0];

  const liveCount = liveGames.filter((g) => g.status === "live").length;

  return (
    <div className="min-h-screen bg-background">
      <Navbar role="student" />

      <main className="pt-20 pb-16 max-w-7xl mx-auto">
        {/* Header */}
        <div className="px-6 pt-8 mb-6">
          <div className="flex items-center gap-2 mb-3">
            {liveCount > 0 ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="live-dot absolute inline-flex h-full w-full rounded-full bg-green-400" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-green-400" />
                </span>
                <span className="text-xs text-green-400 font-semibold uppercase tracking-wider">
                  {liveCount} game{liveCount > 1 ? "s" : ""} live
                </span>
                <Radio className="w-3.5 h-3.5 text-green-400" />
              </>
            ) : (
              <>
                <Activity className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Falcons Athletics</span>
              </>
            )}
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-1">Team Feed</h1>
          <p className="text-sm text-muted-foreground">Game scores, event graphics, and team updates.</p>
        </div>

        {/* Score ticker (from live API) */}
        <ScoreTicker games={liveGames} />

        <div className="px-6">
          {/* Live scores grid */}
          {liveGames.length > 0 && (
            <div className="mb-10">
              <div className="flex items-center gap-2 mb-4">
                <Radio className="w-3.5 h-3.5 text-green-400" />
                <span className="text-xs font-semibold text-green-400 uppercase tracking-wider">Scores</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {liveGames.map((game) => (
                  <LiveGameCard key={game.id} game={game} />
                ))}
              </div>
            </div>
          )}

          {/* Featured asset */}
          {mounted && featured && sportFilter === "All" && (
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-semibold text-primary uppercase tracking-wider">Featured</span>
              </div>
              <div className="group relative rounded-2xl overflow-hidden border border-primary/20 bg-card hover:border-primary/40 transition-all duration-300">
                <div className="relative h-64 md:h-80 overflow-hidden">
                  <Image
                    src={featured.imageUrl}
                    alt={featured.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="100vw"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
                  <div className="absolute inset-0 p-8 flex flex-col justify-end">
                    <div className="text-xs text-primary uppercase tracking-widest mb-2 font-medium">{featured.sport}</div>
                    <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">{featured.title}</h2>
                    {featured.type === "final-score" && featured.homeScore !== undefined && (
                      <div className="flex items-baseline gap-6 mb-4">
                        <div>
                          <div className="text-[10px] text-white/50 uppercase mb-1">{featured.homeTeam}</div>
                          <div className="text-5xl font-black text-white tabular-nums">{featured.homeScore}</div>
                        </div>
                        <div className="text-white/30 text-2xl mb-3">—</div>
                        <div>
                          <div className="text-[10px] text-white/50 uppercase mb-1">{featured.awayTeam}</div>
                          <div className="text-5xl font-black text-white/60 tabular-nums">{featured.awayScore}</div>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => toggleLike(featured.id)}
                        className={cn(
                          "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all",
                          isLiked(featured.id)
                            ? "bg-red-500/20 text-red-400 border border-red-500/30"
                            : "bg-white/10 text-white hover:bg-white/20 border border-white/10"
                        )}
                      >
                        <Heart className={cn("w-4 h-4", isLiked(featured.id) && "fill-red-400")} />
                        {featured.likes} likes
                      </button>
                      <span className="text-xs text-white/40">by {featured.designerName}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sport filter */}
          <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1 no-scrollbar">
            {SPORTS_FILTER.map((s) => (
              <button
                key={s}
                onClick={() => setSportFilter(s)}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-sm font-medium shrink-0 transition-all",
                  sportFilter === s
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "text-muted-foreground hover:text-foreground border border-transparent hover:bg-white/5"
                )}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Asset grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((asset, i) => (
              <div
                key={asset.id}
                className="animate-fade-up"
                style={{ animationDelay: `${i * 60}ms`, animationFillMode: "both" }}
              >
                <FanAssetCard
                  asset={asset}
                  liked={isLiked(asset.id)}
                  onLike={toggleLike}
                />
              </div>
            ))}
          </div>

          {mounted && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-muted-foreground/40">
              <Activity className="w-8 h-8 mb-3" />
              <p className="text-sm">No {sportFilter === "All" ? "" : sportFilter} assets published yet.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
