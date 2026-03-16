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

export async function getTeamsForManager(
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
