"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, Trophy, Star, BarChart2 } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { AssetCard } from "@/components/designer/asset-card";
import { useAppStore } from "@/lib/store";

export default function AthleteDashboard() {
  const [mounted, setMounted] = useState(false);

  const assets     = useAppStore((s) => s.assets);
  const toggleLike = useAppStore((s) => s.toggleLike);
  const isLiked    = useAppStore((s) => s.isLiked);

  useEffect(() => { setMounted(true); }, []);

  const published    = mounted ? assets.filter((a) => a.status === "published") : [];
  const likedAssets  = mounted ? published.filter((a) => isLiked(a.id))  : [];
  const pendingAssets = mounted ? published.filter((a) => !isLiked(a.id)) : [];

  return (
    <div className="min-h-screen bg-background">
      <Navbar role="athlete" />

      <main className="pt-20 px-6 pb-16 max-w-7xl mx-auto">
        {/* Header */}
        <div className="pt-8 mb-10">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">Athlete Portal</p>
              <h1 className="text-3xl font-bold text-foreground mb-1">Your Team&apos;s Assets</h1>
              <p className="text-sm text-muted-foreground">
                Review designs from your team&apos;s designers. Like what you love.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20">
                <Trophy className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-xs font-medium text-blue-400">Falcons Athletics</span>
              </div>
              <Link
                href="/athlete/stats"
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 border border-primary/20 text-sm font-semibold text-primary hover:bg-primary/20 transition-all"
              >
                <BarChart2 className="w-3.5 h-3.5" />
                My Stats
              </Link>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          <div className="rounded-xl border border-border/50 bg-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <Heart className="w-3.5 h-3.5 text-red-400" />
              <span className="text-xs text-muted-foreground">Liked</span>
            </div>
            <div className="text-2xl font-bold text-foreground">{likedAssets.length}</div>
          </div>
          <div className="rounded-xl border border-border/50 bg-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-3.5 h-3.5 text-yellow-400" />
              <span className="text-xs text-muted-foreground">To Review</span>
            </div>
            <div className="text-2xl font-bold text-foreground">{pendingAssets.length}</div>
          </div>
          <div className="rounded-xl border border-border/50 bg-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-xs text-muted-foreground">Total Assets</span>
            </div>
            <div className="text-2xl font-bold text-foreground">{published.length}</div>
          </div>
        </div>

        {/* Awaiting feedback */}
        {pendingAssets.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-5">
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Awaiting Your Feedback</h2>
              <div className="px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-xs text-primary font-medium">
                {pendingAssets.length}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {pendingAssets.map((asset, i) => (
                <div
                  key={asset.id}
                  className="animate-fade-up"
                  style={{ animationDelay: `${i * 60}ms`, animationFillMode: "both" }}
                >
                  <AssetCard
                    asset={asset}
                    variant="athlete"
                    liked={false}
                    onLike={toggleLike}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Liked section */}
        {likedAssets.length > 0 && (
          <div>
            <div className="flex items-center gap-3 mb-5">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Liked</h2>
              <div className="px-2 py-0.5 rounded-full bg-muted border border-border/50 text-xs text-muted-foreground font-medium">
                {likedAssets.length}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 opacity-70">
              {likedAssets.map((asset) => (
                <AssetCard
                  key={asset.id}
                  asset={asset}
                  variant="athlete"
                  liked
                  onLike={toggleLike}
                />
              ))}
            </div>
          </div>
        )}

        {mounted && published.length === 0 && (
          <div className="py-24 text-center text-muted-foreground/50 text-sm">
            No published assets yet — check back after your designer posts something.
          </div>
        )}
      </main>
    </div>
  );
}
