import { memo, useEffect, useRef } from "react";
import ecoBuilding from "@/assets/eco-hero-tower.png";

/* ------------------------------------------------------------------ *
 * EcoLivingScene — the dashboard hero artwork.
 * A transparent tower PNG on a clean, background-free frame, plus
 * birds that roam freely across the page.
 *
 * Performance notes:
 * - The "hub" coordinates the birds converge on are written straight to
 *   CSS custom properties on the sky layer via a ref. No React state,
 *   so scrolling and resizing never trigger a re-render of this tree.
 * - Scroll/resize work is rAF-throttled and skipped unless the hub moved
 *   more than a few pixels, which keeps low-end mobile devices idle.
 * - Motion is disabled entirely under prefers-reduced-motion.
 * ------------------------------------------------------------------ */

const BIRDS = [
  { anim: "animate-bird-roam-a", delay: "0s", scale: 1, opacity: 0.5, bob: "2.6s", mobile: true },
  {
    anim: "animate-bird-roam-b",
    delay: "-2.5s",
    scale: 0.74,
    opacity: 0.42,
    bob: "2.1s",
    mobile: true,
  },
  { anim: "animate-bird-roam-c", delay: "-5s", scale: 0.86, opacity: 0.46, bob: "3s", mobile: false },
  { anim: "animate-bird-roam-b", delay: "-9s", scale: 0.58, opacity: 0.32, bob: "2.4s", mobile: false },
];

const Bird = memo(function Bird({ scale }: { scale: number }) {
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
});

export const EcoLivingScene = memo(function EcoLivingScene() {
  const towerRef = useRef<HTMLImageElement>(null);
  const skyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    let last = { x: -1, y: -1 };

    const apply = () => {
      frame = 0;
      const el = towerRef.current;
      const sky = skyRef.current;
      if (!el || !sky) return;
      const r = el.getBoundingClientRect();
      const s = sky.getBoundingClientRect();
      if (s.width === 0 || s.height === 0) return;

      const x = Math.round(
        Math.min(Math.max(r.left + r.width * 0.5 - s.left, 24), Math.max(24, s.width - 24)),
      );
      const y = Math.round(
        Math.min(Math.max(r.top + r.height * 0.22 - s.top, 16), Math.max(16, s.height - 40)),
      );

      // Skip sub-pixel churn — repainting the flight path is the expensive part.
      if (Math.abs(x - last.x) < 6 && Math.abs(y - last.y) < 6) return;
      last = { x, y };
      sky.style.setProperty("--hub-x", `${x}px`);
      sky.style.setProperty("--hub-y", `${y}px`);
    };

    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(apply);
    };

    schedule();
    window.addEventListener("resize", schedule, { passive: true });
    window.addEventListener("scroll", schedule, { passive: true });

    let ro: ResizeObserver | undefined;
    if ("ResizeObserver" in window && towerRef.current) {
      ro = new ResizeObserver(schedule);
      ro.observe(towerRef.current);
    }

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule);
      ro?.disconnect();
    };
  }, []);

  return (
    <>
      {/* page-wide roaming birds — behind content, never interactive.
          Flight area is clipped between the greeting and the bottom dock. */}
      <div
        ref={skyRef}
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-[168px] bottom-[132px] z-0 overflow-hidden [contain:strict] motion-reduce:hidden sm:top-[136px] sm:bottom-[112px]"
        style={{ "--hub-x": "40vw", "--hub-y": "30%" } as React.CSSProperties}
      >
        {BIRDS.map((b, i) => (
          <span
            key={`bird-${i}`}
            className={`${b.anim} absolute left-0 top-0 [will-change:transform] ${b.mobile ? "" : "hidden sm:block"}`}
            style={{ animationDelay: b.delay, opacity: b.opacity }}
          >
            <span
              className="animate-bird-bob block [will-change:transform]"
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
          decoding="async"
          width={1024}
          height={1024}
          className="absolute inset-x-0 bottom-[-3%] mx-auto block h-[97%] w-auto max-w-[100%] object-contain drop-shadow-[0_22px_36px_rgba(16,50,36,0.16)]"
        />
      </div>
    </>
  );
});
