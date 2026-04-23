"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { LogOut, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/brand/logo";
import type { Role } from "@/lib/types";
import { ROLE_LABELS } from "@/lib/types";

interface NavbarProps {
  role?: Role;
  userEmail?: string | null;
}

const athleteLinks = [
  { href: "/athlete", label: "My Feed" },
  { href: "/scores", label: "Scores" },
];

const studentLinks = [
  { href: "/feed", label: "Live Feed" },
  { href: "/scores", label: "Scores" },
];

const designerLinks = [
  { href: "/designer", label: "Dashboard" },
  { href: "/designer/team", label: "Team" },
  { href: "/designer/create", label: "Generator" },
  { href: "/scores", label: "Scores" },
];

export function Navbar({ role, userEmail }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [resolvedRole, setResolvedRole] = useState<Role | null>(role ?? null);
  const [resolvedEmail, setResolvedEmail] = useState<string | null>(userEmail ?? null);
  const [resolvedName, setResolvedName] = useState<string | null>(null);
  const [hasUser, setHasUser] = useState(false);

  const links =
    resolvedRole === "designer"
      ? designerLinks
      : resolvedRole === "athlete"
      ? athleteLinks
      : resolvedRole === "student"
      ? studentLinks
      : [];
  const settingsHref =
    resolvedRole === "designer"
      ? "/designer/settings"
      : resolvedRole === "athlete"
      ? "/athlete/settings"
      : resolvedRole === "student"
      ? "/feed/settings"
      : "/settings";

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (cancelled) return;
        if (error) throw error;
        const user = data.user;
        setHasUser(Boolean(user));

        // If caller passed explicit props, respect them.
        if (!user) return;
        if (role && userEmail) return;

        const { data: profile, error: profileErr } = await supabase
          .from("profiles")
          .select("role, full_name, email")
          .eq("id", user.id)
          .single();
        if (cancelled) return;
        if (profileErr) throw profileErr;

        setResolvedRole((role ?? (profile?.role as Role | null)) ?? null);
        setResolvedName(profile?.full_name ?? null);
        setResolvedEmail((userEmail ?? profile?.email ?? user.email) ?? null);
      } catch {
        // Non-blocking: navbar still renders without role/email.
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [supabase, role, userEmail]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/80 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85 shadow-sm">
      <div className="px-5 py-3.5 flex items-center justify-between">
        {/* Logo */}
        <Link href={links[0]?.href ?? "/"} className="group transition-opacity hover:opacity-80 shrink-0">
          <Logo size="sm" />
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-0.5">
          {links.map((link) => {
            const active =
              link.href === "/designer/create"
                ? pathname.startsWith("/designer/create")
                : pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "px-3.5 py-1.5 rounded-lg text-sm font-semibold tracking-tight transition-all",
                  active
                    ? "bg-primary/12 text-primary ring-1 ring-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/6"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right side: role badge + user + sign out */}
        <div className="flex items-center gap-2.5 shrink-0">
          {resolvedRole && (
            <div
              className={cn(
                "px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wider uppercase border",
                resolvedRole === "designer" &&
                  "border-primary/30 text-primary bg-primary/10",
                resolvedRole === "athlete" &&
                  "border-violet-500/30 text-violet-400 bg-violet-500/10",
                resolvedRole === "student" &&
                  "border-white/18 text-foreground/55 bg-white/5"
              )}
            >
              {ROLE_LABELS[resolvedRole]}
            </div>
          )}

          {(resolvedName || resolvedEmail) && (
            <span className="hidden md:block text-xs text-muted-foreground font-medium max-w-[140px] truncate">
              {resolvedName ?? resolvedEmail}
            </span>
          )}

          {hasUser && (
            <Link
              href={settingsHref}
              title="Settings"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-white/6 transition-all"
            >
              <Settings className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Settings</span>
            </Link>
          )}

          {hasUser && (
            <button
              onClick={handleSignOut}
              title="Sign out"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-white/6 transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
