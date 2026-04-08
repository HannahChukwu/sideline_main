import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import Replicate from "replicate";
import { z } from "zod";
import { GENERATION_REFERENCES_BUCKET } from "@/lib/supabase/referenceUpload";
import { consumeGenerateRateLimit } from "@/lib/rate-limit/generateRateLimit";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";

const RequestSchema = z.object({
  type: z.enum(["gameday", "final-score", "poster", "highlight"]),
  sport: z.string().min(1),
  homeTeam: z.string().min(1),
  awayTeam: z.string().min(1),
  homeScore: z.string().optional(),
  awayScore: z.string().optional(),
  eventDate: z.string().optional(),
  venue: z.string().optional(),
  gameTime: z.string().optional(),
  broadcastOrStreaming: z.string().optional(),
  hashtag: z.string().optional(),
  style: z.string().optional().default("illustrated"),
  format: z.enum(["story", "post", "banner"]).optional().default("story"),
  customPrompt: z.string().optional(),
  // Designer pre-selection fields
  colorPalette: z.string().optional(),
  composition: z.string().optional(),
  lighting: z.string().optional(),
  mood: z.string().optional(),
  // Chat-based refinement history — accumulated user edit messages
  refinements: z.array(z.string()).optional().default([]),
  /** HTTPS URLs to jpeg/png/gif/webp; order: athlete (1), home logo (2), away logo (3), … */
  referenceImageUrls: z.array(z.string().url()).max(8).optional().default([]),
});

/**
 * Only allow HTTPS URLs from this project's public Supabase storage bucket so Replicate can fetch
 * without leaking the route into an open proxy.
 */
function sanitizeReferenceImageUrls(urls: string[]): string[] | NextResponse {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!base) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_SUPABASE_URL is not configured" },
      { status: 500 }
    );
  }
  let allowedHost: string;
  try {
    allowedHost = new URL(base).hostname;
  } catch {
    return NextResponse.json({ error: "Invalid NEXT_PUBLIC_SUPABASE_URL" }, { status: 500 });
  }
  const prefix = `/storage/v1/object/public/${GENERATION_REFERENCES_BUCKET}/`;
  const out: string[] = [];
  for (const raw of urls) {
    let u: URL;
    try {
      u = new URL(raw);
    } catch {
      return NextResponse.json({ error: "Invalid reference image URL" }, { status: 400 });
    }
    if (u.protocol !== "https:") {
      return NextResponse.json({ error: "Reference images must use HTTPS URLs" }, { status: 400 });
    }
    if (u.hostname !== allowedHost || !u.pathname.startsWith(prefix)) {
      return NextResponse.json(
        { error: "Reference image URLs must come from this app’s Supabase reference storage" },
        { status: 400 }
      );
    }
    out.push(u.toString());
  }
  return out;
}

// Maps output format → orientation hint for prompts; pixel size kept for parity with FLUX aspect targets
const FORMAT_CONFIG: Record<string, { size: "1024x1792" | "1024x1024" | "1792x1024"; orientationHint: string }> = {
  story:  { size: "1024x1792", orientationHint: "portrait 9:16, optimised for Instagram Story or TikTok" },
  post:   { size: "1024x1024", orientationHint: "square 1:1, optimised for Instagram post" },
  banner: { size: "1792x1024", orientationHint: "landscape 16:9, optimised for Twitter banner or web header" },
};

/** Replicate flux-2-pro: one run = one image; 1 MP keeps cost predictable (see model docs). */
const FORMAT_FLUX: Record<
  string,
  { aspect_ratio: "1:1" | "9:16" | "16:9"; resolution: "1 MP" }
> = {
  story:  { aspect_ratio: "9:16", resolution: "1 MP" },
  post:   { aspect_ratio: "1:1", resolution: "1 MP" },
  banner: { aspect_ratio: "16:9", resolution: "1 MP" },
};

