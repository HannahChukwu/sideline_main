"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

function JoinContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("t") ?? "";

  const [phase, setPhase] = useState<"idle" | "checking" | "redeeming" | "done" | "error" | "no_token">("idle");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    if (!token) {
      setPhase("no_token");
      return;
    }

    let cancelled = false;

    async function run() {
      setPhase("checking");
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        const next = `/athlete/join?t=${encodeURIComponent(token)}`;
        router.replace(`/auth?mode=signin&role=athlete&next=${encodeURIComponent(next)}`);
        return;
      }

      setPhase("redeeming");
      const res = await fetch("/api/team-invite/redeem", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; ok?: boolean };

      if (cancelled) return;

      if (!res.ok) {
        setPhase("error");
        setMessage(typeof data.error === "string" ? data.error : "Could not join team.");
        return;
      }

      setPhase("done");
      setTimeout(() => {
        router.replace("/athlete/stats");
      }, 1200);
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [token, router]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar role="athlete" />
      <main className="pt-24 px-6 pb-16 max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-2">Join your team</h1>
        <p className="text-sm text-muted-foreground mb-8">
          This page links your account to your school team so you can see the official schedule.
        </p>

        {phase === "no_token" && (
          <div className="flex gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <div>This invite link is missing its token. Ask your designer for a new link.</div>
          </div>
        )}

        {(phase === "idle" || phase === "checking" || phase === "redeeming") && (
          <div className="flex flex-col items-center gap-4 py-12 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm">{phase === "redeeming" ? "Linking your account…" : "Checking sign-in…"}</p>
          </div>
        )}

        {phase === "error" && (
          <div className="space-y-4">
            <div className="flex gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <div>{message}</div>
            </div>
            <Link
              href="/athlete"
              className="inline-flex text-sm font-medium text-primary hover:underline"
            >
              ← Back to athlete portal
            </Link>
          </div>
        )}

        {phase === "done" && (
          <div className={cn("flex gap-3 rounded-xl border border-green-500/25 bg-green-500/[0.06] p-4 text-sm text-foreground")}>
            <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
            <div>You&apos;re linked. Redirecting to your stats…</div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function AthleteJoinPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      }
    >
      <JoinContent />
    </Suspense>
  );
}
