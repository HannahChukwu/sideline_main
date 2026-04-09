import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { encryptString } from "@/lib/instagram/tokenCrypto";

function getEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name}`);
  return v;
}

function requireQueryParam(name: string, value: string | null): string {
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

async function exchangeCodeForUserAccessToken(params: {
  appId: string;
  appSecret: string;
  redirectUri: string;
  code: string;
}) {
  const { appId, appSecret, redirectUri, code } = params;

  const url = new URL("https://graph.facebook.com/v19.0/oauth/access_token");
  url.searchParams.set("client_id", appId);
  url.searchParams.set("client_secret", appSecret);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("code", code);

  const res = await fetch(url.toString(), { method: "GET" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Token exchange failed: ${res.status} ${text}`);
  }
  const json = (await res.json()) as { access_token?: string; error?: any };
  if (!json.access_token) throw new Error(`Token exchange returned no access_token`);
  return json.access_token;
}

async function exchangeForLongLivedToken(params: {
  appId: string;
  appSecret: string;
  shortLivedToken: string;
}) {
  const { appId, appSecret, shortLivedToken } = params;

  const url = new URL("https://graph.facebook.com/v19.0/oauth/access_token");
  url.searchParams.set("client_id", appId);
  url.searchParams.set("client_secret", appSecret);
  url.searchParams.set("grant_type", "fb_exchange_token");
  url.searchParams.set("fb_exchange_token", shortLivedToken);

  const res = await fetch(url.toString(), { method: "GET" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Long-lived token exchange failed: ${res.status} ${text}`);
  }
  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) throw new Error(`Long-lived token exchange returned no access_token`);
  return json.access_token;
}

async function findFirstInstagramBusinessAccount(params: {
  userAccessToken: string;
}): Promise<string> {
  const { userAccessToken } = params;

  const pagesUrl = new URL("https://graph.facebook.com/v19.0/me/accounts");
  pagesUrl.searchParams.set("access_token", userAccessToken);
  // Include page access token so we can query for the IG Business account on each page.
  pagesUrl.searchParams.set("fields", "id,access_token");

  const pagesRes = await fetch(pagesUrl.toString(), { method: "GET" });
  if (!pagesRes.ok) {
    const text = await pagesRes.text().catch(() => "");
    throw new Error(`Failed to list Pages: ${pagesRes.status} ${text}`);
  }
  const pagesJson = (await pagesRes.json()) as {
    data?: Array<{ id: string; access_token: string }>;
    error?: any;
  };

  const pages = pagesJson.data ?? [];
  for (const page of pages) {
    const igUrl = new URL(`https://graph.facebook.com/v19.0/${page.id}`);
    igUrl.searchParams.set("access_token", page.access_token);
    igUrl.searchParams.set("fields", "instagram_business_account");

    const igRes = await fetch(igUrl.toString(), { method: "GET" });
    if (!igRes.ok) continue;

    const igJson = (await igRes.json()) as {
      instagram_business_account?: { id?: string } | null;
    };

    const igId = igJson.instagram_business_account?.id;
    if (igId) return igId;
  }

  throw new Error("Could not find an Instagram Business account on the connected Pages.");
}

export async function GET(request: NextRequest) {
  const { origin } = new URL(request.url);
  const redirectUri = `${origin}/api/instagram/oauth/callback`;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}/auth?error=not_signed_in`);
  }

  const url = new URL(request.url);
  const code = requireQueryParam("code", url.searchParams.get("code"));
  const state = requireQueryParam("state", url.searchParams.get("state"));

  const cookieState = request.cookies.get("ig_oauth_state")?.value;
  const rawNext = request.cookies.get("ig_oauth_next")?.value ?? "/designer/create";
  const next = rawNext.startsWith("/") ? rawNext : "/designer/create";
  const teamIdCookie = request.cookies.get("ig_oauth_team_id")?.value ?? null;
  const teamIdForConnect =
    teamIdCookie &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(teamIdCookie)
      ? teamIdCookie
      : null;

  const res = NextResponse.redirect(`${origin}${next}?ig=connected`);

  // Validate CSRF state.
  if (!cookieState || cookieState !== state) {
    const bad = NextResponse.redirect(`${origin}${next}?ig=oauth_state_mismatch`);
    bad.cookies.set("ig_oauth_team_id", "", { path: "/", maxAge: 0 });
    return bad;
  }

  // Clear one-time cookies.
  res.cookies.set("ig_oauth_state", "", { path: "/", maxAge: 0 });
  res.cookies.set("ig_oauth_next", "", { path: "/", maxAge: 0 });
  res.cookies.set("ig_oauth_team_id", "", { path: "/", maxAge: 0 });

  const appId = getEnv("INSTAGRAM_META_APP_ID");
  const appSecret = getEnv("INSTAGRAM_META_APP_SECRET");

  try {
    const shortLived = await exchangeCodeForUserAccessToken({
      appId,
      appSecret,
      redirectUri,
      code,
    });

    const longLived = await exchangeForLongLivedToken({
      appId,
      appSecret,
      shortLivedToken: shortLived,
    });

    const igUserId = await findFirstInstagramBusinessAccount({
      userAccessToken: longLived,
    });

    const accessTokenEncrypted = encryptString(longLived);
    const now = new Date().toISOString();

    if (teamIdForConnect) {
      const { data: teamRow, error: teamErr } = await supabase
        .from("teams")
        .select("id")
        .eq("id", teamIdForConnect)
        .maybeSingle();

      if (teamErr || !teamRow) {
        throw new Error("team_not_found_or_unauthorized");
      }

      const { error } = await supabase.from("team_instagram_accounts").upsert(
        {
          team_id: teamIdForConnect,
          ig_user_id: igUserId,
          access_token_encrypted: accessTokenEncrypted,
          updated_at: now,
        },
        { onConflict: "team_id" }
      );

      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("instagram_accounts")
        .upsert(
          {
            user_id: user.id,
            ig_user_id: igUserId,
            access_token_encrypted: accessTokenEncrypted,
            updated_at: now,
          },
          { onConflict: "user_id" }
        );

      if (error) throw error;
    }
  } catch (e: unknown) {
    // Redirect with a failure reason flag; we don't expose the details publicly.
    const message = e instanceof Error ? e.message : "instagram_connect_failed";
    const fail = NextResponse.redirect(
      `${origin}${next}?ig=connect_failed&reason=${encodeURIComponent(message)}`
    );
    fail.cookies.set("ig_oauth_team_id", "", { path: "/", maxAge: 0 });
    return fail;
  }

  return res;
}

