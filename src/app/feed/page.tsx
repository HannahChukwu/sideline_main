"use client";

import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Heart, Eye, Activity, Zap,
  MessageSquare, ExternalLink, Sparkles,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { useAppStore } from "@/lib/store";
import type { DesignerUpdate, StoreAsset } from "@/lib/store";
import { cn } from "@/lib/utils";
import { useEngagement } from "@/lib/hooks/useEngagement";

const SPORTS_FILTER = [
  "All",
  "Basketball",
  "Soccer",
  "Track & Field",
  "Swimming",
  "Baseball",
  "Volleyball",
  "Squash",
  "Tennis",
  "Football",
];

/* ─── Intersection-observer hook — triggers fade-up when element scrolls in ── */
function useInView(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return { ref, visible };
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}


/* ─── Asset Card with scroll-triggered animation & heart pop ─────────────────── */
function FeedAssetCard({
  asset, liked, likeCount, viewCount, onLike, index,
}: {
  asset: StoreAsset;
  liked: boolean;
  likeCount: number;
  viewCount: number;
  onLike: (id: string) => void | Promise<void>;
  index: number;
}) {
  const { ref, visible } = useInView();
  const [popped, setPopped] = useState(false);
  const commentCount = asset.updates?.length ?? 0;

  function handleLike() {
    void onLike(asset.id);
    setPopped(true);
    setTimeout(() => setPopped(false), 400);
  }

  return (
    <div
      ref={ref}
      style={{ animationDelay: `${index * 75}ms`, animationFillMode: "both" }}
      className={cn(visible ? "animate-fade-up" : "opacity-0")}
    >
      <Link href={`/asset/${asset.id}`}>
        <div className="group relative rounded-2xl overflow-hidden border border-border/50 bg-card transition-all duration-300 hover:border-border hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-black/50 sport-border-top">
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
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

            {/* Score overlay */}
            {asset.type === "final-score" && asset.homeScore !== undefined ? (
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <div className="text-[10px] text-white/40 uppercase tracking-widest mb-1">{asset.sport} · Final</div>
                <div className="flex items-baseline gap-4">
                  <div className="text-center">
                    <div className="text-[10px] text-white/50">{asset.homeTeam}</div>
                    <div className="text-4xl font-black text-white tabular-nums">{asset.homeScore}</div>
                  </div>
                  <div className="text-white/25 text-xl mb-2">—</div>
                  <div className="text-center">
                    <div className="text-[10px] text-white/50">{asset.awayTeam}</div>
                    <div className="text-4xl font-black text-white/60 tabular-nums">{asset.awayScore}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <div className="text-[10px] text-white/40 uppercase tracking-widest mb-1">{asset.sport}</div>
                <div className="text-sm font-semibold text-white leading-snug">{asset.title}</div>
              </div>
            )}

            {/* Updates badge */}
            {(asset.updates?.length ?? 0) > 0 && (
              <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/20 border border-green-500/30 text-[10px] font-bold text-green-400">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                {asset.updates.length} update{asset.updates.length !== 1 ? "s" : ""}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center ring-1 ring-primary/10">
                <span className="text-[9px] font-bold text-primary">{asset.designerName[0]?.toUpperCase()}</span>
              </div>
              <span className="text-xs text-muted-foreground">{asset.designerName}</span>
              <span className="text-muted-foreground/30 text-xs">·</span>
              <span className="text-xs text-muted-foreground">
                {new Date(asset.eventDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="flex items-center gap-1 text-[11px] text-muted-foreground/70"
                title={`${viewCount} view${viewCount === 1 ? "" : "s"}`}
              >
                <Eye className="w-3 h-3" />
                <span className="tabular-nums">{viewCount}</span>
              </div>
              <div
                className="flex items-center gap-1 text-[11px] text-muted-foreground/70"
                title={`${commentCount} comment${commentCount === 1 ? "" : "s"}`}
              >
                <MessageSquare className="w-3 h-3" />
                <span className="tabular-nums">{commentCount}</span>
              </div>
              <button
                onClick={(e) => { e.preventDefault(); handleLike(); }}
                className={cn(
                  "flex items-center gap-1.5 text-xs transition-colors px-2 py-1 rounded-lg",
                  liked ? "text-red-400 bg-red-500/10" : "text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                )}
              >
                <Heart className={cn(
                  "w-3.5 h-3.5 transition-all",
                  liked && "fill-red-400",
                  popped && "animate-heart-pop"
                )} />
                <span className="tabular-nums">{likeCount}</span>
              </button>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}

/* ─── Single tweet card ──────────────────────────────────────────────────────── */
interface TweetEntry extends DesignerUpdate {
  assetId: string;
  assetTitle: string;
  assetImageUrl: string;
  sport: string;
}

function TweetCard({ tweet, index, isNew }: { tweet: TweetEntry; index: number; isNew: boolean }) {
  const { ref, visible } = useInView(0.05);

  return (
    <div
      ref={ref}
      style={{ animationDelay: `${index * 55}ms`, animationFillMode: "both" }}
      className={cn(visible ? "animate-slide-in-right" : "opacity-0")}
    >
      <Link href={`/asset/${tweet.assetId}`} className="block group">
        <div className={cn(
          "relative rounded-xl border bg-card p-4 transition-all duration-200 hover:border-border hover:bg-card/80",
          isNew ? "border-primary/25 bg-primary/[0.03]" : "border-border/40",
        )}>

          {/* New badge */}
          {isNew && (
            <div className="absolute -top-2 right-3 animate-new-badge">
              <span className="px-2 py-0.5 rounded-full bg-primary/20 border border-primary/30 text-[9px] font-bold text-primary uppercase tracking-wider">
                New
              </span>
            </div>
          )}

          <div className="flex items-start gap-3">
            {/* Avatar */}
            <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-primary">
                {tweet.designerName.charAt(0).toUpperCase()}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              {/* Name + time */}
              <div className="flex items-baseline justify-between gap-2 mb-1">
                <span className="text-xs font-bold text-foreground truncate">{tweet.designerName}</span>
                <span className="text-[10px] text-muted-foreground/50 shrink-0">{timeAgo(tweet.timestamp)}</span>
              </div>

              {/* Tweet text */}
              <p className="text-sm text-foreground/85 leading-relaxed mb-3">{tweet.text}</p>

              {/* Asset reference chip */}
              <div className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.03] border border-white/[0.06] group-hover:border-white/10 transition-colors">
                <div className="relative w-8 h-8 rounded-md overflow-hidden bg-muted shrink-0">
                  <Image
                    src={tweet.assetImageUrl}
                    alt={tweet.assetTitle}
                    fill
                    className="object-cover"
                    sizes="32px"
                    unoptimized
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold text-foreground/70 truncate leading-tight">{tweet.assetTitle}</p>
                  <p className="text-[10px] text-muted-foreground/50">{tweet.sport}</p>
                </div>
                <ExternalLink className="w-3 h-3 text-muted-foreground/30 shrink-0 group-hover:text-muted-foreground/60 transition-colors" />
              </div>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}

/* ─── Tweet Feed panel — grouped by sport → event ───────────────────────────── */
function TweetFeed({ assets }: { assets: StoreAsset[] }) {
  const [seenCount, setSeenCount] = useState(0);
  const [openSports, setOpenSports]   = useState<Set<string>>(new Set());
  const [openEvents, setOpenEvents]   = useState<Set<string>>(new Set());

  // Build grouped structure: sport → asset → updates
  const assetsWithUpdates = assets.filter((a) => (a.updates?.length ?? 0) > 0);

  // Total updates count for "new" tracking
  const allTweets: TweetEntry[] = assetsWithUpdates
    .flatMap((a) =>
      (a.updates ?? []).map((u) => ({
        ...u,
        assetId: a.id,
        assetTitle: a.title,
        assetImageUrl: a.imageUrl,
        sport: a.sport,
      }))
    )
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const newCount = allTweets.length - seenCount;

  // Group by sport
  const bySport = assetsWithUpdates.reduce<Record<string, StoreAsset[]>>((acc, a) => {
    const key = a.sport || "Other";
    (acc[key] ??= []).push(a);
    return acc;
  }, {});
  const sports = Object.keys(bySport).sort();

  // Auto-expand all sports/events on first render
  useEffect(() => {
    setOpenSports(new Set(sports));
    setOpenEvents(new Set(assetsWithUpdates.map((a) => a.id)));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assets.length]);

  function toggleSport(sport: string) {
    setOpenSports((prev) => {
      const next = new Set(prev);
      next.has(sport) ? next.delete(sport) : next.add(sport);
      return next;
    });
  }

  function toggleEvent(id: string) {
    setOpenEvents((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Panel header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-primary" />
          <span className="text-sm font-bold text-foreground">Designer Updates</span>
        </div>
        {newCount > 0 && seenCount > 0 && (
          <button
            onClick={() => setSeenCount(allTweets.length)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-[11px] font-bold text-primary animate-new-badge hover:bg-primary/20 transition-colors"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            {newCount} new
          </button>
        )}
      </div>

      {assetsWithUpdates.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 py-12 text-center">
          <Sparkles className="w-6 h-6 text-muted-foreground/25" />
          <p className="text-sm text-muted-foreground/40 max-w-[180px] leading-relaxed">
            Designers will post live updates here during events.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {sports.map((sport) => {
            const sportAssets = bySport[sport];
            const sportOpen   = openSports.has(sport);
            const sportTotal  = sportAssets.reduce((n, a) => n + a.updates.length, 0);

            return (
              <div key={sport}>
                {/* ── Sport header ── */}
                <button
                  onClick={() => toggleSport(sport)}
                  className="w-full flex items-center gap-2 mb-3 group"
                >
                  <span className="text-xs font-bold text-primary uppercase tracking-widest">{sport}</span>
                  <span className="text-[10px] text-muted-foreground/40 font-medium">{sportTotal} update{sportTotal !== 1 ? "s" : ""}</span>
                  <div className="flex-1 h-px bg-border/50 mx-1" />
                  <span className={cn("text-muted-foreground/40 text-xs transition-transform duration-200", !sportOpen && "-rotate-90")}>▾</span>
                </button>

                {sportOpen && (
                  <div className="flex flex-col gap-4 pl-3 border-l border-border/40">
                    {sportAssets.map((asset) => {
                      const eventOpen = openEvents.has(asset.id);
                      const updates   = [...asset.updates].sort(
                        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
                      );
                      const matchup = asset.homeTeam && asset.awayTeam
                        ? `${asset.homeTeam} vs ${asset.awayTeam}`
                        : null;
                      const date = new Date(asset.eventDate).toLocaleDateString("en-US", { month: "short", day: "numeric" });

                      return (
                        <div key={asset.id}>
                          {/* ── Event header ── */}
                          <button
                            onClick={() => toggleEvent(asset.id)}
                            className="w-full flex items-start gap-2 mb-2 text-left group"
                          >
                            <div className="relative w-8 h-8 rounded-md overflow-hidden bg-muted shrink-0 mt-0.5">
                              <Image src={asset.imageUrl} alt={asset.title} fill className="object-cover" sizes="32px" unoptimized />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-foreground truncate leading-tight">{asset.title}</p>
                              <p className="text-[10px] text-muted-foreground/50">
                                {matchup ? `${matchup} · ` : ""}{date}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[10px] text-muted-foreground/40">{updates.length}</span>
                              <span className={cn("text-muted-foreground/40 text-xs transition-transform duration-200", !eventOpen && "-rotate-90")}>▾</span>
                            </div>
                          </button>

                          {eventOpen && (
                            <div className="flex flex-col gap-2 pl-10">
                              {updates.map((u, i) => {
                                const tweet: TweetEntry = {
                                  ...u,
                                  assetId: asset.id,
                                  assetTitle: asset.title,
                                  assetImageUrl: asset.imageUrl,
                                  sport: asset.sport,
                                };
                                return (
                                  <TweetCard
                                    key={u.id}
                                    tweet={tweet}
                                    index={i}
                                    isNew={false}
                                  />
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────────── */
export default function FanFeed() {
  const [sportFilter, setSportFilter] = useState("All");
  const [activeTab, setActiveTab]     = useState<"posters" | "updates">("posters");
  const [mounted, setMounted]         = useState(false);

  const assets = useAppStore((s) => s.assets);

  useEffect(() => { setMounted(true); }, []);

  const published = useMemo(
    () => (mounted ? assets.filter((a) => a.status === "published") : []),
    [mounted, assets]
  );
  const filtered  = sportFilter === "All" ? published : published.filter((a) => a.sport === sportFilter);

  // Live engagement (likes/views) keyed by asset id, shared across all profiles via Supabase.
  const engagementKeys = useMemo(() => published.map((a) => a.id), [published]);
  const engagement = useEngagement(engagementKeys);

  // Featured = most-liked using live counts (falls back to seed likes).
  const featured = [...published].sort((a, b) => {
    const la = engagement.get(a.id).like_count || a.likes;
    const lb = engagement.get(b.id).like_count || b.likes;
    return lb - la;
  })[0];

  const totalUpdates = published.reduce((n, a) => n + (a.updates?.length ?? 0), 0);

  return (
    <div className="min-h-screen bg-background">
      <Navbar role="student" />

      <main className="pt-20 pb-16 max-w-7xl mx-auto">

        {/* ── Header ────────────────────────────────────────────── */}
        <div className="px-6 pt-8 mb-6 animate-fade-in">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Falcons Athletics</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-1">Team Feed</h1>
          <p className="text-sm text-muted-foreground">Game scores, event graphics, and designer updates from the scene.</p>
        </div>

        <div className="px-6">

          {/* ── Featured ──────────────────────────────────────── */}
          {mounted && featured && sportFilter === "All" && (
            <div className="mb-8 animate-fade-up" style={{ animationFillMode: "both" }}>
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-bold text-primary uppercase tracking-wider">Featured</span>
              </div>
              <Link href={`/asset/${featured.id}`}>
                <div className="group relative rounded-2xl overflow-hidden border border-primary/20 bg-card hover:border-primary/40 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/10">
                  <div className="relative h-60 md:h-80 overflow-hidden">
                    <Image
                      src={featured.imageUrl}
                      alt={featured.title}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                      sizes="100vw"
                      unoptimized
                      priority
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/40 to-transparent" />
                    <div className="absolute inset-0 p-8 flex flex-col justify-end">
                      <div className="text-xs text-primary uppercase tracking-widest mb-2 font-medium">{featured.sport}</div>
                      <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">{featured.title}</h2>
                      {featured.type === "final-score" && featured.homeScore !== undefined && (
                        <div className="flex items-baseline gap-6 mb-4">
                          <div>
                            <div className="text-[10px] text-white/40 uppercase mb-1">{featured.homeTeam}</div>
                            <div className="text-5xl font-black text-white tabular-nums">{featured.homeScore}</div>
                          </div>
                          <div className="text-white/25 text-2xl mb-3">—</div>
                          <div>
                            <div className="text-[10px] text-white/40 uppercase mb-1">{featured.awayTeam}</div>
                            <div className="text-5xl font-black text-white/60 tabular-nums">{featured.awayScore}</div>
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-3">
                        <button
                          onClick={(e) => { e.preventDefault(); void engagement.toggleLike(featured.id); }}
                          className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all",
                            engagement.get(featured.id).liked_by_me
                              ? "bg-red-500/20 text-red-400 border border-red-500/30"
                              : "bg-white/10 text-white hover:bg-white/20 border border-white/10"
                          )}
                        >
                          <Heart className={cn("w-4 h-4", engagement.get(featured.id).liked_by_me && "fill-red-400")} />
                          {engagement.get(featured.id).like_count}
                        </button>
                        <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 border border-white/10 text-xs font-semibold text-white/70">
                          <Eye className="w-3.5 h-3.5" />
                          {engagement.get(featured.id).view_count}
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 border border-white/10 text-xs font-semibold text-white/70">
                          <MessageSquare className="w-3.5 h-3.5" />
                          {featured.updates?.length ?? 0}
                        </div>
                        {(featured.updates?.length ?? 0) > 0 && (
                          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-500/15 border border-green-500/25 text-xs font-semibold text-green-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                            {featured.updates.length} live update{featured.updates.length !== 1 ? "s" : ""}
                          </div>
                        )}
                        <span className="text-xs text-white/30">by {featured.designerName}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          )}

          {/* ── Tab switcher ──────────────────────────────────── */}
          <div className="flex items-center gap-1 mb-6 border-b border-border/40">
            <button
              onClick={() => setActiveTab("posters")}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-all",
                activeTab === "posters"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Zap className="w-3.5 h-3.5" />
              Posters
              {mounted && published.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-white/8 text-[10px] font-bold">
                  {published.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("updates")}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-all",
                activeTab === "updates"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Designer Updates
              {totalUpdates > 0 && (
                <span className={cn(
                  "px-1.5 py-0.5 rounded-full text-[10px] font-bold",
                  activeTab === "updates" ? "bg-primary/20 text-primary" : "bg-green-500/15 text-green-400"
                )}>
                  {totalUpdates}
                </span>
              )}
            </button>
          </div>

          {/* ── Posters tab ───────────────────────────────────── */}
          {activeTab === "posters" && (
            <>
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

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filtered.map((asset, i) => {
                  const eng = engagement.get(asset.id);
                  return (
                    <FeedAssetCard
                      key={asset.id}
                      asset={asset}
                      liked={eng.liked_by_me}
                      likeCount={eng.like_count}
                      viewCount={eng.view_count}
                      onLike={engagement.toggleLike}
                      index={i}
                    />
                  );
                })}
              </div>

              {mounted && filtered.length === 0 && (
                <div className="flex flex-col items-center justify-center py-24 text-muted-foreground/30 animate-fade-in">
                  <Activity className="w-8 h-8 mb-3" />
                  <p className="text-sm">No {sportFilter === "All" ? "" : sportFilter + " "}posters published yet.</p>
                </div>
              )}
            </>
          )}

          {/* ── Designer Updates tab ──────────────────────────── */}
          {activeTab === "updates" && (
            <div className="max-w-3xl">
              <TweetFeed assets={published} />
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
