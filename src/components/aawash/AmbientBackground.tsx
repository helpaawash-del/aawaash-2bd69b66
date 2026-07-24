/**
 * AmbientBackground
 * -----------------
 * Futuristic real-estate OS backdrop: a near-white surface layered with
 * soft architectural blueprint vectors, floating emerald orbs, and a
 * faint dot grid. Purely decorative, GPU-friendly, no interactivity.
 */
export function AmbientBackground({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none fixed inset-0 -z-10 overflow-hidden ${className}`}
    >
      {/* base gradient wash */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-surface-warm to-background" />

      {/* architectural blueprint vectors — very faint */}
      <svg
        className="absolute inset-0 h-full w-full opacity-[0.06]"
        viewBox="0 0 1200 900"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="blueprintFade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0" />
            <stop offset="45%" stopColor="currentColor" stopOpacity="1" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        <g stroke="currentColor" strokeWidth="1" fill="none" className="text-primary">
          {/* horizon lines */}
          <line x1="0" y1="620" x2="1200" y2="620" />
          <line x1="0" y1="660" x2="1200" y2="660" strokeDasharray="4 8" />
          {/* left tower silhouette */}
          <rect x="120" y="320" width="120" height="340" />
          <rect x="140" y="360" width="20" height="20" />
          <rect x="180" y="360" width="20" height="20" />
          <rect x="140" y="410" width="20" height="20" />
          <rect x="180" y="410" width="20" height="20" />
          <rect x="140" y="460" width="20" height="20" />
          <rect x="180" y="460" width="20" height="20" />
          {/* center tower */}
          <rect x="540" y="240" width="140" height="420" />
          <line x1="540" y1="300" x2="680" y2="300" />
          <line x1="540" y1="360" x2="680" y2="360" />
          <line x1="540" y1="420" x2="680" y2="420" />
          <line x1="540" y1="480" x2="680" y2="480" />
          <line x1="540" y1="540" x2="680" y2="540" />
          <line x1="540" y1="600" x2="680" y2="600" />
          {/* right tower */}
          <rect x="920" y="380" width="140" height="280" />
          <line x1="920" y1="430" x2="1060" y2="430" />
          <line x1="920" y1="480" x2="1060" y2="480" />
          <line x1="920" y1="530" x2="1060" y2="530" />
          <line x1="920" y1="580" x2="1060" y2="580" />
        </g>
      </svg>

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

      {/* fine dot grid */}
      <svg
        className="absolute inset-0 h-full w-full opacity-[0.14]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="aawash-grid" width="48" height="48" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.6" fill="currentColor" className="text-primary" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#aawash-grid)" />
      </svg>

      {/* top luminous sweep */}
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white/60 to-transparent" />
    </div>
  );
}
