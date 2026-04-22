import type { Athlete } from "@/lib/pipeline/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";

type Client = SupabaseClient<Database>;

export async function getAthletesForTeam(
  supabase: Client,
  teamId: string
): Promise<Athlete[]> {
  const { data, error } = await supabase
    .from("athletes")
    .select("id, team_id, full_name, number, position")
    .eq("team_id", teamId)
    .order("full_name");

  if (error) throw error;
  const rows = (data ?? []) as { id: string; team_id: string; full_name: string; number: string | null; position: string | null }[];

  return rows.map((row) => ({
    id: row.id,
    teamId: row.team_id,
    fullName: row.full_name,
    number: row.number ?? undefined,
    position: row.position ?? undefined,
  }));
}

export async function insertAthlete(
  supabase: Client,
  input: { team_id: string; full_name: string; number?: string | null; position?: string | null }
): Promise<void> {
  const { error } = await supabase.from("athletes").insert({
    team_id: input.team_id,
    full_name: input.full_name.trim(),
    number: input.number?.trim() || null,
    position: input.position?.trim() || null,
  });
  if (error) throw error;
}

export async function getAthleteById(supabase: Client, athleteId: string): Promise<Athlete | null> {
  const { data, error } = await supabase
    .from("athletes")
    .select("id, team_id, full_name, number, position")
    .eq("id", athleteId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    teamId: data.team_id,
    fullName: data.full_name,
    number: data.number ?? undefined,
    position: data.position ?? undefined,
  };
}

export async function findAthleteByTeamAndName(
  supabase: Client,
  teamId: string,
  fullName: string
): Promise<Athlete | null> {
  const normalized = fullName.trim().toLowerCase();
  if (!normalized) return null;
  const { data, error } = await supabase
    .from("athletes")
    .select("id, team_id, full_name, number, position")
    .eq("team_id", teamId);
  if (error) throw error;
  const match = (data ?? []).find((row) => row.full_name.trim().toLowerCase() === normalized);
  if (!match) return null;
  return {
    id: match.id,
    teamId: match.team_id,
    fullName: match.full_name,
    number: match.number ?? undefined,
    position: match.position ?? undefined,
  };
}
