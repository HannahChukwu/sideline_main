"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import {
  ArrowLeft,
  Sparkles,
  Loader2,
  Download,
  Share2,
  RefreshCw,
  Wand2,
  Send,
  MessageSquare,
  CheckCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  FlaskConical,
  ImagePlus,
  X,
  Check,
  Users,
  Calendar,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { SPORTS, ASSET_TYPES, type AssetType } from "@/lib/mock-data";
import { useAppStore } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";
import {
  uploadGenerationReference,
  uploadGeneratedPosterFromUrl,
} from "@/lib/supabase/referenceUpload";
import { getTeamsForDesigner } from "@/lib/supabase/teams";
import { getAthletesForTeam } from "@/lib/supabase/athletes";
import { getSchedulesForTeam, type ScheduleRow } from "@/lib/supabase/schedules";
import type { Athlete, Team } from "@/lib/pipeline/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { TeamInstagramRow } from "@/lib/instagram/teamInstagram";
import { applyScheduleRowToPosterForm, formatScheduleRowOptionLabel } from "@/lib/schedule/applyScheduleToForm";
import {
  REPLICATE_IMAGE_MODEL_ID,
  REPLICATE_IMAGE_MODEL_LABEL,
} from "@/lib/imageGen/replicateImageModel";
import {
  GENERATION_PRESETS,
  type GenerationPreset,
} from "@/lib/prompt/generationPresets";

interface FormState {
  preset: GenerationPreset;
  type: AssetType;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: string;
  awayScore: string;
  eventDate: string;
  venue: string;
  gameTime: string;
  broadcastOrStreaming: string;
  hashtag: string;
  customPrompt: string;
  style: string;
  format: string;
  colorPalette: string;
  composition: string;
  lighting: string;
  mood: string;
}

interface ChatMessage {
  role: "user";
  content: string;
}

const STYLES = [
  { value: "illustrated", label: "Illustrated", description: "Painted poster collage" },
  { value: "bold", label: "Bold", description: "High contrast, explosive" },
  { value: "cinematic", label: "Cinematic", description: "Epic movie-poster" },
  { value: "retro", label: "Retro", description: "Vintage 70s–80s style" },
  { value: "minimal", label: "Minimal", description: "Clean & understated" },
];

const FORMATS = [
  { value: "story", label: "Story", description: "9:16 · Instagram / TikTok" },
  { value: "post", label: "Post", description: "1:1 · Instagram / X" },
  { value: "banner", label: "Banner", description: "16:9 · Twitter / Web" },
];

const COLOR_PALETTES = [
  { value: "", label: "Auto", description: "AI picks from team", colors: [] as string[] },
  { value: "red and white", label: "Red & White", description: "", colors: ["#CC0000", "#FFFFFF"] },
  { value: "blue and gold", label: "Blue & Gold", description: "", colors: ["#003DA5", "#FFB612"] },
  { value: "black and orange", label: "Black & Orange", description: "", colors: ["#111111", "#FF6900"] },
  { value: "green and white", label: "Green & White", description: "", colors: ["#006400", "#FFFFFF"] },
  { value: "purple and gold", label: "Purple & Gold", description: "", colors: ["#4B0082", "#FFD700"] },
  { value: "navy and silver", label: "Navy & Silver", description: "", colors: ["#001F5B", "#C0C0C0"] },
  { value: "maroon and gold", label: "Maroon & Gold", description: "", colors: ["#800000", "#FFD700"] },
  { value: "black and red", label: "Black & Red", description: "", colors: ["#111111", "#CC0000"] },
];

const COMPOSITION_OPTIONS = [
  { value: "", label: "Auto", description: "AI decides" },
  { value: "single hero athlete in foreground, massive close-up shot dominating the frame", label: "Hero Athlete", description: "One player, close up" },
  { value: "full team group together, team huddle or celebration with all players visible", label: "Team Group", description: "Full squad shown" },
  { value: "ball or sport equipment as central visual hero, athlete in background", label: "Equipment Focus", description: "Ball / gear hero" },
  { value: "wide stadium establishing shot, crowd filling the stands, venue as the star", label: "Venue / Crowd", description: "Stadium atmosphere" },
  { value: "split composition with both teams facing each other from opposite sides of center", label: "Matchup Split", description: "Both teams vs." },
];

const LIGHTING_OPTIONS = [
  { value: "", label: "Auto", description: "AI decides" },
  { value: "dramatic dark underlighting with deep shadows and high contrast chiaroscuro", label: "Dramatic Dark", description: "Dark & moody" },
  { value: "bright stadium floodlights, high key lighting, vivid and energetic", label: "Stadium Lights", description: "Bright & vivid" },
  { value: "golden hour warm sunset, long shadows, amber and orange glow", label: "Golden Hour", description: "Warm & cinematic" },
  { value: "night game, electric blue-black sky, neon stadium lights, cool tones", label: "Night Game", description: "Night atmosphere" },
  { value: "crisp daytime natural sunlight, clean open bright light", label: "Daytime Sun", description: "Clean & natural" },
];

const MOOD_OPTIONS = [
  { value: "", label: "Auto", description: "Matches asset type" },
  { value: "maximum hype, explosive energy, electric game-day intensity", label: "Hype / Intense", description: "Max energy" },
  { value: "triumphant victory celebration, pure joy and euphoria, fists raised", label: "Celebratory", description: "Victory energy" },
  { value: "epic cinematic gravitas, historic and legendary, larger than life", label: "Epic / Dramatic", description: "Grand scale" },
  { value: "motivational, determined, locked in focus, warrior ready, coiled energy", label: "Motivational", description: "Focused & driven" },
  { value: "clean, professional, confident and polished, brand-level restraint", label: "Professional", description: "Clean & sharp" },
];

const FORMAT_ASPECT: Record<string, string> = {
  story: "aspect-[9/16]",
  post: "aspect-square",
  banner: "aspect-video",
};

function InstagramGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}

