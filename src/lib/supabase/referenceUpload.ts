import type { SupabaseClient } from "@supabase/supabase-js";

/** Must match `storage.buckets` id in supabase-schema.sql */
export const GENERATION_REFERENCES_BUCKET = "generation-references";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

function extForMime(mime: string): string {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/gif") return "gif";
  if (mime === "image/webp") return "webp";
  return "bin";
}

/**
 * Upload a reference image for FLUX `input_images`. Caller must be authenticated;
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
