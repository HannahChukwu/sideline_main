"use client";

import { useMemo, useState, useEffect, useRef, use } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Heart, Eye, Send, Zap, Clock, CheckCircle, Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import { Badge } from "@/components/ui/badge";
import { useEngagement } from "@/lib/hooks/useEngagement";
import { createClient } from "@/lib/supabase/client";
import { recordAssetView } from "@/lib/supabase/engagement";

const typeColors: Record<string, string> = {
  "gameday":     "bg-orange-500/10 text-orange-400 border-orange-500/20",
  "final-score": "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "poster":      "bg-purple-500/10 text-purple-400 border-purple-500/20",
  "highlight":   "bg-green-500/10 text-green-400 border-green-500/20",
};

const typeLabels: Record<string, string> = {
  "gameday":     "Game Day",
  "final-score": "Final Score",
  "poster":      "Poster",
  "highlight":   "Highlight",
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [updateText, setUpdateText] = useState("");
  const [posting, setPosting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const assets          = useAppStore((s) => s.assets);
  const currentDesigner = useAppStore((s) => s.currentDesigner);
  const addUpdate       = useAppStore((s) => s.addUpdate);
  const deleteAsset     = useAppStore((s) => s.deleteAsset);

  useEffect(() => { setMounted(true); }, []);

  // Live shared likes/views (keyed by asset id) across all profiles.
  const engagementKeys = useMemo(() => [id], [id]);
  const engagement = useEngagement(engagementKeys);

  // Record one view per page load for the current user. The RPC bumps a
  // per-(user, asset) counter; total = SUM across users.
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    const supabase = createClient();
    (async () => {
      try {
        await recordAssetView(supabase, id);
        if (!cancelled) await engagement.refresh();
      } catch {
        // non-fatal: view tracking shouldn't block the page
      }
    })();
    return () => {
      cancelled = true;
    };
    // Only fire on first mount per asset id.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const asset = mounted ? assets.find((a) => a.id === id) : null;

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Asset not found.</p>
        <Link href="/" className="text-sm text-primary hover:underline">← Back to home</Link>
      </div>
    );
  }

  const isDesigner    = !!currentDesigner && currentDesigner === asset.designerName;
  const liveEng       = engagement.get(asset.id);
  const liked         = liveEng.liked_by_me;
  const updates       = asset.updates ?? [];

  function handlePost() {
    if (!updateText.trim() || !currentDesigner || !asset) return;
    setPosting(true);
    addUpdate(asset.id, updateText, currentDesigner);
    setUpdateText("");
    setPosting(false);
    textareaRef.current?.focus();
  }

  // Back link — designers go to their dashboard, others go back
  const backHref = isDesigner ? "/designer" : "/feed";
  const backLabel = isDesigner ? "Back to your assets" : "Back to feed";

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-border/50 bg-background/80 backdrop-blur-md px-6 py-4 flex items-center gap-4">
        <Link
          href={backHref}
          className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {backLabel}
        </Link>
        <div className="ml-auto flex items-center gap-3">
          {isDesigner && !confirmDelete && (
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 border border-transparent hover:border-destructive/20 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          )}
          {isDesigner && confirmDelete && (
            <div className="flex items-center gap-2 animate-fade-in">
              <span className="text-xs text-muted-foreground">Delete this asset?</span>
              <button
                onClick={() => { deleteAsset(asset.id); router.push("/designer"); }}
                className="px-3 py-1.5 rounded-lg bg-destructive text-white text-xs font-bold hover:bg-destructive/90 transition-colors"
              >
                Confirm
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-3 py-1.5 rounded-lg bg-muted text-muted-foreground text-xs font-semibold hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
          <div className="flex items-center gap-2 text-muted-foreground/30">
            <Zap className="w-3 h-3 text-primary/50" />
            <span className="text-[10px] font-semibold tracking-widest uppercase">Sideline Studio</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-[1fr_360px] gap-8">

        {/* ── Left: Poster + info ───────────────────────────────────── */}
        <div>
          {/* Poster image */}
          <div className="relative rounded-2xl overflow-hidden border border-border/50 bg-black/40 mb-6 p-2 sm:p-3">
            <div className="relative w-full min-h-[420px] sm:min-h-[560px] lg:min-h-[680px]">
              <Image
                src={asset.imageUrl}
                alt={asset.title}
                fill
                className="object-contain"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 65vw, 760px"
                unoptimized
                priority
              />

              {/* Type badge */}
              <div className="absolute top-4 left-4">
                <Badge className={cn("text-xs font-medium border", typeColors[asset.type])}>
                  {typeLabels[asset.type]}
                </Badge>
              </div>

              {/* Status badge (designer only) */}
              {isDesigner && (
                <div className={cn(
                  "absolute top-4 right-4 flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border",
                  asset.status === "published"
                    ? "bg-green-500/20 text-green-400 border-green-500/20"
                    : "bg-yellow-500/20 text-yellow-400 border-yellow-500/20"
                )}>
                  {asset.status === "published"
                    ? <><CheckCircle className="w-3 h-3" /> Published</>
                    : <><Clock className="w-3 h-3" /> Draft</>
                  }
                </div>
              )}

              {/* Score overlay */}
              {asset.type === "final-score" && asset.homeScore !== undefined && (
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <div className="flex items-baseline gap-4">
                    <div className="text-center">
                      <div className="text-xs text-white/60 uppercase tracking-wider mb-1">{asset.homeTeam}</div>
                      <div className="text-5xl font-bold text-white tabular-nums">{asset.homeScore}</div>
                    </div>
                    <div className="text-white/30 text-2xl font-light mb-1">—</div>
                    <div className="text-center">
                      <div className="text-xs text-white/60 uppercase tracking-wider mb-1">{asset.awayTeam}</div>
                      <div className="text-5xl font-bold text-white/70 tabular-nums">{asset.awayScore}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Asset info */}
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-xl font-bold text-foreground leading-snug mb-1">{asset.title}</h1>
                {asset.tagline && (
                  <p className="text-sm text-muted-foreground">{asset.tagline}</p>
                )}
              </div>
              {/* Like + view counts */}
              <div className="flex items-center gap-2">
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-sm font-semibold text-muted-foreground"
                  title={`${liveEng.view_count} view${liveEng.view_count === 1 ? "" : "s"}`}
                >
                  <Eye className="w-4 h-4" />
                  <span className="tabular-nums">{liveEng.view_count}</span>
                </div>
                {!isDesigner ? (
                  <button
                    onClick={() => void engagement.toggleLike(asset.id)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold transition-all",
                      liked
                        ? "bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20"
                        : "bg-white/5 border-white/10 text-muted-foreground hover:text-red-400 hover:border-red-500/30"
                    )}
                  >
                    <Heart className={cn("w-4 h-4 transition-all", liked && "fill-red-400 scale-110")} />
                    <span className="tabular-nums">{liveEng.like_count}</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-sm font-semibold text-muted-foreground">
                    <Heart className="w-4 h-4" />
                    <span className="tabular-nums">{liveEng.like_count}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span className="font-medium text-foreground/70">{asset.sport}</span>
              <span className="text-muted-foreground/30">·</span>
              <span>{asset.homeTeam} vs {asset.awayTeam}</span>
              <span className="text-muted-foreground/30">·</span>
              <span>{new Date(asset.eventDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
              <span className="text-muted-foreground/30">·</span>
              <span>by <strong className="text-foreground/80">{asset.designerName}</strong></span>
            </div>
          </div>
        </div>

        {/* ── Right: Live updates (tweets) ─────────────────────────── */}
          <div className="flex flex-col gap-4 md:sticky md:top-24 h-fit">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Live Updates</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isDesigner ? "Post updates from the scene" : `Updates from ${asset.designerName}`}
              </p>
            </div>
            {updates.length > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <span className="text-[11px] font-semibold text-green-400">LIVE</span>
              </div>
            )}
          </div>

          {/* Designer tweet composer */}
          {isDesigner && (
            <div className="rounded-xl border border-border/50 bg-card p-4">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-primary">
                    {currentDesigner.charAt(0).toUpperCase()}
                  </span>
                </div>
                <textarea
                  ref={textareaRef}
                  value={updateText}
                  onChange={(e) => setUpdateText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handlePost();
                  }}
                  placeholder="Share what's happening at the event…"
                  rows={3}
                  maxLength={280}
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-foreground/25 resize-none focus:outline-none leading-relaxed"
                />
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-border/50">
                <span className={cn(
                  "text-xs tabular-nums",
                  updateText.length > 240 ? "text-yellow-400" : "text-muted-foreground/40"
                )}>
                  {280 - updateText.length}
                </span>
                <button
                  onClick={handlePost}
                  disabled={!updateText.trim() || posting}
                  className={cn(
                    "flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                    updateText.trim()
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "bg-white/5 text-muted-foreground/40 cursor-not-allowed"
                  )}
                >
                  <Send className="w-3 h-3" />
                  Post Update
                </button>
              </div>
            </div>
          )}

          {/* Updates feed */}
          <div className="flex flex-col gap-3 flex-1">
            {updates.length === 0 ? (
              <div className={cn(
                "rounded-xl border border-dashed border-border/50 p-8 text-center",
                isDesigner ? "bg-white/[0.015]" : "bg-transparent"
              )}>
                <Zap className="w-5 h-5 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground/50">
                  {isDesigner
                    ? "No updates yet. Post from the scene above!"
                    : "No live updates yet — check back soon."}
                </p>
              </div>
            ) : (
              updates.map((u) => (
                <div
                  key={u.id}
                  className="rounded-xl border border-border/50 bg-card p-4 hover:border-border transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-primary">
                        {u.designerName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-foreground">{u.designerName}</span>
                        <span className="text-[10px] text-muted-foreground/50">{timeAgo(u.timestamp)}</span>
                      </div>
                      <p className="text-sm text-foreground/80 leading-relaxed">{u.text}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
