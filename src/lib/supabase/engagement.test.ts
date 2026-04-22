import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";
import {
  emptyEngagement,
  getEngagementCounts,
  likeAssetByKey,
  recordAssetView,
  unlikeAssetByKey,
} from "./engagement";

type TableResult = Promise<{ data: unknown; error: unknown }>;

function chain(result: TableResult) {
  const self = {
    select: vi.fn(() => self),
    in: vi.fn(() => result),
    eq: vi.fn(() => self),
    delete: vi.fn(() => self),
    upsert: vi.fn(() => result),
    then: (ok: (v: unknown) => unknown, err?: (e: unknown) => unknown) =>
      result.then(ok, err),
  };
  return self;
}

type ClientOpts = {
  likes: TableResult;
  views: TableResult;
  user: { id: string } | null;
  rpc?: TableResult;
  likeUpsert?: TableResult;
  likeDelete?: TableResult;
};

function makeClient(opts: ClientOpts) {
  const likesChain = chain(opts.likes);
  const viewsChain = chain(opts.views);
  const likeUpsertChain = chain(opts.likeUpsert ?? Promise.resolve({ data: null, error: null }));
  const likeDeleteChain = chain(opts.likeDelete ?? Promise.resolve({ data: null, error: null }));

  const from = vi.fn((table: string) => {
    if (table === "asset_engagement_likes") {
      // The same chain is reused for select/upsert/delete within one test;
      // callers drive behaviour via opts.
      return {
        ...likesChain,
        upsert: likeUpsertChain.upsert,
        delete: likeDeleteChain.delete,
        eq: likeDeleteChain.eq,
      };
    }
    if (table === "asset_engagement_views") return viewsChain;
    throw new Error(`Unexpected table ${table}`);
  });

  return {
    __mocks: { from, likesChain, viewsChain, likeUpsertChain, likeDeleteChain },
    client: {
      from,
      rpc: vi.fn(() => opts.rpc ?? Promise.resolve({ data: null, error: null })),
      auth: {
        getUser: vi.fn(() =>
          Promise.resolve({ data: { user: opts.user }, error: null })
        ),
      },
    } as unknown as SupabaseClient<Database>,
  };
}

describe("emptyEngagement", () => {
  it("returns zeroed shape", () => {
    expect(emptyEngagement()).toEqual({
      like_count: 0,
      view_count: 0,
      liked_by_me: false,
    });
  });
});

describe("getEngagementCounts", () => {
  it("aggregates likes and views across rows and marks liked_by_me", async () => {
    const { client } = makeClient({
      likes: Promise.resolve({
        data: [
          { asset_key: "a", user_id: "u1" },
          { asset_key: "a", user_id: "u2" },
          { asset_key: "b", user_id: "u2" },
        ],
        error: null,
      }),
      views: Promise.resolve({
        data: [
          { asset_key: "a", view_count: 5 },
          { asset_key: "a", view_count: 2 },
          { asset_key: "b", view_count: 3 },
        ],
        error: null,
      }),
      user: { id: "u2" },
    });
    const out = await getEngagementCounts(client, ["a", "b", "c"]);
    expect(out.a).toEqual({ like_count: 2, view_count: 7, liked_by_me: true });
    expect(out.b).toEqual({ like_count: 1, view_count: 3, liked_by_me: true });
    expect(out.c).toEqual({ like_count: 0, view_count: 0, liked_by_me: false });
  });

  it("returns {} on empty input without querying", async () => {
    const { client, __mocks } = {
      ...makeClient({
        likes: Promise.resolve({ data: [], error: null }),
        views: Promise.resolve({ data: [], error: null }),
        user: null,
      }),
    };
    const out = await getEngagementCounts(client, []);
    expect(out).toEqual({});
    expect(__mocks.from).not.toHaveBeenCalled();
  });

  it("anonymous users never show liked_by_me", async () => {
    const { client } = makeClient({
      likes: Promise.resolve({
        data: [{ asset_key: "a", user_id: "u1" }],
        error: null,
      }),
      views: Promise.resolve({ data: [], error: null }),
      user: null,
    });
    const out = await getEngagementCounts(client, ["a"]);
    expect(out.a?.liked_by_me).toBe(false);
    expect(out.a?.like_count).toBe(1);
  });
});

describe("likeAssetByKey / unlikeAssetByKey", () => {
  it("likeAssetByKey throws when not signed in", async () => {
    const { client } = makeClient({
      likes: Promise.resolve({ data: [], error: null }),
      views: Promise.resolve({ data: [], error: null }),
      user: null,
    });
    await expect(likeAssetByKey(client, "a")).rejects.toThrow(/Not signed in/);
  });

  it("unlikeAssetByKey throws when not signed in", async () => {
    const { client } = makeClient({
      likes: Promise.resolve({ data: [], error: null }),
      views: Promise.resolve({ data: [], error: null }),
      user: null,
    });
    await expect(unlikeAssetByKey(client, "a")).rejects.toThrow(/Not signed in/);
  });

  it("likeAssetByKey upserts with ignoreDuplicates for idempotency", async () => {
    const { client, __mocks } = makeClient({
      likes: Promise.resolve({ data: [], error: null }),
      views: Promise.resolve({ data: [], error: null }),
      user: { id: "u1" },
      likeUpsert: Promise.resolve({ data: null, error: null }),
    });
    await likeAssetByKey(client, "a");
    expect(__mocks.likeUpsertChain.upsert).toHaveBeenCalledWith(
      { asset_key: "a", user_id: "u1" },
      expect.objectContaining({ onConflict: "asset_key,user_id", ignoreDuplicates: true })
    );
  });
});

describe("recordAssetView", () => {
  it("no-ops silently when not signed in", async () => {
    const { client } = makeClient({
      likes: Promise.resolve({ data: [], error: null }),
      views: Promise.resolve({ data: [], error: null }),
      user: null,
    });
    await expect(recordAssetView(client, "a")).resolves.toBeUndefined();
    expect(
      (client as unknown as { rpc: ReturnType<typeof vi.fn> }).rpc
    ).not.toHaveBeenCalled();
  });

  it("calls record_asset_view RPC when signed in", async () => {
    const { client } = makeClient({
      likes: Promise.resolve({ data: [], error: null }),
      views: Promise.resolve({ data: [], error: null }),
      user: { id: "u1" },
    });
    await recordAssetView(client, "asset-xyz");
    expect(
      (client as unknown as { rpc: ReturnType<typeof vi.fn> }).rpc
    ).toHaveBeenCalledWith("record_asset_view", { p_asset_key: "asset-xyz" });
  });

  it("ignores empty keys", async () => {
    const { client } = makeClient({
      likes: Promise.resolve({ data: [], error: null }),
      views: Promise.resolve({ data: [], error: null }),
      user: { id: "u1" },
    });
    await recordAssetView(client, "");
    expect(
      (client as unknown as { rpc: ReturnType<typeof vi.fn> }).rpc
    ).not.toHaveBeenCalled();
  });
});
