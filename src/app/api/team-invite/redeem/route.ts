import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { verifyTeamInviteToken } from "@/lib/team-invite/token";
import type { Role } from "@/lib/types";

const BodySchema = z.object({
  token: z.string().min(20),
});

const REDEEM_ROLES: ReadonlySet<Role> = new Set(["athlete", "student"]);

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const payload = verifyTeamInviteToken(parsed.data.token);
  if (!payload) {
    return NextResponse.json({ error: "Invalid or expired invite link" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (profileErr) {
    return NextResponse.json({ error: "Could not load profile" }, { status: 500 });
  }

  const role = profile?.role as Role | undefined;
  if (!role || !REDEEM_ROLES.has(role)) {
    return NextResponse.json(
      { error: "Only athlete or student accounts can use team invite links." },
      { status: 403 }
    );
  }

  let athleteIdToLink: string | null = null;
  if (role === "athlete") {
    const normalizedName = profile?.full_name?.trim() ?? "";
    if (normalizedName) {
      const { data: existing, error: existingErr } = await supabase
        .from("athletes")
        .select("id")
        .eq("team_id", payload.team_id)
        .ilike("full_name", normalizedName)
        .limit(1)
        .maybeSingle();
      if (existingErr) {
        return NextResponse.json({ error: existingErr.message }, { status: 500 });
      }
      athleteIdToLink = existing?.id ?? null;
    }

    // If the roster has no matching athlete yet, self-register one so
    // athlete photo library can work immediately after invite redemption.
    if (!athleteIdToLink) {
      const fallbackName = profile?.full_name?.trim() || `Athlete ${user.id.slice(0, 6)}`;
      const { data: inserted, error: insertErr } = await supabase
        .from("athletes")
        .insert({
          team_id: payload.team_id,
          full_name: fallbackName,
          number: null,
          position: null,
        })
        .select("id")
        .single();
      if (insertErr) {
        return NextResponse.json({ error: insertErr.message }, { status: 500 });
      }
      athleteIdToLink = inserted.id;
    }
  }

  const { error: updateErr } = await supabase
    .from("profiles")
    .update({
      team_id: payload.team_id,
      athlete_id: athleteIdToLink,
    })
    .eq("id", user.id);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, team_id: payload.team_id, athlete_id: athleteIdToLink });
}
