import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";
import { getAthletesForTeam } from "./athletes";

function mockSupabase(result: { data: unknown; error: unknown }) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn(() => Promise.resolve(result)),
  };
  return { from: vi.fn(() => chain) } as unknown as SupabaseClient<Database>;
}

describe("getAthletesForTeam", () => {
  it("maps nullable number and position", async () => {
    const supabase = mockSupabase({
      error: null,
      data: [
        {
          id: "a1",
          team_id: "t1",
          full_name: "Jordan",
          number: "7",
          position: "QB",
        },
        {
          id: "a2",
          team_id: "t1",
          full_name: "Sam",
          number: null,
          position: null,
        },
      ],
    });
    const athletes = await getAthletesForTeam(supabase, "t1");
    expect(athletes[0]).toEqual(
      expect.objectContaining({
        fullName: "Jordan",
        number: "7",
        position: "QB",
      })
    );
    expect(athletes[1]).toEqual({
      id: "a2",
      teamId: "t1",
      fullName: "Sam",
    });
  });

  it("throws on error", async () => {
    const supabase = mockSupabase({ data: null, error: { message: "nope" } });
    await expect(getAthletesForTeam(supabase, "t1")).rejects.toEqual(
      expect.objectContaining({ message: "nope" })
    );
  });
});
