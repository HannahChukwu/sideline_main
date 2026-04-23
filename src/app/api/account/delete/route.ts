import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";

export async function POST(request: NextRequest) {
  const pendingCookies: { name: string; value: string; options?: Record<string, unknown> }[] = [];

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach((c) =>
            pendingCookies.push({ name: c.name, value: c.value, options: c.options })
          );
        },
      },
    }
  );

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Account deletion is not configured on this environment." },
      { status: 500 }
    );
  }

  const admin = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error: deleteProfileError } = await admin.from("profiles").delete().eq("id", user.id);
  if (deleteProfileError) {
    return NextResponse.json({ error: deleteProfileError.message }, { status: 500 });
  }

  const { error: deleteAuthError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteAuthError) {
    return NextResponse.json({ error: deleteAuthError.message }, { status: 500 });
  }

  await supabase.auth.signOut();

  const out = NextResponse.json({ ok: true }, { status: 200 });
  for (const c of pendingCookies) {
    if (c.options && Object.keys(c.options).length > 0) {
      out.cookies.set(c.name, c.value, c.options as Parameters<typeof out.cookies.set>[2]);
    } else {
      out.cookies.set(c.name, c.value);
    }
  }
  return out;
}
