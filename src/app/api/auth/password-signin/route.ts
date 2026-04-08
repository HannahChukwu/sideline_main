import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { z } from "zod";
import {
  clearLoginLockout,
  getLoginLockStatus,
  recordPasswordSigninFailure,
} from "@/lib/auth/loginLockout";
import type { Database } from "@/lib/types";

const BodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 400 });
  }

  const { email, password } = parsed.data;

  const lock = await getLoginLockStatus(email);
  if (lock.locked) {
    const minutes = Math.max(1, Math.ceil(lock.retryAfterSec / 60));
    return NextResponse.json(
      {
        error: `Too many failed sign-in attempts. Try again in about ${minutes} minute${minutes === 1 ? "" : "s"}.`,
        retryAfterSec: lock.retryAfterSec,
      },
      { status: 429, headers: { "Retry-After": String(lock.retryAfterSec) } }
    );
  }

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

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    const fail = await recordPasswordSigninFailure(email);
    if (fail.locked) {
      return NextResponse.json(
        {
          error: `Too many failed sign-in attempts. Try again in about ${Math.ceil(fail.retryAfterSec / 60)} minutes.`,
          retryAfterSec: fail.retryAfterSec,
        },
        {
          status: 429,
          headers: { "Retry-After": String(fail.retryAfterSec) },
        }
      );
    }
    return NextResponse.json(
      { error: "Invalid email or password." },
      { status: 401 }
    );
  }

  await clearLoginLockout(email);

  const out = NextResponse.json({ ok: true, userId: data.user.id }, { status: 200 });
  for (const c of pendingCookies) {
    if (c.options && Object.keys(c.options).length > 0) {
      out.cookies.set(c.name, c.value, c.options as Parameters<typeof out.cookies.set>[2]);
    } else {
      out.cookies.set(c.name, c.value);
    }
  }
  return out;
}
