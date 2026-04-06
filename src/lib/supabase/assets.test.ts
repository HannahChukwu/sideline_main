import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";
import {
  getDesignerAssets,
  getLikeCounts,
  getPublishedAssets,
  likeAsset,
  unlikeAsset,
} from "./assets";

function queryBuilder(result: Promise<{ data: unknown; error: unknown }>) {
  const self = {
    select: vi.fn(() => self),
    eq: vi.fn(() => self),
    order: vi.fn(() => self),
    limit: vi.fn(() => self),
    then: (onFulfilled: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) =>
      result.then(onFulfilled, onRejected),
    catch: (onRejected: (e: unknown) => unknown) => result.catch(onRejected),
  };
  return self;
}

function makeClient(handlers: {
  queryResult: Promise<{ data: unknown; error: unknown }>;
  authUser: Promise<{ data: { user: { id: string } | null }; error: unknown }>;
}) {
  return {
    from: vi.fn(() => queryBuilder(handlers.queryResult)),
    auth: {
      getUser: vi.fn(() => handlers.authUser),
    },
  } as unknown as SupabaseClient<Database>;
}

describe("getPublishedAssets", () => {
  const assetRow = {
    id: "a1",
    designer_id: "d1",
    profiles: { full_name: "Pat" },
    asset_likes: [{ user_id: "u1" }, { user_id: "u2" }],
  };

  it("computes like_count and liked_by_me", async () => {
    const supabase = makeClient({
      queryResult: Promise.resolve({ data: [assetRow], error: null }),
      authUser: Promise.resolve({ data: { user: { id: "u2" } }, error: null }),
    });
    const rows = await getPublishedAssets(supabase);
    expect(rows[0]).toEqual(
      expect.objectContaining({
        like_count: 2,
        liked_by_me: true,
        designer_name: "Pat",
      })
    );
  });

  it("sets liked_by_me false when anonymous", async () => {
    const supabase = makeClient({
      queryResult: Promise.resolve({ data: [assetRow], error: null }),
      authUser: Promise.resolve({ data: { user: null }, error: null }),
    });
    const rows = await getPublishedAssets(supabase);
    expect(rows[0]?.liked_by_me).toBe(false);
  });

  it("filters by sport when not All", async () => {
    const qb = queryBuilder(Promise.resolve({ data: [], error: null }));
    const supabase = {
      from: vi.fn(() => qb),
      auth: {
        getUser: vi.fn(() =>
          Promise.resolve({ data: { user: { id: "x" } }, error: null })
        ),
      },
    } as unknown as SupabaseClient<Database>;
    await getPublishedAssets(supabase, { sport: "Soccer" });
    expect(qb.eq).toHaveBeenCalledWith("sport", "Soccer");
  });
});

describe("getDesignerAssets", () => {
  it("filters status when not all", async () => {
    const qb = queryBuilder(Promise.resolve({ data: [], error: null }));
    const supabase = { from: vi.fn(() => qb) } as unknown as SupabaseClient<Database>;
    await getDesignerAssets(supabase, "d1", { status: "draft" });
    expect(qb.eq).toHaveBeenCalledWith("designer_id", "d1");
    expect(qb.eq).toHaveBeenCalledWith("status", "draft");
  });
});

describe("likeAsset", () => {
  it("inserts like for current user", async () => {
    const insert = vi.fn(() => Promise.resolve({ error: null }));
    const supabase = {
      from: vi.fn((t: string) => {
        expect(t).toBe("asset_likes");
        return { insert };
      }),
      auth: {
        getUser: vi.fn(() =>
          Promise.resolve({ data: { user: { id: "u9" } }, error: null })
        ),
      },
    } as unknown as SupabaseClient<Database>;
    await likeAsset(supabase, "a1");
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ asset_id: "a1", user_id: "u9" })
    );
  });

  it("throws when not signed in", async () => {
    const supabase = {
      from: vi.fn(),
      auth: {
        getUser: vi.fn(() =>
          Promise.resolve({ data: { user: null }, error: null })
        ),
      },
    } as unknown as SupabaseClient<Database>;
    await expect(likeAsset(supabase, "a1")).rejects.toThrow("Not signed in");
  });
});

