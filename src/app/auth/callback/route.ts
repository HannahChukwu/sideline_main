import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/types";
import { ROLE_ROUTES } from "@/lib/types";

function roleFromValue(value: string | null | undefined): Role | null {
  if (value === "designer" || value === "athlete" || value === "student") return value;
  return null;
}

function oauthModeFromValue(value: string | null | undefined): "signin" | "signup" | null {
  if (value === "signup") return "signup";
  if (value === "signin" || value === "login") return "signin";
  return null;
}

function readCookieValue(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  const pairs = cookieHeader.split(";").map((part) => part.trim());
  for (const pair of pairs) {
    if (pair.startsWith(`${name}=`)) {
      return decodeURIComponent(pair.slice(name.length + 1));
    }
  }
  return null;
}

/**
 * Handles the OAuth / magic-link callback from Supabase.
 * Exchanges the `code` for a session, then redirects the user
 * to their role-based dashboard.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");
  const modeFromQuery = oauthModeFromValue(searchParams.get("mode"));
  const modeFromCookie = oauthModeFromValue(
    readCookieValue(request.headers.get("cookie"), "sideline_oauth_mode")
  );
  const oauthMode = modeFromQuery ?? modeFromCookie;
  const roleFromQuery = roleFromValue(searchParams.get("role"));
  const roleFromCookie = roleFromValue(
    readCookieValue(request.headers.get("cookie"), "sideline_oauth_role")
  );
  const intendedRole: Role | null =
    oauthMode === "signup" ? roleFromQuery ?? roleFromCookie : null;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Fetch role to determine where to send the user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();

        const metadataRole = user.user_metadata?.role;
        const fallbackRole: Role =
          intendedRole ??
          (metadataRole === "designer" || metadataRole === "athlete" || metadataRole === "student"
            ? metadataRole
            : "student");

        let existingRole =
          profile?.role === "designer" || profile?.role === "athlete" || profile?.role === "student"
            ? (profile.role as Role)
            : null;

        // IMPORTANT: with current RLS, UPDATE is allowed on own profile, INSERT is not.
        // So avoid upsert here (it can fail even on conflict) and do explicit updates.
        if (intendedRole && existingRole !== intendedRole) {
          const { error: updateError } = await supabase
            .from("profiles")
            .update({
              role: intendedRole,
              email: user.email ?? null,
              full_name:
                typeof user.user_metadata?.full_name === "string"
                  ? user.user_metadata.full_name
                  : null,
            })
            .eq("id", user.id);

          if (!updateError) {
            existingRole = intendedRole;
          }
        }

        const resolvedRole: Role = intendedRole ?? existingRole ?? fallbackRole;

        const destination = next ?? ROLE_ROUTES[resolvedRole];
        const response = NextResponse.redirect(`${origin}${destination}`);
        response.cookies.set("sideline_oauth_role", "", { path: "/", maxAge: 0 });
        response.cookies.set("sideline_oauth_mode", "", { path: "/", maxAge: 0 });
        return response;
      }
    }
  }

  // On failure, redirect to auth with an error flag
  return NextResponse.redirect(`${origin}/auth?error=callback_failed`);
}
