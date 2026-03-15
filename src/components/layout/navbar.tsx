"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/brand/logo";

interface NavbarProps {
  role?: "designer" | "athlete" | "fan";
  userEmail?: string | null;
}

const designerLinks = [
  { href: "/designer", label: "Dashboard" },
  { href: "/designer/create", label: "Generator" },
];

const athleteLinks = [{ href: "/athlete", label: "My Feed" }];

const fanLinks = [{ href: "/feed", label: "Live Feed" }];

export function Navbar({ role, userEmail }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const links =
    role === "designer"
      ? designerLinks
      : role === "athlete"
      ? athleteLinks
      : role === "fan"
      ? fanLinks
      : [];

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50">
      <div className="glass px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="group transition-opacity hover:opacity-80">
          <Logo size="sm" />
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "px-4 py-1.5 rounded-md text-sm font-bold tracking-tight transition-all",
                pathname === link.href
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right side: role badge + user + sign out */}
        <div className="flex items-center gap-3">
          {role && (
            <div
              className={cn(
                "px-3 py-1 rounded-full text-xs font-semibold tracking-wider uppercase border",
                role === "designer" &&
                  "border-primary/30 text-primary bg-primary/10",
                role === "athlete" &&
                  "border-violet-500/30 text-violet-400 bg-violet-500/10",
                role === "fan" &&
                  "border-white/20 text-white/60 bg-white/5"
              )}
            >
              {role}
            </div>
          )}

          {userEmail && (
            <span className="hidden md:block text-xs text-muted-foreground font-medium max-w-[140px] truncate">
              {userEmail}
            </span>
          )}

          <button
            onClick={handleSignOut}
            title="Sign out"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
