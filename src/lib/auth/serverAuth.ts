import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Database, Role } from "@/lib/types";

type Client = SupabaseClient<Database>;

type ProfileRoleRow = {
  role: Role;
};

export async function getAuthenticatedUser(supabase: Client): Promise<User | null> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) return null;
  return user ?? null;
}

export async function getUserRole(
  supabase: Client,
  userId: string
): Promise<Role | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return (data as ProfileRoleRow).role ?? null;
}

export async function userHasRole(
  supabase: Client,
  userId: string,
  role: Role
): Promise<boolean> {
  const currentRole = await getUserRole(supabase, userId);
  return currentRole === role;
}

/**
 * Checks whether a user can manage a team through schools.manager_id ownership.
 */
export async function canManageTeam(
  supabase: Client,
  userId: string,
  teamId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("teams")
    .select("id, schools!inner(manager_id)")
    .eq("id", teamId)
    .maybeSingle();

  if (error || !data) return false;

  const ownerId = (data as unknown as { schools: { manager_id: string } }).schools
    ?.manager_id;
  return ownerId === userId;
}
