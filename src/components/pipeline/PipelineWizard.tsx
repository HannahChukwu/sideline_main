"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, ChevronLeft, ClipboardCopy, ImagePlus, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { ScheduleImporter } from "@/components/schedule/ScheduleImporter";
import { MOCK_ATHLETES, MOCK_TEAMS } from "@/lib/pipeline/mock-data";
import type { Athlete, GenerationRequest, GameEvent, PostDraft, PostType, Team } from "@/lib/pipeline/types";
import type { ImportedGameEvent } from "@/lib/schedule/parseCsv";
import { compileImagePrompt } from "@/lib/prompt/compileImagePrompt";
import { compileCaptionPrompt } from "@/lib/prompt/compileCaptionPrompt";
import { buildCopyFromRequest } from "@/lib/editor/buildCopyFromRequest";
import { DEFAULT_POST_LAYOUT } from "@/lib/editor/defaultLayout";
import { createClient } from "@/lib/supabase/client";
import { getTeamsForDesigner } from "@/lib/supabase/teams";
import { getAthletesForTeam } from "@/lib/supabase/athletes";
import { saveManagerDraft as saveManagerDraftToSupabase } from "@/lib/supabase/managerDraft";
import { getSchedulesForTeam, replaceTeamScheduleFromImport, updateScheduleScore } from "@/lib/supabase/schedules";
import { generateImage } from "@/lib/imageGen/provider";

type StepId = "team" | "athletes" | "schedule" | "postType" | "review";

const STEPS: { id: StepId; label: string }[] = [
  { id: "team", label: "Team" },
  { id: "athletes", label: "Athletes" },
  { id: "schedule", label: "Schedule" },
  { id: "postType", label: "Post type" },
  { id: "review", label: "Review" },
];

const POST_TYPES: { value: PostType; label: string; desc: string }[] = [
  { value: "gameday", label: "Game Day", desc: "Match announcement graphic for a specific date" },
  { value: "hype", label: "Hype", desc: "Big energy teaser for upcoming competition" },
  { value: "announcement", label: "Announcement", desc: "General news: tryouts, tickets, senior night, etc." },
];

function stepIndex(step: StepId) {
  return STEPS.findIndex((s) => s.id === step);
}

function nextStep(step: StepId): StepId {
  const idx = stepIndex(step);
  return STEPS[Math.min(idx + 1, STEPS.length - 1)].id;
}

function prevStep(step: StepId): StepId {
  const idx = stepIndex(step);
  return STEPS[Math.max(idx - 1, 0)].id;
}

function toGameEvents(imported: ImportedGameEvent[]): GameEvent[] {
  return imported.map((ev, idx) => ({
    id: `evt-${idx}-${ev.opponent}`.replace(/\s+/g, "-").toLowerCase(),
    opponent: ev.opponent,
    dateTime: ev.dateTime,
    dateText: ev.dateText,
    timeText: ev.timeText,
    location: ev.location,
    homeAway: ev.homeAway,
  }));
}

