"use client";

import { useEffect, useMemo, useState } from "react";
import { Heart, Trophy, Star } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { AssetCard, type AssetCardModel } from "@/components/designer/asset-card";
import { createClient } from "@/lib/supabase/client";
import { getPublishedAssets, likeAsset, unlikeAsset } from "@/lib/supabase/assets";
import { getTeamsForManager } from "@/lib/supabase/teams";
import type { Team } from "@/lib/pipeline/types";

function toAssetCardModel(row: Awaited<ReturnType<typeof getPublishedAssets>>[number]): AssetCardModel {
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    status: row.status,
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

export default function AthleteDashboard() {
  const [assets, setAssets] = useState<AssetCardModel[]>([]);
  const [allRows, setAllRows] = useState<Awaited<ReturnType<typeof getPublishedAssets>>>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const rows = await getPublishedAssets(supabase, { limit: 120 });
        if (cancelled) return;
        setAllRows(rows);
        setAssets(rows.map(toAssetCardModel));
        setLiked(new Set(rows.filter((r) => r.liked_by_me).map((r) => r.id)));
        setLikeCounts(Object.fromEntries(rows.map((r) => [r.id, r.like_count])));

        // MVP “filter by team” support: pull teams visible to this user.
        // If the user isn't a manager, this may return 0 teams; filter UI will still work as “All”.
        const teamsList = await getTeamsForManager(supabase);
        if (cancelled) return;
        setTeams(teamsList);
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

  useEffect(() => {
    if (teamFilter === "all") {
      setAssets(allRows.map(toAssetCardModel));
      return;
    }
    setAssets(allRows.filter((r) => r.team_id === teamFilter).map(toAssetCardModel));
  }, [allRows, teamFilter]);

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

  const assetsWithUpdatedLikes = assets.map((a) => ({
    ...a,
    likes: likeCounts[a.id] ?? a.likes,
  }));

  const totalLikesGiven = liked.size;
  const pendingReview = assetsWithUpdatedLikes.filter((a) => !liked.has(a.id)).length;

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
            <div className="text-2xl font-bold text-foreground">{assetsWithUpdatedLikes.length}</div>
          </div>
        </div>

        {/* Team filter (MVP manual) */}
        <div className="flex items-center justify-end mb-6">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Team</span>
            <select
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
              className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none"
            >
              <option value="all">All</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.teamName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="mb-8 px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Section: Pending review */}
        {!loading && pendingReview > 0 && (
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
        {!loading && totalLikesGiven > 0 && (
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

        {!loading && assetsWithUpdatedLikes.length === 0 && !error && (
          <div className="py-24 text-center text-muted-foreground">
            No published assets yet.
          </div>
        )}
      </main>
    </div>
  );
}
