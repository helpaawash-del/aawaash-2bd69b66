/**
 * AiBuddy — a tiny animated assistant that sits beside the dashboard greeting.
 * Pure CSS/SVG: floats gently, blinks, and pulses a soft aura. Respects
 * `prefers-reduced-motion` through the shared hook.
 */
import { useReducedMotion } from "@/hooks/useReducedMotion";

export function AiBuddy({ className = "" }: { className?: string }) {
  const reduced = useReducedMotion();

  return (
    <div
      className={`relative shrink-0 ${className}`}
      aria-hidden="true"
      style={{ width: "clamp(46px,12vw,62px)", height: "clamp(46px,12vw,62px)" }}
    >
      {/* aura */}
      <span
        className="absolute inset-0 rounded-full bg-primary/20 blur-xl"
        style={reduced ? undefined : { animation: "ai-aura 3.4s ease-in-out infinite" }}
      />
      <svg
        viewBox="0 0 64 64"
        className="relative h-full w-full drop-shadow-[0_6px_14px_color-mix(in_oklab,var(--primary)_28%,transparent)]"
        style={reduced ? undefined : { animation: "ai-float 4.2s ease-in-out infinite" }}
      >
        <defs>
          <linearGradient id="aiBody" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="color-mix(in oklab, var(--primary) 82%, white)" />
            <stop offset="100%" stopColor="var(--primary)" />
          </linearGradient>
        </defs>
        {/* antenna */}
        <line x1="32" y1="8" x2="32" y2="16" stroke="var(--primary)" strokeWidth="2.4" strokeLinecap="round" />
        <circle cx="32" cy="6.5" r="3.2" fill="var(--primary)">
          {!reduced && (
            <animate attributeName="opacity" values="1;0.35;1" dur="1.8s" repeatCount="indefinite" />
          )}
        </circle>
        {/* head */}
        <rect x="12" y="16" width="40" height="30" rx="13" fill="url(#aiBody)" />
        {/* visor */}
        <rect x="18" y="23" width="28" height="16" rx="8" fill="color-mix(in oklab, var(--foreground) 88%, transparent)" />
        {/* eyes */}
        <g fill="color-mix(in oklab, var(--primary) 35%, white)">
          <ellipse cx="26.5" cy="31" rx="3.1" ry="3.4">
            {!reduced && (
              <animate attributeName="ry" values="3.4;0.4;3.4;3.4;3.4" dur="4.6s" repeatCount="indefinite" />
            )}
          </ellipse>
          <ellipse cx="37.5" cy="31" rx="3.1" ry="3.4">
            {!reduced && (
              <animate attributeName="ry" values="3.4;0.4;3.4;3.4;3.4" dur="4.6s" repeatCount="indefinite" />
            )}
          </ellipse>
        </g>
        {/* smile */}
        <path d="M28 37.5c1.6 1.4 6.4 1.4 8 0" stroke="color-mix(in oklab, var(--primary) 55%, white)" strokeWidth="1.6" strokeLinecap="round" fill="none" />
        {/* ears */}
        <rect x="7.5" y="26" width="4" height="10" rx="2" fill="var(--primary)" opacity="0.75" />
        <rect x="52.5" y="26" width="4" height="10" rx="2" fill="var(--primary)" opacity="0.75" />
        {/* body base */}
        <rect x="20" y="47" width="24" height="8" rx="4" fill="color-mix(in oklab, var(--primary) 45%, white)" />
        <ellipse cx="32" cy="58" rx="13" ry="2.6" fill="var(--foreground)" opacity="0.08" />
      </svg>
    </div>
  );
}
