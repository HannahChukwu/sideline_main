"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Heart, Activity, Zap } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { createClient } from "@/lib/supabase/client";
import { getPublishedAssets, likeAsset, unlikeAsset, type PublishedAsset } from "@/lib/supabase/assets";
import { cn } from "@/lib/utils";

const SPORTS_FILTER = ["All", "Basketball", "Soccer", "Track & Field", "Swimming", "Baseball", "Volleyball"];

type FeedAssetModel = {
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

function toFeedModel(row: PublishedAsset): FeedAssetModel {
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    sport: row.sport,
    homeTeam: row.home_team,
    awayTeam: row.away_team,
    homeScore: row.home_score ?? undefined,
    awayScore: row.away_score ?? undefined,
    eventDate: row.event_date,
    imageUrl: row.image_url ?? "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&q=80",
    likes: row.like_count,
    designerName: row.designer_name ?? "Designer",
  };
}

function ScoreTicker({ assets }: { assets: FeedAssetModel[] }) {
  const scores = assets.filter((a) => a.type === "final-score" && a.homeScore !== undefined);
  if (scores.length === 0) return null;

  return (
    <div className="overflow-hidden border-y border-border/50 bg-card/50 py-3 mb-8">
      <div className="flex items-center gap-8 animate-[ticker_20s_linear_infinite] whitespace-nowrap" style={{
        animation: "none",
        display: "flex",
        gap: "3rem",
        overflow: "hidden",
      }}>
        {[...scores, ...scores].map((a, i) => (
          <div key={`${a.id}-${i}`} className="flex items-center gap-3 shrink-0">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">{a.sport}</span>
            <span className="text-sm font-semibold text-foreground">{a.homeTeam}</span>
            <span className="text-lg font-bold text-primary tabular-nums">{a.homeScore}</span>
            <span className="text-muted-foreground/30">—</span>
            <span className="text-lg font-bold text-muted-foreground tabular-nums">{a.awayScore}</span>
            <span className="text-sm font-semibold text-muted-foreground">{a.awayTeam}</span>
            <span className="w-1 h-1 rounded-full bg-border shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

function FanAssetCard({ asset, liked, onLike }: { asset: FeedAssetModel; liked: boolean; onLike: (id: string) => void }) {
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
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

        {/* Score overlay */}
        {asset.type === "final-score" && asset.homeScore !== undefined && (
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <div className="flex items-end justify-between">
              <div>
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
            <span className="text-[9px] font-bold text-primary">{asset.designerName[0]}</span>
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

export default function FanFeed() {
  const [sportFilter, setSportFilter] = useState("All");
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [assets, setAssets] = useState<FeedAssetModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const rows = await getPublishedAssets(supabase, { limit: 200 });
        if (cancelled) return;
        const models = rows.map(toFeedModel);
        setAssets(models);
        setLiked(new Set(rows.filter((r) => r.liked_by_me).map((r) => r.id)));
        setLikeCounts(Object.fromEntries(rows.map((r) => [r.id, r.like_count])));
      } catch (e: unknown) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load feed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  function handleLike(id: string) {
    setLiked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        setLikeCounts((c) => ({ ...c, [id]: (c[id] ?? 0) - 1 }));
        unlikeAsset(supabase, id).catch(() => {
          setLiked((p) => new Set(p).add(id));
          setLikeCounts((c) => ({ ...c, [id]: (c[id] ?? 0) + 1 }));
        });
      } else {
        next.add(id);
        setLikeCounts((c) => ({ ...c, [id]: (c[id] ?? 0) + 1 }));
        likeAsset(supabase, id).catch(() => {
          setLiked((p) => {
            const r = new Set(p);
            r.delete(id);
            return r;
          });
          setLikeCounts((c) => ({ ...c, [id]: Math.max(0, (c[id] ?? 0) - 1) }));
        });
      }
      return next;
    });
  }

  const filtered = sportFilter === "All" ? assets : assets.filter((a) => a.sport === sportFilter);

  const assetsWithUpdatedLikes = filtered.map((a) => ({
    ...a,
    likes: likeCounts[a.id] ?? a.likes,
  }));

  // Featured: most liked
  const featured = [...assets].sort((a, b) => (likeCounts[b.id] ?? b.likes) - (likeCounts[a.id] ?? a.likes))[0];

  return (
    <div className="min-h-screen bg-background">
      <Navbar role="fan" />

      <main className="pt-20 pb-16 max-w-7xl mx-auto">
        {/* Hero section */}
        <div className="px-6 pt-8 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Live</span>
            <Activity className="w-3.5 h-3.5 text-green-400" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-1">Falcons Athletics</h1>
          <p className="text-sm text-muted-foreground">Game scores, event graphics, and team updates.</p>
        </div>

        {/* Score ticker */}
        <ScoreTicker assets={assets} />

        <div className="px-6">
          {error && (
            <div className="mb-8 px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Featured */}
          {featured && sportFilter === "All" && (
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
                        onClick={() => handleLike(featured.id)}
                        className={cn(
                          "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all",
                          liked.has(featured.id)
                            ? "bg-red-500/20 text-red-400 border border-red-500/30"
                            : "bg-white/10 text-white hover:bg-white/20 border border-white/10"
                        )}
                      >
                        <Heart className={cn("w-4 h-4", liked.has(featured.id) && "fill-red-400")} />
                        {likeCounts[featured.id] ?? featured.likes} likes
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

          {/* Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {(!loading ? assetsWithUpdatedLikes : []).map((asset, i) => (
              <div
                key={asset.id}
                className="animate-fade-up"
                style={{ animationDelay: `${i * 60}ms`, animationFillMode: "both" }}
              >
                <FanAssetCard
                  asset={asset}
                  liked={liked.has(asset.id)}
                  onLike={handleLike}
                />
              </div>
            ))}
          </div>

          {!loading && assetsWithUpdatedLikes.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-muted-foreground/40">
              <Activity className="w-8 h-8 mb-3" />
              <p className="text-sm">No {sportFilter} assets yet.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
