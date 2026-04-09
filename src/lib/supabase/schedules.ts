import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";
import type { ImportedGameEvent } from "@/lib/schedule/parseCsv";

type Client = SupabaseClient<Database>;

export type ScheduleRow = Database["public"]["Tables"]["schedules"]["Row"];
type ScheduleInsert = Database["public"]["Tables"]["schedules"]["Insert"];

export async function replaceTeamScheduleFromImport(
  supabase: Client,
  teamId: string,
  events: ImportedGameEvent[]
): Promise<void> {
  // MVP approach: replace schedule for team with newly imported set.
  // This avoids needing unique constraints for upsert.
  const { error: delErr } = await supabase.from("schedules").delete().eq("team_id", teamId);
  if (delErr) throw delErr;

  // Do not send updated_at: older DBs may lack the column; when present, default now() applies.
  const payload: ScheduleInsert[] = events.map((ev) => ({
    team_id: teamId,
    opponent: ev.opponent,
    date_time: ev.dateTime ?? null,
    date_text: ev.dateText ?? null,
    time_text: ev.timeText ?? null,
    location: ev.location ?? null,
    home_away: (ev.homeAway === "home" || ev.homeAway === "away" || ev.homeAway === "neutral") ? ev.homeAway : null,
  }));

  if (payload.length === 0) return;
  const { error: insErr } = await supabase.from("schedules").insert(payload);
  if (insErr) throw insErr;
}

export async function getSchedulesForTeam(
  supabase: Client,
  teamId: string
): Promise<ScheduleRow[]> {
  const { data, error } = await supabase
    .from("schedules")
    .select("*")
    .eq("team_id", teamId)
    .order("date_time", { ascending: true, nullsFirst: false });

  if (error) throw error;
  return (data ?? []) as ScheduleRow[];
}

export async function updateScheduleScore(
  supabase: Client,
  scheduleId: string,
  patch: { home_score: number | null; away_score: number | null; final: boolean }
): Promise<void> {
  const { error } = await supabase
    .from("schedules")
    .update({
      home_score: patch.home_score,
      away_score: patch.away_score,
      final: patch.final,
    })
    .eq("id", scheduleId);
  if (error) throw error;
}

