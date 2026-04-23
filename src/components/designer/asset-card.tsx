"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, Eye, CheckCircle, Clock, MessageSquare, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Minimal asset shape required by this card.
 * Both mock-data `Asset` and store `StoreAsset` satisfy this interface.
 */
export type AssetCardModel = {
  id: string;
  title: string;
  type: "gameday" | "final-score" | "poster" | "highlight";
  status: "draft" | "published" | "archived";
  sport: string;
  homeTeam: string;
  awayTeam: string;
  homeScore?: number;
  awayScore?: number;
  eventDate: string;
  imageUrl: string;
  likes: number;
  designerName: string;
  createdAt?: string;
  updates?: { id: string }[];
};

interface AssetCardProps {
  asset: AssetCardModel;
  /** "designer" = creator view, "athlete" = team feedback view, "student" / "fan" = public view */
  variant?: "designer" | "athlete" | "student" | "fan";
  liked?: boolean;
  /** Live like count from Supabase. Falls back to `asset.likes` when unset. */
  likeCount?: number;
  /** Live view count from Supabase. Hidden when undefined. */
  viewCount?: number;
  onLike?: (id: string) => void | Promise<void>;
  /** Designer dashboard only — promote a draft to published */
  onPublish?: (id: string) => void;
  /** Designer dashboard only — permanently delete this asset */
  onDelete?: (id: string) => void;
}

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

