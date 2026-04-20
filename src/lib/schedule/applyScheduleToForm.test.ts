import { describe, expect, it } from "vitest";
import { applyScheduleRowToPosterForm, formatScheduleRowOptionLabel } from "./applyScheduleToForm";
import type { Team } from "@/lib/pipeline/types";
import type { ScheduleRow } from "@/lib/supabase/schedules";

const team: Team = {
  id: "t1",
  schoolName: "Ridgeline",
  teamName: "Lions",
  sport: "Football",
  season: "2025",
};

function row(partial: Partial<ScheduleRow>): ScheduleRow {
  return {
    id: "s1",
    team_id: team.id,
    opponent: "Tigers",
    date_time: "2026-03-15T19:00:00.000Z",
    date_text: null,
    time_text: null,
    location: "Home Field",
    home_away: "home",
    home_score: null,
    away_score: null,
    final: false,
    created_at: "",
    updated_at: "",
    ...partial,
  };
}

describe("applyScheduleRowToPosterForm", () => {
  it("fills home as school program and opponent as away", () => {
    const patch = applyScheduleRowToPosterForm(team, row({}));
    expect(patch.homeTeam).toBe("Ridgeline");
    expect(patch.awayTeam).toBe("Tigers");
    expect(patch.sport).toBe("Football");
    expect(patch.eventDate).toBe("2026-03-15");
    expect(patch.venue).toBe("Home Field");
  });

  it("includes scores when final", () => {
    const patch = applyScheduleRowToPosterForm(team, row({ final: true, home_score: 21, away_score: 14 }));
    expect(patch.homeScore).toBe("21");
    expect(patch.awayScore).toBe("14");
  });

  it("normalizes opponent when imported value includes our team", () => {
    const squashTeam: Team = {
      id: "t2",
      schoolName: "Trinity",
      teamName: "Men's Squash",
      sport: "Squash",
      season: "2026",
    };
    const patch = applyScheduleRowToPosterForm(
      squashTeam,
      row({ opponent: "Men's Squash vs Harvard" })
    );
    expect(patch.homeTeam).toBe("Trinity");
    expect(patch.awayTeam).toBe("Harvard");
  });
});

describe("formatScheduleRowOptionLabel", () => {
  it("shows date and opponent", () => {
    const label = formatScheduleRowOptionLabel(team, row({}));
    expect(label).toContain("2026-03-15");
    expect(label).toContain("Tigers");
  });

  it("shows normalized opponent label for imported matchup text", () => {
    const squashTeam: Team = {
      id: "t2",
      schoolName: "Trinity",
      teamName: "Men's Squash",
      sport: "Squash",
      season: "2026",
    };
    const label = formatScheduleRowOptionLabel(
      squashTeam,
      row({ opponent: "Men's Squash vs Harvard" })
    );
    expect(label).toContain("vs Harvard");
    expect(label).not.toContain("vs Men's Squash vs Harvard");
  });
});
