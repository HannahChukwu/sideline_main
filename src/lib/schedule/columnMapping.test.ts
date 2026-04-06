import { describe, expect, it } from "vitest";
import { guessColumnMapping } from "./columnMapping";

describe("guessColumnMapping", () => {
  it("maps common header labels", () => {
    const headers = ["Game Date", "Start Time", "Opponent", "Venue", "Home/Away"];
    expect(guessColumnMapping(headers)).toEqual({
      date: "Game Date",
      time: "Start Time",
      opponent: "Opponent",
      location: "Venue",
      homeAway: "Home/Away",
    });
  });

  it("uses contains match when exact keyword match is missing", () => {
    const headers = ["event_date", "vs_team", "field_name"];
    const m = guessColumnMapping(headers);
    expect(m.date).toBe("event_date");
    expect(m.opponent).toBe("vs_team");
    expect(m.location).toBe("field_name");
  });

  it("returns partial mapping when only some columns match", () => {
    const headers = ["Foo", "Opponent"];
    expect(guessColumnMapping(headers)).toEqual({
      opponent: "Opponent",
    });
  });
});
