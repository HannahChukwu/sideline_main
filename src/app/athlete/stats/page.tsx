"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft, BarChart2, Edit2, Check, Plus, Trash2,
  User, Trophy, RefreshCw, Wifi, WifiOff, ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore, STAT_PRESETS, EMPTY_ATHLETE_PROFILE } from "@/lib/store";
import type { StatRow, AthleteProfile } from "@/lib/store";
import type { LiveGame } from "@/app/api/live-scores/route";

const SPORTS = Object.keys(STAT_PRESETS);
const YEARS  = ["Freshman", "Sophomore", "Junior", "Senior", "Graduate"];

// ── Mini score card for the athlete's sport ─────────────────────────────────
function SportScoreCard({ game }: { game: LiveGame }) {
  const isLive  = game.status === "live";
  const isFinal = game.status === "final";
  return (
    <div className={cn(
      "rounded-xl border p-4 transition-all",
      isLive  && "border-green-500/25 bg-green-500/[0.04]",
      isFinal && "border-border/50 bg-card",
      !isLive && !isFinal && "border-border/30 bg-card opacity-80",
    )}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest">{game.sport}</span>
        {isLive && (
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 animate-ping opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-400" />
            </span>
            <span className="text-[10px] font-bold text-green-400">LIVE</span>
          </div>
        )}
        {isFinal && <span className="text-[10px] text-muted-foreground font-medium">Final</span>}
        {game.status === "upcoming" && (
          <span className="text-[10px] text-blue-400 font-medium">{game.startTime}</span>
        )}
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-foreground">{game.homeTeam}</span>
          {game.status !== "upcoming" && (
            <span className={cn("text-lg font-black tabular-nums", isLive ? "text-foreground" : "text-foreground/80")}>
              {game.homeScore}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{game.awayTeam}</span>
          {game.status !== "upcoming" && (
            <span className="text-lg font-black tabular-nums text-muted-foreground">{game.awayScore}</span>
          )}
        </div>
      </div>
      {isLive && game.period && (
        <div className="mt-2 pt-2 border-t border-border/50 flex justify-between text-xs text-muted-foreground">
          <span>{game.period}</span>
          {game.clock && <span className="font-mono text-green-400">{game.clock}</span>}
        </div>
      )}
    </div>
  );
}

// ── Editable stat row ────────────────────────────────────────────────────────
function StatRowInput({
  row, onChange, onDelete, editing,
}: {
  row: StatRow;
  onChange: (updated: StatRow) => void;
  onDelete: () => void;
  editing: boolean;
}) {
  return (
    <div className={cn(
      "flex items-center gap-3 px-4 py-3 border-b border-border/30 last:border-0 transition-colors",
      editing && "hover:bg-white/[0.02]"
    )}>
      {editing ? (
        <>
          <input
            value={row.label}
            onChange={(e) => onChange({ ...row, label: e.target.value })}
            placeholder="Stat name"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-foreground/25 focus:outline-none"
          />
          <input
            value={row.value}
            onChange={(e) => onChange({ ...row, value: e.target.value })}
            placeholder="—"
            className="w-20 text-right bg-transparent text-sm font-semibold text-foreground placeholder:text-foreground/25 focus:outline-none"
          />
          <button onClick={onDelete} className="text-muted-foreground/30 hover:text-destructive transition-colors shrink-0">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </>
      ) : (
        <>
          <span className="flex-1 text-sm text-muted-foreground">{row.label}</span>
          <span className={cn(
            "text-sm font-bold tabular-nums",
            row.value ? "text-foreground" : "text-muted-foreground/30"
          )}>{row.value || "—"}</span>
        </>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function AthleteStatsPage() {
  const [mounted,  setMounted]  = useState(false);
  const [editing,  setEditing]  = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [liveGames, setLiveGames] = useState<LiveGame[]>([]);
  const [scoresLoading, setScoresLoading] = useState(true);
  const [scoresSource, setScoresSource] = useState<"ncaa" | "fallback" | null>(null);
  const [showSportPicker, setShowSportPicker] = useState(false);

  const athleteProfile  = useAppStore((s) => s.athleteProfile);
  const setAthleteProfile = useAppStore((s) => s.setAthleteProfile);

  // Local draft while editing
  const [draft, setDraft] = useState<AthleteProfile>(EMPTY_ATHLETE_PROFILE);

  useEffect(() => { setMounted(true); }, []);

  // Fetch NCAA live scores for this athlete's sport
  useEffect(() => {
    if (!mounted) return;
    async function load() {
      setScoresLoading(true);
      try {
        const res  = await fetch("/api/live-scores");
        const data = await res.json();
        setLiveGames(data.games ?? []);
        setScoresSource(data.source ?? null);
      } catch { /* ignore */ }
      finally { setScoresLoading(false); }
    }
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, [mounted]);

  function startEdit() {
    setDraft({ ...athleteProfile, stats: athleteProfile.stats.map((r) => ({ ...r })) });
    setEditing(true);
  }

  function cancelEdit() {
    setDraft({ ...athleteProfile });
    setEditing(false);
  }

  function saveEdit() {
    setSaving(true);
    setAthleteProfile(draft);
    setTimeout(() => { setSaving(false); setEditing(false); }, 500);
  }

  function changeSport(sport: string) {
    const existing = draft.stats.filter((r) => r.label && r.value);
    const presets  = STAT_PRESETS[sport] ?? [];
    // Keep any filled rows, prepend sport presets (without duplicates)
    const merged: StatRow[] = [
      ...presets.filter((p) => !existing.find((e) => e.label === p.label)),
      ...existing,
    ];
    setDraft((d) => ({ ...d, sport, stats: merged }));
    setShowSportPicker(false);
  }

  function loadPreset() {
    const presets = STAT_PRESETS[draft.sport] ?? [];
    setDraft((d) => ({ ...d, stats: presets.map((r) => ({ ...r })) }));
  }

  function updateRow(i: number, row: StatRow) {
    setDraft((d) => ({ ...d, stats: d.stats.map((r, idx) => (idx === i ? row : r)) }));
  }

  function deleteRow(i: number) {
    setDraft((d) => ({ ...d, stats: d.stats.filter((_, idx) => idx !== i) }));
  }

  function addRow() {
    setDraft((d) => ({ ...d, stats: [...d.stats, { label: "", value: "" }] }));
  }

  const profile = editing ? draft : athleteProfile;
  const sportGames = liveGames.filter(
    (g) => g.sport.toLowerCase() === (profile.sport ?? "").toLowerCase()
  );
  const hasProfile = !!(athleteProfile.name || athleteProfile.sport);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-border/50 bg-background/80 backdrop-blur-md px-6 py-4 flex items-center gap-4">
        <Link
          href="/athlete"
          className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to portal
        </Link>
        <div className="ml-auto flex items-center gap-2">
          {!editing ? (
            <button
              onClick={startEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-white/20 transition-all"
            >
              <Edit2 className="w-3.5 h-3.5" /> Edit Profile
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={cancelEdit}
                className="px-3 py-1.5 rounded-lg bg-muted text-muted-foreground text-xs font-semibold hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all"
              >
                {saving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                Save
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8">

        {/* ── Left: Profile card + stats ─────────────────────────────────── */}
        <div className="space-y-6">

          {/* Profile banner */}
          <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
            {/* Top colour strip */}
            <div className="h-20 bg-gradient-to-r from-primary/30 via-primary/10 to-transparent" />

            <div className="px-6 pb-6 -mt-8">
              {/* Avatar */}
              <div className="w-16 h-16 rounded-2xl bg-primary/20 border-2 border-background flex items-center justify-center mb-4 ring-2 ring-primary/20">
                <User className="w-8 h-8 text-primary/60" />
              </div>

              {editing ? (
                <div className="space-y-3">
                  <input
                    value={draft.name}
                    onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                    placeholder="Your full name"
                    className="w-full bg-transparent border-b border-border/50 pb-1 text-lg font-bold text-foreground placeholder:text-foreground/25 focus:outline-none focus:border-primary/50 transition-colors"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    {/* Sport selector */}
                    <div className="relative">
                      <button
                        onClick={() => setShowSportPicker((v) => !v)}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-foreground hover:border-white/20 transition-colors"
                      >
                        <span>{draft.sport || "Sport"}</span>
                        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                      {showSportPicker && (
                        <div className="absolute top-full mt-1 left-0 right-0 z-20 rounded-xl border border-border/50 bg-card shadow-xl overflow-hidden">
                          {SPORTS.map((s) => (
                            <button
                              key={s}
                              onClick={() => changeSport(s)}
                              className={cn(
                                "w-full text-left px-3 py-2 text-sm hover:bg-white/5 transition-colors",
                                draft.sport === s ? "text-primary font-semibold" : "text-foreground"
                              )}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <input
                      value={draft.team}
                      onChange={(e) => setDraft((d) => ({ ...d, team: e.target.value }))}
                      placeholder="Team / School"
                      className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-foreground placeholder:text-foreground/25 focus:outline-none focus:border-primary/40 transition-colors"
                    />
                    <input
                      value={draft.position}
                      onChange={(e) => setDraft((d) => ({ ...d, position: e.target.value }))}
                      placeholder="Position"
                      className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-foreground placeholder:text-foreground/25 focus:outline-none focus:border-primary/40 transition-colors"
                    />
                    <div className="flex gap-2">
                      <input
                        value={draft.number}
                        onChange={(e) => setDraft((d) => ({ ...d, number: e.target.value }))}
                        placeholder="#"
                        className="w-16 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-foreground placeholder:text-foreground/25 focus:outline-none focus:border-primary/40 transition-colors"
                      />
                      <select
                        value={draft.year}
                        onChange={(e) => setDraft((d) => ({ ...d, year: e.target.value }))}
                        className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-foreground focus:outline-none focus:border-primary/40 transition-colors"
                      >
                        <option value="">Year</option>
                        {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                  </div>
                  <textarea
                    value={draft.bio}
                    onChange={(e) => setDraft((d) => ({ ...d, bio: e.target.value }))}
                    placeholder="Short bio (optional)…"
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-foreground placeholder:text-foreground/25 focus:outline-none focus:border-primary/40 resize-none transition-colors"
                  />
                </div>
              ) : !hasProfile ? (
                <div className="text-center py-6">
                  <p className="text-muted-foreground/50 text-sm mb-3">Set up your athlete profile to track your stats.</p>
                  <button
                    onClick={startEdit}
                    className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-all"
                  >
                    Create Profile
                  </button>
                </div>
              ) : (
                <div>
                  <h1 className="text-xl font-bold text-foreground mb-1">{profile.name || "Athlete"}</h1>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                    {profile.sport && <span className="font-semibold text-primary/80">{profile.sport}</span>}
                    {profile.position && <span>{profile.position}</span>}
                    {profile.number && <span>#{profile.number}</span>}
                    {profile.team && <span>{profile.team}</span>}
                    {profile.year && <span>{profile.year}</span>}
                  </div>
                  {profile.bio && (
                    <p className="mt-3 text-sm text-muted-foreground/70 leading-relaxed">{profile.bio}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Stats table */}
          <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-primary" />
                <span className="text-sm font-bold text-foreground">
                  {editing ? `${draft.sport} Stats` : `${profile.sport || "My"} Stats`}
                </span>
                <span className="text-xs text-muted-foreground/50">· Season 2025–26</span>
              </div>
              {editing && (
                <button
                  onClick={loadPreset}
                  className="text-[11px] text-primary hover:text-primary/80 font-semibold transition-colors"
                >
                  Load {draft.sport} template
                </button>
              )}
            </div>

            {(editing ? draft.stats : profile.stats).length === 0 ? (
              <div className="py-10 text-center">
                <BarChart2 className="w-6 h-6 text-muted-foreground/20 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground/40">
                  {editing ? "Add your first stat below or load a template." : "No stats yet — click Edit Profile to add them."}
                </p>
              </div>
            ) : (
              <div>
                {(editing ? draft.stats : profile.stats).map((row, i) => (
                  <StatRowInput
                    key={i}
                    row={row}
                    editing={editing}
                    onChange={(updated) => updateRow(i, updated)}
                    onDelete={() => deleteRow(i)}
                  />
                ))}
              </div>
            )}

            {editing && (
              <button
                onClick={addRow}
                className="w-full flex items-center justify-center gap-2 py-3 text-xs text-primary hover:text-primary/80 font-semibold border-t border-border/30 hover:bg-white/[0.02] transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add stat
              </button>
            )}
          </div>
        </div>

        {/* ── Right: NCAA live scores for this sport ────────────────────── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">
                {profile.sport || "NCAA"} Scores
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {scoresSource === "ncaa" ? "Live from NCAA" : "Simulated · NCAA unavailable"}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              {scoresSource === "ncaa"
                ? <Wifi className="w-3.5 h-3.5 text-green-400" />
                : <WifiOff className="w-3.5 h-3.5 text-muted-foreground/40" />
              }
            </div>
          </div>

          {scoresLoading ? (
            <div className="space-y-3">
              {[1,2,3].map((i) => (
                <div key={i} className="rounded-xl border border-border/30 bg-card p-4 animate-pulse">
                  <div className="h-3 bg-white/5 rounded mb-3 w-24" />
                  <div className="h-4 bg-white/5 rounded mb-2 w-full" />
                  <div className="h-4 bg-white/5 rounded w-3/4" />
                </div>
              ))}
            </div>
          ) : sportGames.length > 0 ? (
            <div className="space-y-3">
              {sportGames.map((g) => <SportScoreCard key={g.id} game={g} />)}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border/40 p-8 text-center">
              <Trophy className="w-5 h-5 text-muted-foreground/20 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground/40">
                No {profile.sport || "NCAA"} games scheduled right now.
              </p>
              <p className="text-xs text-muted-foreground/30 mt-1">
                Scores update every 30 seconds.
              </p>
            </div>
          )}

          {/* All sports scores summary */}
          {liveGames.filter((g) => g.status === "live").length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-semibold text-muted-foreground/50 uppercase tracking-wider mb-3">
                Other Live Games
              </p>
              <div className="space-y-2">
                {liveGames
                  .filter((g) => g.status === "live" && g.sport.toLowerCase() !== (profile.sport ?? "").toLowerCase())
                  .slice(0, 4)
                  .map((g) => (
                    <div key={g.id} className="flex items-center justify-between rounded-lg border border-green-500/15 bg-green-500/[0.03] px-3 py-2">
                      <div>
                        <div className="text-[10px] text-green-400 font-semibold uppercase">{g.sport}</div>
                        <div className="text-xs text-foreground/70">{g.homeTeam} vs {g.awayTeam}</div>
                      </div>
                      <div className="text-sm font-bold text-foreground tabular-nums">
                        {g.homeScore}–{g.awayScore}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
