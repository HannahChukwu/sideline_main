import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";
import { z } from "zod";
import { GENERATION_REFERENCES_BUCKET } from "@/lib/supabase/referenceUpload";
import { ATHLETE_PHOTOS_BUCKET } from "@/lib/supabase/athletePhotos";
import { consumeGenerateRateLimit } from "@/lib/rate-limit/generateRateLimit";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { REPLICATE_IMAGE_MODEL_ID } from "@/lib/imageGen/replicateImageModel";
import { getUserRole } from "@/lib/auth/serverAuth";
import { buildMasterSportsPrompt } from "@/lib/prompt/buildMasterSportsPrompt";
import type { GenerationPreset } from "@/lib/prompt/generationPresets";
import { GENERATION_PRESET_VALUES } from "@/lib/prompt/generationPresets";

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
  preset: z.enum(GENERATION_PRESET_VALUES).optional().default("custom"),
  format: z.enum(["story", "post", "banner"]).optional().default("story"),
  customPrompt: z.string().optional(),
  colorPalette: z.string().optional(),
  composition: z.string().optional(),
  lighting: z.string().optional(),
  mood: z.string().optional(),
  strictPhotoLock: z.boolean().optional().default(true),
  refinements: z.array(z.string()).optional().default([]),
  referenceImageUrls: z.array(z.string().url()).max(14).optional().default([]),
});

const FORMAT_IMAGE: Record<
  string,
  { aspect_ratio: "1:1" | "9:16" | "16:9"; resolution: "2K" }
> = {
  story: { aspect_ratio: "9:16", resolution: "2K" },
  post: { aspect_ratio: "1:1", resolution: "2K" },
  banner: { aspect_ratio: "16:9", resolution: "2K" },
};

const ASSET_TYPE_LABELS: Record<string, string> = {
  gameday: "Game Day",
  "final-score": "Final",
  poster: "Poster",
  highlight: "Player Feature",
};

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
  const allowedPrefixes = [
    `/storage/v1/object/public/${GENERATION_REFERENCES_BUCKET}/`,
    `/storage/v1/object/public/${ATHLETE_PHOTOS_BUCKET}/`,
  ];
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
    const fromAllowedBucket = allowedPrefixes.some((p) => u.pathname.startsWith(p));
    if (u.hostname !== allowedHost || !fromAllowedBucket) {
      return NextResponse.json(
        { error: "Reference image URLs must come from this app’s Supabase storage buckets" },
        { status: 400 }
      );
    }
    out.push(u.toString());
  }
  return out;
}

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

  if (
    output &&
    typeof output === "object" &&
    "url" in output &&
    typeof (output as { url: unknown }).url === "function"
  ) {
    let u: unknown = (output as { url: () => unknown }).url();
    if (
      u != null &&
      typeof u === "object" &&
      "then" in u &&
      typeof (u as Promise<unknown>).then === "function"
    ) {
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
  const role = await getUserRole(supabase, user.id);
  if (role !== "designer") {
    return NextResponse.json({ error: "Only designer accounts can generate assets." }, { status: 403 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const rl = await consumeGenerateRateLimit(supabase);
  if (!rl.ok) {
    if (rl.kind === "rate_limited") {
      return NextResponse.json(
        { error: "Generation limit reached. Try again later." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
      );
    }
    // Fail-open fallback: don't block generation when DB rate-limit migration
    // is missing/misconfigured. This keeps production usable while admins
    // apply SQL migrations.
    // eslint-disable-next-line no-console
    console.warn("Generate rate limit misconfigured; continuing without DB limits.", rl.detail);
  }

  const {
    type,
    sport,
    homeTeam,
    awayTeam,
    eventDate,
    venue,
    gameTime,
    style,
    preset,
    format,
    customPrompt,
    composition,
    lighting,
    mood,
    strictPhotoLock,
    refinements,
    referenceImageUrls: rawReferenceImageUrls,
  } = parsed.data;

  const sanitizedRefs = sanitizeReferenceImageUrls(rawReferenceImageUrls);
  if (sanitizedRefs instanceof NextResponse) return sanitizedRefs;

  const imagePrompt = buildMasterSportsPrompt({
    type,
    sport,
    homeTeam,
    awayTeam,
    eventDate,
    gameTime,
    venue,
    format,
    mood,
    lighting,
    visualStyle: style,
    composition,
    customPrompt,
    preset: preset as GenerationPreset,
    refinements,
    referenceImageCount: sanitizedRefs.length,
    strictPhotoLock,
  });

  const replicateToken = process.env.REPLICATE_API_TOKEN?.trim();
  if (!replicateToken) {
    return NextResponse.json(
      { error: "REPLICATE_API_TOKEN is not configured" },
      { status: 500 }
    );
  }

  let imageUrl: string;
  try {
    const imageFormat = FORMAT_IMAGE[format ?? "story"] ?? FORMAT_IMAGE.story;
    const replicate = new Replicate({ auth: replicateToken });
    const output = await replicate.run(REPLICATE_IMAGE_MODEL_ID, {
      input: {
        prompt: imagePrompt,
        aspect_ratio: imageFormat.aspect_ratio,
        resolution: imageFormat.resolution,
        image_input: sanitizedRefs,
        output_format: "png",
        safety_filter_level: "block_only_high",
        allow_fallback_model: true,
      },
    });
    imageUrl = await imageUrlFromReplicateOutput(output);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Image generation failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  return NextResponse.json({
    title: `${homeTeam} vs ${awayTeam}`,
    tagline: `${sport} · ${ASSET_TYPE_LABELS[type] ?? "Sports Graphic"}`,
    imageUrl,
    imagePrompt,
  });
}
