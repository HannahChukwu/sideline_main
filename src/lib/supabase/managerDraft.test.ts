import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";
import type { GenerationRequest } from "@/lib/pipeline/types";
import {
  clearManagerDraft,
  loadManagerDraft,
  saveManagerDraft,
} from "./managerDraft";

const generationRequest: GenerationRequest = {
  team: {
    id: "t",
    schoolName: "S",
    teamName: "T",
    sport: "Football",
    season: "2025",
  },
  athletes: [],
  event: { id: "e", opponent: "O", dateTime: null },
  postType: "gameday",
  createdAt: "2026-01-01T00:00:00.000Z",
};

describe("loadManagerDraft", () => {
  it("throws when Supabase returns error", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn(() => ({
        maybeSingle: () => Promise.resolve({ data: null, error: new Error("db") }),
      })),
    };
    const supabase = { from: vi.fn(() => chain) } as unknown as SupabaseClient<Database>;
    await expect(loadManagerDraft(supabase, "m1")).rejects.toThrow("db");
  });

  it("returns row or null", async () => {
    const row = { id: "d1", manager_id: "m1" };
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn(() => ({
        maybeSingle: () => Promise.resolve({ data: row, error: null }),
      })),
    };
    const supabase = { from: vi.fn(() => chain) } as unknown as SupabaseClient<Database>;
    await expect(loadManagerDraft(supabase, "m1")).resolves.toEqual(row);
  });
});

describe("saveManagerDraft", () => {
  const payload = {
    generationRequest,
    compiledImagePrompt: "img",
    compiledCaptionPrompt: "cap",
  };

  it("updates when draft exists", async () => {
    const single = vi.fn(() =>
      Promise.resolve({ data: { id: "d1", manager_id: "m1", ...payload }, error: null })
    );
    const updateChain = {
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single,
          })),
        })),
      })),
    };
    let call = 0;
    const from = vi.fn(() => {
      call += 1;
      if (call === 1) {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          limit: vi.fn(() => ({
            maybeSingle: () => Promise.resolve({ data: { id: "d1" }, error: null }),
          })),
        };
      }
      return updateChain;
    });
    const supabase = { from } as unknown as SupabaseClient<Database>;

    const out = await saveManagerDraft(supabase, "m1", payload);
    expect(out).toEqual(expect.objectContaining({ id: "d1" }));
    expect(updateChain.update).toHaveBeenCalled();
  });

  it("throws when update fails", async () => {
    const single = vi.fn(() =>
      Promise.resolve({ data: null, error: new Error("update-fail") })
    );
    const updateChain = {
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({ single })),
        })),
      })),
    };
    let call = 0;
    const from = vi.fn(() => {
      call += 1;
      if (call === 1) {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          limit: vi.fn(() => ({
            maybeSingle: () => Promise.resolve({ data: { id: "d1" }, error: null }),
          })),
        };
      }
      return updateChain;
    });
    const supabase = { from } as unknown as SupabaseClient<Database>;
    await expect(saveManagerDraft(supabase, "m1", payload)).rejects.toThrow("update-fail");
  });

  it("inserts when no draft", async () => {
    const single = vi.fn(() =>
      Promise.resolve({ data: { id: "new1", manager_id: "m1" }, error: null })
    );
    const insertChain = {
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single,
        })),
      })),
    };
    let call = 0;
    const from = vi.fn(() => {
      call += 1;
      if (call === 1) {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              limit: vi.fn(() => ({
                maybeSingle: () => Promise.resolve({ data: null, error: null }),
              })),
            })),
          })),
        };
      }
      return insertChain;
    });
    const supabase = { from } as unknown as SupabaseClient<Database>;
    const out = await saveManagerDraft(supabase, "m1", payload);
    expect(out.id).toBe("new1");
    expect(insertChain.insert).toHaveBeenCalled();
  });

  it("throws when insert fails", async () => {
    const single = vi.fn(() =>
      Promise.resolve({ data: null, error: new Error("insert-fail") })
    );
    const insertChain = {
      insert: vi.fn(() => ({
        select: vi.fn(() => ({ single })),
      })),
    };
    let call = 0;
    const from = vi.fn(() => {
      call += 1;
      if (call === 1) {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          limit: vi.fn(() => ({
            maybeSingle: () => Promise.resolve({ data: null, error: null }),
          })),
        };
      }
      return insertChain;
    });
    const supabase = { from } as unknown as SupabaseClient<Database>;
    await expect(saveManagerDraft(supabase, "m1", payload)).rejects.toThrow("insert-fail");
  });
});

describe("clearManagerDraft", () => {
  it("deletes by manager", async () => {
    const eq = vi.fn();
    const supabase = {
      from: vi.fn(() => ({
        delete: vi.fn(() => ({ eq })),
      })),
    } as unknown as SupabaseClient<Database>;
    await clearManagerDraft(supabase, "m1");
    expect(eq).toHaveBeenCalledWith("manager_id", "m1");
  });
});
