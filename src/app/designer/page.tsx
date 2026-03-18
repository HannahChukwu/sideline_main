"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, TrendingUp, Image as ImageIcon, Heart, CheckCircle } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { AssetCard, type AssetCardModel } from "@/components/designer/asset-card";
import { createClient } from "@/lib/supabase/client";
import { getDesignerAssets } from "@/lib/supabase/assets";

function toAssetCardModel(row: Awaited<ReturnType<typeof getDesignerAssets>>[number]): AssetCardModel {
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
    designerName: row.designer_name ?? "You",
  };
}

export default function DesignerDashboard() {
  const [filter, setFilter] = useState<"all" | "published" | "draft">("all");
  const [assets, setAssets] = useState<AssetCardModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const { data: userRes, error: userErr } = await supabase.auth.getUser();
        if (userErr) throw userErr;
        const user = userRes.user;
        if (!user) throw new Error("Not signed in");

        const rows = await getDesignerAssets(supabase, user.id, { status: "all", limit: 200 });
        if (cancelled) return;
        setAssets(rows.map(toAssetCardModel));
      } catch (e: unknown) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load assets");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const filtered = assets.filter((a) => (filter === "all" ? true : a.status === filter));

  const stats = useMemo(() => {
    const totalLikes = assets.reduce((sum, a) => sum + a.likes, 0);
    const publishedCount = assets.filter((a) => a.status === "published").length;
    return [
      { label: "Assets Created", value: String(assets.length), icon: ImageIcon, color: "text-primary" },
      { label: "Total Likes", value: String(totalLikes), icon: Heart, color: "text-red-400" },
      { label: "Published", value: String(publishedCount), icon: CheckCircle, color: "text-green-400" },
      { label: "This Week", value: "+0", icon: TrendingUp, color: "text-blue-400" },
    ];
  }, [assets]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar role="designer" />

      <main className="pt-20 px-6 pb-16 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-end justify-between mb-10 pt-8">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">Designer Portal</p>
            <h1 className="text-3xl font-bold text-foreground">Your Assets</h1>
          </div>
          <Link
            href="/designer/create"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all glow-orange-sm hover:glow-orange"
          >
            <Plus className="w-4 h-4" />
            Generate Poster
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-xl border border-border/50 bg-card p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-muted-foreground">{stat.label}</span>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <div className="text-2xl font-bold text-foreground">{stat.value}</div>
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-6 px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex items-center gap-2 mb-6">
          {(["all", "published", "draft"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${
                filter === f
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5 border border-transparent"
              }`}
            >
              {f}
            </button>
          ))}
          <span className="ml-auto text-xs text-muted-foreground">{filtered.length} assets</span>
        </div>

        {/* Asset grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {(loading ? [] : filtered).map((asset, i) => (
            <div
              key={asset.id}
              className="animate-fade-up"
              style={{ animationDelay: `${i * 60}ms`, animationFillMode: "both" }}
            >
              <AssetCard asset={asset} variant="designer" />
            </div>
          ))}
        </div>

        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-4">
              <ImageIcon className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-sm">No {filter} assets yet.</p>
            <Link
              href="/designer/create"
              className="mt-4 text-sm text-primary hover:text-primary/80 font-medium"
            >
              Create your first asset →
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
