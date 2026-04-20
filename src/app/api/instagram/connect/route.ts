import crypto from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canManageTeam, getUserRole } from "@/lib/auth/serverAuth";

function getEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name}`);
  return v;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr) {
    return NextResponse.json({ error: userErr.message }, { status: 401 });
  }
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const role = await getUserRole(supabase, user.id);
  if (role !== "designer") {
    return NextResponse.json({ error: "Only designer accounts can connect Instagram." }, { status: 403 });
  }

  const { origin } = new URL(request.url);
  const urlObj = new URL(request.url);
  const rawNext = urlObj.searchParams.get("next") ?? "/designer/create";
  const next = rawNext.startsWith("/") ? rawNext : "/designer/create";
  const teamIdParam = urlObj.searchParams.get("teamId");
  const teamId =
    teamIdParam && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(teamIdParam)
      ? teamIdParam
      : null;

  if (teamId) {
    const allowed = await canManageTeam(supabase, user.id, teamId);
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden team access." }, { status: 403 });
    }
  }

  const state = crypto.randomBytes(16).toString("hex");
  const redirectUri = `${origin}/api/instagram/oauth/callback`;

  const appId = getEnv("INSTAGRAM_META_APP_ID");

  // MVP scope (publishing feed images):
  // - `instagram_content_publish` to publish containers to IG
  // - `pages_show_list` to read connected Pages
  const scope = "instagram_content_publish,pages_show_list";

  const authUrl = new URL("https://www.facebook.com/v19.0/dialog/oauth");
  authUrl.searchParams.set("client_id", appId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("scope", scope);
  authUrl.searchParams.set("response_type", "code");

  const res = NextResponse.redirect(authUrl.toString(), 302);

  // CSRF protection: validate state in callback.
  res.cookies.set("ig_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  res.cookies.set("ig_oauth_next", next, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  if (teamId) {
    res.cookies.set("ig_oauth_team_id", teamId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 600,
    });
  } else {
    res.cookies.set("ig_oauth_team_id", "", { path: "/", maxAge: 0 });
  }

  return res;
}

