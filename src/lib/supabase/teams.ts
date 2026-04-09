import type { Team } from "@/lib/pipeline/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";

type Client = SupabaseClient<Database>;

type TeamRow = {
  id: string;
  team_name: string;
  sport: string;
  season: string;
  school_id: string;
  schools: { name: string } | null;
};

/** Teams under schools owned by the signed-in designer (`schools.manager_id`; RLS-enforced). */
export async function getTeamsForDesigner(
  supabase: Client
): Promise<Team[]> {
  const { data, error } = await supabase
    .from("teams")
    .select("id, team_name, sport, season, school_id, schools(name)")
    .order("team_name");

  if (error) throw error;
  const rows = (data ?? []) as unknown as TeamRow[];

  return rows.map((row) => ({
    id: row.id,
    schoolName: row.schools?.name ?? "",
    teamName: row.team_name,
    sport: row.sport,
    season: row.season,
  }));
}

export async function createTeamForDesigner(
  supabase: Client,
  input: {
    school_id: string;
    /** Pass from the school row so we avoid a nested `schools()` select on RETURNING (RLS/embed edge cases). */
    school_name?: string;
    team_name: string;
    sport: string;
    season: string;
  }
): Promise<Team> {
  const { data, error } = await supabase
    .from("teams")
    .insert({
      school_id: input.school_id,
      team_name: input.team_name.trim(),
      sport: input.sport.trim(),
      season: input.season.trim(),
    })
    .select("id, team_name, sport, season, school_id")
    .single();

  if (error) throw error;
  const row = data as { id: string; team_name: string; sport: string; season: string; school_id: string };
  return {
    id: row.id,
    schoolName: input.school_name?.trim() ?? "",
    teamName: row.team_name,
    sport: row.sport,
    season: row.season,
  };
}

export type TeamDisplay = {
  id: string;
  schoolName: string;
  teamName: string;
  sport: string;
  season: string;
};

/** Name row for dashboards; allowed by RLS for school owners and for athletes linked via profiles.team_id. */
export async function getTeamDisplayForViewer(supabase: Client, teamId: string): Promise<TeamDisplay | null> {
  const { data, error } = await supabase
    .from("teams")
    .select("id, team_name, sport, season, schools(name)")
    .eq("id", teamId)
    .maybeSingle();

  if (error || !data) return null;
  const row = data as unknown as TeamRow;
  return {
    id: row.id,
    schoolName: row.schools?.name ?? "",
    teamName: row.team_name,
    sport: row.sport,
    season: row.season,
  };
}
