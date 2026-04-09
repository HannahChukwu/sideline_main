import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { TeamInstagramRow } from "@/lib/instagram/teamInstagram";

/**
 * Teams the signed-in designer can manage, with whether Instagram is linked for each.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { data: teams, error: teamsErr } = await supabase
    .from("teams")
    .select("id, team_name, sport, season, schools(name)")
    .order("team_name");

  if (teamsErr) {
    return NextResponse.json({ error: teamsErr.message }, { status: 500 });
  }

  type Row = {
    id: string;
    team_name: string;
    sport: string;
    season: string;
    schools: { name: string } | null;
  };

  const teamRows = (teams ?? []) as unknown as Row[];

  const { data: igRows, error: igErr } = await supabase
    .from("team_instagram_accounts")
    .select("team_id");

  if (igErr) {
    return NextResponse.json({ error: igErr.message }, { status: 500 });
  }

  const connected = new Set((igRows ?? []).map((r) => r.team_id as string));

  const payload: TeamInstagramRow[] = teamRows.map((t) => {
    const school = t.schools?.name?.trim() ?? "";
    const label = school ? `${school} — ${t.team_name} (${t.sport})` : `${t.team_name} (${t.sport})`;
    return {
      id: t.id,
      label,
      igConnected: connected.has(t.id),
    };
  });

  return NextResponse.json({ teams: payload });
}
