"use client";

import { useMemo, useState } from "react";
import { Upload, Clipboard, Table, Check, AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { guessColumnMapping, type ColumnMapping } from "@/lib/schedule/columnMapping";
import { parseCsv, rowsToImportedEvents, type ImportedGameEvent } from "@/lib/schedule/parseCsv";

type Props = {
  onImport: (events: ImportedGameEvent[]) => void;
};

type ParseState =
  | { kind: "idle" }
  | { kind: "parsed"; headers: string[]; rows: Record<string, string>[] }
  | { kind: "error"; message: string };

function Select({
  value,
  onChange,
  options,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder: string;
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm text-foreground outline-none",
        "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
      )}
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

export function ScheduleImporter({ onImport }: Props) {
  const [pasteText, setPasteText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseState, setParseState] = useState<ParseState>({ kind: "idle" });
  const [mapping, setMapping] = useState<ColumnMapping>({});

  const events = useMemo(() => {
    if (parseState.kind !== "parsed") return [];
    return rowsToImportedEvents(parseState.rows, mapping);
  }, [parseState, mapping]);

  function handleParse(text: string, sourceLabel?: string) {
    try {
      const { headers: parsedHeaders, rows: parsedRows } = parseCsv(text);
      if (parsedHeaders.length === 0) {
        setParseState({ kind: "error", message: "Couldn’t find CSV headers. Make sure you pasted a CSV (first row should be headers)." });
        return;
      }
      if (parsedRows.length === 0) {
        setParseState({ kind: "error", message: "CSV parsed, but no rows were found." });
        return;
      }
      setParseState({ kind: "parsed", headers: parsedHeaders, rows: parsedRows });
      setMapping(guessColumnMapping(parsedHeaders));
      if (sourceLabel) setFileName(sourceLabel);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to parse CSV.";
      setParseState({ kind: "error", message });
    }
  }

  return (
    <Card>
      <CardHeader className="pb-0">
        <CardTitle className="flex items-center gap-2">
          <Table className="w-4 h-4 text-primary" />
          Import schedule
        </CardTitle>
        <CardDescription>
          Upload a <span className="font-semibold text-foreground/70">.csv</span> export or paste CSV text. Works across schools without relying on a specific website format.
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-0">
        <Tabs defaultValue="upload">
          <TabsList>
            <TabsTrigger value="upload">
              <Upload className="w-4 h-4" />
              Upload CSV
            </TabsTrigger>
            <TabsTrigger value="paste">
              <Clipboard className="w-4 h-4" />
              Paste CSV
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="pt-3">
            <div className="flex flex-col gap-2">
              <Input
                type="file"
                accept=".csv,text/csv"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const text = await file.text();
                  handleParse(text, file.name);
                }}
              />
              {fileName && <div className="text-xs text-muted-foreground">Loaded: {fileName}</div>}
            </div>
          </TabsContent>

          <TabsContent value="paste" className="pt-3">
            <div className="flex flex-col gap-2">
              <Textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder={`Paste CSV here (first row headers)\nDate,Time,Opponent,Location\n3/22/2026,7:00 PM,Tigers,Home Stadium`}
                className="min-h-[140px]"
              />
              <div className="flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setPasteText("");
                    setParseState({ kind: "idle" });
                    setFileName(null);
                    setMapping({});
                  }}
                >
                  Clear
                </Button>
                <Button type="button" onClick={() => handleParse(pasteText, "pasted.csv")} disabled={!pasteText.trim()}>
                  Parse
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {parseState.kind === "error" && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            <AlertTriangle className="w-4 h-4 mt-0.5" />
            <div>{parseState.message}</div>
          </div>
        )}

        {parseState.kind === "parsed" && (
          <div className="mt-5 flex flex-col gap-4">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <div className="text-xs font-semibold tracking-widest uppercase text-muted-foreground/70 mb-3">
                Column mapping
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <div className="text-xs font-semibold text-foreground/60 uppercase tracking-wider">Opponent</div>
                  <Select
                    value={mapping.opponent ?? ""}
                    onChange={(v) => setMapping((m) => ({ ...m, opponent: v || undefined }))}
                    options={parseState.headers}
                    placeholder="Choose column"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="text-xs font-semibold text-foreground/60 uppercase tracking-wider">Date</div>
                  <Select
                    value={mapping.date ?? ""}
                    onChange={(v) => setMapping((m) => ({ ...m, date: v || undefined }))}
                    options={parseState.headers}
                    placeholder="Choose column"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="text-xs font-semibold text-foreground/60 uppercase tracking-wider">Time</div>
                  <Select
                    value={mapping.time ?? ""}
                    onChange={(v) => setMapping((m) => ({ ...m, time: v || undefined }))}
                    options={parseState.headers}
                    placeholder="Optional"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="text-xs font-semibold text-foreground/60 uppercase tracking-wider">Location</div>
                  <Select
                    value={mapping.location ?? ""}
                    onChange={(v) => setMapping((m) => ({ ...m, location: v || undefined }))}
                    options={parseState.headers}
                    placeholder="Optional"
                  />
                </div>
              </div>

              <div className="mt-3 text-[11px] text-muted-foreground">
                Tip: if your CSV has different header names, just pick the right columns here.
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div>
                  <div className="text-xs font-semibold tracking-widest uppercase text-muted-foreground/70">
                    Preview
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {events.length} event{events.length === 1 ? "" : "s"} detected
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={() => onImport(events)}
                  disabled={!mapping.opponent || events.length === 0}
                >
                  <Check className="w-4 h-4" />
                  Use schedule
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {events.slice(0, 6).map((ev, idx) => (
                  <div
                    key={`${ev.opponent}-${idx}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">{ev.opponent}</div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {(ev.dateText ?? "—")}{ev.timeText ? ` • ${ev.timeText}` : ""}{ev.location ? ` • ${ev.location}` : ""}
                      </div>
                    </div>
                    <div className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground/60">
                      {ev.homeAway ? String(ev.homeAway) : "event"}
                    </div>
                  </div>
                ))}
              </div>

              {events.length > 6 && (
                <div className="mt-2 text-[11px] text-muted-foreground">
                  Showing first 6 events. You’ll pick the exact matchup in the next step.
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