export function PipelineWizard() {
  const router = useRouter();
  const [step, setStep] = useState<StepId>("team");
  const [schedule, setSchedule] = useState<GameEvent[]>([]);
  const [scheduleMeta, setScheduleMeta] = useState<Record<string, { homeScore: string; awayScore: string; final: boolean }>>({});

  const [teams, setTeams] = useState<Team[]>(MOCK_TEAMS);
  const [athletesByTeamId, setAthletesByTeamId] = useState<Record<string, Athlete[]>>({});

  const [draft, setDraft] = useState<PostDraft>({
    teamId: null,
    athleteIds: [],
    postType: "gameday",
    eventId: null,
    captionNotes: "",
  });

  const supabase = useMemo(() => createClient(), []);
  const [signedInUserId, setSignedInUserId] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setSignedInUserId(user?.id ?? null));
  }, [supabase]);

  useEffect(() => {
    let cancelled = false;
    getTeamsForDesigner(supabase)
      .then((list) => {
        if (!cancelled && list.length > 0) setTeams(list);
      })
      .catch(() => {
        if (!cancelled) setTeams(MOCK_TEAMS);
      });
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  useEffect(() => {
    if (!draft.teamId) return;
    const teamId = draft.teamId;
    let cancelled = false;
    getAthletesForTeam(supabase, teamId)
      .then((list) => {
        if (!cancelled) setAthletesByTeamId((prev) => ({ ...prev, [teamId]: list }));
      })
      .catch(() => {
        if (!cancelled)
          setAthletesByTeamId((prev) => ({
            ...prev,
            [teamId]: MOCK_ATHLETES.filter((a) => a.teamId === teamId),
          }));
      });
    return () => {
      cancelled = true;
    };
  }, [draft.teamId, supabase]);

  useEffect(() => {
    if (!draft.teamId) return;
    const teamId = draft.teamId;
    let cancelled = false;
    getSchedulesForTeam(supabase, teamId)
      .then((rows) => {
        if (cancelled) return;
        const events: GameEvent[] = rows.map((r) => ({
          id: r.id,
          opponent: r.opponent,
          dateTime: r.date_time,
          dateText: r.date_text ?? undefined,
          timeText: r.time_text ?? undefined,
          location: r.location ?? undefined,
          homeAway: (r.home_away as GameEvent["homeAway"]) ?? undefined,
        }));
        setSchedule(events);
        setScheduleMeta((prev) => {
          const next = { ...prev };
          for (const r of rows) {
            next[r.id] = {
              homeScore: r.home_score === null || r.home_score === undefined ? "" : String(r.home_score),
              awayScore: r.away_score === null || r.away_score === undefined ? "" : String(r.away_score),
              final: Boolean(r.final),
            };
          }
          return next;
        });
        if (events.length > 0 && !draft.eventId) {
          setDraft((d) => ({ ...d, eventId: events[0]?.id ?? null }));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [draft.teamId, draft.eventId, supabase]);

  const athletesForTeam = useMemo(
    () => (draft.teamId ? athletesByTeamId[draft.teamId] ?? [] : []),
    [draft.teamId, athletesByTeamId]
  );

  const selectedTeam = useMemo(
    () => teams.find((t) => t.id === draft.teamId) ?? null,
    [teams, draft.teamId]
  );

  const selectedAthletes = useMemo(
    () => athletesForTeam.filter((a) => draft.athleteIds.includes(a.id)),
    [athletesForTeam, draft.athleteIds]
  );

  const selectedEvent = useMemo(
    () => schedule.find((e) => e.id === draft.eventId) ?? null,
    [schedule, draft.eventId]
  );

  const canContinue = useMemo(() => {
    if (step === "team") return !!draft.teamId;
    if (step === "athletes") return draft.athleteIds.length > 0;
    if (step === "schedule") return schedule.length > 0 && !!draft.eventId;
    if (step === "postType") return !!draft.postType;
    return true;
  }, [step, draft, schedule]);

  const generationRequest: GenerationRequest | null = useMemo(() => {
    if (!selectedTeam || !selectedEvent) return null;
    return {
      team: selectedTeam,
      athletes: selectedAthletes,
      event: selectedEvent,
      postType: draft.postType,
      captionNotes: draft.captionNotes.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
  }, [selectedTeam, selectedEvent, selectedAthletes, draft.postType, draft.captionNotes]);

  const compiledImagePrompt = useMemo(
    () => (generationRequest ? compileImagePrompt(generationRequest) : null),
    [generationRequest]
  );
  const compiledCaptionPrompt = useMemo(
    () => (generationRequest ? compileCaptionPrompt(generationRequest) : null),
    [generationRequest]
  );

  const [imagePromptOverride, setImagePromptOverride] = useState("");
  const [captionPromptOverride, setCaptionPromptOverride] = useState("");
  const [referenceImages, setReferenceImages] = useState<
    { name: string; type: string; dataUrl: string }[]
  >([]);

  const effectiveImagePrompt = imagePromptOverride.trim().length
    ? imagePromptOverride
    : compiledImagePrompt ?? "";
  const effectiveCaptionPrompt = captionPromptOverride.trim().length
    ? captionPromptOverride
    : compiledCaptionPrompt ?? "";

  return (
    <div className="min-h-screen px-6 py-10 max-w-5xl mx-auto">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <div className="text-[10px] font-bold tracking-[0.35em] uppercase text-muted-foreground/60">
            Program & schedule
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight mt-1">
            Build a post in minutes
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-xl">
            Select a team, choose featured athletes, import a schedule (Excel or CSV), then assemble an AI-ready post draft you can edit.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/designer/team">Designer Team</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/">Home</Link>
          </Button>
        </div>
      </div>

      <div className="mb-6 flex items-center gap-2 flex-wrap">
        {STEPS.map((s) => {
          const active = s.id === step;
          const done = stepIndex(s.id) < stepIndex(step);
          return (
            <div
              key={s.id}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold tracking-wide",
                active ? "border-primary/30 bg-primary/10 text-primary" : "border-white/10 bg-white/[0.03] text-muted-foreground",
                done && "text-foreground/70"
              )}
            >
              {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : <div className="w-3.5 h-3.5 rounded-full border border-white/20" />}
              {s.label}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5">
        <div className="flex flex-col gap-5">
          {step === "team" && (
            <Card>
              <CardHeader>
                <CardTitle>Select team</CardTitle>
                <CardDescription>Pick the team you’re creating content for.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {teams.map((t) => {
                    const active = draft.teamId === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setDraft((d) => ({ ...d, teamId: t.id, athleteIds: [], eventId: null }))}
                        className={cn(
                          "text-left rounded-xl border p-4 transition-all",
                          active ? "border-primary/30 bg-primary/10" : "border-white/10 bg-white/[0.02] hover:bg-white/[0.04]"
                        )}
                      >
                        <div className="text-sm font-bold">{t.schoolName}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {t.teamName} • {t.sport} • {t.season}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {step === "athletes" && (
            <Card>
              <CardHeader>
                <CardTitle>Select featured athletes</CardTitle>
                <CardDescription>Choose one or more athletes to feature in the post.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {!draft.teamId ? (
                  <div className="text-sm text-muted-foreground">Select a team first.</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {athletesForTeam.map((a) => {
                      const active = draft.athleteIds.includes(a.id);
                      return (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() =>
                            setDraft((d) => ({
                              ...d,
                              athleteIds: active ? d.athleteIds.filter((x) => x !== a.id) : [...d.athleteIds, a.id],
                            }))
                          }
                          className={cn(
                            "text-left rounded-xl border p-4 transition-all",
                            active ? "border-primary/30 bg-primary/10" : "border-white/10 bg-white/[0.02] hover:bg-white/[0.04]"
                          )}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-sm font-bold truncate">{a.fullName}</div>
                              <div className="text-xs text-muted-foreground mt-1 truncate">
                                {a.number ? `#${a.number}` : "—"}{a.position ? ` • ${a.position}` : ""}
                              </div>
                            </div>
                            {active && <CheckCircle2 className="w-4 h-4 text-primary" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {step === "schedule" && (
            <div className="flex flex-col gap-4">
              <ScheduleImporter
                onImport={async (events) => {
                  if (!draft.teamId) return;
                  await replaceTeamScheduleFromImport(supabase, draft.teamId, events);
                  const rows = await getSchedulesForTeam(supabase, draft.teamId);
                  const converted: GameEvent[] = rows.map((r) => ({
                    id: r.id,
                    opponent: r.opponent,
                    dateTime: r.date_time,
                    dateText: r.date_text ?? undefined,
                    timeText: r.time_text ?? undefined,
                    location: r.location ?? undefined,
                    homeAway: (r.home_away as GameEvent["homeAway"]) ?? undefined,
                  }));
                  setSchedule(converted);
                  setDraft((d) => ({ ...d, eventId: converted[0]?.id ?? null }));
                  setScheduleMeta(
                    Object.fromEntries(
                      rows.map((r) => [
                        r.id,
                        {
                          homeScore: r.home_score === null || r.home_score === undefined ? "" : String(r.home_score),
                          awayScore: r.away_score === null || r.away_score === undefined ? "" : String(r.away_score),
                          final: Boolean(r.final),
                        },
                      ])
                    )
                  );
                }}
              />

              {schedule.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Pick the matchup</CardTitle>
                    <CardDescription>Select the game you want to announce.</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3">
                    <div className="text-xs font-semibold text-foreground/60 uppercase tracking-wider">
                      Event
                    </div>
                    <select
                      value={draft.eventId ?? ""}
                      onChange={(e) => setDraft((d) => ({ ...d, eventId: e.target.value || null }))}
                      className={cn(
                        "h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none",
                        "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                      )}
                    >
                      {schedule.map((ev) => (
                        <option key={ev.id} value={ev.id}>
                          {ev.opponent} — {(ev.dateText ?? "date")} {ev.timeText ?? ""}
                        </option>
                      ))}
                    </select>

                    {draft.eventId && (
                      <div className="mt-2 rounded-xl border border-white/10 bg-white/[0.02] p-4">
                        <div className="text-xs font-semibold tracking-widest uppercase text-muted-foreground/70 mb-3">
                          Final score (optional)
                        </div>
                        <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
                          <div className="flex flex-col gap-1.5">
                            <div className="text-[11px] font-semibold text-foreground/60 uppercase tracking-wider">
                              Home
                            </div>
                            <Input
                              type="number"
                              value={scheduleMeta[draft.eventId]?.homeScore ?? ""}
                              onChange={(e) =>
                                setScheduleMeta((m) => ({
                                  ...m,
                                  [draft.eventId!]: {
                                    homeScore: e.target.value,
                                    awayScore: m[draft.eventId!]?.awayScore ?? "",
                                    final: m[draft.eventId!]?.final ?? false,
                                  },
                                }))
                              }
                            />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <div className="text-[11px] font-semibold text-foreground/60 uppercase tracking-wider">
                              Away
                            </div>
                            <Input
                              type="number"
                              value={scheduleMeta[draft.eventId]?.awayScore ?? ""}
                              onChange={(e) =>
                                setScheduleMeta((m) => ({
                                  ...m,
                                  [draft.eventId!]: {
                                    homeScore: m[draft.eventId!]?.homeScore ?? "",
                                    awayScore: e.target.value,
                                    final: m[draft.eventId!]?.final ?? false,
                                  },
                                }))
                              }
                            />
                          </div>
                          <label className="flex items-center gap-2 text-xs font-semibold text-foreground/70 select-none pb-2">
                            <input
                              type="checkbox"
                              checked={scheduleMeta[draft.eventId]?.final ?? false}
                              onChange={(e) =>
                                setScheduleMeta((m) => ({
                                  ...m,
                                  [draft.eventId!]: {
                                    homeScore: m[draft.eventId!]?.homeScore ?? "",
                                    awayScore: m[draft.eventId!]?.awayScore ?? "",
                                    final: e.target.checked,
                                  },
                                }))
                              }
                            />
                            Final
                          </label>
                        </div>

                        <div className="mt-3 flex items-center justify-end">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              if (!draft.eventId) return;
                              const meta = scheduleMeta[draft.eventId];
                              const home = meta?.homeScore?.trim() ? Number(meta.homeScore) : null;
                              const away = meta?.awayScore?.trim() ? Number(meta.awayScore) : null;
                              await updateScheduleScore(supabase, draft.eventId, {
                                home_score: Number.isFinite(home as number) ? (home as number) : null,
                                away_score: Number.isFinite(away as number) ? (away as number) : null,
                                final: Boolean(meta?.final),
                              });
                            }}
                          >
                            Save score
                          </Button>
                        </div>

                        <div className="mt-4 flex items-center justify-between gap-2">
                          <div className="text-[11px] text-muted-foreground">
                            Publish a graphic for this game so it appears in feeds.
                          </div>
                          <Button
                            type="button"
                            disabled={!signedInUserId || publishing}
                            onClick={async () => {
                              if (!signedInUserId || !selectedTeam || !selectedEvent || !draft.eventId) return;
                              setPublishError(null);
                              setPublishing(true);
                              try {
                                const meta = scheduleMeta[draft.eventId];
                                const isFinal = Boolean(meta?.final);
                                const home = meta?.homeScore?.trim() ? Number(meta.homeScore) : null;
                                const away = meta?.awayScore?.trim() ? Number(meta.awayScore) : null;

                                const prompt = [
                                  `${isFinal ? "final-score" : "gameday"} for ${selectedTeam.sport}`,
                                  `${selectedTeam.teamName} vs ${selectedEvent.opponent}`,
                                  selectedEvent.dateText ? `date: ${selectedEvent.dateText}` : "",
                                  selectedEvent.timeText ? `time: ${selectedEvent.timeText}` : "",
                                  isFinal && Number.isFinite(home as number) && Number.isFinite(away as number)
                                    ? `score: ${home}-${away}`
                                    : "",
                                ]
                                  .filter(Boolean)
                                  .join(" | ");

                                const img = await generateImage({ prompt });
                                const now = new Date().toISOString();

                                const { error: insErr } = await supabase.from("assets").insert({
                                  designer_id: signedInUserId,
                                  team_id: selectedTeam.id,
                                  schedule_id: draft.eventId,
                                  title: `${selectedTeam.teamName} vs ${selectedEvent.opponent}`,
                                  type: isFinal ? "final-score" : "gameday",
                                  status: "published",
                                  sport: selectedTeam.sport,
                                  home_team: selectedTeam.teamName,
                                  away_team: selectedEvent.opponent,
                                  home_score: Number.isFinite(home as number) ? (home as number) : null,
                                  away_score: Number.isFinite(away as number) ? (away as number) : null,
                                  event_date: (selectedEvent.dateText ?? "").slice(0, 10) || new Date().toISOString().slice(0, 10),
                                  image_url: img.imageUrl,
                                  created_at: now,
                                  updated_at: now,
                                  published_at: now,
                                });
                                if (insErr) throw insErr;

                                router.push("/feed");
                              } catch (e: unknown) {
                                setPublishError(e instanceof Error ? e.message : "Failed to publish");
                              } finally {
                                setPublishing(false);
                              }
                            }}
                          >
                            {publishing ? "Publishing…" : "Publish to feeds"}
                          </Button>
                        </div>
                        {publishError && (
                          <div className="mt-3 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                            {publishError}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {step === "postType" && (
            <Card>
              <CardHeader>
                <CardTitle>Select post type</CardTitle>
                <CardDescription>Choose the kind of post you’re building.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                {POST_TYPES.map((p) => {
                  const active = draft.postType === p.value;
                  return (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setDraft((d) => ({ ...d, postType: p.value }))}
                      className={cn(
                        "text-left rounded-xl border p-4 transition-all",
                        active ? "border-primary/30 bg-primary/10" : "border-white/10 bg-white/[0.02] hover:bg-white/[0.04]"
                      )}
                    >
                      <div className="text-sm font-bold">{p.label}</div>
                      <div className="text-xs text-muted-foreground mt-1">{p.desc}</div>
                    </button>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {step === "review" && (
            <Card>
              <CardHeader>
                <CardTitle>Review</CardTitle>
                <CardDescription>These variables will feed prompt building and the editor.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                    <div className="text-xs font-semibold tracking-widest uppercase text-muted-foreground/70 mb-2">
                      Caption notes (optional)
                    </div>
                    <Textarea
                      value={draft.captionNotes}
                      onChange={(e) => setDraft((d) => ({ ...d, captionNotes: e.target.value }))}
                      placeholder="Add a quick note for the caption (tone, hashtags, story)…"
                      className="min-h-[110px]"
                    />
                  </div>

                  <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                    <div className="text-xs font-semibold tracking-widest uppercase text-muted-foreground/70 mb-2">
                      Selected
                    </div>
                    <div className="text-sm font-semibold">
                      {selectedTeam ? `${selectedTeam.schoolName} — ${selectedTeam.teamName}` : "—"}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {selectedEvent ? `${selectedEvent.opponent} • ${selectedEvent.dateText ?? "—"} ${selectedEvent.timeText ?? ""}` : "—"}
                    </div>
                    <div className="mt-3 text-xs text-muted-foreground">
                      Athletes:{" "}
                      <span className="text-foreground/70 font-semibold">
                        {selectedAthletes.map((a) => a.fullName).join(", ") || "—"}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Post type: <span className="text-foreground/70 font-semibold">{draft.postType}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="text-xs font-semibold tracking-widest uppercase text-muted-foreground/70">
                        Image prompt (editable)
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          if (!effectiveImagePrompt.trim()) return;
                          await navigator.clipboard.writeText(effectiveImagePrompt);
                        }}
                        disabled={!effectiveImagePrompt.trim()}
                      >
                        <ClipboardCopy className="w-4 h-4" />
                        Copy
                      </Button>
                    </div>
                    <Textarea
                      value={effectiveImagePrompt}
                      onChange={(e) => setImagePromptOverride(e.target.value)}
                      className="min-h-[360px] font-mono text-[12px]"
                      placeholder="Complete earlier steps to compile the image prompt."
                    />
                  </div>

                  <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="text-xs font-semibold tracking-widest uppercase text-muted-foreground/70">
                        Caption prompt (editable)
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          if (!effectiveCaptionPrompt.trim()) return;
                          await navigator.clipboard.writeText(effectiveCaptionPrompt);
                        }}
                        disabled={!effectiveCaptionPrompt.trim()}
                      >
                        <ClipboardCopy className="w-4 h-4" />
                        Copy
                      </Button>
                    </div>
                    <Textarea
                      value={effectiveCaptionPrompt}
                      onChange={(e) => setCaptionPromptOverride(e.target.value)}
                      className="min-h-[360px] font-mono text-[12px]"
                      placeholder="Complete earlier steps to compile the caption prompt."
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="text-xs font-semibold tracking-widest uppercase text-muted-foreground/70">
                      Reference images (optional)
                    </div>
                    <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.03] text-xs font-semibold text-foreground/70 hover:bg-white/[0.05] cursor-pointer transition-all">
                      <ImagePlus className="w-4 h-4" />
                      Add images
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={async (e) => {
                          const files = Array.from(e.target.files ?? []);
                          if (!files.length) return;

                          const next: { name: string; type: string; dataUrl: string }[] = [];
                          for (const f of files.slice(0, 6)) {
                            const dataUrl = await new Promise<string>((resolve, reject) => {
                              const reader = new FileReader();
                              reader.onload = () => resolve(String(reader.result ?? ""));
                              reader.onerror = () => reject(new Error("Failed to read file"));
                              reader.readAsDataURL(f);
                            });
                            next.push({ name: f.name, type: f.type, dataUrl });
                          }

                          setReferenceImages((cur) => [...cur, ...next].slice(0, 6));
                          e.target.value = "";
                        }}
                      />
                    </label>
                  </div>

                  {referenceImages.length === 0 ? (
                    <div className="text-sm text-muted-foreground">
                      Add athlete photos, logo, or a style reference. Later, these can be sent with the image-generation request.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                      {referenceImages.map((img) => (
                        <div
                          key={`${img.name}-${img.dataUrl.slice(0, 24)}`}
                          className="relative aspect-square rounded-lg overflow-hidden border border-white/10 bg-white/[0.03]"
                          title={img.name}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={img.dataUrl} alt={img.name} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}

                  {referenceImages.length > 0 && (
                    <div className="mt-3 flex items-center justify-end">
                      <Button type="button" variant="outline" size="sm" onClick={() => setReferenceImages([])}>
                        Clear images
                      </Button>
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="text-xs font-semibold tracking-widest uppercase text-muted-foreground/70">
                      GenerationRequest JSON
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        if (!generationRequest) return;
                        await navigator.clipboard.writeText(JSON.stringify(generationRequest, null, 2));
                      }}
                      disabled={!generationRequest}
                    >
                      <ClipboardCopy className="w-4 h-4" />
                      Copy
                    </Button>
                  </div>
                  <pre className="text-[11px] overflow-auto max-h-[240px] rounded-lg bg-black/20 border border-white/10 p-3">
                    {generationRequest ? JSON.stringify(generationRequest, null, 2) : "Complete the steps to generate a request."}
                  </pre>
                </div>

                {!signedInUserId && (
                  <p className="text-sm text-muted-foreground">
                    Sign in to save your draft and open the editor.
                  </p>
                )}
                <div className="flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    disabled={!signedInUserId || !generationRequest || !effectiveImagePrompt.trim() || !effectiveCaptionPrompt.trim()}
                    onClick={async () => {
                      if (!generationRequest || !effectiveImagePrompt.trim() || !effectiveCaptionPrompt.trim()) return;
                      const { data: { user } } = await supabase.auth.getUser();
                      if (!user) return;
                      await saveManagerDraftToSupabase(supabase, user.id, {
                        generationRequest,
                        compiledImagePrompt: effectiveImagePrompt,
                        compiledCaptionPrompt: effectiveCaptionPrompt,
                        referenceImageIds: [],
                        editorCopy: buildCopyFromRequest(generationRequest),
                        editorLayout: DEFAULT_POST_LAYOUT,
                      });
                      router.push("/designer/editor");
                    }}
                  >
                    <Sparkles className="w-4 h-4" />
                    Generate (stub) → Editor
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <Card size="sm">
            <CardHeader className="pb-0">
              <CardTitle>Progress</CardTitle>
              <CardDescription>Finish each step to continue.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="text-xs text-muted-foreground">
                Team: <span className="font-semibold text-foreground/70">{selectedTeam ? selectedTeam.teamName : "—"}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                Athletes: <span className="font-semibold text-foreground/70">{draft.athleteIds.length || "—"}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                Event: <span className="font-semibold text-foreground/70">{selectedEvent ? selectedEvent.opponent : "—"}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                Type: <span className="font-semibold text-foreground/70">{draft.postType}</span>
              </div>
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader className="pb-0">
              <CardTitle>Controls</CardTitle>
              <CardDescription>Move through the workflow.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep((s) => prevStep(s))}
                disabled={step === "team"}
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </Button>
              <Button
                type="button"
                onClick={() => setStep((s) => nextStep(s))}
                disabled={!canContinue || step === "review"}
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </Button>

              <div className="mt-2 rounded-lg border border-white/10 bg-white/[0.02] p-3">
                <div className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground/60 mb-1">
                  Note
                </div>
                <div className="text-xs text-muted-foreground">
                  This flow runs without Supabase or AI keys. “Generate” will become real image generation later.
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

