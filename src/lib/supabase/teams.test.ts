import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";
import { getTeamsForManager } from "./teams";

function mockSupabase(result: { data: unknown; error: unknown }) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn(() => Promise.resolve(result)),
  };
  return {
    from: vi.fn(() => chain),
  } as unknown as SupabaseClient<Database>;
}

describe("getTeamsForManager", () => {
  it("maps joined school name", async () => {
    const supabase = mockSupabase({
      error: null,
      data: [
        {
          id: "t1",
          team_name: "Lions",
          sport: "Football",
          season: "2025",
          school_id: "s1",
          schools: { name: "Ridgeline High" },
        },
      ],
    });
    const teams = await getTeamsForManager(supabase);
    expect(teams).toEqual([
      {
        id: "t1",
        schoolName: "Ridgeline High",
        teamName: "Lions",
        sport: "Football",
        season: "2025",
      },
    ]);
  });

  it("uses empty school when join missing", async () => {
    const supabase = mockSupabase({
      error: null,
      data: [
        {
          id: "t1",
          team_name: "Lions",
          sport: "Football",
          season: "2025",
          school_id: "s1",
          schools: null,
        },
      ],
    });
    const teams = await getTeamsForManager(supabase);
    expect(teams[0]?.schoolName).toBe("");
  });

  it("throws on Supabase error", async () => {
    const supabase = mockSupabase({ data: null, error: new Error("db") });
    await expect(getTeamsForManager(supabase)).rejects.toThrow("db");
  });
});
