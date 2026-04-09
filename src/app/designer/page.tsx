"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Plus,
  TrendingUp,
  Image as ImageIcon,
  Heart,
  CheckCircle,
  Pencil,
  FolderOpen,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { AssetCard } from "@/components/designer/asset-card";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export default function DesignerDashboard() {
  const [filter, setFilter] = useState<"all" | "published" | "draft">("all");
  const [mounted, setMounted] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [editingName, setEditingName] = useState(false);

  const assets            = useAppStore((s) => s.assets);
  const updateStatus      = useAppStore((s) => s.updateStatus);
  const deleteAsset       = useAppStore((s) => s.deleteAsset);
  const currentDesigner   = useAppStore((s) => s.currentDesigner);
  const setCurrentDesigner = useAppStore((s) => s.setCurrentDesigner);

  useEffect(() => { setMounted(true); }, []);

  // My assets only
  const myAssets  = mounted && currentDesigner
    ? assets.filter((a) => a.designerName === currentDesigner && a.status !== "archived")
    : [];

  const filtered = myAssets.filter((a) =>
    filter === "all" ? true : a.status === filter
  );

  const totalLikes     = myAssets.reduce((s, a) => s + a.likes, 0);
  const publishedCount = myAssets.filter((a) => a.status === "published").length;
  const oneWeekAgo     = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const thisWeek       = myAssets.filter((a) => (a.createdAt ?? "") >= oneWeekAgo).length;

  const stats = [
    { label: "Assets Created", value: String(myAssets.length),  icon: ImageIcon,   color: "text-primary" },
    { label: "Total Likes",    value: String(totalLikes),        icon: Heart,        color: "text-red-400" },
    { label: "Published",      value: String(publishedCount),    icon: CheckCircle, color: "text-green-400" },
    { label: "This Week",      value: `+${thisWeek}`,            icon: TrendingUp,  color: "text-blue-400" },
  ];

  function saveName() {
    if (nameInput.trim()) {
      setCurrentDesigner(nameInput.trim());
      setEditingName(false);
    }
  }

  // ── Name setup screen ──────────────────────────────────────────────────────
  if (mounted && !currentDesigner) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar role="designer" />
        <main className="pt-20 flex items-center justify-center min-h-screen px-6">
          <div className="w-full max-w-sm">
            <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center mb-6">
              <Pencil className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-2xl font-bold mb-2">What&apos;s your designer name?</h1>
            <p className="text-sm text-muted-foreground mb-7">
              This name will appear on every asset you create and your live updates.
            </p>
            <div className="flex flex-col gap-3">
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveName()}
                placeholder="e.g. Jordan Lee"
                autoFocus
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm text-foreground placeholder:text-foreground/25 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all"
              />
              <button
                onClick={saveName}
                disabled={!nameInput.trim()}
                className={cn(
                  "w-full py-3 rounded-xl text-sm font-bold transition-all",
                  nameInput.trim()
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-white/5 text-muted-foreground/40 cursor-not-allowed"
                )}
              >
                Get Started
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ── Main dashboard ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <Navbar role="designer" />

      <main className="pt-20 px-6 pb-16 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-end justify-between mb-10 pt-8">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">Designer Portal</p>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-foreground">Your Assets</h1>
              {/* Editable name pill */}
              {mounted && currentDesigner && (
                editingName ? (
                  <form
                    onSubmit={(e) => { e.preventDefault(); saveName(); }}
                    className="flex items-center gap-2"
                  >
                    <input
                      autoFocus
                      value={nameInput || currentDesigner}
                      onChange={(e) => setNameInput(e.target.value)}
                      className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/15 text-xs text-foreground focus:outline-none focus:border-primary/40 w-28"
                    />
                    <button type="submit" className="text-xs text-primary font-semibold">Save</button>
                    <button type="button" onClick={() => setEditingName(false)} className="text-xs text-muted-foreground">Cancel</button>
                  </form>
                ) : (
                  <button
                    onClick={() => { setNameInput(currentDesigner); setEditingName(true); }}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
                  >
                    {currentDesigner}
                    <Pencil className="w-2.5 h-2.5" />
                  </button>
                )
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/designer/folders"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-white/20 transition-all"
            >
              <FolderOpen className="w-4 h-4" />
              Folders
            </Link>
            <Link
              href="/designer/create"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all"
            >
              <Plus className="w-4 h-4" />
              Generate Poster
            </Link>
          </div>
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
                onDelete={(id) => deleteAsset(id)}
              />
            </div>
          ))}
        </div>

        {mounted && filtered.length === 0 && currentDesigner && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-4">
              <ImageIcon className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-sm">No {filter === "all" ? "" : filter + " "}assets yet.</p>
            <Link href="/designer/create" className="mt-4 text-sm text-primary hover:text-primary/80 font-medium">
              Create your first asset →
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
