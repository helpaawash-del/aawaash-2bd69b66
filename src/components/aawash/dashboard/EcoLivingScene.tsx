import { useEffect, useRef, useState } from "react";
import ecoBuilding from "@/assets/eco-hero-tower.png";

/* ------------------------------------------------------------------ *
 * EcoLivingScene — the dashboard hero artwork.
 * A transparent tower PNG on a clean, background-free frame, with
 * birds that roam freely across the whole page (overlapping any
 * section) and leaves drifting down through the frame.
 * The birds regularly swing back near the building, linger for a
 * moment, then head off in another direction.
 * All motion is disabled under prefers-reduced-motion.
 * ------------------------------------------------------------------ */

const BIRDS = [
  { anim: "animate-bird-roam-a", delay: "0s", scale: 1, opacity: 0.55 },
  { anim: "animate-bird-roam-b", delay: "-6s", scale: 0.72, opacity: 0.45 },
  { anim: "animate-bird-roam-c", delay: "-13s", scale: 0.85, opacity: 0.5 },
  { anim: "animate-bird-roam-b", delay: "-19s", scale: 0.55, opacity: 0.35 },
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
      className="text-forest"
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
  const towerRef = useRef<HTMLImageElement>(null);
  const [hub, setHub] = useState<{ x: string; y: string }>({ x: "40vw", y: "40vh" });

  useEffect(() => {
    const measure = () => {
      const el = towerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setHub({
        x: `${Math.round(r.left + r.width * 0.5)}px`,
        y: `${Math.round(r.top + r.height * 0.28)}px`,
      });
    };
    measure();
    window.addEventListener("resize", measure, { passive: true });
    window.addEventListener("scroll", measure, { passive: true });
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure);
    };
  }, []);

  return (
    <>
      {/* page-wide roaming birds — overlap every section, never clickable */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-40 overflow-hidden motion-reduce:hidden"
        style={
          { "--hub-x": hub.x, "--hub-y": hub.y } as React.CSSProperties
        }
      >
        {BIRDS.map((b, i) => (
          <span
            key={`bird-${i}`}
            className={`${b.anim} absolute left-0 top-0`}
            style={{ animationDelay: b.delay, opacity: b.opacity }}
          >
            <Bird scale={b.scale} />
          </span>
        ))}
      </div>

      <div
        aria-hidden
        className="relative aspect-[4/3] w-full overflow-hidden rounded-[28px] sm:aspect-[16/10]"
      >
        {/* tower */}
        <img
          ref={towerRef}
          src={ecoBuilding}
          alt=""
          loading="lazy"
          width={1024}
          height={1024}
          className="absolute inset-x-0 bottom-[1%] mx-auto block h-[96%] w-auto max-w-[98%] object-contain drop-shadow-[0_22px_36px_rgba(16,50,36,0.16)]"
        />

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
    </>
  );
}
