import Link from "next/link";
import { Palette, Trophy, Users, ArrowRight, Zap } from "lucide-react";

export default function Home() {
  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      {/* Background grid */}
      <div className="absolute inset-0 bg-grid opacity-100" />

      {/* Purple glow — top center */}
      <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[700px] h-[600px] bg-primary/12 rounded-full blur-[160px] pointer-events-none" />

      {/* Subtle secondary glow — bottom right */}
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-primary/6 rounded-full blur-[120px] pointer-events-none" />

      {/* Top nav strip */}
      <header className="relative z-20 flex items-center justify-between px-8 py-6">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold tracking-tight text-foreground/70">Sideline Studio</span>
        </div>
        <div className="flex items-center gap-1 px-3 py-1 rounded-full border border-primary/20 bg-primary/8">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          <span className="text-xs font-medium text-primary tracking-wide">AI-Powered</span>
        </div>
      </header>

      {/* Hero */}
      <div className="relative z-10 flex flex-col items-center justify-center px-6 pt-16 pb-8">

        {/* Main wordmark */}
        <div className="text-center mb-6 animate-fade-up">
          <h1 className="text-[clamp(72px,14vw,160px)] font-bold leading-[0.9] tracking-[-0.04em]">
            <span className="text-gradient">SIDELINE</span>
          </h1>
          <div className="flex items-center justify-center gap-4 mt-3">
            <div className="h-px w-16 bg-border" />
            <span className="text-xs font-semibold tracking-[0.4em] uppercase text-muted-foreground">
              Studio
            </span>
            <div className="h-px w-16 bg-border" />
          </div>
        </div>

        {/* Subheadline */}
        <p className="text-foreground/50 text-base font-medium text-center max-w-md mb-14 leading-relaxed animate-fade-up animate-delay-100">
          Create game day assets in seconds.
          <br />
          Built for athletic programs that move fast.
        </p>

        {/* Portal cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full max-w-2xl animate-fade-up animate-delay-200">

          {/* Designer */}
          <Link href="/auth?role=designer" className="group relative flex flex-col gap-4 rounded-xl p-5 border border-white/8 bg-white/[0.03] hover:bg-primary/8 hover:border-primary/25 transition-all duration-200 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
            <div className="flex items-start justify-between">
              <div className="w-9 h-9 rounded-lg bg-primary/12 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Palette className="w-4 h-4 text-primary" />
              </div>
              <ArrowRight className="w-4 h-4 text-foreground/20 group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-200" />
            </div>
            <div>
              <h2 className="font-semibold text-sm text-foreground mb-1 tracking-tight">Designer</h2>
              <p className="text-xs text-foreground/40 leading-relaxed font-medium">
                Generate & publish game day posters, final score cards, and hype graphics.
              </p>
            </div>
            <span className="text-xs font-semibold text-primary/70 group-hover:text-primary transition-colors">
              Enter portal →
            </span>
          </Link>

          {/* Athlete */}
          <Link href="/auth?role=athlete" className="group relative flex flex-col gap-4 rounded-xl p-5 border border-white/8 bg-white/[0.03] hover:bg-violet-500/8 hover:border-violet-500/25 transition-all duration-200 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
            <div className="flex items-start justify-between">
              <div className="w-9 h-9 rounded-lg bg-violet-500/12 flex items-center justify-center group-hover:bg-violet-500/20 transition-colors">
                <Trophy className="w-4 h-4 text-violet-400" />
              </div>
              <ArrowRight className="w-4 h-4 text-foreground/20 group-hover:text-violet-400 group-hover:translate-x-0.5 transition-all duration-200" />
            </div>
            <div>
              <h2 className="font-semibold text-sm text-foreground mb-1 tracking-tight">Athlete</h2>
              <p className="text-xs text-foreground/40 leading-relaxed font-medium">
                Review assets made for your team. Like and react to give designers feedback.
              </p>
            </div>
            <span className="text-xs font-semibold text-violet-400/70 group-hover:text-violet-400 transition-colors">
              Enter portal →
            </span>
          </Link>

          {/* Fan Feed */}
          <Link href="/auth?role=student" className="group relative flex flex-col gap-4 rounded-xl p-5 border border-white/8 bg-white/[0.03] hover:bg-white/5 hover:border-white/15 transition-all duration-200 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
            <div className="flex items-start justify-between">
              <div className="w-9 h-9 rounded-lg bg-white/6 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                <Users className="w-4 h-4 text-foreground/50" />
              </div>
              <ArrowRight className="w-4 h-4 text-foreground/20 group-hover:text-foreground/60 group-hover:translate-x-0.5 transition-all duration-200" />
            </div>
            <div>
              <h2 className="font-semibold text-sm text-foreground mb-1 tracking-tight">Student Feed</h2>
              <p className="text-xs text-foreground/40 leading-relaxed font-medium">
                Live scores, game day graphics, and event updates for your school.
              </p>
            </div>
            <span className="text-xs font-semibold text-foreground/30 group-hover:text-foreground/60 transition-colors">
              View feed →
            </span>
          </Link>
        </div>

        {/* Bottom stat strip */}
        <div className="mt-16 flex items-center gap-8 text-center animate-fade-up animate-delay-300">
          {[
            { value: "< 30s", label: "Asset generation" },
            { value: "3", label: "Portals" },
            { value: "∞", label: "Possibilities" },
          ].map((stat) => (
            <div key={stat.label} className="flex flex-col gap-0.5">
              <span className="text-lg font-bold text-foreground/80 tracking-tight">{stat.value}</span>
              <span className="text-[10px] font-semibold tracking-widest uppercase text-foreground/25">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
