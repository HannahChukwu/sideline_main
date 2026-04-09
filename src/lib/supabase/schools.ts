import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";

type Client = SupabaseClient<Database>;

export type SchoolRow = { id: string; name: string };

/** First school owned by the signed-in user (RLS). */
export async function getSchoolForDesigner(supabase: Client): Promise<SchoolRow | null> {
  const { data, error } = await supabase
    .from("schools")
    .select("id, name")
    .order("created_at")
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as SchoolRow | null;
}

/** Ensures a school row exists for the current user so teams can be created. */
export async function ensureSchoolForDesigner(
  supabase: Client,
  defaultName = "My school"
): Promise<SchoolRow> {
  const existing = await getSchoolForDesigner(supabase);
  if (existing) return existing;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in to add teams.");

  const { data, error } = await supabase
    .from("schools")
    .insert({ name: defaultName.trim() || "My school", manager_id: user.id })
    .select("id, name")
    .single();

  if (error) throw error;
  return data as SchoolRow;
}
