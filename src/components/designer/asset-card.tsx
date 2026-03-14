"use client";

import Image from "next/image";
import { Heart, Eye, MoreHorizontal, Clock, CheckCircle, FileEdit } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Asset } from "@/lib/mock-data";

interface AssetCardProps {
  asset: Asset;
  variant?: "designer" | "athlete" | "fan";
  liked?: boolean;
  onLike?: (id: string) => void;
}

const typeColors: Record<string, string> = {
  "gameday": "bg-orange-500/10 text-orange-400 border-orange-500/20",
  "final-score": "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "poster": "bg-purple-500/10 text-purple-400 border-purple-500/20",
  "highlight": "bg-green-500/10 text-green-400 border-green-500/20",
};

const typeLabels: Record<string, string> = {
  "gameday": "Game Day",
  "final-score": "Final Score",
  "poster": "Poster",
  "highlight": "Highlight",
};

export function AssetCard({ asset, variant = "designer", liked = false, onLike }: AssetCardProps) {
  const isPublished = asset.status === "published";

  return (
    <div className="group relative rounded-xl overflow-hidden border border-border/50 bg-card transition-all duration-300 hover:border-border hover:shadow-2xl hover:shadow-black/50 hover:-translate-y-0.5">
      {/* Image */}
      <div className="relative aspect-[16/9] overflow-hidden bg-muted">
        <Image
          src={asset.imageUrl}
          alt={asset.title}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        {/* Overlay gradient */}
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

        {/* Score overlay for final-score type */}
        {asset.type === "final-score" && asset.homeScore !== undefined && (
          <div className="absolute bottom-0 left-0 right-0 p-3 flex items-end justify-between">
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

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-medium text-sm text-foreground leading-snug line-clamp-2">
            {asset.title}
          </h3>
          {variant === "designer" && (
            <button className="text-muted-foreground hover:text-foreground p-0.5 shrink-0 transition-colors">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs text-muted-foreground">{asset.sport}</span>
          <span className="text-muted-foreground/30">·</span>
          <span className="text-xs text-muted-foreground">
            {new Date(asset.eventDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
          {variant !== "designer" && (
            <>
              <span className="text-muted-foreground/30">·</span>
              <span className="text-xs text-muted-foreground">by {asset.designerName}</span>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-border/50">
          <div className="flex items-center gap-3">
            {/* Like button */}
            <button
              onClick={() => onLike?.(asset.id)}
              className={cn(
                "flex items-center gap-1.5 text-xs transition-all",
                variant === "athlete" || variant === "fan"
                  ? liked
                    ? "text-red-400 hover:text-red-300"
                    : "text-muted-foreground hover:text-red-400"
                  : "text-muted-foreground cursor-default"
              )}
            >
              <Heart className={cn("w-3.5 h-3.5", liked && "fill-red-400")} />
              <span>{asset.likes}</span>
            </button>

            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Eye className="w-3.5 h-3.5" />
              <span>{Math.floor(asset.likes * 4.2 + 10)}</span>
            </div>
          </div>

          {variant === "designer" && asset.status === "draft" && (
            <button className="flex items-center gap-1 text-[11px] text-primary hover:text-primary/80 font-medium transition-colors">
              <FileEdit className="w-3 h-3" />
              Edit
            </button>
          )}

          {(variant === "athlete") && !liked && (
            <button
              onClick={() => onLike?.(asset.id)}
              className="text-[11px] text-primary hover:text-primary/80 font-medium transition-colors"
            >
              Give feedback
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
