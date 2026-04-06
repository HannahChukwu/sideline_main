import { describe, expect, it } from "vitest";
import { parseCsv, rowsToImportedEvents } from "./parseCsv";
import type { ColumnMapping } from "./columnMapping";

describe("parseCsv", () => {
  it("returns empty result for blank input", () => {
    expect(parseCsv("")).toEqual({ headers: [], rows: [] });
    expect(parseCsv("   \n  ")).toEqual({ headers: [], rows: [] });
  });

  it("strips BOM and parses comma-delimited rows", () => {
    const text = "\uFEFFName,Score\nAlice,10\nBob,20";
    expect(parseCsv(text)).toEqual({
      headers: ["Name", "Score"],
      rows: [
        { Name: "Alice", Score: "10" },
        { Name: "Bob", Score: "20" },
      ],
    });
  });

  it("handles quoted fields with commas and escaped quotes", () => {
    const text = 'a,b\n"hello, world","say ""hi"""';
    expect(parseCsv(text)).toEqual({
      headers: ["a", "b"],
      rows: [{ a: "hello, world", b: 'say "hi"' }],
    });
  });

  it("prefers tab delimiter when tabs dominate", () => {
    const text = "Col1\tCol2\nA\tB";
    expect(parseCsv(text)).toEqual({
      headers: ["Col1", "Col2"],
      rows: [{ Col1: "A", Col2: "B" }],
    });
  });

  it("prefers semicolon when semicolons dominate", () => {
    const text = "A;B\n1;2";
    expect(parseCsv(text)).toEqual({
      headers: ["A", "B"],
      rows: [{ A: "1", B: "2" }],
    });
  });

  it("skips rows that are entirely empty cells", () => {
    const text = "x,y\n1,2\n,,\n3,4";
    expect(parseCsv(text).rows).toEqual([
      { x: "1", y: "2" },
      { x: "3", y: "4" },
    ]);
  });

});

describe("rowsToImportedEvents", () => {
  const mapping: ColumnMapping = {
    opponent: "Opponent",
    date: "Date",
    time: "Time",
    location: "Where",
    homeAway: "H/A",
  };

  it("drops rows with no opponent", () => {
    const rows = [{ Opponent: "", Date: "2025-01-01" }];
    expect(rowsToImportedEvents(rows, mapping)).toEqual([]);
  });

  it("maps columns and normalizes home/away", () => {
    const rows = [
      {
        Opponent: "East High",
        Date: "January 15, 2025",
        Time: "",
        Where: "Main Field",
        "H/A": "home",
      },
    ];
    const events = rowsToImportedEvents(rows, mapping);
    expect(events).toHaveLength(1);
    expect(events[0]!.opponent).toBe("East High");
    expect(events[0]!.location).toBe("Main Field");
    expect(events[0]!.homeAway).toBe("home");
    expect(events[0]!.dateTime).toBeTypeOf("string");
  });

  it.each([
    ["h", "home"],
    ["a", "away"],
    ["n", "neutral"],
    ["CUSTOM", "CUSTOM"],
  ] as const)("normalizes homeAway %s → %s", (raw, expected) => {
    const rows = [{ Opponent: "X", "H/A": raw }];
    const m: ColumnMapping = { opponent: "Opponent", homeAway: "H/A" };
    const [ev] = rowsToImportedEvents(rows, m);
    expect(ev!.homeAway).toBe(expected);
  });

  it("leaves homeAway undefined when blank", () => {
    const rows = [{ Opponent: "X", "H/A": "   " }];
    const m: ColumnMapping = { opponent: "Opponent", homeAway: "H/A" };
    const [ev] = rowsToImportedEvents(rows, m);
    expect(ev!.homeAway).toBeUndefined();
  });

  it("returns null dateTime when date text is not parseable", () => {
    const rows = [
      { Opponent: "X", Date: "not-a-real-date", Time: "also-nope" },
    ];
    const m: ColumnMapping = { opponent: "Opponent", date: "Date", time: "Time" };
    const [ev] = rowsToImportedEvents(rows, m);
    expect(ev!.dateTime).toBeNull();
  });
});
