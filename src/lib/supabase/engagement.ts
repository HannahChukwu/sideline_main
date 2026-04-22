import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";

type Client = SupabaseClient<Database>;

export type Engagement = {
  like_count: number;
  view_count: number;
  liked_by_me: boolean;
};

export type EngagementMap = Record<string, Engagement>;

export function emptyEngagement(): Engagement {
  return { like_count: 0, view_count: 0, liked_by_me: false };
}

/**
 * Fetch live like/view counts for the given asset keys, plus whether the
 * current user has liked each one.
 *
 * Keyed by free-form `asset_key` text so it works for both mock seed
 * assets ("1", "2", …) and locally-created posters with random uids —
 * i.e. every poster the UI shows today.
 */
export async function getEngagementCounts(
  supabase: Client,
  assetKeys: string[]
): Promise<EngagementMap> {
  const out: EngagementMap = {};
  if (assetKeys.length === 0) return out;

  const keys = Array.from(new Set(assetKeys.filter(Boolean))).slice(0, 500);
  for (const k of keys) out[k] = emptyEngagement();

  const { data: userRes } = await supabase.auth.getUser();
  const myId = userRes.user?.id ?? null;

  const [likesRes, viewsRes] = await Promise.all([
    supabase
      .from("asset_engagement_likes")
      .select("asset_key, user_id")
      .in("asset_key", keys),
    supabase
      .from("asset_engagement_views")
      .select("asset_key, view_count")
      .in("asset_key", keys),
  ]);

  if (likesRes.error) throw likesRes.error;
  if (viewsRes.error) throw viewsRes.error;

  for (const row of likesRes.data ?? []) {
    const cur = out[row.asset_key] ?? emptyEngagement();
    cur.like_count += 1;
    if (myId && row.user_id === myId) cur.liked_by_me = true;
    out[row.asset_key] = cur;
  }

  for (const row of viewsRes.data ?? []) {
    const cur = out[row.asset_key] ?? emptyEngagement();
    cur.view_count += Number(row.view_count) || 0;
    out[row.asset_key] = cur;
  }

  return out;
}

export async function likeAssetByKey(
  supabase: Client,
  assetKey: string
): Promise<void> {
  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;
  const userId = userRes.user?.id;
  if (!userId) throw new Error("Not signed in");

  const { error } = await supabase
    .from("asset_engagement_likes")
    .upsert(
      { asset_key: assetKey, user_id: userId },
      { onConflict: "asset_key,user_id", ignoreDuplicates: true }
    );
  if (error) throw error;
}

export async function unlikeAssetByKey(
  supabase: Client,
  assetKey: string
): Promise<void> {
  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;
  const userId = userRes.user?.id;
  if (!userId) throw new Error("Not signed in");

  const { error } = await supabase
    .from("asset_engagement_likes")
    .delete()
    .eq("asset_key", assetKey)
    .eq("user_id", userId);
  if (error) throw error;
}

/**
 * Record a view for the current user on this asset. Silent no-op when
 * not signed in — callers can fire this unconditionally on mount.
 */
export async function recordAssetView(
  supabase: Client,
  assetKey: string
): Promise<void> {
  if (!assetKey) return;
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user?.id) return;
  const { error } = await supabase.rpc("record_asset_view", {
    p_asset_key: assetKey,
  });
  if (error) throw error;
}
