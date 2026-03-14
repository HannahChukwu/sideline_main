import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/types";
import { ROLE_ROUTES } from "@/lib/types";

/**
 * Handles the OAuth / magic-link callback from Supabase.
 * Exchanges the `code` for a session, then redirects the user
 * to their role-based dashboard.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

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
          .single();

        const destination =
          next ??
          (profile?.role ? ROLE_ROUTES[profile.role as Role] : "/");

        return NextResponse.redirect(`${origin}${destination}`);
      }
    }
  }

  // On failure, redirect to auth with an error flag
  return NextResponse.redirect(`${origin}/auth?error=callback_failed`);
}