function httpUrlFromUnknown(value: unknown): string | null {
  if (typeof value === "string" && /^https?:\/\//i.test(value)) return value;
  if (value && typeof value === "object") {
    const o = value as Record<string, unknown>;
    if (typeof o.href === "string" && /^https?:\/\//i.test(o.href)) return o.href;
    const s = String(value);
    if (/^https?:\/\//i.test(s)) return s;
  }
  return null;
}

async function imageUrlFromReplicateOutput(output: unknown): Promise<string> {
  if (typeof output === "string" && /^https?:\/\//i.test(output)) return output;

  if (output && typeof output === "object" && "url" in output && typeof (output as { url: unknown }).url === "function") {
    let u: unknown = (output as { url: () => unknown }).url();
    if (u != null && typeof u === "object" && "then" in u && typeof (u as Promise<unknown>).then === "function") {
      u = await (u as Promise<unknown>);
    }
    const fromUrl = httpUrlFromUnknown(u);
    if (fromUrl) return fromUrl;
  }

  if (Array.isArray(output) && output.length > 0) {
    return imageUrlFromReplicateOutput(output[0]);
  }
  throw new Error("No image URL returned from Replicate");
}

const ASSET_TYPE_LABELS: Record<string, string> = {
  gameday:       "Game Day Hype",
  "final-score": "Final Score Announcement",
  poster:        "Event Poster",
  highlight:     "Highlight Graphic",
};

// ─── Enhanced DALL-E Style Descriptors ────────────────────────────────────────
const STYLE_DESCRIPTORS: Record<string, string> = {
  illustrated:
    "official sports team illustrated poster in the style of a commissioned NBA/NFL game day art print, " +
    "painterly digital painting with visible brushstroke texture throughout the entire composition, " +
    "multi-figure collage: dominant hero athlete fills center foreground at grand scale, supporting players arranged at receding scales in mid-ground, " +
    "team mascot animal or symbol looms large in upper background, " +
    "rich dominant team hue saturates every element — the whole image breathes in team colors, " +
    "dramatic underlighting with warm rim spotlight isolating the hero figure, strong chiaroscuro shadows, " +
    "city skyline or stadium architecture visible through atmospheric haze behind the figures, " +
    "dense layered composition with no empty space, maximum visual richness, " +
    "acrylic impasto aesthetic with loose gestural marks and color bleed at edges, " +
    "art direction: Robert Bruno NFL poster series, official NBA City Edition illustration quality",

  bold:
    "hyper-intense sports promotional graphic, explosive radial composition emanating from central athlete, " +
    "maximum saturation colors pushed to near-neon — blazing complementary hues in direct collision, " +
    "stadium LED floodlights creating multiple harsh shadow directions and mirror-bright specular highlights, " +
    "speed-line motion blur streaking behind every limb and the ball, particle debris, sparks and embers, " +
    "concentric energy shockwave rings at point of impact, rising smoke and dust columns catching stadium light, " +
    "crowd reduced to a glowing sea of color far in background, " +
    "heavy oval vignette pulling all focus inward to athlete, extreme shallow depth-of-field background bokeh, " +
    "ESPN or FOX Sports broadcast hype-reel aesthetic, maximum kinetic energy",

  cinematic:
    "epic cinematic sports poster composed like a Marvel Studios or Warner Bros. theatrical one-sheet, " +
    "anamorphic widescreen perspective translated to tall format, " +
    "volumetric god rays descending from stadium roof through atmospheric smoke or crowd haze, " +
    "Hollywood color grade: rich teal-orange complementary split, deeply crushed blacks, Dolby Vision HDR quality contrast, " +
    "heroic extreme low-angle shot looking up at athlete silhouetted against sky and stadium lights, " +
    "dramatic separation rim-light carving athlete out of dark background, " +
    "atmospheric depth layers: razor-sharp foreground subject, softly blurred mid-ground crowd, " +
    "anamorphic lens flares streaking across the frame from multiple stadium light towers, " +
    "blockbuster production value, IMAX-scale grandeur, sense of historic sporting destiny",

  retro:
    "vintage sports poster circa 1972–1984, letterpress and three-color screen-print aesthetic, " +
    "aged cream or off-white paper texture with foxing and yellowing at corners and edges, " +
    "halftone Ben-Day dot printing visible in shadows and flesh tones, rosette dot pattern in highlights, " +
    "strictly limited palette: burnt orange, warm sepia, cream-white, with one vivid accent — deep crimson or electric blue, " +
    "hand-illustrated athlete in bold simplified style with anatomically exaggerated heroism, " +
    "grain overlay and ink bleed at every color boundary, slight color registration misalignment between layers, " +
    "risograph printing texture with visible paper tooth, " +
    "nostalgic 1970s championship program energy meets Topps trading card illustration art",

  minimal:
    "ultra-clean minimal sports identity design at Pentagram or Bureau Borsche quality, " +
    "Swiss International Style graphic design principles applied to sports, " +
    "athlete rendered as a single bold flat silhouette or clean single-weight contour line drawing, " +
    "strictly two colors maximum: one neutral ground color, one saturated team accent, zero gradients, " +
    "vast generous negative space surrounding the central figure — at least 60% empty, " +
    "every element placed on an invisible mathematical grid, golden-ratio proportions, " +
    "no decorative marks, no texture, no shadow — pure form and negative space, " +
    "Nike Training campaign restraint meets Nike Football identity design, power through reduction",
};

// ─── Sport-Specific Environments ──────────────────────────────────────────────
const SPORT_ENVIRONMENTS: Record<string, string> = {
  Basketball:
    "NBA-scale arena at full capacity — 20,000 fans packed to the rafters, " +
    "parquet hardwood floor with painted court markings and glossy polyurethane reflections, " +
    "transparent perspex backboard with arena lights refracting through it, vivid orange rim catching spotlight, " +
    "championship banners hanging in the rafters, scoreboard and jumbotron screens glowing, " +
    "floor-level wide-angle perspective showing colossal scale, " +
    "chalk dust and shoe rubber particles catching the arena beam spotlights",

  Football:
    "100,000-seat NFL stadium at night under blazing LED floodlights, multiple crisp overlapping player shadows on turf, " +
    "freshly painted end zone with bold field markings and yard lines, " +
    "goalposts silhouetted against a dark ink-blue sky beyond the stadium bowl, " +
    "city skyline glowing above the upper deck rim, " +
    "turf spray and torn grass chunks suspended mid-air on impact, " +
    "lens flares from multiple stadium light towers, massive roaring crowd in every direction",

  Soccer:
    "80,000-seat stadium at golden hour, long dramatic low-sun shadows striping the immaculate pitch, " +
    "freshly mown grass with alternating light and dark mowing stripes, " +
    "crisp white touchlines, penalty arc, and center circle markings, " +
    "ultras section erupting with massive tifo banner display, colored smoke flares, " +
    "UEFA Champions League scale atmosphere: dramatic layered clouds, stadium lights activating at dusk, " +
    "soccer ball with stretched motion trail frozen in trajectory, " +
    "stadium floodlights creating orange rim-light on players against golden sky",

  Baseball:
    "classic baseball stadium under twilight sky transitioning from amber to deep blue, " +
    "infield dirt raked in perfect concentric arcs around the bases, outfield grass mowed in diagonal diamond pattern, " +
    "pitching rubber and chalk lines of the batter's box still visible, " +
    "vintage stadium bleachers and scoreboard in background, " +
    "crowd waves lit by stadium lights in the gathering dark, " +
    "rosin bag dust caught in the arc light, bat explosion of ball impact implied",

  Hockey:
    "NHL-scale arena: ice surface with visible skate-cut grooves and gouges, " +
    "boards and plexiglass reflecting arena lights, " +
    "puck frozen in motion leaving a blur trail on the ice, " +
    "cool arctic-blue arena lighting reflected as long mirror streaks in the ice surface, " +
    "visible breath condensation rising from players in the cold arena air, " +
    "ice spray kicked up from a hard stop catching the spotlight, packed crowd behind glass",

  Volleyball:
    "Olympic indoor volleyball arena at full capacity, " +
    "regulation court with crisp painted boundary lines on hardwood, " +
    "volleyball suspended at apex of trajectory — compression dimples visible, " +
    "net casting dramatic shadow on the court, " +
    "bank of overhead arena lights creating hard-edged catch-light in the ball, " +
    "crowd at edge of seats, coaches and bench in peripheral background",

  Tennis:
    "Grand Slam-scale tennis stadium — Roland Garros red clay or Wimbledon grass aesthetic, " +
    "net taut across center court, baseline and service box markings crisp, " +
    "tennis ball trailing yellow-green motion arc at peak of toss or return, " +
    "open-air stadium with tiered crowd rising around the court, " +
    "low camera angle from baseline level showing full stadium bowl behind the player",

  Track:
    "Olympic athletics stadium at night, eight-lane track with painted numbers and stagger lines crisp under floodlights, " +
    "starting blocks chrome-bright under stadium lights, " +
    "motion blur trailing athletes — bodies leaning into finish or exploding from blocks, " +
    "stadium stands packed with 80,000 spectators under open night sky, " +
    "long-jump pit sand or high-jump mat visible at field edges",

  Swimming:
    "Olympic aquatics center, 50-meter pool divided by lane ropes in vivid colors, " +
    "water surface exploding in white foam and spray at the touchpad, " +
    "underwater light refracting up through the chop into dramatic caustic patterns, " +
    "competition starting blocks gleaming, scoreboard visible at pool end, " +
    "spectator stands reflected in the water surface between lanes",

  Wrestling:
    "Olympic wrestling mat — circular boundary circle in high contrast against mat color, " +
    "arena overhead beam spotlights creating a sharp isolated pool of light on the mat, " +
    "dramatic single shadow of athlete cast long across the mat surface, " +
    "competition arena with judges table and scoreboards visible, " +
    "gymnasium or arena architecture with high ceiling truss visible above",
};

// ─── Per-Type Mood & Composition Guidance ─────────────────────────────────────
const TYPE_MOOD: Record<string, string> = {
  gameday:
    "electric pre-game anticipation: tunnel-walk energy, warm-up intensity, crowd still filling in, " +
    "players locked in — complete game-face focus, coiled warrior-ready body language, " +
    "every muscle ready to fire, the silence before the storm, this is what everything has been building to",

  "final-score":
    "post-victory pure euphoria: fists raised to the sky, open-mouthed celebration scream, teammates colliding in embrace, " +
    "confetti catching in stadium lights, sweat and exhaustion mixed with transcendent joy, " +
    "crowd on their feet in complete delirium, scoreboard victory glow in background, " +
    "this win was carved out through everything — it was earned, not given",

  poster:
    "championship showdown promotional announcement: two rival forces about to collide, " +
    "visual tension splitting the composition — each half channels a different team's energy and color, " +
    "opposing visual forces converging at center like the clash of titans, " +
    "epic promotional scale that makes this feel like the most important sporting event in a generation",

  highlight:
    "the viral moment frozen in time: the athletic impossibility that breaks physics, " +
    "gravity-defying height or speed or contortion that the body should not be able to do, " +
    "crowd suspended in collective gasping silence — you can read the shock on every face, " +
    "motion blur trailing the leading edge of movement, sharpest focus precisely on point of impact or peak extension, " +
    "this single millisecond tells an entire career's story",
};

// ─── Fallback Prompt Builder ───────────────────────────────────────────────────
function buildFallbackPrompt(params: {
  sport: string;
  homeTeam: string;
  awayTeam: string;
  type: string;
  style: string;
  scoreInfo: string;
  customPrompt?: string;
  colorPalette?: string;
  composition?: string;
  lighting?: string;
  mood?: string;
  refinements?: string[];
  orientationHint?: string;
  eventDate?: string;
  venue?: string;
  gameTime?: string;
  broadcastOrStreaming?: string;
  hashtag?: string;
  referenceImageCount: number;
}): string {
  const {
    sport,
    homeTeam,
    awayTeam,
    type,
    style,
    scoreInfo,
    customPrompt,
    colorPalette,
    composition,
    lighting,
    mood,
    refinements,
    orientationHint,
    eventDate,
    venue,
    gameTime,
    broadcastOrStreaming,
    hashtag,
    referenceImageCount,
  } = params;
  const styleDesc = STYLE_DESCRIPTORS[style] ?? STYLE_DESCRIPTORS.illustrated;
  const sportEnv = SPORT_ENVIRONMENTS[sport] ?? `${sport} arena or stadium, sport-specific equipment and atmosphere`;
  const typeMood = TYPE_MOOD[type] ?? TYPE_MOOD.gameday;

  const refinementContext = refinements && refinements.length > 0
    ? `User refinements to apply: ${refinements.join("; ")}.`
    : "";

  const referenceBlock =
    referenceImageCount > 0
      ? `Reference images are supplied to the model in order — use 1-based indexing in your reasoning: ` +
        `image 1 must be the primary athlete (preserve facial identity and general appearance; integrate into a polished college athletics poster). ` +
        (referenceImageCount >= 2
          ? `image 2 is the home team logo or mark — place it crisply with correct colors/shape; user is responsible for trademark accuracy. `
          : "") +
        (referenceImageCount >= 3
          ? `image 3 is the away / opponent team mark — same care as image 2. `
          : "") +
        `Blend references naturally with lighting and perspective.`
      : "";

  const scheduleBits = [
    eventDate ? `Date on poster (exact spelling): ${eventDate}.` : "",
    venue ? `Venue (exact): ${venue}.` : "",
    gameTime ? `Time (exact): ${gameTime}.` : "",
    broadcastOrStreaming ? `Broadcast or stream line (exact): ${broadcastOrStreaming}.` : "",
    hashtag ? `Hashtag (exact, include if it fits): ${hashtag}.` : "",
  ].filter(Boolean);

  const typoDirectives =
    `This is a FLUX.2 Pro college / university athletics graphic. Include clean, legible typography with correct spelling: ` +
    `school names "${homeTeam}" (home) and "${awayTeam}" (opponent)${eventDate ? `, date ${eventDate}` : ""}. ` +
    `Hierarchy: large headline matchup, secondary line for date or venue, smaller details for broadcast or hashtag. ` +
    `High production value, print-ready sports marketing layout, correct kerning, strong contrast for social sharing. ` +
    `User is responsible for accuracy of logos and third-party marks.`;

  const parts = [
    styleDesc + ".",
    typoDirectives,
    referenceBlock,
    `Sport: ${sport}.`,
    `Setting: ${sportEnv}.`,
    `Mood: ${typeMood}.`,
    mood ? `Energy override: ${mood}.` : "",
    scoreInfo ? scoreInfo : `${homeTeam} vs ${awayTeam} matchup.`,
    ...scheduleBits,
    colorPalette ? `Color palette: dominant ${colorPalette} color scheme throughout.` : "",
    composition ? `Composition: ${composition}.` : "",
    lighting ? `Lighting: ${lighting}.` : "",
    customPrompt ? `Creative direction: ${customPrompt}.` : "",
    refinementContext,
    orientationHint
      ? `Framing: ${orientationHint}.`
      : "Portrait orientation. Professional digital sports graphic design.",
  ];

  return parts.filter(Boolean).join(" ");
}

// ─── Route Handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Sign in required to generate." }, { status: 401 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const rl = await consumeGenerateRateLimit(user.id);
  if (!rl.ok) {
    if (rl.kind === "misconfigured") {
      return NextResponse.json(
        {
          error:
            "Generation service is misconfigured (rate limiting). Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.",
        },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: "Generation limit reached. Try again later." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  const {
    type,
    sport,
    homeTeam,
    awayTeam,
    homeScore,
    awayScore,
    eventDate,
    venue,
    gameTime,
    broadcastOrStreaming,
    hashtag,
    style,
    format,
    customPrompt,
    colorPalette,
    composition,
    lighting,
    mood,
    refinements,
    referenceImageUrls: rawReferenceImageUrls,
  } = parsed.data;

  const sanitizedRefs = sanitizeReferenceImageUrls(rawReferenceImageUrls);
  if (sanitizedRefs instanceof NextResponse) return sanitizedRefs;
  const referenceImageCount = sanitizedRefs.length;

  const formatConfig = FORMAT_CONFIG[format ?? "story"] ?? FORMAT_CONFIG.story;
  const assetLabel   = ASSET_TYPE_LABELS[type];
  const styleDesc    = STYLE_DESCRIPTORS[style ?? "illustrated"] ?? STYLE_DESCRIPTORS.illustrated;
  const scoreInfo    =
    type === "final-score" && homeScore && awayScore
      ? `Final score: ${homeTeam} ${homeScore} – ${awayTeam} ${awayScore}.`
      : "";
  const dateInfo = eventDate ? `Event date: ${eventDate}.` : "";
  const venueInfo    = venue ? `Venue: ${venue}.` : "";
  const timeInfo     = gameTime ? `Game time: ${gameTime}.` : "";
  const broadcastInfo = broadcastOrStreaming ? `Watch / broadcast: ${broadcastOrStreaming}.` : "";
  const hashtagInfo  = hashtag ? `Hashtag to include if suitable: ${hashtag}.` : "";

  const referenceInstructions =
    referenceImageCount > 0
      ? `
Reference images (FLUX input order, cite as image 1, image 2, … in the imagePrompt when needed):
- Image 1: primary athlete — preserve identity; integrate into the layout.
${referenceImageCount >= 2 ? "- Image 2: home team logo or mark — render sharply; user responsible for trademark accuracy.\n" : ""}${referenceImageCount >= 3 ? "- Image 3: opponent team logo or mark — same as image 2.\n" : ""}`
      : "";

  // ── Step 1: Build copy + image prompt ──────────────────────────────────────
  let copy: { title: string; tagline: string; imagePrompt: string };

  const fallbackCopy = {
    title:       `${homeTeam} vs ${awayTeam}`,
    tagline:     `${sport} · ${assetLabel}`,
    imagePrompt: buildFallbackPrompt({
      sport,
      homeTeam,
      awayTeam,
      type,
      style:           style ?? "illustrated",
      scoreInfo,
      customPrompt,
      colorPalette,
      composition,
      lighting,
      mood,
      refinements,
      orientationHint: formatConfig.orientationHint,
      eventDate,
      venue,
      gameTime,
      broadcastOrStreaming,
      hashtag,
      referenceImageCount,
    }),
  };

  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY.startsWith("AIza")) {
    copy = fallbackCopy;
  } else {
    try {
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

      const refinementNote = refinements && refinements.length > 0
        ? `\nUser has requested these refinements (apply all of them):\n${refinements.map((r, i) => `${i + 1}. ${r}`).join("\n")}`
        : "";

      const claudePrompt = `You are a creative director for US college athletics social and print graphics. Generate assets for a ${assetLabel} piece.

Details:
- Sport: ${sport}
- Home Team: ${homeTeam}
- Away Team: ${awayTeam}
${scoreInfo ? `- ${scoreInfo}` : ""}
${dateInfo ? `- ${dateInfo}` : ""}
${venueInfo ? `- ${venueInfo}` : ""}
${timeInfo ? `- ${timeInfo}` : ""}
${broadcastInfo ? `- ${broadcastInfo}` : ""}
${hashtagInfo ? `- ${hashtagInfo}` : ""}
- Visual Style: ${style}
- Style Reference: ${styleDesc}
- Sport Environment: ${SPORT_ENVIRONMENTS[sport] ?? `${sport} arena`}
- Mood: ${TYPE_MOOD[type] ?? TYPE_MOOD.gameday}
${colorPalette ? `- Color Palette: dominant ${colorPalette} color scheme throughout` : ""}
${composition ? `- Composition: ${composition}` : ""}
${lighting ? `- Lighting: ${lighting}` : ""}
${mood ? `- Energy/Mood Override: ${mood}` : ""}
${customPrompt ? `- Creative Direction: ${customPrompt}` : ""}${refinementNote}
${referenceInstructions}

Return a JSON object with exactly these fields (no markdown, raw JSON only):
{
  "title": "Short punchy headline, max 6 words, all caps, hype energy",
  "tagline": "Supporting slogan or matchup line, max 12 words",
  "imagePrompt": "A single detailed FLUX.2 Pro image generation prompt for a college athletics poster or social graphic. Must incorporate: the full style descriptor, sport environment, composition, team color atmosphere, mood, and ALL user refinements. Include legible typography with EXACT correct spelling for the two school/team names (${homeTeam} vs ${awayTeam})${eventDate ? ` and the date (${eventDate})` : ""}${venue ? `; include venue (${venue}) if space allows` : ""}${gameTime ? `; include game time (${gameTime}) if suitable` : ""}${broadcastOrStreaming ? `; you may add a small broadcast/stream line: ${broadcastOrStreaming}` : ""}${hashtag ? `; optionally include hashtag ${hashtag}` : ""}. Use a clear hierarchy (headline, subhead, details). If reference images are used, name them as image 1, image 2, etc., and tie instructions to those indices. Remind that the user is responsible for trademark/logo accuracy. Photoreal or illustrated is fine per style. End with: professional sports marketing layout, high contrast, social-ready."
}`;

      const stream = anthropic.messages.stream({
        model: "claude-opus-4-6",
        max_tokens: 1024,
        thinking: { type: "adaptive" },
        messages: [{ role: "user", content: claudePrompt }],
      });

      const claudeMessage = await stream.finalMessage();
      const textBlock = claudeMessage.content.find((b) => b.type === "text");

      if (textBlock && textBlock.type === "text") {
        const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          copy = JSON.parse(jsonMatch[0]);
        } else {
          copy = fallbackCopy;
        }
      } else {
        copy = fallbackCopy;
      }
    } catch {
      copy = fallbackCopy;
    }
  }

  // ── Step 2: Generate image (Replicate FLUX.2 Pro) ───────────────────────────
  const replicateToken = process.env.REPLICATE_API_TOKEN?.trim();
  if (!replicateToken) {
    return NextResponse.json(
      { error: "REPLICATE_API_TOKEN is not configured" },
      { status: 500 }
    );
  }

  let imageUrl: string;
  try {
    const fluxFormat = FORMAT_FLUX[format ?? "story"] ?? FORMAT_FLUX.story;
    const replicate = new Replicate({ auth: replicateToken });
    const output = await replicate.run("black-forest-labs/flux-2-pro", {
      input: {
        prompt: copy.imagePrompt,
        aspect_ratio: fluxFormat.aspect_ratio,
        resolution: fluxFormat.resolution,
        input_images: sanitizedRefs,
        output_format: "webp",
        output_quality: 85,
        safety_tolerance: 2,
        prompt_upsampling: false,
      },
    });
    imageUrl = await imageUrlFromReplicateOutput(output);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Image generation failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  return NextResponse.json({
    title:       copy.title,
    tagline:     copy.tagline,
    imageUrl,
    imagePrompt: copy.imagePrompt,
  });
}
