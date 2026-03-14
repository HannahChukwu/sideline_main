"use client";

import { useState } from "react";
import { Heart, Trophy, Star } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { AssetCard } from "@/components/designer/asset-card";
import { MOCK_ASSETS } from "@/lib/mock-data";

const ATHLETE_ID = "athlete-1";

export default function AthleteDashboard() {
  const [liked, setLiked] = useState<Set<string>>(
    new Set(MOCK_ASSETS.filter((a) => a.likedByAthletes.includes(ATHLETE_ID)).map((a) => a.id))
  );
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>(
    Object.fromEntries(MOCK_ASSETS.map((a) => [a.id, a.likes]))
  );

  const published = MOCK_ASSETS.filter((a) => a.status === "published");

  function handleLike(id: string) {
    setLiked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        setLikeCounts((c) => ({ ...c, [id]: c[id] - 1 }));
      } else {
        next.add(id);
        setLikeCounts((c) => ({ ...c, [id]: c[id] + 1 }));
      }
      return next;
    });
  }

  const assetsWithUpdatedLikes = published.map((a) => ({
    ...a,
    likes: likeCounts[a.id] ?? a.likes,
  }));

  const totalLikesGiven = liked.size;
  const pendingReview = published.filter((a) => !liked.has(a.id)).length;

  return (
    <div className="min-h-screen bg-background">
      <Navbar role="athlete" />

      <main className="pt-20 px-6 pb-16 max-w-7xl mx-auto">
        {/* Header */}
        <div className="pt-8 mb-10">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">Athlete Portal</p>
              <h1 className="text-3xl font-bold text-foreground mb-1">Your Team's Assets</h1>
              <p className="text-sm text-muted-foreground">
                Review designs from your team's designers. Like what you love.
              </p>
            </div>

            {/* Athlete badge */}
            <div className="hidden md:flex flex-col items-end gap-1">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20">
                <Trophy className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-xs font-medium text-blue-400">Falcons Athletics</span>
              </div>
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
            <div className="text-2xl font-bold text-foreground">{totalLikesGiven}</div>
          </div>
          <div className="rounded-xl border border-border/50 bg-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-3.5 h-3.5 text-yellow-400" />
              <span className="text-xs text-muted-foreground">To Review</span>
            </div>
            <div className="text-2xl font-bold text-foreground">{pendingReview}</div>
          </div>
          <div className="rounded-xl border border-border/50 bg-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-xs text-muted-foreground">Total Assets</span>
            </div>
            <div className="text-2xl font-bold text-foreground">{published.length}</div>
          </div>
        </div>

        {/* Section: Pending review */}
        {pendingReview > 0 && (
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-5">
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Awaiting Your Feedback</h2>
              <div className="px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-xs text-primary font-medium">
                {pendingReview}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {assetsWithUpdatedLikes
                .filter((a) => !liked.has(a.id))
                .map((asset, i) => (
                  <div
                    key={asset.id}
                    className="animate-fade-up"
                    style={{ animationDelay: `${i * 60}ms`, animationFillMode: "both" }}
                  >
                    <AssetCard
                      asset={asset}
                      variant="athlete"
                      liked={liked.has(asset.id)}
                      onLike={handleLike}
                    />
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Section: Liked */}
        {totalLikesGiven > 0 && (
          <div>
            <div className="flex items-center gap-3 mb-5">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Liked</h2>
              <div className="px-2 py-0.5 rounded-full bg-muted border border-border/50 text-xs text-muted-foreground font-medium">
                {totalLikesGiven}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 opacity-70">
              {assetsWithUpdatedLikes
                .filter((a) => liked.has(a.id))
                .map((asset) => (
                  <AssetCard
                    key={asset.id}
                    asset={asset}
                    variant="athlete"
                    liked
                    onLike={handleLike}
                  />
                ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
