import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";

type Client = SupabaseClient<Database>;

export const ATHLETE_PHOTOS_BUCKET = "athlete-photos";
const MAX_BYTES = 20 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

export type AthletePhoto = {
  id: string;
  athlete_id: string;
  uploaded_by: string;
  storage_path: string;
  mime_type: string;
  original_name: string | null;
  created_at: string;
  public_url: string;
};

function extForMime(mime: string): string {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/gif") return "gif";
  if (mime === "image/webp") return "webp";
  return "bin";
}

function toPublicUrl(supabase: Client, path: string): string {
  const { data } = supabase.storage.from(ATHLETE_PHOTOS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function listMyAthletePhotos(supabase: Client): Promise<AthletePhoto[]> {
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;
  const userId = userData.user?.id;
  if (!userId) return [];

  const { data, error } = await supabase
    .from("athlete_photos")
    .select("id, athlete_id, uploaded_by, storage_path, mime_type, original_name, created_at")
    .eq("uploaded_by", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({ ...row, public_url: toPublicUrl(supabase, row.storage_path) }));
}

export async function listAthletePhotosByAthleteIds(
  supabase: Client,
  athleteIds: string[]
): Promise<Record<string, AthletePhoto[]>> {
  const unique = Array.from(new Set(athleteIds.filter(Boolean)));
  const out: Record<string, AthletePhoto[]> = {};
  if (unique.length === 0) return out;
  for (const id of unique) out[id] = [];

  const { data, error } = await supabase
    .from("athlete_photos")
    .select("id, athlete_id, uploaded_by, storage_path, mime_type, original_name, created_at")
    .in("athlete_id", unique)
    .order("created_at", { ascending: false });
  if (error) throw error;

  for (const row of data ?? []) {
    const normalized: AthletePhoto = {
      ...row,
      public_url: toPublicUrl(supabase, row.storage_path),
    };
    if (!out[row.athlete_id]) out[row.athlete_id] = [];
    out[row.athlete_id].push(normalized);
  }
  return out;
}

export async function uploadAthletePhoto(
  supabase: Client,
  input: { athleteId: string; file: File; userId: string }
): Promise<AthletePhoto> {
  const { athleteId, file, userId } = input;
  if (!athleteId) throw new Error("No athlete selected.");
  if (!ALLOWED_TYPES.has(file.type)) throw new Error("Photo must be JPEG, PNG, GIF, or WebP.");
  if (file.size > MAX_BYTES) throw new Error("Photo must be 20MB or smaller.");

  const ext = extForMime(file.type);
  const storagePath = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error: storageError } = await supabase.storage
    .from(ATHLETE_PHOTOS_BUCKET)
    .upload(storagePath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });
  if (storageError) throw new Error(storageError.message);

  const { data: row, error: insertError } = await supabase
    .from("athlete_photos")
    .insert({
      athlete_id: athleteId,
      uploaded_by: userId,
      storage_path: storagePath,
      mime_type: file.type,
      original_name: file.name,
    })
    .select("id, athlete_id, uploaded_by, storage_path, mime_type, original_name, created_at")
    .single();
  if (insertError) {
    await supabase.storage.from(ATHLETE_PHOTOS_BUCKET).remove([storagePath]);
    throw insertError;
  }

  return { ...row, public_url: toPublicUrl(supabase, row.storage_path) };
}

export async function deleteAthletePhoto(supabase: Client, photo: AthletePhoto): Promise<void> {
  const { error: removeStorageError } = await supabase.storage
    .from(ATHLETE_PHOTOS_BUCKET)
    .remove([photo.storage_path]);
  if (removeStorageError) throw new Error(removeStorageError.message);

  const { error: deleteRowError } = await supabase
    .from("athlete_photos")
    .delete()
    .eq("id", photo.id);
  if (deleteRowError) throw deleteRowError;
}
