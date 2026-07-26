import ecoBuilding from "@/assets/eco-hero-tower.png";

/* ------------------------------------------------------------------ *
 * EcoLivingScene — the dashboard hero artwork.
 * A transparent tower PNG that gently levitates, with lightweight,
 * GIF-like motion layered on top in pure SVG/CSS:
 *   · birds gliding across the sky (with flapping wings)
 *   · leaves drifting down through the frame
 *   · a neighbour waving hello from a balcony
 * Everything lives inside one fixed-aspect box, so the scene can never
 * overlap the text around it. All motion is disabled under
 * prefers-reduced-motion.
 * ------------------------------------------------------------------ */

const BIRDS = [
  { top: "16%", delay: "0s", duration: "12s", scale: 1 },
  { top: "26%", delay: "3.6s", duration: "14s", scale: 0.72 },
  { top: "9%", delay: "7.2s", duration: "16s", scale: 0.55 },
];

const LEAVES = [
  { left: "12%", delay: "0s", duration: "9s", size: 13 },
  { left: "31%", delay: "2.4s", duration: "11s", size: 9 },
  { left: "68%", delay: "1.2s", duration: "10s", size: 11 },
  { left: "84%", delay: "4.8s", duration: "12.5s", size: 8 },
  { left: "52%", delay: "6.1s", duration: "10.5s", size: 10 },
];

function Bird({ scale }: { scale: number }) {
  return (
    <svg
      width={26 * scale}
      height={12 * scale}
      viewBox="0 0 26 12"
      fill="none"
      className="text-forest/60"
    >
      <g className="animate-scene-wing motion-reduce:animate-none">
        <path
          d="M1 8C4.5 8 6.5 2 9.5 2c2.4 0 3 4 3.5 4"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <path
          d="M13 6c.5 0 1.1-4 3.5-4C19.5 2 21.5 8 25 8"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}

function Leaf({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className="text-leaf">
      <path
        d="M14 2C8 2 2 5 2 11c0 2 1 3 3 3 6 0 9-6 9-12Z"
        fill="currentColor"
        opacity="0.55"
      />
      <path d="M13 3C9 6 6 9 4 13" stroke="currentColor" strokeWidth="1" opacity="0.8" />
    </svg>
  );
}

export function EcoLivingScene() {
  return (
    <div
      aria-hidden
      className="relative aspect-[4/3] w-full overflow-hidden rounded-[28px] bg-gradient-to-br from-primary/8 via-transparent to-leaf/10 ring-1 ring-border/50 sm:aspect-[16/10]"
    >
      {/* ambient washes */}
      <span className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
      <span className="animate-hero-glow pointer-events-none absolute bottom-[8%] left-1/2 h-8 w-[58%] rounded-[50%] bg-forest/25 blur-2xl motion-reduce:animate-none" />

      {/* birds */}
      {BIRDS.map((b, i) => (
        <span
          key={`bird-${i}`}
          className="animate-scene-bird pointer-events-none absolute left-0 motion-reduce:hidden"
          style={{ top: b.top, animationDelay: b.delay, animationDuration: b.duration }}
        >
          <Bird scale={b.scale} />
        </span>
      ))}

      {/* tower */}
      <img
        src={ecoBuilding}
        alt=""
        loading="lazy"
        width={1024}
        height={1024}
        className="animate-hero-levitate absolute inset-x-0 bottom-[6%] mx-auto block h-[88%] w-auto max-w-[92%] object-contain drop-shadow-[0_22px_36px_rgba(16,50,36,0.16)] motion-reduce:animate-none"
      />

      {/* neighbour waving from a balcony */}
      <span className="pointer-events-none absolute bottom-[38%] left-1/2 -translate-x-[128%]">
        <svg width="30" height="34" viewBox="0 0 30 34" fill="none">
          <circle cx="15" cy="9" r="4.4" className="fill-forest/75" />
          <path
            d="M9 33v-9a6 6 0 0 1 12 0v9"
            className="fill-forest/65"
          />
          <g className="animate-scene-wave motion-reduce:animate-none" style={{ transformOrigin: "21px 22px" }}>
            <path
              d="M21 22 27 12"
              className="stroke-forest/75"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <circle cx="27.5" cy="10.5" r="2.6" className="fill-forest/75" />
          </g>
        </svg>
      </span>

      {/* drifting leaves */}
      {LEAVES.map((l, i) => (
        <span
          key={`leaf-${i}`}
          className="animate-scene-leaf pointer-events-none absolute top-0 motion-reduce:hidden"
          style={{ left: l.left, animationDelay: l.delay, animationDuration: l.duration }}
        >
          <Leaf size={l.size} />
        </span>
      ))}
    </div>
  );
}