describe("unlikeAsset", () => {
  it("deletes like", async () => {
    const innerEq = vi.fn(() => Promise.resolve({ error: null }));
    const outerEq = vi.fn(() => ({ eq: innerEq }));
    const supabase = {
      from: vi.fn(() => ({
        delete: vi.fn(() => ({ eq: outerEq })),
      })),
      auth: {
        getUser: vi.fn(() =>
          Promise.resolve({ data: { user: { id: "u9" } }, error: null })
        ),
      },
    } as unknown as SupabaseClient<Database>;
    await unlikeAsset(supabase, "a1");
    expect(outerEq).toHaveBeenCalledWith("asset_id", "a1");
    expect(innerEq).toHaveBeenCalledWith("user_id", "u9");
  });
});

describe("getPublishedAssets errors", () => {
  it("throws when query fails", async () => {
    const supabase = makeClient({
      queryResult: Promise.resolve({ data: null, error: new Error("qfail") }),
      authUser: Promise.resolve({ data: { user: { id: "u" } }, error: null }),
    });
    await expect(getPublishedAssets(supabase)).rejects.toThrow("qfail");
  });

  it("throws when auth.getUser fails", async () => {
    const supabase = makeClient({
      queryResult: Promise.resolve({ data: [], error: null }),
      authUser: Promise.resolve({ data: { user: null }, error: new Error("auth") }),
    });
    await expect(getPublishedAssets(supabase)).rejects.toThrow("auth");
  });
});

describe("getDesignerAssets errors", () => {
  it("throws when query fails", async () => {
    const qb = queryBuilder(Promise.resolve({ data: null, error: new Error("bad") }));
    const supabase = { from: vi.fn(() => qb) } as unknown as SupabaseClient<Database>;
    await expect(getDesignerAssets(supabase, "d1")).rejects.toThrow("bad");
  });
});

describe("likeAsset errors", () => {
  it("throws when auth fails", async () => {
    const supabase = {
      from: vi.fn(),
      auth: {
        getUser: vi.fn(() =>
          Promise.resolve({ data: { user: null }, error: new Error("nope") })
        ),
      },
    } as unknown as SupabaseClient<Database>;
    await expect(likeAsset(supabase, "a1")).rejects.toThrow("nope");
  });
});

describe("unlikeAsset errors", () => {
  it("throws when auth fails", async () => {
    const supabase = {
      from: vi.fn(),
      auth: {
        getUser: vi.fn(() =>
          Promise.resolve({ data: { user: null }, error: new Error("uerr") })
        ),
      },
    } as unknown as SupabaseClient<Database>;
    await expect(unlikeAsset(supabase, "a1")).rejects.toThrow("uerr");
  });
});

describe("getLikeCounts", () => {
  it("returns empty map for empty ids", async () => {
    const supabase = {} as SupabaseClient<Database>;
    await expect(getLikeCounts(supabase, [])).resolves.toEqual({});
  });

  it("aggregates likes", async () => {
    const supabase = {
      auth: {
        getUser: vi.fn(() =>
          Promise.resolve({ data: { user: { id: "me" } }, error: null })
        ),
      },
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          in: vi.fn(() =>
            Promise.resolve({
              error: null,
              data: [
                { asset_id: "a1", user_id: "x" },
                { asset_id: "a1", user_id: "me" },
                { asset_id: "a2", user_id: "y" },
              ],
            })
          ),
        })),
      })),
    } as unknown as SupabaseClient<Database>;

    const out = await getLikeCounts(supabase, ["a1", "a2"]);
    expect(out.a1).toEqual({ like_count: 2, liked_by_me: true });
    expect(out.a2).toEqual({ like_count: 1, liked_by_me: false });
  });

  it("throws when query fails", async () => {
    const supabase = {
      auth: {
        getUser: vi.fn(() =>
          Promise.resolve({ data: { user: { id: "me" } }, error: null })
        ),
      },
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          in: vi.fn(() =>
            Promise.resolve({ error: new Error("likes"), data: null })
          ),
        })),
      })),
    } as unknown as SupabaseClient<Database>;
    await expect(getLikeCounts(supabase, ["a1"])).rejects.toThrow("likes");
  });
});
