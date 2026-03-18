import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";

type Client = SupabaseClient<Database>;

export type AssetRow = Database["public"]["Tables"]["assets"]["Row"];

export type PublishedAsset = AssetRow & {
  like_count: number;
  liked_by_me: boolean;
  designer_name: string | null;
};

function asNumber(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

function asBoolean(v: unknown): boolean {
  return v === true;
}

export async function getPublishedAssets(
  supabase: Client,
  opts?: { sport?: string; limit?: number }
): Promise<PublishedAsset[]> {
  const limit = Math.max(1, Math.min(200, opts?.limit ?? 60));

  let q = supabase
    .from("assets")
    .select(
      `
        *,
        profiles:designer_id(full_name),
        asset_likes!left(user_id)
      `
    )
    .eq("status", "published")
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (opts?.sport && opts.sport !== "All") {
    q = q.eq("sport", opts.sport);
  }

  const {
    data,
    error,
  } = await q;
  if (error) throw error;

  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;
  const myId = userRes.user?.id ?? null;

  const rows = (data ?? []) as (AssetRow & {
    profiles?: { full_name: string | null } | null;
    asset_likes?: { user_id: string }[] | null;
  })[];

  return rows.map((r) => {
    const likes = r.asset_likes ?? [];
    return {
      ...r,
      like_count: likes.length,
      liked_by_me: myId ? likes.some((l) => l.user_id === myId) : false,
      designer_name: r.profiles?.full_name ?? null,
    };
  });
}

export async function getDesignerAssets(
  supabase: Client,
  designerId: string,
  opts?: { status?: "all" | "published" | "draft" | "archived"; limit?: number }
): Promise<PublishedAsset[]> {
  const limit = Math.max(1, Math.min(200, opts?.limit ?? 100));
  const status = opts?.status ?? "all";

  let q = supabase
    .from("assets")
    .select(
      `
        *,
        profiles:designer_id(full_name),
        asset_likes!left(user_id)
      `
    )
    .eq("designer_id", designerId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status !== "all") q = q.eq("status", status);

  const { data, error } = await q;
  if (error) throw error;

  const rows = (data ?? []) as (AssetRow & {
    profiles?: { full_name: string | null } | null;
    asset_likes?: { user_id: string }[] | null;
  })[];

  return rows.map((r) => ({
    ...r,
    like_count: (r.asset_likes ?? []).length,
    liked_by_me: false,
    designer_name: r.profiles?.full_name ?? null,
  }));
}

export async function likeAsset(supabase: Client, assetId: string): Promise<void> {
  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;
  const userId = userRes.user?.id;
  if (!userId) throw new Error("Not signed in");

  const { error } = await supabase.from("asset_likes").insert({ asset_id: assetId, user_id: userId });
  if (error) throw error;
}

export async function unlikeAsset(supabase: Client, assetId: string): Promise<void> {
  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;
  const userId = userRes.user?.id;
  if (!userId) throw new Error("Not signed in");

  const { error } = await supabase
    .from("asset_likes")
    .delete()
    .eq("asset_id", assetId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function getLikeCounts(
  supabase: Client,
  assetIds: string[]
): Promise<Record<string, { like_count: number; liked_by_me: boolean }>> {
  if (assetIds.length === 0) return {};

  const { data: userRes } = await supabase.auth.getUser();
  const myId = userRes.user?.id ?? null;

  const { data, error } = await supabase
    .from("asset_likes")
    .select("asset_id, user_id")
    .in("asset_id", assetIds);
  if (error) throw error;

  const out: Record<string, { like_count: number; liked_by_me: boolean }> = {};
  for (const id of assetIds) out[id] = { like_count: 0, liked_by_me: false };

  for (const row of (data ?? []) as { asset_id: string; user_id: string }[]) {
    const prev = out[row.asset_id] ?? { like_count: 0, liked_by_me: false };
    out[row.asset_id] = {
      like_count: asNumber(prev.like_count) + 1,
      liked_by_me: prev.liked_by_me || (myId ? row.user_id === myId : false),
    };
  }
  for (const id of Object.keys(out)) {
    out[id] = {
      like_count: asNumber(out[id]?.like_count),
      liked_by_me: asBoolean(out[id]?.liked_by_me),
    };
  }
  return out;
}

