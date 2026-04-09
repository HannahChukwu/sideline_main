import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { signTeamInviteToken } from "@/lib/team-invite/token";

const BodySchema = z.object({
  team_id: z.string().uuid(),
});

function originFromRequest(request: Request): string {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!host) return "";
  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

/**
 * POST — school owner (designer account; `schools.manager_id`) only.
 * Returns a signed join URL for athletes/students.
 */
export async function POST(request: Request) {
  try {
    const json = await request.json().catch(() => null);
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const teamId = parsed.data.team_id;
    const { data: row, error } = await supabase
      .from("teams")
      .select("id, schools!inner(manager_id)")
      .eq("id", teamId)
      .maybeSingle();

    if (error || !row) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    const ownerId = (row as unknown as { schools: { manager_id: string } }).schools?.manager_id;
    if (ownerId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const token = signTeamInviteToken(teamId);
    const base = originFromRequest(request);
    if (!base) {
      return NextResponse.json({ error: "Could not determine site URL" }, { status: 500 });
    }

    const url = `${base}/athlete/join?t=${encodeURIComponent(token)}`;
    return NextResponse.json({ url, expires_in_days: 14 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    if (message.includes("TEAM_INVITE_SECRET")) {
      return NextResponse.json({ error: "Server invite signing is not configured" }, { status: 503 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
