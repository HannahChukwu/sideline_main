"use client";

import { useState } from "react";
import { ArrowLeft, Sparkles, Loader2, Download, Share2, RefreshCw, Wand2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Navbar } from "@/components/layout/navbar";
import { SPORTS, ASSET_TYPES, type AssetType } from "@/lib/mock-data";

interface FormState {
  type: AssetType;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: string;
  awayScore: string;
  eventDate: string;
  customPrompt: string;
  style: string;
}

const STYLES = [
  { value: "minimal", label: "Minimal" },
  { value: "bold", label: "Bold & Dramatic" },
  { value: "retro", label: "Retro" },
  { value: "cinematic", label: "Cinematic" },
];

const GENERATED_PREVIEWS = [
  "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&q=80",
  "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800&q=80",
  "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80",
  "https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=800&q=80",
];

export default function CreateAsset() {
  const [form, setForm] = useState<FormState>({
    type: "gameday",
    sport: "Basketball",
    homeTeam: "",
    awayTeam: "",
    homeScore: "",
    awayScore: "",
    eventDate: "",
    customPrompt: "",
    style: "bold",
  });
  const [step, setStep] = useState<"form" | "generating" | "result">("form");
  const [generatedIndex, setGeneratedIndex] = useState(0);

  const isScoreType = form.type === "final-score";

  function set(key: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function generate() {
    setStep("generating");
    // Simulate AI generation delay
    await new Promise((r) => setTimeout(r, 2800));
    setGeneratedIndex(Math.floor(Math.random() * GENERATED_PREVIEWS.length));
    setStep("result");
  }

  function regenerate() {
    setStep("generating");
    setTimeout(() => {
      setGeneratedIndex(Math.floor(Math.random() * GENERATED_PREVIEWS.length));
      setStep("result");
    }, 2000);
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar role="designer" />

      <main className="pt-20 px-6 pb-16 max-w-6xl mx-auto">
        <div className="pt-8 mb-8 flex items-center gap-4">
          <Link
            href="/designer"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <span className="text-muted-foreground/30">/</span>
          <span className="text-sm text-muted-foreground">Create Asset</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left — Form */}
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold mb-1">Generate Asset</h1>
              <p className="text-sm text-muted-foreground">Fill in the details and let AI handle the design.</p>
            </div>

            {/* Asset type */}
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-3 block">Asset Type</label>
              <div className="grid grid-cols-2 gap-2">
                {ASSET_TYPES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => set("type", t.value)}
                    className={`p-3 rounded-xl border text-sm font-medium text-left transition-all ${
                      form.type === t.value
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border/50 bg-card text-muted-foreground hover:border-border hover:text-foreground"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sport */}
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-3 block">Sport</label>
              <div className="flex flex-wrap gap-2">
                {SPORTS.slice(0, 8).map((s) => (
                  <button
                    key={s}
                    onClick={() => set("sport", s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      form.sport === s
                        ? "bg-primary/10 text-primary border border-primary/30"
                        : "bg-card border border-border/50 text-muted-foreground hover:border-border hover:text-foreground"
                    }`}
                  >
                    {s}
                  </button>
                ))}
                <select
                  value={SPORTS.slice(0, 8).includes(form.sport) ? "" : form.sport}
                  onChange={(e) => e.target.value && set("sport", e.target.value)}
                  className="px-3 py-1.5 rounded-lg text-xs bg-card border border-border/50 text-muted-foreground cursor-pointer"
                >
                  <option value="">More...</option>
                  {SPORTS.slice(8).map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Teams */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">Home Team</label>
                <input
                  type="text"
                  value={form.homeTeam}
                  onChange={(e) => set("homeTeam", e.target.value)}
                  placeholder="Falcons"
                  className="w-full px-3 py-2.5 rounded-xl bg-card border border-border/50 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">Away Team</label>
                <input
                  type="text"
                  value={form.awayTeam}
                  onChange={(e) => set("awayTeam", e.target.value)}
                  placeholder="Rivals"
                  className="w-full px-3 py-2.5 rounded-xl bg-card border border-border/50 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all"
                />
              </div>
            </div>

            {/* Scores (only for final-score) */}
            {isScoreType && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">Home Score</label>
                  <input
                    type="number"
                    value={form.homeScore}
                    onChange={(e) => set("homeScore", e.target.value)}
                    placeholder="87"
                    className="w-full px-3 py-2.5 rounded-xl bg-card border border-border/50 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">Away Score</label>
                  <input
                    type="number"
                    value={form.awayScore}
                    onChange={(e) => set("awayScore", e.target.value)}
                    placeholder="74"
                    className="w-full px-3 py-2.5 rounded-xl bg-card border border-border/50 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all"
                  />
                </div>
              </div>
            )}

            {/* Event date */}
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">Event Date</label>
              <input
                type="date"
                value={form.eventDate}
                onChange={(e) => set("eventDate", e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-card border border-border/50 text-sm text-foreground focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all [color-scheme:dark]"
              />
            </div>

            {/* Visual style */}
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-3 block">Visual Style</label>
              <div className="grid grid-cols-4 gap-2">
                {STYLES.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => set("style", s.value)}
                    className={`p-2 rounded-lg border text-xs font-medium transition-all ${
                      form.style === s.value
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border/50 bg-card text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom prompt */}
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">
                Additional Instructions <span className="text-muted-foreground/50">(optional)</span>
              </label>
              <textarea
                value={form.customPrompt}
                onChange={(e) => set("customPrompt", e.target.value)}
                placeholder="Add team colors, special effects, taglines, or anything specific..."
                rows={3}
                className="w-full px-3 py-2.5 rounded-xl bg-card border border-border/50 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all resize-none"
              />
            </div>

            {/* Generate button */}
            <button
              onClick={generate}
              disabled={step === "generating" || !form.homeTeam || !form.awayTeam}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold transition-all hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed glow-orange-sm hover:glow-orange"
            >
              {step === "generating" ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating with AI...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  Generate Asset
                </>
              )}
            </button>
          </div>

          {/* Right — Preview */}
          <div className="lg:sticky lg:top-24 h-fit">
            <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
              <div className="p-4 border-b border-border/50 flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">Preview</span>
                {step === "result" && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={regenerate}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted transition-all"
                    >
                      <RefreshCw className="w-3 h-3" /> Regenerate
                    </button>
                  </div>
                )}
              </div>

              <div className="aspect-[16/9] relative bg-muted/30">
                {step === "form" && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground/40">
                    <Sparkles className="w-8 h-8" />
                    <span className="text-sm">Your asset will appear here</span>
                  </div>
                )}

                {step === "generating" && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                    {/* Animated dots */}
                    <div className="relative w-16 h-16">
                      <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-ping" />
                      <div className="absolute inset-2 rounded-full border-2 border-primary/40" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Wand2 className="w-5 h-5 text-primary animate-pulse" />
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-foreground mb-1">Generating your asset</p>
                      <p className="text-xs text-muted-foreground">AI is crafting your design...</p>
                    </div>
                    {/* Progress bar */}
                    <div className="w-48 h-1 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full animate-[progress_2.8s_ease-in-out_forwards]" style={{ width: "0%", animation: "none", transition: "width 2.8s ease-in-out", }} ref={(el) => { if (el) setTimeout(() => { el.style.width = "100%"; }, 50); }} />
                    </div>
                  </div>
                )}

                {step === "result" && (
                  <Image
                    src={GENERATED_PREVIEWS[generatedIndex]}
                    alt="Generated asset"
                    fill
                    className="object-cover"
                    sizes="(max-width: 1200px) 50vw, 600px"
                  />
                )}
              </div>

              {step === "result" && (
                <div className="p-4 border-t border-border/50">
                  <p className="text-sm font-medium text-foreground mb-1">
                    {form.homeTeam || "Home"} vs {form.awayTeam || "Away"}
                    {isScoreType && form.homeScore && ` — ${form.homeScore}–${form.awayScore}`}
                  </p>
                  <p className="text-xs text-muted-foreground mb-4">{form.sport} · {ASSET_TYPES.find((t) => t.value === form.type)?.label}</p>

                  <div className="flex gap-2">
                    <button className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all glow-orange-sm">
                      <Share2 className="w-3.5 h-3.5" /> Publish
                    </button>
                    <button className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-muted text-foreground text-xs font-medium hover:bg-muted/70 transition-all">
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
