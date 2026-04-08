"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { ArrowLeft, Sparkles, Loader2, Download, Share2, RefreshCw, Wand2, Send, MessageSquare, CheckCircle, Clock, ChevronDown, ChevronUp, FlaskConical, ImagePlus, X } from "lucide-react";
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

interface FormState {
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

export default function CreateAsset() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
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
  /** Order: athlete, home logo, away logo — matches API / FLUX image 1–3. */
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
  // Instagram integration state
  const [igConnected, setIgConnected] = useState<boolean | null>(null);
  const [igUserId, setIgUserId] = useState<string | null>(null);
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

    async function loadInstagramStatus() {
      try {
        const { data: userRes, error: userErr } = await supabase.auth.getUser();
        if (userErr) throw userErr;
        const user = userRes.user;

        if (!user) {
          if (!cancelled) setIgConnected(false);
          return;
        }

        const res = await fetch("/api/instagram/status", { credentials: "include" });
        const json = await res.json().catch(() => ({}));
        if (cancelled) return;

        setIgConnected(Boolean(json.connected));
        setIgUserId(json.ig_user_id ?? null);
      } catch {
        if (!cancelled) setIgConnected(false);
      }
    }

    // Avoid flashing the connect UI while we don't yet know.
    setIgConnected(null);
    loadInstagramStatus();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  useEffect(() => {
    if (step !== "result") return;
    if (!generatedImage) return;

    // Only set a default caption if the user hasn't typed one yet.
    setIgCaption((prev) => (prev.trim().length ? prev : defaultInstagramCaption));
  }, [step, generatedImage, defaultInstagramCaption]);

  function set(key: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
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
            setGenerateError("Sign in to attach reference images (JPEG, PNG, GIF, or WebP, max 5MB each).");
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
      <Navbar />

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
          {/* ── Left — Form ─────────────────────────────────────────────────── */}
          <div className="space-y-5">

            {/* Header + Dev mode toggle */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold mb-1">Generate Asset</h1>
                <p className="text-sm text-muted-foreground">
                  Pick a format, then describe your vision — or expand optional settings for fine control.
                </p>
              </div>
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
            </div>

            {devMode && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/8 border border-amber-500/20 text-xs text-amber-400">
                <FlaskConical className="w-3.5 h-3.5 shrink-0" />
                Dev mode — generation uses a placeholder poster instantly. No API calls.
              </div>
            )}

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

            {/* ── Reference images (FLUX) — athlete + optional logos ─── */}
            {step !== "result" && (
              <div className="rounded-xl border border-border/50 bg-card/40 p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <ImagePlus className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Reference images</p>
                    <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                      Optional. Order matters: <span className="text-foreground/80">1 — Athlete</span>,{" "}
                      <span className="text-foreground/80">2 — Home logo</span>,{" "}
                      <span className="text-foreground/80">3 — Away logo</span>. JPEG/PNG/GIF/WebP, max 5MB each. Sign in
                      required. You are responsible for rights and accuracy of logos.
                    </p>
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

                  {igPostError && (
                    <div className="mt-3 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                      {igPostError}
                    </div>
                  )}

                  {igPostSuccess && (
                    <div className="mt-3 text-xs text-green-400 bg-green-400/10 border border-green-400/20 rounded-lg px-3 py-2">
                      {igPostSuccess}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
