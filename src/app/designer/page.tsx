"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, TrendingUp, Image as ImageIcon, Heart, CheckCircle } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { AssetCard } from "@/components/designer/asset-card";
import { useAppStore } from "@/lib/store";

export default function DesignerDashboard() {
  const [filter, setFilter] = useState<"all" | "published" | "draft">("all");
  const [mounted, setMounted] = useState(false);

<<<<<<< Updated upstream
  const assets       = useAppStore((s) => s.assets);
  const updateStatus = useAppStore((s) => s.updateStatus);

  // Defer store reads to client to avoid SSR/hydration mismatch
  useEffect(() => { setMounted(true); }, []);

  const display  = mounted ? assets.filter((a) => a.status !== "archived") : [];
  const filtered = display.filter((a) =>
    filter === "all" ? true : a.status === filter
  );

  // Live stats computed from real store data
  const totalLikes     = display.reduce((s, a) => s + a.likes, 0);
  const publishedCount = display.filter((a) => a.status === "published").length;
  const oneWeekAgo     = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const thisWeek       = display.filter((a) => (a.createdAt ?? "") >= oneWeekAgo).length;

  const stats = [
    { label: "Assets Created", value: String(display.length),   icon: ImageIcon,    color: "text-primary" },
    { label: "Total Likes",    value: String(totalLikes),        icon: Heart,         color: "text-red-400" },
    { label: "Published",      value: String(publishedCount),    icon: CheckCircle,  color: "text-green-400" },
    { label: "This Week",      value: `+${thisWeek}`,            icon: TrendingUp,   color: "text-blue-400" },
=======
  const assets     = useAppStore((s) => s.assets);
  const updateStatus = useAppStore((s) => s.updateStatus);

  // Avoid hydration mismatch — only render store data after client mount
  useEffect(() => { setMounted(true); }, []);

  const displayAssets = mounted ? assets : [];
  const filtered = displayAssets.filter((a) =>
    filter === "all" ? a.status !== "archived" : a.status === filter
  );

  // Real stats from store
  const totalAssets    = displayAssets.length;
  const totalLikes     = displayAssets.reduce((sum, a) => sum + a.likes, 0);
  const publishedCount = displayAssets.filter((a) => a.status === "published").length;

  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const thisWeek   = displayAssets.filter((a) => a.createdAt >= oneWeekAgo).length;

  const stats = [
    { label: "Assets Created", value: String(totalAssets),   icon: ImageIcon,    color: "text-primary" },
    { label: "Total Likes",    value: String(totalLikes),    icon: Heart,         color: "text-red-400" },
    { label: "Published",      value: String(publishedCount), icon: CheckCircle, color: "text-green-400" },
    { label: "This Week",      value: `+${thisWeek}`,         icon: TrendingUp,  color: "text-blue-400" },
>>>>>>> Stashed changes
  ];

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
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all glow-violet-sm hover:glow-violet"
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
          {filtered.map((asset, i) => (
            <div
              key={asset.id}
              className="animate-fade-up"
              style={{ animationDelay: `${i * 60}ms`, animationFillMode: "both" }}
            >
              <AssetCard
                asset={asset}
                variant="designer"
                onPublish={(id) => updateStatus(id, "published")}
              />
            </div>
          ))}
        </div>

<<<<<<< Updated upstream
        {mounted && filtered.length === 0 && (
=======
        {filtered.length === 0 && mounted && (
>>>>>>> Stashed changes
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-4">
              <ImageIcon className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-sm">No {filter} assets yet.</p>
            <Link href="/designer/create" className="mt-4 text-sm text-primary hover:text-primary/80 font-medium">
              Create your first asset →
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
