"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Zap, Palette, Trophy, Users, Eye, EyeOff, ArrowLeft, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/types";
import { ROLE_ROUTES } from "@/lib/types";

// ─── Role metadata ────────────────────────────────────────────────────────────

const ROLE_META: Record<Role, { label: string; description: string; icon: React.ReactNode; color: string }> = {
  designer: {
    label: "Designer",
    description: "Create and publish AI-generated game day assets",
    icon: <Palette className="w-5 h-5" />,
    color: "text-primary border-primary/30 bg-primary/10",
  },
  athlete: {
    label: "Athlete",
    description: "Review assets created for your team",
    icon: <Trophy className="w-5 h-5" />,
    color: "text-violet-400 border-violet-500/30 bg-violet-500/10",
  },
  student: {
    label: "Student",
    description: "Follow your school's athletic program",
    icon: <Users className="w-5 h-5" />,
    color: "text-foreground/60 border-white/15 bg-white/5",
  },
};

// ─── Inner component (uses useSearchParams) ───────────────────────────────────

function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const rawRole = searchParams.get("role") as Role | null;
  const role: Role = rawRole && rawRole in ROLE_META ? rawRole : "student";
  const meta = ROLE_META[role];

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  // Slight delay before rendering for smoother page transition
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const m = searchParams.get("mode");
    if (m === "signup") setMode("signup");
    if (m === "signin" || m === "login") setMode("signin");
  }, [searchParams]);

  async function handleGoogleSignIn() {
    setError(null);
    setGoogleLoading(true);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
    if (!supabaseUrl.startsWith("http") || supabaseKey.length < 10) {
      setError(
        "Supabase is not configured. Add your project URL and anon key to .env.local to enable auth."
      );
      setGoogleLoading(false);
      return;
    }

    const supabase = createClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (oauthError) {
      setError(oauthError.message);
      setGoogleLoading(false);
    }
    // On success, Supabase redirects away; no further action needed here.
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
    if (!supabaseUrl.startsWith("http") || supabaseKey.length < 10) {
      setError("Supabase is not configured. Add your project URL and anon key to .env.local to enable auth.");
      setLoading(false);
      return;
    }

    const supabase = createClient();

    try {
      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { role, full_name: fullName },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });

        if (signUpError) throw signUpError;

        // If email confirmation is required, identities array is empty
        if (data.user && data.user.identities?.length === 0) {
          setError("An account with this email already exists. Please sign in.");
          return;
        }

        if (data.session) {
          // Email confirmation disabled → signed in immediately
          router.push(ROLE_ROUTES[role]);
          router.refresh();
        } else {
          // Confirmation email sent
          setEmailSent(true);
        }
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;

        if (data.user) {
          // Fetch stored role and redirect to correct dashboard
          const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", data.user.id)
            .single();

          const roleFromDb = (profile as unknown as { role?: Role | null } | null)?.role ?? null;
          const destination = roleFromDb ? ROLE_ROUTES[roleFromDb] : ROLE_ROUTES[role];

          router.push(destination);
          router.refresh();
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  // ── Email confirmation sent state ────────────────────────────────────────────
  if (emailSent) {
    return (
      <div
        className={cn(
          "w-full max-w-sm text-center transition-all duration-500",
          visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        )}
      >
        <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center mx-auto mb-5">
          <Zap className="w-7 h-7 text-primary" />
        </div>
        <h2 className="text-xl font-bold mb-2">Check your email</h2>
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
          We sent a confirmation link to <strong className="text-foreground">{email}</strong>.
          Click the link to activate your account.
        </p>
        <button
          onClick={() => setEmailSent(false)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
        >
          Use a different email
        </button>
      </div>
    );
  }

  // ── Auth form ────────────────────────────────────────────────────────────────
  return (
    <div
      className={cn(
        "w-full max-w-sm transition-all duration-500",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      )}
    >
      {/* Role pill */}
      <div className={cn("inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold mb-6 tracking-wide", meta.color)}>
        {meta.icon}
        {meta.label} Portal
      </div>

      {/* Heading */}
      <h1 className="text-2xl font-bold tracking-tight mb-1">
        {mode === "signin" ? "Welcome back" : "Create your account"}
      </h1>
      <p className="text-sm text-muted-foreground mb-7">{meta.description}</p>

      {/* Google OAuth */}
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={loading || googleLoading}
        className={cn(
          "w-full py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2",
          "border border-white/10 bg-white/5 text-foreground hover:bg-white/7 active:scale-[0.98]",
          "disabled:opacity-50 disabled:cursor-not-allowed"
        )}
      >
        {googleLoading && <Loader2 className="w-4 h-4 animate-spin" />}
        Continue with Google
      </button>

      <div className="flex items-center gap-3 my-2">
        <div className="h-px flex-1 bg-white/10" />
        <span className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground/60">
          Or
        </span>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {mode === "signup" && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-foreground/60 uppercase tracking-wider">
              Full Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your name"
              required
              className="w-full px-3.5 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm text-foreground placeholder:text-foreground/25 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all"
            />
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-foreground/60 uppercase tracking-wider">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@university.edu"
            required
            className="w-full px-3.5 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm text-foreground placeholder:text-foreground/25 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-foreground/60 uppercase tracking-wider">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === "signup" ? "Min. 8 characters" : "Your password"}
              required
              minLength={mode === "signup" ? 8 : undefined}
              className="w-full px-3.5 py-2.5 pr-10 rounded-lg bg-white/5 border border-white/10 text-sm text-foreground placeholder:text-foreground/25 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/30 hover:text-foreground/60 transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="px-3.5 py-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive font-medium">
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className={cn(
            "mt-1 w-full py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2",
            "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98]",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "pulse-glow"
          )}
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {mode === "signin" ? "Sign In" : "Create Account"}
        </button>
      </form>

      {/* Toggle mode */}
      <p className="text-center text-xs text-muted-foreground mt-5">
        {mode === "signin" ? "Don't have an account?" : "Already have an account?"}{" "}
        <button
          onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(null); }}
          className="text-primary font-semibold hover:underline underline-offset-2 transition-colors"
        >
          {mode === "signin" ? "Sign up" : "Sign in"}
        </button>
      </p>
    </div>
  );
}

// ─── Page wrapper ─────────────────────────────────────────────────────────────

export default function AuthPage() {
  return (
    <div className="relative min-h-screen bg-background overflow-hidden flex flex-col">
      {/* Background */}
      <div className="absolute inset-0 bg-grid opacity-100" />
      <div className="absolute top-[-80px] left-1/2 -translate-x-1/2 w-[600px] h-[500px] bg-primary/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Back link */}
      <header className="relative z-10 px-6 py-5">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Change role
        </Link>
      </header>

      {/* Centered form */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-6 py-12">
        <Suspense>
          <AuthForm />
        </Suspense>
      </main>

      {/* Footer */}
      <footer className="relative z-10 px-6 py-4 text-center">
        <div className="flex items-center justify-center gap-2 text-muted-foreground/30">
          <Zap className="w-3 h-3 text-primary/50" />
          <span className="text-[10px] font-semibold tracking-widest uppercase">
            Sideline Studio
          </span>
        </div>
      </footer>
    </div>
  );
}
