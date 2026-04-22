"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  emptyEngagement,
  getEngagementCounts,
  likeAssetByKey,
  unlikeAssetByKey,
  type Engagement,
  type EngagementMap,
} from "@/lib/supabase/engagement";

type EngagementHook = {
  get: (key: string) => Engagement;
  /**
   * Optimistically toggle like for `key`. Resolves once Supabase confirms;
   * on failure the optimistic change is rolled back.
   */
  toggleLike: (key: string) => Promise<void>;
  /** Manually re-fetch counts (e.g. after recording a view). */
  refresh: () => Promise<void>;
  loading: boolean;
  hasUser: boolean;
};

/**
 * Live likes & views for a list of asset keys, shared across all profiles
 * via Supabase. Re-fetches when the set of keys changes.
 */
export function useEngagement(assetKeys: string[]): EngagementHook {
  const supabase = useMemo(() => createClient(), []);
  const [counts, setCounts] = useState<EngagementMap>({});
  const [loading, setLoading] = useState(true);
  const [hasUser, setHasUser] = useState(false);

  const stableKeys = useMemo(
    () => Array.from(new Set(assetKeys.filter(Boolean))).sort(),
    [assetKeys]
  );
  const keysSignature = stableKeys.join("|");

  const keysRef = useRef<string[]>(stableKeys);
  keysRef.current = stableKeys;

  const refresh = useCallback(async () => {
    const keys = keysRef.current;
    if (keys.length === 0) {
      setCounts({});
      setLoading(false);
      return;
    }
    try {
      const next = await getEngagementCounts(supabase, keys);
      setCounts(next);
    } catch {
      // Non-fatal: leave previous counts in place.
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    (async () => {
      const { data } = await supabase.auth.getUser();
      if (cancelled) return;
      setHasUser(Boolean(data.user));
      await refresh();
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keysSignature, supabase]);

  const get = useCallback(
    (key: string): Engagement => counts[key] ?? emptyEngagement(),
    [counts]
  );

  const toggleLike = useCallback(
    async (key: string) => {
      if (!key) return;
      const prev = counts[key] ?? emptyEngagement();
      const willLike = !prev.liked_by_me;

      setCounts((s) => ({
        ...s,
        [key]: {
          ...prev,
          liked_by_me: willLike,
          like_count: Math.max(0, prev.like_count + (willLike ? 1 : -1)),
        },
      }));

      try {
        if (willLike) await likeAssetByKey(supabase, key);
        else await unlikeAssetByKey(supabase, key);
      } catch {
        setCounts((s) => ({ ...s, [key]: prev }));
      }
    },
    [counts, supabase]
  );

  return { get, toggleLike, refresh, loading, hasUser };
}
