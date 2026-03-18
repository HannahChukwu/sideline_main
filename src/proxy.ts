import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Role } from "@/lib/types";
import { ROLE_ROUTES } from "@/lib/types";

// Routes that require authentication
const PROTECTED = ["/designer", "/athlete", "/feed"];

// Infer the required role from the requested path
function roleFromPath(pathname: string): Role {
  if (pathname.startsWith("/designer")) return "designer";
  if (pathname.startsWith("/athlete")) return "athlete";
  return "student";
}

function isConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  return url.startsWith("http") && key.length > 10;
}

export async function proxy(request: NextRequest) {
  // If Supabase is not yet configured, let everything through
  if (!isConfigured()) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: always call getUser() to refresh the session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED.some((r) => pathname.startsWith(r));
  const searchParams = request.nextUrl.searchParams;

  // 1. Unauthenticated user hitting a protected route → send to auth
  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth";
    url.searchParams.set("role", roleFromPath(pathname));
    // Preserve where the user was trying to go so callback can redirect back.
    url.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(url);
  }

  // 2. Authenticated user hitting /auth → redirect to their dashboard
  // Allow explicitly requesting the auth UI even if already signed in (account switching).
  const explicitlyWantsAuthUi =
    searchParams.has("mode") || searchParams.has("role") || searchParams.has("force");

  if (user && pathname === "/auth" && !explicitlyWantsAuthUi) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role) {
      const url = request.nextUrl.clone();
      url.pathname = ROLE_ROUTES[profile.role as Role];
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  // 3. Authenticated user on wrong role's portal → redirect to correct one
  if (user && isProtected) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role) {
      const onWrongPortal =
        (profile.role === "designer" && !pathname.startsWith("/designer")) ||
        (profile.role === "athlete" && !pathname.startsWith("/athlete")) ||
        (profile.role === "student" && !pathname.startsWith("/feed"));

      if (onWrongPortal) {
        const url = request.nextUrl.clone();
        url.pathname = ROLE_ROUTES[profile.role as Role];
        url.search = "";
        return NextResponse.redirect(url);
      }
    }
  }

  return supabaseResponse;
}

export default proxy;

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
