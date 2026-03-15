import { cn } from "@/lib/utils";

interface LogoMarkProps {
  className?: string;
  size?: number;
}

/**
 * Sideline Studio — Sideline Marker Logo
 * A bold vertical pole with dynamic speed lines extending right —
 * referencing the sideline marker in football/track while suggesting
 * broadcast energy and forward motion.
 */
export function LogoMark({ className, size = 28 }: LogoMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Sideline Studio logo"
    >
      {/* Vertical sideline pole */}
      <rect x="4" y="3" width="3.5" height="22" rx="1.75" fill="currentColor" />

      {/* Primary speed line */}
      <rect x="10" y="8.5" width="14" height="3" rx="1.5" fill="currentColor" />

      {/* Secondary speed line — shorter, lighter (motion trail) */}
      <rect x="10" y="14" width="9" height="2" rx="1" fill="currentColor" opacity="0.45" />

      {/* Tertiary speed line — shortest (motion trail) */}
      <rect x="10" y="18.5" width="5" height="1.5" rx="0.75" fill="currentColor" opacity="0.2" />
    </svg>
  );
}

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: "sm" | "md" | "lg";
}

const sizes = {
  sm: { icon: 20, text: "text-xs" },
  md: { icon: 26, text: "text-sm" },
  lg: { icon: 40, text: "text-base" },
};

export function Logo({ className, showText = true, size = "md" }: LogoProps) {
  const { icon, text } = sizes[size];

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div
        className="relative flex items-center justify-center rounded-lg bg-primary text-primary-foreground shrink-0"
        style={{ width: icon + 8, height: icon + 8 }}
      >
        {/* Subtle inner glow */}
        <div className="absolute inset-0 rounded-lg bg-white/10" />
        <LogoMark size={icon} className="relative z-10" />
      </div>
      {showText && (
        <div className="flex flex-col leading-none">
          <span className={cn("font-black tracking-tight text-foreground uppercase", text)}>
            Sideline
          </span>
          <span
            className={cn(
              "font-semibold tracking-[0.25em] uppercase text-muted-foreground",
              size === "sm" ? "text-[8px]" : "text-[9px]"
            )}
          >
            Studio
          </span>
        </div>
      )}
    </div>
  );
}
