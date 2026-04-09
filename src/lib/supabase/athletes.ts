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