export default function CreateAsset() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    preset: "custom",
    type: "gameday",
    sport: "Basketball",
    homeTeam: "",
    awayTeam: "",
    homeScore: "",
    awayScore: "",
    eventDate: "",
    venue: "",
    gameTime: "",
    broadcastOrStreaming: "",
    hashtag: "",
    customPrompt: "",
    style: "illustrated",
    format: "story",
    colorPalette: "",
    composition: "",
    lighting: "",
    mood: "",
  });
  /** Order: athlete, home logo, away logo — matches API image_input order (image 1–3). */
  const [refAthleteFile, setRefAthleteFile] = useState<File | null>(null);
  const [refHomeLogoFile, setRefHomeLogoFile] = useState<File | null>(null);
  const [refAwayLogoFile, setRefAwayLogoFile] = useState<File | null>(null);

  const refPreviews = useMemo(
    () => ({
      athlete: refAthleteFile ? URL.createObjectURL(refAthleteFile) : null,
      homeLogo: refHomeLogoFile ? URL.createObjectURL(refHomeLogoFile) : null,
      awayLogo: refAwayLogoFile ? URL.createObjectURL(refAwayLogoFile) : null,
    }),
    [refAthleteFile, refHomeLogoFile, refAwayLogoFile]
  );

  useEffect(() => {
    return () => {
      if (refPreviews.athlete) URL.revokeObjectURL(refPreviews.athlete);
      if (refPreviews.homeLogo) URL.revokeObjectURL(refPreviews.homeLogo);
      if (refPreviews.awayLogo) URL.revokeObjectURL(refPreviews.awayLogo);
    };
  }, [refPreviews.athlete, refPreviews.homeLogo, refPreviews.awayLogo]);

  const [step, setStep] = useState<"form" | "generating" | "result" | "error">("form");
  const [showOptional, setShowOptional] = useState(false);
  const [devMode, setDevMode] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [generatedTitle, setGeneratedTitle] = useState<string>("");
  const [generatedTagline, setGeneratedTagline] = useState<string>("");
  const [generateError, setGenerateError] = useState<string>("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isRefining, setIsRefining] = useState(false);
  const [designerName, setDesignerName] = useState("");
  const [saveState, setSaveState] = useState<null | "saving" | "published" | "draft">(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [schoolTeams, setSchoolTeams] = useState<Team[]>([]);

  /** Context wizard: team → featured athletes → match, then full generator. */
  const [ctxComplete, setCtxComplete] = useState(false);
  const [ctxStep, setCtxStep] = useState<1 | 2 | 3>(1);
  const [genTeamId, setGenTeamId] = useState<string | null>(null);
  const [genAthleteIds, setGenAthleteIds] = useState<string[]>([]);
  const [genMatchId, setGenMatchId] = useState<string | null>(null);
  const [ctxRoster, setCtxRoster] = useState<Athlete[]>([]);
  const [ctxMatchRows, setCtxMatchRows] = useState<ScheduleRow[]>([]);
  const [ctxMatchErr, setCtxMatchErr] = useState<string | null>(null);
  // Instagram (per athletics team)
  const [teamIgRows, setTeamIgRows] = useState<TeamInstagramRow[]>([]);
  const [igDialogOpen, setIgDialogOpen] = useState(false);
  const [igTeamForPublish, setIgTeamForPublish] = useState<string | null>(null);
  const [igPublishing, setIgPublishing] = useState(false);
  const [igCaption, setIgCaption] = useState("");
  const [igPostError, setIgPostError] = useState<string | null>(null);
  const [igPostSuccess, setIgPostSuccess] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const addAsset          = useAppStore((s) => s.addAsset);
  const currentDesigner   = useAppStore((s) => s.currentDesigner);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) setSignedIn(Boolean(data.session?.user));
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(Boolean(session?.user));
    });
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    let cancelled = false;
    if (!signedIn) {
      setSchoolTeams([]);
      return;
    }
    getTeamsForDesigner(supabase)
      .then((list) => {
        if (!cancelled) setSchoolTeams(list);
      })
      .catch(() => {
        if (!cancelled) setSchoolTeams([]);
      });
    return () => {
      cancelled = true;
    };
  }, [signedIn, supabase]);

  const showContextWizard = signedIn && schoolTeams.length > 0 && !ctxComplete;

  useEffect(() => {
    if (!showContextWizard || genTeamId) return;
    if (schoolTeams.length === 1) setGenTeamId(schoolTeams[0].id);
  }, [showContextWizard, genTeamId, schoolTeams]);

  useEffect(() => {
    if (!genTeamId) {
      setCtxRoster([]);
      setCtxMatchRows([]);
      setCtxMatchErr(null);
      return;
    }
    let cancelled = false;
    getAthletesForTeam(supabase, genTeamId)
      .then((list) => {
        if (!cancelled) setCtxRoster(list);
      })
      .catch(() => {
        if (!cancelled) setCtxRoster([]);
      });
    getSchedulesForTeam(supabase, genTeamId)
      .then((rows) => {
        if (!cancelled) {
          setCtxMatchRows(rows);
          setCtxMatchErr(null);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setCtxMatchRows([]);
          setCtxMatchErr(e instanceof Error ? e.message : "Could not load schedule");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [genTeamId, supabase]);

  const featuredAthleteNames = useMemo(() => {
    const set = new Set(genAthleteIds);
    return ctxRoster.filter((a) => set.has(a.id)).map((a) => a.fullName);
  }, [ctxRoster, genAthleteIds]);

  function toggleFeaturedAthlete(id: string) {
    setGenAthleteIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function selectTeamForCtx(id: string) {
    setGenTeamId(id);
    setGenAthleteIds([]);
    setGenMatchId(null);
  }

  function finishContextWizard() {
    if (genTeamId && genMatchId) {
      const team = schoolTeams.find((t) => t.id === genTeamId);
      const row = ctxMatchRows.find((r) => r.id === genMatchId);
      if (team && row) {
        const patch = applyScheduleRowToPosterForm(team, row);
        setForm((f) => ({
          ...f,
          ...patch,
          type: row.final ? "final-score" : f.type === "final-score" ? "gameday" : f.type,
        }));
      }
    } else if (genTeamId) {
      const team = schoolTeams.find((t) => t.id === genTeamId);
      if (team) {
        setForm((f) => ({ ...f, sport: team.sport }));
      }
    }
    setCtxComplete(true);
  }

  const isScoreType = form.type === "final-score";

  const defaultInstagramCaption = useMemo(() => {
    const teamA = form.homeTeam || "Team";
    const teamB = form.awayTeam || "Opponent";
    const when = form.eventDate ? `📅 ${form.eventDate}` : "Game day";
    const scoreLine =
      isScoreType && form.homeScore && form.awayScore
        ? `Final score: ${form.homeScore}-${form.awayScore}`
        : "";

    const tags = ["#SidelineStudio", "#GameDay", "#Athletics"]
      .concat(teamA.trim() ? [`#${teamA.trim().replace(/\s+/g, "")}`] : [])
      .concat(teamB.trim() ? [`#${teamB.trim().replace(/\s+/g, "")}`] : [])
      .join(" ");

    const cta = "Be there.";

    const paragraphs = [
      `${teamA} vs ${teamB} ${when}`,
      [scoreLine, cta].filter(Boolean).join("\n"),
      tags,
    ].filter(Boolean);

    // Instagram captions can include multiple paragraphs via \n.
    return paragraphs.join("\n\n").slice(0, 2200);
  }, [form.awayScore, form.awayTeam, form.eventDate, form.homeScore, form.homeTeam, isScoreType]);

  // Pre-fill designer name from the store identity
  useEffect(() => {
    if (currentDesigner && !designerName) setDesignerName(currentDesigner);
  }, [currentDesigner, designerName]);

  useEffect(() => {
    let cancelled = false;
    if (!signedIn) {
      setTeamIgRows([]);
      return;
    }
    fetch("/api/instagram/teams", { credentials: "include" })
      .then((r) => r.json())
      .then((j: { teams?: TeamInstagramRow[] }) => {
        if (!cancelled) setTeamIgRows(Array.isArray(j.teams) ? j.teams : []);
      })
      .catch(() => {
        if (!cancelled) setTeamIgRows([]);
      });
    return () => {
      cancelled = true;
    };
  }, [signedIn]);

  useEffect(() => {
    if (!igDialogOpen) return;
    setIgPostError(null);
    setIgPostSuccess(null);
    if (genTeamId && teamIgRows.some((t) => t.id === genTeamId)) {
      setIgTeamForPublish(genTeamId);
    } else if (teamIgRows.length > 0) {
      setIgTeamForPublish((prev) => prev ?? teamIgRows[0]!.id);
    }
  }, [igDialogOpen, genTeamId, teamIgRows]);

  useEffect(() => {
    if (step !== "result") return;
    if (!generatedImage) return;

    // Only set a default caption if the user hasn't typed one yet.
    setIgCaption((prev) => (prev.trim().length ? prev : defaultInstagramCaption));
  }, [step, generatedImage, defaultInstagramCaption]);

  function set(key: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function applyPreset(preset: GenerationPreset) {
    const selected = GENERATION_PRESETS.find((p) => p.value === preset);
    if (!selected) return;
    setForm((f) => ({
      ...f,
      preset,
      mood: selected.moodEnergy || f.mood,
      lighting: selected.lighting || f.lighting,
      composition: selected.compositionFocus || f.composition,
      style:
        preset === "hype"
          ? "bold"
          : preset === "result"
          ? "minimal"
          : preset === "commitment"
          ? "cinematic"
          : f.style,
    }));
  }

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isRefining]);

  function buildMockImage(homeTeam: string, awayTeam: string, sport: string): string {
    const bgColors = ["#0f172a", "#1a1a2e", "#0d1117", "#111827", "#1c1917"];
    const accentColors = ["#6366f1", "#f97316", "#a855f7", "#3b82f6", "#10b981"];
    const seed = (homeTeam + awayTeam).length % bgColors.length;
    const bg = bgColors[seed];
    const accent = accentColors[seed];
    const home = homeTeam || "HOME";
    const away = awayTeam || "AWAY";
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
      <defs>
        <radialGradient id="g" cx="50%" cy="45%" r="60%">
          <stop offset="0%" stop-color="${accent}" stop-opacity="0.25"/>
          <stop offset="100%" stop-color="${bg}" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="1080" height="1920" fill="${bg}"/>
      <rect width="1080" height="1920" fill="url(#g)"/>
      <line x1="0" y1="960" x2="1080" y2="960" stroke="${accent}" stroke-width="2" stroke-opacity="0.15"/>
      <text x="540" y="640" text-anchor="middle" fill="white" font-size="110" font-weight="900" font-family="Arial Black,sans-serif" letter-spacing="-2" opacity="0.95">${home.substring(0,10)}</text>
      <text x="540" y="780" text-anchor="middle" fill="${accent}" font-size="64" font-weight="700" font-family="Arial,sans-serif" letter-spacing="12" opacity="0.8">VS</text>
      <text x="540" y="940" text-anchor="middle" fill="white" font-size="110" font-weight="900" font-family="Arial Black,sans-serif" letter-spacing="-2" opacity="0.95">${away.substring(0,10)}</text>
      <text x="540" y="1080" text-anchor="middle" fill="white" font-size="36" font-weight="400" font-family="Arial,sans-serif" letter-spacing="8" opacity="0.35">${sport.toUpperCase()}</text>
      <text x="540" y="1800" text-anchor="middle" fill="${accent}" font-size="22" font-weight="600" font-family="Arial,sans-serif" letter-spacing="4" opacity="0.5">DEV PLACEHOLDER</text>
    </svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }

  async function generate(refinements: string[] = []) {
    const isInitial = refinements.length === 0;
    if (isInitial) {
      setStep("generating");
      setGenerateError("");
    } else {
      setIsRefining(true);
    }

    // ── Dev / mock mode: skip the API, return instantly ───────────────────
    if (devMode) {
      await new Promise((r) => setTimeout(r, 900)); // simulate brief delay
      setGeneratedImage(buildMockImage(form.homeTeam, form.awayTeam, form.sport));
      setGeneratedTitle(`${form.homeTeam || "Home"} vs ${form.awayTeam || "Away"}`);
      setGeneratedTagline(`${form.sport} · Mock Poster`);
      setStep("result");
      setIsRefining(false);
      return;
    }

    try {
      if (!devMode) {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session?.user) {
          const msg = "Sign in to generate posters. Open /auth to continue.";
          setGenerateError(msg);
          if (isInitial) setStep("error");
          setIsRefining(false);
          return;
        }
      }

      const referenceImageUrls: string[] = [];
      if (refAthleteFile || refHomeLogoFile || refAwayLogoFile) {
        const { data: userData, error: userErr } = await supabase.auth.getUser();
        if (userErr || !userData.user) {
          if (isInitial) {
            setGenerateError("Sign in to attach reference images (JPEG, PNG, GIF, or WebP, max 20MB each).");
            setStep("error");
          }
          setIsRefining(false);
          return;
        }
        const uid = userData.user.id;
        try {
          if (refAthleteFile) referenceImageUrls.push(await uploadGenerationReference(supabase, uid, refAthleteFile));
          if (refHomeLogoFile) referenceImageUrls.push(await uploadGenerationReference(supabase, uid, refHomeLogoFile));
          if (refAwayLogoFile) referenceImageUrls.push(await uploadGenerationReference(supabase, uid, refAwayLogoFile));
        } catch (upErr) {
          const msg = upErr instanceof Error ? upErr.message : "Reference upload failed";
          if (isInitial) {
            setGenerateError(msg);
            setStep("error");
          }
          setIsRefining(false);
          return;
        }
      }

      const res = await fetch("/api/generate", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: form.type,
          sport: form.sport,
          homeTeam: form.homeTeam,
          awayTeam: form.awayTeam,
          homeScore: form.homeScore || undefined,
          awayScore: form.awayScore || undefined,
          eventDate: form.eventDate || undefined,
          venue: form.venue.trim() || undefined,
          gameTime: form.gameTime.trim() || undefined,
          broadcastOrStreaming: form.broadcastOrStreaming.trim() || undefined,
          hashtag: form.hashtag.trim() || undefined,
          style: form.style,
          preset: form.preset,
          format: form.format,
          customPrompt: form.customPrompt || undefined,
          colorPalette: form.colorPalette || undefined,
          composition: form.composition || undefined,
          lighting: form.lighting || undefined,
          mood: form.mood || undefined,
          refinements: refinements.length > 0 ? refinements : undefined,
          referenceImageUrls: referenceImageUrls.length > 0 ? referenceImageUrls : undefined,
        }),
      });
      const data = (await res.json()) as {
        error?: string | Record<string, unknown>;
        imageUrl?: string;
        title?: string;
        tagline?: string;
      };
      if (!res.ok) {
        let message: string;
        if (res.status === 401) {
          message = "Sign in to generate posters. Open /auth if you’re not signed in.";
        } else if (res.status === 429) {
          const retry = res.headers.get("Retry-After");
          const base =
            typeof data.error === "string"
              ? data.error
              : "Generation limit reached. Try again later.";
          message = retry ? `${base} Retry in about ${retry}s.` : base;
        } else if (res.status === 503) {
          message =
            typeof data.error === "string"
              ? data.error
              : "Service temporarily unavailable.";
        } else if (typeof data.error === "string") {
          message = data.error;
        } else if (res.status === 400) {
          message = "Invalid request — check required fields.";
        } else {
          message = "Generation failed";
        }
        setGenerateError(message);
        if (isInitial) setStep("error");
        return;
      }
      if (!data.imageUrl) {
        setGenerateError("Generation response missing image.");
        if (isInitial) setStep("error");
        return;
      }
      setGeneratedImage(data.imageUrl);
      setGeneratedTitle(data.title ?? "");
      setGeneratedTagline(data.tagline ?? "");
      setStep("result");
    } catch {
      if (isInitial) {
        setGenerateError("Network error — please try again");
        setStep("error");
      }
    } finally {
      setIsRefining(false);
    }
  }

  async function sendChatMessage() {
    if (!chatInput.trim() || isRefining || (!devMode && !signedIn)) return;
    const message = chatInput.trim();
    const updated = [...chatMessages, { role: "user" as const, content: message }];
    setChatMessages(updated);
    setChatInput("");
    await generate(updated.map((m) => m.content));
  }

  function regenerate() {
    if (!devMode && !signedIn) return;
    setChatMessages([]);
    setSaveState(null);
    setSaveError(null);
    generate([]);
  }

  async function saveAsset(status: "published" | "draft") {
    if (!generatedImage) return;
    setSaveError(null);
    setSaveState("saving");
    let imageUrl = generatedImage;
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (uid) {
        imageUrl = await uploadGeneratedPosterFromUrl(supabase, uid, generatedImage);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not archive poster image.";
      setSaveError(msg);
      setSaveState(null);
      return;
    }
    addAsset({
      title: generatedTitle || `${form.homeTeam} vs ${form.awayTeam}`,
      tagline: generatedTagline || "",
      type: form.type,
      status,
      sport: form.sport,
      homeTeam: form.homeTeam,
      awayTeam: form.awayTeam,
      homeScore: form.homeScore ? Number(form.homeScore) : undefined,
      awayScore: form.awayScore ? Number(form.awayScore) : undefined,
      eventDate: form.eventDate || new Date().toISOString().split("T")[0],
      imageUrl,
      style: form.style,
      format: form.format,
      designerName: designerName.trim() || currentDesigner || "Designer",
    });
    setSaveState(status === "published" ? "published" : "draft");
  }

  const instagramMediaType = useMemo(() => (form.format === "story" ? "STORIES" : "FEED"), [form.format]);

  async function publishToTeamInstagram() {
    if (!generatedImage) return;
    if (!igTeamForPublish) {
      setIgPostError("Select a team.");
      return;
    }
    const row = teamIgRows.find((t) => t.id === igTeamForPublish);
    if (!row?.igConnected) {
      setIgPostError("Connect Instagram for this team using the link below.");
      return;
    }
    if (instagramMediaType === "FEED" && !igCaption.trim()) {
      setIgPostError("Add a caption for a feed post. Put hashtags in the caption (e.g. #GameDay).");
      return;
    }

    setIgPublishing(true);
    setIgPostError(null);
    setIgPostSuccess(null);

    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData.user) {
        setIgPostError("Sign in to publish to Instagram.");
        return;
      }

      let imageUrl = generatedImage;
      try {
        imageUrl = await uploadGeneratedPosterFromUrl(supabase, userData.user.id, generatedImage);
        setGeneratedImage(imageUrl);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Could not prepare image for Instagram.";
        setIgPostError(msg);
        return;
      }

      if (!imageUrl.startsWith("https://")) {
        setIgPostError("A public https image URL is required for Instagram.");
        return;
      }

      const res = await fetch("/api/instagram/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          teamId: igTeamForPublish,
          imageUrl,
          mediaType: instagramMediaType,
          caption: instagramMediaType === "FEED" ? igCaption.trim() : "",
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setIgPostError(typeof data.error === "string" ? data.error : "Publish failed.");
        return;
      }
      setIgPostSuccess(
        instagramMediaType === "STORIES"
          ? "Published to the team’s Instagram story."
          : "Published to the team’s Instagram feed."
      );
    } catch {
      setIgPostError("Network error while publishing.");
    } finally {
      setIgPublishing(false);
    }
  }

  /* ─── Shared picker style helpers ──────────────────────────────────── */
  const pill = (active: boolean) =>
    `flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm font-medium transition-all text-left ${
      active
        ? "border-primary/40 bg-primary/10 text-primary"
        : "border-border/50 bg-card text-muted-foreground hover:border-border hover:text-foreground"
    }`;

  const pillDesc = (active: boolean) =>
    `text-xs font-normal ${active ? "text-primary/70" : "text-muted-foreground/50"}`;

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
          <span className="text-sm text-muted-foreground">Generator</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* ── Left — Form ─────────────────────────────────────────────────── */}
          <div className="space-y-5">

            {/* Header + Dev mode toggle */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold mb-1">Generator</h1>
                <p className="text-sm text-muted-foreground">
                  {showContextWizard
                    ? "Choose team, featured athletes, and match — then build your poster."
                    : "Pick a format, then describe your vision — or expand optional settings for fine control."}
                </p>
                <p className="text-xs text-muted-foreground mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                  <Sparkles className="w-3.5 h-3.5 shrink-0 text-primary/70" aria-hidden />
                  <span className="text-muted-foreground/90">Image model</span>
                  <span className="font-mono text-[11px] text-foreground/85 bg-muted/40 border border-border/40 rounded px-1.5 py-0.5">
                    {REPLICATE_IMAGE_MODEL_ID}
                  </span>
                  <span className="text-muted-foreground/70">({REPLICATE_IMAGE_MODEL_LABEL})</span>
                </p>
              </div>
              {(!showContextWizard || ctxComplete) && (
                <button
                  onClick={() => setDevMode((v) => !v)}
                  title="Toggle dev/mock mode"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold shrink-0 transition-all ${
                    devMode
                      ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                      : "bg-white/5 border-white/10 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <FlaskConical className="w-3.5 h-3.5" />
                  {devMode ? "Mock ON" : "Mock"}
                </button>
              )}
            </div>

            {step !== "result" && signedIn && schoolTeams.length === 0 && (
              <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.06] p-4 text-sm text-amber-200/90">
                Add teams, players, and schedules on the{" "}
                <Link href="/designer/team" className="font-semibold text-primary hover:underline">
                  Team
                </Link>{" "}
                tab first. You can still use the controls below manually if you prefer.
              </div>
            )}

            {(!showContextWizard || ctxComplete) && devMode && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/8 border border-amber-500/20 text-xs text-amber-400">
                <FlaskConical className="w-3.5 h-3.5 shrink-0" />
                Dev mode — generation uses a placeholder poster instantly. No API calls.
              </div>
            )}

            {step !== "result" && showContextWizard && (
              <div className="rounded-xl border border-primary/30 bg-primary/[0.06] p-5 space-y-4">
                <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wider">
                  <span className={ctxStep === 1 ? "text-primary" : "text-muted-foreground"}>1 · Team</span>
                  <span className="text-muted-foreground/40">→</span>
                  <span className={ctxStep === 2 ? "text-primary" : "text-muted-foreground"}>2 · Athletes</span>
                  <span className="text-muted-foreground/40">→</span>
                  <span className={ctxStep === 3 ? "text-primary" : "text-muted-foreground"}>3 · Match</span>
                </div>

                {ctxStep === 1 && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground flex items-center gap-2">
                      <Users className="w-3.5 h-3.5" />
                      Which team is this asset for?
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {schoolTeams.map((t) => {
                        const active = genTeamId === t.id;
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => selectTeamForCtx(t.id)}
                            className={`text-left rounded-xl border p-3 text-sm transition-all ${
                              active
                                ? "border-primary/40 bg-primary/10 text-primary"
                                : "border-border/50 bg-card text-foreground hover:border-border"
                            }`}
                          >
                            <div className="font-semibold">
                              {[t.schoolName, t.teamName].filter(Boolean).join(" · ") || t.teamName}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {t.sport} · {t.season}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {ctxStep === 2 && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      Select one or more athletes to feature (reference prompts can follow their photos below).
                    </p>
                    {ctxRoster.length === 0 ? (
                      <p className="text-xs text-destructive">
                        No players on this roster yet. Add them on the Team tab, or go back and pick another team.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {ctxRoster.map((a) => {
                          const on = genAthleteIds.includes(a.id);
                          return (
                            <button
                              key={a.id}
                              type="button"
                              onClick={() => toggleFeaturedAthlete(a.id)}
                              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
                                on
                                  ? "border-primary/40 bg-primary/15 text-primary"
                                  : "border-border/50 bg-card text-muted-foreground hover:border-border"
                              }`}
                            >
                              {on && <Check className="w-3.5 h-3.5" />}
                              {a.fullName}
                              {a.number ? ` · #${a.number}` : ""}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {ctxStep === 3 && genTeamId && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5" />
                      Pick the match to pre-fill date, time, venue, and opponent (from your uploaded schedule).
                    </p>
                    <select
                      value={genMatchId ?? ""}
                      onChange={(e) => setGenMatchId(e.target.value || null)}
                      className="w-full px-3 py-2.5 rounded-xl bg-card border border-border/50 text-sm text-foreground focus:outline-none focus:border-primary/40"
                    >
                      <option value="">
                        {ctxMatchRows.length === 0
                          ? "No games yet — import schedule on Team tab"
                          : "Select match…"}
                      </option>
                      {ctxMatchRows.map((row) => {
                        const team = schoolTeams.find((t) => t.id === genTeamId)!;
                        return (
                          <option key={row.id} value={row.id}>
                            {formatScheduleRowOptionLabel(team, row)}
                          </option>
                        );
                      })}
                    </select>
                    {ctxMatchErr && <p className="text-xs text-destructive">{ctxMatchErr}</p>}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/30">
                  <button
                    type="button"
                    onClick={() => setCtxComplete(true)}
                    className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
                  >
                    Skip setup — fill everything manually
                  </button>
                  <div className="flex-1 min-w-[8rem]" />
                  {ctxStep > 1 && (
                    <Button type="button" variant="outline" size="sm" onClick={() => setCtxStep((s) => (s === 2 ? 1 : 2))}>
                      Back
                    </Button>
                  )}
                  {ctxStep === 1 && (
                    <Button
                      type="button"
                      size="sm"
                      disabled={!genTeamId}
                      onClick={() => setCtxStep(2)}
                    >
                      Continue
                    </Button>
                  )}
                  {ctxStep === 2 && (
                    <Button
                      type="button"
                      size="sm"
                      disabled={genAthleteIds.length === 0}
                      onClick={() => setCtxStep(3)}
                    >
                      Continue
                    </Button>
                  )}
                  {ctxStep === 3 && (
                    <Button type="button" size="sm" onClick={() => finishContextWizard()}>
                      Continue to generator
                    </Button>
                  )}
                </div>
              </div>
            )}

            {ctxComplete && signedIn && schoolTeams.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setCtxComplete(false);
                  setCtxStep(1);
                }}
                className="text-xs font-medium text-primary hover:underline"
              >
                Edit team / athletes / match
              </button>
            )}

            {(!showContextWizard || ctxComplete) && (
            <>
            {/* ── Output Format (ALWAYS SHOWN — required) ─── */}
            <div>
              <label className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3 block">
                Output Format <span className="text-primary ml-1">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {FORMATS.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => set("format", f.value)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      form.format === f.value
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border/50 bg-card text-muted-foreground hover:border-border hover:text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-2">
                      {f.value === "story"  && <div className="w-3 h-5 rounded-sm border-2 border-current opacity-60" />}
                      {f.value === "post"   && <div className="w-4 h-4 rounded-sm border-2 border-current opacity-60" />}
                      {f.value === "banner" && <div className="w-6 h-3.5 rounded-sm border-2 border-current opacity-60" />}
                    </div>
                    <span className="block text-sm font-semibold">{f.label}</span>
                    <span className="block text-xs font-normal mt-0.5 opacity-60">{f.description}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* ── AI Generator (MAIN FOCUS — always shown pre-result) ─── */}
            {step !== "result" && (
              <div className="relative rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/5 to-primary/[0.02] overflow-hidden">
                {/* Glow accent */}
                <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="text-sm font-bold text-foreground">AI Generator</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-4">
                    Describe the poster you want — teams, vibe, special details, mascot, anything.
                    The AI will handle the rest.
                  </p>
                  <textarea
                    value={form.customPrompt}
                    onChange={(e) => set("customPrompt", e.target.value)}
                    placeholder="e.g. Falcons vs Eagles, game day energy, mascot flying in, school colors red & gold, crowd going wild in the background, big bold text..."
                    rows={5}
                    className="w-full px-4 py-3 rounded-xl bg-background/60 border border-primary/20 text-sm text-foreground placeholder:text-foreground/25 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/15 transition-all resize-none leading-relaxed"
                  />
                  {form.customPrompt.trim() && (
                    <p className="text-[11px] text-primary/60 mt-2 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      Great — hit Generate and the AI will build around your description.
                    </p>
                  )}
                </div>
              </div>
            )}

            {step !== "result" && (
              <div className="rounded-xl border border-border/50 bg-card/40 p-4 space-y-3">
                <div>
                  <p className="text-xs font-semibold text-foreground uppercase tracking-wider">
                    Presets
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Choose a starting mode for consistent results. You can still fine-tune all fields below.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {GENERATION_PRESETS.map((preset) => {
                    const active = form.preset === preset.value;
                    return (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => applyPreset(preset.value)}
                        className={`text-left rounded-xl border p-3 transition-all ${
                          active
                            ? "border-primary/40 bg-primary/10 text-primary"
                            : "border-border/50 bg-card text-muted-foreground hover:border-border hover:text-foreground"
                        }`}
                      >
                        <div className="text-sm font-semibold">{preset.label}</div>
                        <div className={`text-xs mt-1 ${active ? "text-primary/75" : "text-muted-foreground/70"}`}>
                          {preset.description}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Reference images — athlete + optional logos (Replicate image_input) ─── */}
            {step !== "result" && (
              <div className="rounded-xl border border-border/50 bg-card/40 p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <ImagePlus className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Reference images</p>
                    <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                      Optional. Order matters: <span className="text-foreground/80">1 — Athlete</span>,{" "}
                      <span className="text-foreground/80">2 — Home logo</span>,{" "}
                      <span className="text-foreground/80">3 — Away logo</span>. JPEG/PNG/GIF/WebP, max 20MB each. Sign in
                      required. You are responsible for rights and accuracy of logos.
                    </p>
                    {featuredAthleteNames.length > 0 && (
                      <p className="text-[11px] text-primary/80 mt-2">
                        Selected for this asset: {featuredAthleteNames.join(", ")} — upload their photo in slot 1 if you
                        want likeness in the poster.
                      </p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {(
                    [
                      {
                        key: "athlete" as const,
                        label: "Athlete",
                        preview: refPreviews.athlete,
                        file: refAthleteFile,
                        setFile: setRefAthleteFile,
                        inputId: "ref-athlete-input",
                      },
                      {
                        key: "home",
                        label: "Home logo",
                        preview: refPreviews.homeLogo,
                        file: refHomeLogoFile,
                        setFile: setRefHomeLogoFile,
                        inputId: "ref-home-logo-input",
                      },
                      {
                        key: "away",
                        label: "Away logo",
                        preview: refPreviews.awayLogo,
                        file: refAwayLogoFile,
                        setFile: setRefAwayLogoFile,
                        inputId: "ref-away-logo-input",
                      },
                    ] as const
                  ).map((slot) => (
                    <div
                      key={slot.key}
                      className="relative rounded-xl border border-dashed border-border/60 bg-background/40 p-3 flex flex-col min-h-[120px]"
                    >
                      <input
                        id={slot.inputId}
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        className="sr-only"
                        onChange={(e) => {
                          const f = e.target.files?.[0] ?? null;
                          slot.setFile(f);
                          e.target.value = "";
                        }}
                      />
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <label htmlFor={slot.inputId} className="text-xs font-medium text-foreground cursor-pointer hover:text-primary">
                          {slot.label}
                        </label>
                        {slot.file && (
                          <button
                            type="button"
                            onClick={() => slot.setFile(null)}
                            className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            aria-label={`Remove ${slot.label}`}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      {slot.preview ? (
                        <Image
                          src={slot.preview}
                          alt=""
                          width={320}
                          height={80}
                          unoptimized
                          className="mt-auto w-full h-20 object-contain rounded-lg bg-muted/30"
                        />
                      ) : (
                        <label
                          htmlFor={slot.inputId}
                          className="mt-auto flex flex-1 items-center justify-center text-[11px] text-muted-foreground cursor-pointer py-4"
                        >
                          Choose file
                        </label>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Optional Context (collapsible) ─── */}
            <div className="rounded-xl border border-border/40 overflow-hidden">
              <button
                onClick={() => setShowOptional((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/[0.02] transition-colors"
              >
                <div>
                  <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
                    Optional Context
                  </span>
                  <span className="ml-2 text-xs text-muted-foreground/60">
                    (type, sport, teams, style, lighting…)
                  </span>
                </div>
                {showOptional
                  ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                  : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                }
              </button>

              {showOptional && (
                <div className="px-4 pb-5 space-y-5 border-t border-border/40">

                  {/* Asset Type */}
                  <div className="pt-4">
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
                      <input type="text" value={form.homeTeam} onChange={(e) => set("homeTeam", e.target.value)} placeholder="Falcons"
                        className="w-full px-3 py-2.5 rounded-xl bg-card border border-border/50 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">Away Team</label>
                      <input type="text" value={form.awayTeam} onChange={(e) => set("awayTeam", e.target.value)} placeholder="Rivals"
                        className="w-full px-3 py-2.5 rounded-xl bg-card border border-border/50 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all"
                      />
                    </div>
                  </div>

                  {/* Scores */}
                  {isScoreType && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">Home Score</label>
                        <input type="number" value={form.homeScore} onChange={(e) => set("homeScore", e.target.value)} placeholder="87"
                          className="w-full px-3 py-2.5 rounded-xl bg-card border border-border/50 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">Away Score</label>
                        <input type="number" value={form.awayScore} onChange={(e) => set("awayScore", e.target.value)} placeholder="74"
                          className="w-full px-3 py-2.5 rounded-xl bg-card border border-border/50 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all"
                        />
                      </div>
                    </div>
                  )}

                  {/* Event Date */}
                  <div>
                    <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">Event Date</label>
                    <input type="date" value={form.eventDate} onChange={(e) => set("eventDate", e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-card border border-border/50 text-sm text-foreground focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all [color-scheme:dark]"
                    />
                  </div>

                  {/* Event details (poster copy) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">Venue</label>
                      <input
                        type="text"
                        value={form.venue}
                        onChange={(e) => set("venue", e.target.value)}
                        placeholder="e.g. State Arena"
                        className="w-full px-3 py-2.5 rounded-xl bg-card border border-border/50 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">Game time</label>
                      <input
                        type="text"
                        value={form.gameTime}
                        onChange={(e) => set("gameTime", e.target.value)}
                        placeholder="e.g. 7:00 PM ET"
                        className="w-full px-3 py-2.5 rounded-xl bg-card border border-border/50 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">Broadcast / stream</label>
                      <input
                        type="text"
                        value={form.broadcastOrStreaming}
                        onChange={(e) => set("broadcastOrStreaming", e.target.value)}
                        placeholder="e.g. ESPN+ / Big Ten Network"
                        className="w-full px-3 py-2.5 rounded-xl bg-card border border-border/50 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">Hashtag</label>
                      <input
                        type="text"
                        value={form.hashtag}
                        onChange={(e) => set("hashtag", e.target.value)}
                        placeholder="e.g. #GoBlue"
                        className="w-full px-3 py-2.5 rounded-xl bg-card border border-border/50 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all"
                      />
                    </div>
                  </div>

                  {/* Team Colors */}
                  <div>
                    <label className="text-xs text-muted-foreground uppercase tracking-wider mb-3 block">Team Colors</label>
                    <div className="grid grid-cols-3 gap-2">
                      {COLOR_PALETTES.map((p) => (
                        <button key={p.value} onClick={() => set("colorPalette", p.value)}
                          className={`p-2.5 rounded-xl border text-xs font-medium text-left transition-all ${
                            form.colorPalette === p.value
                              ? "border-primary/40 bg-primary/10 text-primary"
                              : "border-border/50 bg-card text-muted-foreground hover:border-border hover:text-foreground"
                          }`}
                        >
                          {p.colors.length > 0 ? (
                            <div className="flex gap-1 mb-1.5">
                              {p.colors.map((c) => (
                                <div key={c} className="w-4 h-4 rounded-sm border border-white/10 flex-shrink-0" style={{ backgroundColor: c }} />
                              ))}
                            </div>
                          ) : (
                            <div className="w-4 h-4 rounded-sm border border-dashed border-current opacity-40 mb-1.5" />
                          )}
                          <span className="block font-medium leading-tight">{p.label}</span>
                          {p.description && <span className="block text-xs font-normal opacity-50 mt-0.5">{p.description}</span>}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Visual Style */}
                  <div>
                    <label className="text-xs text-muted-foreground uppercase tracking-wider mb-3 block">Visual Style</label>
                    <div className="grid grid-cols-1 gap-2">
                      {STYLES.map((s) => (
                        <button key={s.value} onClick={() => set("style", s.value)} className={pill(form.style === s.value)}>
                          <span>{s.label}</span>
                          <span className={pillDesc(form.style === s.value)}>{s.description}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Composition */}
                  <div>
                    <label className="text-xs text-muted-foreground uppercase tracking-wider mb-3 block">Composition Focus</label>
                    <div className="grid grid-cols-1 gap-2">
                      {COMPOSITION_OPTIONS.map((c) => (
                        <button key={c.value} onClick={() => set("composition", c.value)} className={pill(form.composition === c.value)}>
                          <span>{c.label}</span>
                          <span className={pillDesc(form.composition === c.value)}>{c.description}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Lighting */}
                  <div>
                    <label className="text-xs text-muted-foreground uppercase tracking-wider mb-3 block">Lighting</label>
                    <div className="grid grid-cols-1 gap-2">
                      {LIGHTING_OPTIONS.map((l) => (
                        <button key={l.value} onClick={() => set("lighting", l.value)} className={pill(form.lighting === l.value)}>
                          <span>{l.label}</span>
                          <span className={pillDesc(form.lighting === l.value)}>{l.description}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Mood */}
                  <div>
                    <label className="text-xs text-muted-foreground uppercase tracking-wider mb-3 block">Mood / Energy</label>
                    <div className="grid grid-cols-1 gap-2">
                      {MOOD_OPTIONS.map((m) => (
                        <button key={m.value} onClick={() => set("mood", m.value)} className={pill(form.mood === m.value)}>
                          <span>{m.label}</span>
                          <span className={pillDesc(form.mood === m.value)}>{m.description}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                </div>
              )}
            </div>

            {/* ── Generate Button ─── */}
            <button
              type="button"
              onClick={() => generate([])}
              disabled={step === "generating" || (!devMode && !signedIn)}
              title={!devMode && !signedIn ? "Sign in to generate" : undefined}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold transition-all hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {step === "generating" ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {devMode ? "Building mock poster…" : "Generating with AI..."}
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  {step === "result" ? "Regenerate Fresh" : "Generate Asset"}
                </>
              )}
            </button>

            {generateError && !devMode && (
              <div className="px-3.5 py-2.5 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive font-medium">
                {generateError}
              </div>
            )}
            </>
            )}
          </div>

          {/* ── Right — Preview ──────────────────────────────────────────────── */}
          <div className="lg:sticky lg:top-24 h-fit">
            <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
              {/* Preview header */}
              <div className="p-4 border-b border-border/50 flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">Preview</span>
                <div className="flex items-center gap-2">
                  {/* Format badge */}
                  <span className="px-2 py-0.5 rounded-md bg-muted text-xs text-muted-foreground font-medium capitalize">
                    {form.format}
                  </span>
                  {step === "result" && (
                    <button
                      type="button"
                      onClick={regenerate}
                      disabled={!devMode && !signedIn}
                      title={!devMode && !signedIn ? "Sign in to regenerate" : undefined}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <RefreshCw className="w-3 h-3" /> Regenerate
                    </button>
                  )}
                </div>
              </div>

              {/* Dynamic aspect ratio based on format */}
              <div className={`${FORMAT_ASPECT[form.format] ?? "aspect-[9/16]"} relative bg-muted/30`}>
                {(step === "form" || step === "error") && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground/40">
                    {step === "error" ? (
                      <>
                        <Sparkles className="w-8 h-8 text-destructive/50" />
                        <span className="text-sm text-destructive/70 text-center px-4">{generateError}</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-8 h-8" />
                        <span className="text-sm">Your asset will appear here</span>
                      </>
                    )}
                  </div>
                )}

                {step === "generating" && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                    <div className="relative w-16 h-16">
                      <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-ping" />
                      <div className="absolute inset-2 rounded-full border-2 border-primary/40" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Wand2 className="w-5 h-5 text-primary animate-pulse" />
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-foreground mb-1">Generating your asset</p>
                      <p className="text-xs text-muted-foreground">AI is crafting your design…</p>
                    </div>
                    <div className="w-48 h-1 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: "0%", transition: "width 30s linear" }}
                        ref={(el) => { if (el) setTimeout(() => { el.style.width = "90%"; }, 50); }}
                      />
                    </div>
                  </div>
                )}

                {/* Overlay regenerating spinner */}
                {step === "result" && isRefining && (
                  <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-10">
                    <div className="relative w-12 h-12">
                      <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-ping" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Wand2 className="w-4 h-4 text-primary animate-pulse" />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">Applying your changes…</p>
                  </div>
                )}

                {step === "result" && generatedImage && (
                  <Image
                    src={generatedImage}
                    alt="Generated asset"
                    fill
                    className="object-cover"
                    sizes="(max-width: 1200px) 50vw, 600px"
                    unoptimized
                  />
                )}
              </div>

              {step === "result" && generatedImage && signedIn && (
                <div className="flex justify-center py-3 border-b border-border/50 bg-muted/15">
                  <button
                    type="button"
                    onClick={() => {
                      setIgPostError(null);
                      setIgPostSuccess(null);
                      setIgDialogOpen(true);
                    }}
                    className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 border border-pink-500/25 bg-gradient-to-r from-purple-600/15 to-pink-600/15 text-pink-100 hover:from-purple-600/25 hover:to-pink-600/25 transition-colors"
                    title="Share to team Instagram"
                  >
                    <InstagramGlyph className="w-5 h-5" />
                    <span className="text-xs font-bold tracking-wide">Instagram</span>
                  </button>
                </div>
              )}

              {/* Result metadata + actions */}
              {step === "result" && (
                <div className="p-4 border-t border-border/50">
                  {generatedTitle && (
                    <p className="text-sm font-semibold text-foreground mb-0.5">{generatedTitle}</p>
                  )}
                  {generatedTagline && (
                    <p className="text-xs text-primary/80 mb-1 italic">{generatedTagline}</p>
                  )}
                  <p className="text-xs text-muted-foreground mb-4">
                    {form.homeTeam} vs {form.awayTeam}
                    {isScoreType && form.homeScore && ` — ${form.homeScore}–${form.awayScore}`}
                    {" · "}{form.sport} · {ASSET_TYPES.find((t) => t.value === form.type)?.label}
                  </p>

                  {/* Save state: idle → form, saving → spinner, saved → success */}
                  {saveState === null && (
                    <>
                      {saveError && (
                        <p className="text-xs text-destructive mb-2" role="alert">
                          {saveError}
                        </p>
                      )}
                      {!saveError && signedIn && (
                        <p className="text-[10px] text-muted-foreground/70 mb-2">
                          A permanent copy is saved to your project storage so thumbnails won&apos;t break when the AI
                          preview link expires.
                        </p>
                      )}
                      {!saveError && !signedIn && (
                        <p className="text-[10px] text-amber-500/85 mb-2">
                          Sign in to archive the image to your project. If you save while signed out, only the temporary
                          AI link is stored and the picture may disappear later.
                        </p>
                      )}
                      {/* Designer name */}
                      <input
                        type="text"
                        value={designerName}
                        onChange={(e) => setDesignerName(e.target.value)}
                        placeholder="Your name (e.g. Jordan M.)"
                        className="w-full px-3 py-2 mb-3 rounded-xl bg-muted/50 border border-border/50 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40 transition-all"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => saveAsset("published")}
                          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all glow-violet-sm"
                        >
                          <Share2 className="w-3.5 h-3.5" /> Publish to Portal
                        </button>
                        <button
                          onClick={() => saveAsset("draft")}
                          className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-muted text-foreground text-xs font-medium hover:bg-muted/70 transition-all"
                          title="Save as draft"
                        >
                          <Clock className="w-3.5 h-3.5" />
                        </button>
                        <a
                          href={generatedImage ?? "#"}
                          download="asset.png"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-muted text-foreground text-xs font-medium hover:bg-muted/70 transition-all"
                          title="Download image"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </>
                  )}

                  {saveState === "saving" && (
                    <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" /> Saving…
                    </div>
                  )}

                  {saveState === "published" && (
                    <div className="rounded-xl bg-green-500/10 border border-green-500/20 p-3 flex items-start gap-3">
                      <CheckCircle className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold text-green-400 mb-1">Published to portal!</p>
                        <p className="text-xs text-muted-foreground mb-2">Athletes and students can now see and like this asset.</p>
                        <div className="flex gap-2">
                          <Link href="/designer" className="text-xs text-primary font-medium hover:text-primary/80">
                            View Dashboard →
                          </Link>
                          <span className="text-muted-foreground/30">·</span>
                          <button
                            onClick={() => { setSaveState(null); regenerate(); }}
                            className="text-xs text-muted-foreground hover:text-foreground"
                          >
                            Make another
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {saveState === "draft" && (
                    <div className="rounded-xl bg-yellow-500/10 border border-yellow-500/20 p-3 flex items-start gap-3">
                      <Clock className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold text-yellow-400 mb-1">Saved as draft</p>
                        <p className="text-xs text-muted-foreground mb-2">Only you can see this. Publish it from your dashboard when it&apos;s ready.</p>
                        <div className="flex gap-2">
                          <Link href="/designer" className="text-xs text-primary font-medium hover:text-primary/80">
                            View Dashboard →
                          </Link>
                          <span className="text-muted-foreground/30">·</span>
                          <button
                            onClick={() => setSaveState(null)}
                            className="text-xs text-muted-foreground hover:text-foreground"
                          >
                            Publish now
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── AI Chat Refinement (appears after first generation) ── */}
              {step === "result" && (
                <div className="border-t border-border/50">
                  {/* Chat header */}
                  <div className="px-4 pt-3 pb-2 flex items-center gap-2">
                    <MessageSquare className="w-3.5 h-3.5 text-primary/60" />
                    <span className="text-xs font-semibold text-foreground">Refine with AI</span>
                    <span className="text-xs text-muted-foreground">— describe what to change</span>
                  </div>

                  {/* Message history */}
                  {chatMessages.length > 0 && (
                    <div className="px-4 pb-2 space-y-2 max-h-36 overflow-y-auto">
                      {chatMessages.map((m, i) => (
                        <div key={i} className="flex justify-end">
                          <div className="bg-primary/10 border border-primary/20 text-primary text-xs rounded-2xl rounded-tr-sm px-3 py-1.5 max-w-[85%] leading-relaxed">
                            {m.content}
                          </div>
                        </div>
                      ))}
                      {isRefining && (
                        <div className="flex justify-start">
                          <div className="bg-muted text-muted-foreground text-xs rounded-2xl rounded-tl-sm px-3 py-1.5 flex items-center gap-1.5">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Regenerating…
                          </div>
                        </div>
                      )}
                      <div ref={chatEndRef} />
                    </div>
                  )}

                  {/* Chat input */}
                  <div className="p-3 pt-1 flex gap-2">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") sendChatMessage(); }}
                      placeholder="Make the background darker, add more crowd energy…"
                      disabled={isRefining || (!devMode && !signedIn)}
                      className="flex-1 px-3 py-2 rounded-xl bg-muted/50 border border-border/50 text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={sendChatMessage}
                      disabled={!chatInput.trim() || isRefining || (!devMode && !signedIn)}
                      className="px-3 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Dialog open={igDialogOpen} onOpenChange={setIgDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Post to team Instagram</DialogTitle>
            <DialogDescription>
              Pick the athletics program account. Where it publishes follows your{" "}
              <span className="text-foreground font-medium">output format</span>: Story → Instagram story; Post or
              Banner → feed post.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">This image will publish as: </span>
              {instagramMediaType === "STORIES"
                ? "Instagram Story (image only — API does not add a text caption to stories)."
                : "Instagram feed post (caption + hashtags below)."}
            </div>

            {teamIgRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No teams found. Add a school and team first, then return here to connect each team&apos;s Instagram
                Business account.
                <Link href="/designer/team" className="block mt-2 text-primary font-medium hover:underline">
                  Open team setup →
                </Link>
              </p>
            ) : (
              <>
                <div className="space-y-1.5">
                  <label htmlFor="ig-team-select" className="text-xs font-semibold text-foreground uppercase tracking-wider">
                    Team
                  </label>
                  <select
                    id="ig-team-select"
                    value={igTeamForPublish ?? ""}
                    onChange={(e) => setIgTeamForPublish(e.target.value || null)}
                    className="w-full px-3 py-2.5 rounded-xl bg-card border border-border/50 text-sm text-foreground focus:outline-none focus:border-primary/40"
                  >
                    {teamIgRows.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                        {t.igConnected ? "" : " — connect Instagram"}
                      </option>
                    ))}
                  </select>
                </div>

                {igTeamForPublish &&
                  !teamIgRows.find((t) => t.id === igTeamForPublish)?.igConnected && (
                    <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-xs text-amber-200/90">
                      <p className="mb-2">This team is not linked to Instagram yet. Connect once with Facebook (Page + IG Business).</p>
                      <a
                        href={`/api/instagram/connect?teamId=${encodeURIComponent(igTeamForPublish)}&next=${encodeURIComponent("/designer/create")}`}
                        className="inline-flex font-semibold text-primary hover:underline"
                      >
                        Connect Instagram for this team →
                      </a>
                    </div>
                  )}

                {instagramMediaType === "FEED" && (
                  <div className="space-y-1.5">
                    <label htmlFor="ig-caption" className="text-xs font-semibold text-foreground uppercase tracking-wider">
                      Caption & hashtags
                    </label>
                    <textarea
                      id="ig-caption"
                      value={igCaption}
                      onChange={(e) => setIgCaption(e.target.value)}
                      rows={6}
                      maxLength={2200}
                      placeholder="Write the post copy and include hashtags (e.g. #GameDay #YourSchool)…"
                      className="w-full px-3 py-2.5 rounded-xl bg-card border border-border/50 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40 resize-none"
                    />
                    <p className="text-[10px] text-muted-foreground">{igCaption.length} / 2200</p>
                  </div>
                )}
              </>
            )}

            {igPostError && (
              <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                {igPostError}
              </div>
            )}
            {igPostSuccess && (
              <div className="text-xs text-green-400 bg-green-400/10 border border-green-400/20 rounded-lg px-3 py-2">
                {igPostSuccess}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setIgDialogOpen(false)}>
              Close
            </Button>
            <Button
              type="button"
              disabled={igPublishing || teamIgRows.length === 0}
              onClick={() => void publishToTeamInstagram()}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-600/90 hover:to-pink-600/90 text-white border-0"
            >
              {igPublishing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2 inline" />
                  Publishing…
                </>
              ) : (
                "Publish"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
