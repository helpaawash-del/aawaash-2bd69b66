import { useEffect, useRef, useState } from "react";
import ecoBuilding from "@/assets/eco-hero-tower.png";

/* ------------------------------------------------------------------ *
 * EcoLivingScene — the dashboard hero artwork.
 * A transparent tower PNG on a clean, background-free frame, plus
 * birds that roam freely across the whole page. Every ~7s the flock
 * swings back near the building, lingers for ~1.5s, then disperses in
 * a new direction. The bird layer sits behind page content (z-0,
 * pointer-events-none) so it can never cover the greeting or dock.
 * Motion is disabled under prefers-reduced-motion.
 * ------------------------------------------------------------------ */

const BIRDS = [
  { anim: "animate-bird-roam-a", delay: "0s", scale: 1, opacity: 0.5, bob: "2.6s", mobile: true },
  { anim: "animate-bird-roam-b", delay: "-2.5s", scale: 0.74, opacity: 0.42, bob: "2.1s", mobile: true },
  { anim: "animate-bird-roam-c", delay: "-5s", scale: 0.86, opacity: 0.46, bob: "3s", mobile: false },
  { anim: "animate-bird-roam-b", delay: "-9s", scale: 0.58, opacity: 0.32, bob: "2.4s", mobile: false },
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

export function EcoLivingScene() {
  const towerRef = useRef<HTMLImageElement>(null);
  const skyRef = useRef<HTMLDivElement>(null);
  const [hub, setHub] = useState({ x: "40vw", y: "30%" });

  useEffect(() => {
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const el = towerRef.current;
        const sky = skyRef.current;
        if (!el || !sky) return;
        const r = el.getBoundingClientRect();
        const s = sky.getBoundingClientRect();
        // Coordinates are relative to the clipped sky layer, and clamped so
        // the hub always stays inside it.
        const x = r.left + r.width * 0.5 - s.left;
        const y = r.top + r.height * 0.22 - s.top;
        setHub({
          x: `${Math.round(Math.min(Math.max(x, 24), Math.max(24, s.width - 24)))}px`,
          y: `${Math.round(Math.min(Math.max(y, 16), Math.max(16, s.height - 40)))}px`,
        });
      });
    };
    measure();
    window.addEventListener("resize", measure, { passive: true });
    window.addEventListener("scroll", measure, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure);
    };
  }, []);

  return (
    <>
      {/* page-wide roaming birds — behind content, never interactive */}
      {/* Flight area is clipped: it starts below the greeting block and ends
          above the bottom dock, so birds can never overlap either. */}
      <div
        ref={skyRef}
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-[168px] bottom-[132px] z-0 overflow-hidden motion-reduce:hidden sm:top-[136px] sm:bottom-[112px]"
        style={{ "--hub-x": hub.x, "--hub-y": hub.y } as React.CSSProperties}
      >
        {BIRDS.map((b, i) => (
          <span
            key={`bird-${i}`}
            className={`${b.anim} absolute left-0 top-0 ${b.mobile ? "" : "hidden sm:block"}`}
            style={{ animationDelay: b.delay, opacity: b.opacity }}
          >
            <span
              className="animate-bird-bob block"
              style={{ animationDuration: b.bob, animationDelay: b.delay }}
            >
              <Bird scale={b.scale} />
            </span>
          </span>
        ))}
      </div>

      <div
        aria-hidden
        className="relative isolate aspect-[4/3] w-full overflow-hidden rounded-[28px] sm:aspect-[16/10]"
      >
        <img
          ref={towerRef}
          src={ecoBuilding}
          alt=""
          loading="lazy"
          width={1024}
          height={1024}
          className="absolute inset-x-0 bottom-[-3%] mx-auto block h-[97%] w-auto max-w-[100%] object-contain drop-shadow-[0_22px_36px_rgba(16,50,36,0.16)]"
        />
      </div>
    </>
  );
}
