/**
 * AmbientBackground
 * -----------------
 * Ultra-subtle animated backdrop used across every Aawash screen.
 * Renders soft floating blurred gradients and slow drifting particles
 * on top of a near-white surface. Purely decorative.
 */
export function AmbientBackground({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none fixed inset-0 -z-10 overflow-hidden ${className}`}
    >
      {/* base gradient wash */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-surface-warm to-background" />

      {/* floating blurred orbs */}
      <div className="animate-drift absolute -top-24 -left-24 h-[420px] w-[420px] rounded-full bg-primary/10 blur-3xl" />
      <div
        className="animate-drift absolute top-1/3 -right-32 h-[380px] w-[380px] rounded-full bg-leaf/10 blur-3xl"
        style={{ animationDelay: "-6s" }}
      />
      <div
        className="animate-drift absolute -bottom-32 left-1/4 h-[360px] w-[360px] rounded-full bg-gold/10 blur-3xl"
        style={{ animationDelay: "-12s" }}
      />

      {/* fine grain particles */}
      <svg
        className="absolute inset-0 h-full w-full opacity-[0.15]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="aawash-grid" width="48" height="48" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.6" fill="currentColor" className="text-primary" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#aawash-grid)" />
      </svg>
    </div>
  );
}
