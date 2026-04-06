import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";
import type { ImportedGameEvent } from "@/lib/schedule/parseCsv";
import {
  getSchedulesForTeam,
  replaceTeamScheduleFromImport,
  updateScheduleScore,
} from "./schedules";

describe("replaceTeamScheduleFromImport", () => {
  it("deletes then inserts events", async () => {
    const deleteEq = vi.fn(() => Promise.resolve({ error: null }));
    const insert = vi.fn(() => Promise.resolve({ error: null }));
    const from = vi.fn((table: string) => {
      expect(table).toBe("schedules");
      return {
        delete: () => ({ eq: deleteEq }),
        insert,
      };
    });
    const supabase = { from } as unknown as SupabaseClient<Database>;

    const events: ImportedGameEvent[] = [
      {
        opponent: "A",
        dateTime: "2026-01-01T00:00:00.000Z",
        sourceRow: {},
      },
    ];

    await replaceTeamScheduleFromImport(supabase, "team-1", events);
    expect(deleteEq).toHaveBeenCalledWith("team_id", "team-1");
    expect(insert).toHaveBeenCalledWith([
      expect.objectContaining({
        team_id: "team-1",
        opponent: "A",
        date_time: "2026-01-01T00:00:00.000Z",
      }),
    ]);
  });

  it("skips insert when no events", async () => {
    const insert = vi.fn();
    const from = vi.fn(() => ({
      delete: () => ({ eq: () => Promise.resolve({ error: null }) }),
      insert,
    }));
    await replaceTeamScheduleFromImport(
      { from } as unknown as SupabaseClient<Database>,
      "team-1",
      []
    );
    expect(insert).not.toHaveBeenCalled();
  });

  it("throws on insert error after delete", async () => {
    const from = vi.fn(() => ({
      delete: () => ({
        eq: () => Promise.resolve({ error: null }),
      }),
      insert: () => Promise.resolve({ error: { message: "ins" } }),
    }));
    await expect(
      replaceTeamScheduleFromImport(
        { from } as unknown as SupabaseClient<Database>,
        "t",
        [{ opponent: "Y", dateTime: null, sourceRow: {} }]
      )
    ).rejects.toEqual(expect.objectContaining({ message: "ins" }));
  });

  it("throws on delete error", async () => {
    const from = vi.fn(() => ({
      delete: () => ({
        eq: () => Promise.resolve({ error: { message: "del" } }),
      }),
    }));
    await expect(
      replaceTeamScheduleFromImport(
        { from } as unknown as SupabaseClient<Database>,
        "t",
        [{ opponent: "X", dateTime: null, sourceRow: {} }]
      )
    ).rejects.toEqual(expect.objectContaining({ message: "del" }));
  });
});

describe("getSchedulesForTeam", () => {
  it("throws on error", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn(() => Promise.resolve({ data: null, error: new Error("sch") })),
    };
    const supabase = { from: vi.fn(() => chain) } as unknown as SupabaseClient<Database>;
    await expect(getSchedulesForTeam(supabase, "t")).rejects.toThrow("sch");
  });

  it("returns rows", async () => {
    const rows = [{ id: "1", team_id: "t" }];
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn(() => Promise.resolve({ data: rows, error: null })),
    };
    const supabase = { from: vi.fn(() => chain) } as unknown as SupabaseClient<Database>;
    await expect(getSchedulesForTeam(supabase, "t")).resolves.toEqual(rows);
  });
});

describe("updateScheduleScore", () => {
  it("throws on error", async () => {
    const eq = vi.fn(() => Promise.resolve({ error: { message: "up" } }));
    const supabase = {
      from: vi.fn(() => ({
        update: vi.fn(() => ({ eq })),
      })),
    } as unknown as SupabaseClient<Database>;
    await expect(
      updateScheduleScore(supabase, "id", {
        home_score: 0,
        away_score: 0,
        final: false,
      })
    ).rejects.toEqual(expect.objectContaining({ message: "up" }));
  });

  it("updates row", async () => {
    const eq = vi.fn(() => Promise.resolve({ error: null }));
    const chain = {
      update: vi.fn(() => ({ eq })),
    };
    const supabase = {
      from: vi.fn(() => chain),
    } as unknown as SupabaseClient<Database>;

    await updateScheduleScore(supabase, "sch-1", {
      home_score: 1,
      away_score: 2,
      final: true,
    });
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        home_score: 1,
        away_score: 2,
        final: true,
      })
    );
    expect(eq).toHaveBeenCalledWith("id", "sch-1");
  });
});
