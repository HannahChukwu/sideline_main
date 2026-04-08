import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";

type Client = SupabaseClient<Database>;

export async function fetchProfileTeamId(supabase: Client, userId: string): Promise<string | null> {
  const { data, error } = await supabase.from("profiles").select("team_id").eq("id", userId).maybeSingle();
  if (error) throw error;
  return data?.team_id ?? null;
}

export async function updateProfileTeamId(
  supabase: Client,
  userId: string,
  teamId: string | null
): Promise<void> {
  const { error } = await supabase.from("profiles").update({ team_id: teamId }).eq("id", userId);
  if (error) throw error;
}
