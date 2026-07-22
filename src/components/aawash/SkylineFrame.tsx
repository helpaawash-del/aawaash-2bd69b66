/**
 * SkylineFrame
 * ------------
 * Decorative futuristic skyline silhouette rendered as inline SVG.
 * Used at the bottom of admin/project layouts for a light, aesthetic
 * chrome that ties every page together without harming legibility.
 */
export function SkylineFrame({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none fixed inset-x-0 bottom-0 -z-10 h-[240px] overflow-hidden ${className}`}
    >
      <svg
        viewBox="0 0 1600 240"
        preserveAspectRatio="xMidYMax slice"
        className="absolute inset-0 h-full w-full"
      >
        <defs>
          <linearGradient id="skyline-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0" className="text-primary" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.08" className="text-primary" />
          </linearGradient>
          <linearGradient id="skyline-tower" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.10" className="text-primary" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.22" className="text-primary" />
          </linearGradient>
          <linearGradient id="skyline-tower-back" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.05" className="text-leaf" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.14" className="text-leaf" />
          </linearGradient>
        </defs>

        <rect width="1600" height="240" fill="url(#skyline-sky)" />

        {/* Back silhouette layer */}
        <path
          fill="url(#skyline-tower-back)"
          d="M0,240 L0,170 L40,170 L40,140 L90,140 L90,120 L140,120 L140,150 L200,150 L200,90 L250,90 L250,130 L320,130 L320,110 L380,110 L380,150 L450,150 L450,100 L520,100 L520,140 L600,140 L600,120 L680,120 L680,90 L750,90 L750,130 L830,130 L830,150 L910,150 L910,100 L980,100 L980,140 L1060,140 L1060,120 L1140,120 L1140,150 L1220,150 L1220,110 L1300,110 L1300,140 L1380,140 L1380,130 L1460,130 L1460,150 L1540,150 L1540,120 L1600,120 L1600,240 Z"
        />

        {/* Foreground towers */}
        <path
          fill="url(#skyline-tower)"
          d="M0,240 L0,200 L60,200 L60,180 L100,180 L100,150 L130,150 L130,120 L160,120 L160,80 L200,80 L200,60 L230,60 L230,120 L280,120 L280,160 L340,160 L340,110 L390,110 L390,90 L430,90 L430,130 L490,130 L490,100 L540,100 L540,70 L590,70 L590,150 L650,150 L650,170 L720,170 L720,120 L770,120 L770,90 L820,90 L820,50 L860,50 L860,110 L920,110 L920,160 L990,160 L990,130 L1050,130 L1050,100 L1110,100 L1110,140 L1180,140 L1180,120 L1240,120 L1240,80 L1290,80 L1290,140 L1360,140 L1360,110 L1420,110 L1420,150 L1490,150 L1490,130 L1560,130 L1560,170 L1600,170 L1600,240 Z"
        />

        {/* Window rows on tallest towers */}
        <g fill="currentColor" className="text-primary" opacity="0.22">
          {[80, 100, 120, 140, 160].map((y) => (
            <g key={y}>
              <rect x="205" y={y} width="4" height="4" />
              <rect x="215" y={y} width="4" height="4" />
              <rect x="545" y={y - 20} width="4" height="4" />
              <rect x="555" y={y - 20} width="4" height="4" />
              <rect x="835" y={y - 40} width="4" height="4" />
              <rect x="845" y={y - 40} width="4" height="4" />
              <rect x="1245" y={y - 10} width="4" height="4" />
              <rect x="1255" y={y - 10} width="4" height="4" />
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}