export function AssetCard({
  asset,
  variant = "designer",
  liked = false,
  likeCount,
  viewCount,
  onLike,
  onPublish,
  onDelete,
}: AssetCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isPublished  = asset.status === "published";
  const canLike      = variant !== "designer";
  const updateCount  = asset.updates?.length ?? 0;
  const displayedLikes = likeCount ?? asset.likes ?? 0;

  return (
    <div className="group relative rounded-xl overflow-hidden border border-border bg-card transition-all duration-300 hover:border-white/20 hover:shadow-2xl hover:shadow-black/60 hover:-translate-y-0.5">

      {/* Delete confirmation overlay */}
      {confirmDelete && (
        <div className="absolute inset-0 z-20 bg-background/90 backdrop-blur-sm flex flex-col items-center justify-center gap-3 rounded-xl">
          <Trash2 className="w-6 h-6 text-destructive" />
          <p className="text-sm font-semibold text-foreground text-center px-4">Delete this asset?</p>
          <p className="text-xs text-muted-foreground text-center px-6">This can't be undone.</p>
          <div className="flex gap-2 mt-1">
            <button
              onClick={(e) => { e.stopPropagation(); onDelete?.(asset.id); }}
              className="px-4 py-2 rounded-lg bg-destructive text-white text-xs font-bold hover:bg-destructive/90 transition-colors"
            >
              Delete
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setConfirmDelete(false); }}
              className="px-4 py-2 rounded-lg bg-muted text-foreground text-xs font-semibold hover:bg-muted/70 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Clickable image area → detail page */}
      <Link href={`/asset/${asset.id}`} className="block">
        <div className="relative aspect-[16/9] overflow-hidden bg-muted">
          <Image
            src={asset.imageUrl}
            alt={asset.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          {/* Top badges */}
          <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
            <Badge className={cn("text-[10px] font-medium border", typeColors[asset.type])}>
              {typeLabels[asset.type]}
            </Badge>
            {variant === "designer" && (
              <div className={cn(
                "flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium",
                isPublished
                  ? "bg-green-500/20 text-green-400 border border-green-500/20"
                  : "bg-yellow-500/20 text-yellow-400 border border-yellow-500/20"
              )}>
                {isPublished ? <CheckCircle className="w-2.5 h-2.5" /> : <Clock className="w-2.5 h-2.5" />}
                {isPublished ? "Published" : "Draft"}
              </div>
            )}
          </div>

          {/* Live updates badge */}
          {updateCount > 0 && (
            <div className="absolute bottom-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/20 border border-green-500/30 text-[10px] font-semibold text-green-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              {updateCount} update{updateCount !== 1 ? "s" : ""}
            </div>
          )}

          {/* Score overlay for final-score type */}
          {asset.type === "final-score" && asset.homeScore !== undefined && (
            <div className="absolute bottom-0 left-0 right-0 p-3">
              <div className="flex items-baseline gap-3">
                <div className="text-center">
                  <div className="text-[10px] text-white/60 uppercase tracking-wider">{asset.homeTeam}</div>
                  <div className="text-3xl font-bold text-white tabular-nums">{asset.homeScore}</div>
                </div>
                <div className="text-white/30 text-lg font-light mb-1">—</div>
                <div className="text-center">
                  <div className="text-[10px] text-white/60 uppercase tracking-wider">{asset.awayTeam}</div>
                  <div className="text-3xl font-bold text-white/70 tabular-nums">{asset.awayScore}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </Link>

      {/* Content */}
      <div className="p-4">
        <Link href={`/asset/${asset.id}`} className="block mb-2">
          <h3 className="font-medium text-sm text-foreground leading-snug line-clamp-2 hover:text-primary transition-colors">
            {asset.title}
          </h3>
        </Link>

        <div className="flex items-center gap-1.5 mb-3 flex-wrap">
          <span className="text-xs text-muted-foreground">{asset.sport}</span>
          <span className="text-foreground/20">·</span>
          <span className="text-xs text-muted-foreground">
            {new Date(asset.eventDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
          <span className="text-foreground/20">·</span>
          <span className="text-xs text-muted-foreground">by {asset.designerName}</span>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <div className="flex items-center gap-3">
            {/* Like button */}
            <button
              onClick={(e) => { e.stopPropagation(); canLike && onLike?.(asset.id); }}
              disabled={!canLike}
              className={cn(
                "flex items-center gap-1.5 text-xs transition-all",
                canLike
                  ? liked
                    ? "text-red-400 hover:text-red-300"
                    : "text-muted-foreground hover:text-red-400"
                  : "text-muted-foreground cursor-default"
              )}
            >
              <Heart className={cn("w-3.5 h-3.5 transition-all", liked && "fill-red-400 scale-110")} />
              <span className="tabular-nums">{displayedLikes}</span>
            </button>

            {viewCount !== undefined && (
              <div
                className="flex items-center gap-1.5 text-xs text-muted-foreground"
                title={`${viewCount} view${viewCount === 1 ? "" : "s"}`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span className="tabular-nums">{viewCount}</span>
              </div>
            )}

            {/* Comments count */}
            <Link
              href={`/asset/${asset.id}`}
              onClick={(e) => e.stopPropagation()}
              className={cn(
                "flex items-center gap-1.5 text-xs transition-colors",
                updateCount > 0
                  ? "text-green-400 hover:text-green-300"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title={`${updateCount} comment${updateCount === 1 ? "" : "s"}`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="tabular-nums">{updateCount}</span>
            </Link>
          </div>

          {/* Designer dashboard: actions */}
          {variant === "designer" && (
            <div className="flex items-center gap-2">
              {asset.status === "draft" && (
                <button
                  onClick={(e) => { e.stopPropagation(); onPublish?.(asset.id); }}
                  className="flex items-center gap-1 text-[11px] text-green-400 hover:text-green-300 font-medium transition-colors"
                >
                  <CheckCircle className="w-3 h-3" /> Publish
                </button>
              )}
              {onDelete && (
                <button
                  onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }}
                  className="flex items-center gap-1 text-[11px] text-muted-foreground/50 hover:text-destructive font-medium transition-colors"
                  title="Delete asset"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          {/* View updates CTA for non-designers */}
          {variant !== "designer" && (
            <Link
              href={`/asset/${asset.id}`}
              onClick={(e) => e.stopPropagation()}
              className="text-[11px] text-primary hover:text-primary/80 font-medium transition-colors"
            >
              View →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
