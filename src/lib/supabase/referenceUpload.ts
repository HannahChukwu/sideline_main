import type { SupabaseClient } from "@supabase/supabase-js";

/** Must match `storage.buckets` id in supabase-schema.sql */
export const GENERATION_REFERENCES_BUCKET = "generation-references";

/** Archived generated posters only (not reference uploads). */
export const GENERATED_POSTERS_BUCKET = "generated-posters";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

function normalizeImageContentType(blobType: string | undefined): string {
  const t = (blobType ?? "").toLowerCase();
  if (t && ALLOWED_TYPES.has(t)) return t;
  if (!t || t === "application/octet-stream") return "image/webp";
  return t;
}

function extForMime(mime: string): string {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/gif") return "gif";
  if (mime === "image/webp") return "webp";
  return "bin";
}

/**
 * Upload a reference image for Replicate `image_input` (e.g. Nano Banana Pro). Caller must be authenticated;
 * object path is scoped under `userId`.
 */
export async function uploadGenerationReference(
  supabase: SupabaseClient,
  userId: string,
  file: File
): Promise<string> {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error("Reference image must be JPEG, PNG, GIF, or WebP.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Reference image must be 5MB or smaller.");
  }
  const ext = extForMime(file.type);
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(GENERATION_REFERENCES_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
  });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(GENERATION_REFERENCES_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Download a generated image from a temporary provider URL (e.g. Replicate) and
 * upload it to `generated-posters` so `imageUrl` does not expire when the provider link ends.
 */
export async function uploadGeneratedPosterFromUrl(
  supabase: SupabaseClient,
  userId: string,
  sourceUrl: string
): Promise<string> {
  if (!/^https?:\/\//i.test(sourceUrl)) {
    throw new Error("Invalid image URL.");
  }
  const res = await fetch(sourceUrl);
  if (!res.ok) {
    throw new Error(`Could not download image (${res.status}). Try regenerating and save again.`);
  }
  const blob = await res.blob();
  if (blob.size > MAX_BYTES) {
    throw new Error("Generated image exceeds storage limit (5MB).");
  }
  const contentType = normalizeImageContentType(blob.type);
  if (!ALLOWED_TYPES.has(contentType)) {
    throw new Error(`Unsupported image type: ${blob.type || "unknown"}`);
  }
  const ext = extForMime(contentType);
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(GENERATED_POSTERS_BUCKET).upload(path, blob, {
    cacheControl: "86400",
    upsert: false,
    contentType,
  });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(GENERATED_POSTERS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
