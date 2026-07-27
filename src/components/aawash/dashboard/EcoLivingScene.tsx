import { useEffect, useRef } from "react";
import ecoBuilding from "@/assets/eco-tower-wire.png.asset.json";

/* ------------------------------------------------------------------ *
 * EcoLivingScene — the dashboard hero artwork.
 * A transparent tower PNG on a clean, background-free frame, plus
 * birds that roam freely across the whole page.
 *
 * Performance notes: the pointer tilt and the bird "hub" coordinates
 * are written straight to the DOM as CSS custom properties inside a
 * single rAF tick — no React state, so moving the pointer or scrolling
 * never re-renders this tree. Listeners are passive, the pointer one is
 * only attached on fine pointers without reduced-motion, and the scroll
 * re-measure is skipped while the scene is off-screen.
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
  const haloRef = useRef<HTMLSpanElement>(null);
  const skyRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);

  // Pointer parallax / tilt — desktop pointers only, respects reduced motion.
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const node = sceneRef.current;
    if (!fine || calm || !node) return;

    let frame = 0;
    let px = 0;
    let py = 0;
    let rect: DOMRect | null = null;

    const write = () => {
      frame = 0;
      const tower = towerRef.current;
      const halo = haloRef.current;
      if (!tower) return;
      tower.style.setProperty("--rx", `${(-py * 7).toFixed(2)}deg`);
      tower.style.setProperty("--ry", `${(px * 10).toFixed(2)}deg`);
      tower.style.setProperty("--tx", `${(px * 12).toFixed(1)}px`);
      tower.style.setProperty("--ty", `${(py * 8).toFixed(1)}px`);
      if (halo) {
        halo.style.setProperty("--hx", `${(px * 4.8).toFixed(1)}px`);
        halo.style.setProperty("--hy", `${(py * 3.2).toFixed(1)}px`);
      }
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(write);
    };

    const onEnter = () => {
      rect = node.getBoundingClientRect();
    };
    const onMove = (e: PointerEvent) => {
      if (!rect) rect = node.getBoundingClientRect();
      px = (e.clientX - rect.left) / rect.width - 0.5;
      py = (e.clientY - rect.top) / rect.height - 0.5;
      schedule();
    };
    const onLeave = () => {
      rect = null;
      px = 0;
      py = 0;
      schedule();
    };

    node.addEventListener("pointerenter", onEnter, { passive: true });
    node.addEventListener("pointermove", onMove, { passive: true });
    node.addEventListener("pointerleave", onLeave, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      node.removeEventListener("pointerenter", onEnter);
      node.removeEventListener("pointermove", onMove);
      node.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  // Bird "hub" position — written as CSS vars, never as state.
  useEffect(() => {
    if (typeof window === "undefined") return;
    let frame = 0;
    let onScreen = true;

    const write = () => {
      frame = 0;
      const el = towerRef.current;
      const sky = skyRef.current;
      if (!el || !sky) return;
      const r = el.getBoundingClientRect();
      const s = sky.getBoundingClientRect();
      const x = r.left + r.width * 0.5 - s.left;
      const y = r.top + r.height * 0.22 - s.top;
      sky.style.setProperty(
        "--hub-x",
        `${Math.round(Math.min(Math.max(x, 24), Math.max(24, s.width - 24)))}px`,
      );
      sky.style.setProperty(
        "--hub-y",
        `${Math.round(Math.min(Math.max(y, 16), Math.max(16, s.height - 40)))}px`,
      );
    };

    const measure = () => {
      if (!onScreen || frame) return;
      frame = requestAnimationFrame(write);
    };

    measure();
    window.addEventListener("resize", measure, { passive: true });
    window.addEventListener("scroll", measure, { passive: true });

    // Skip scroll work entirely while the tower is off-screen.
    let io: IntersectionObserver | undefined;
    if (typeof IntersectionObserver !== "undefined" && towerRef.current) {
      io = new IntersectionObserver(
        ([entry]) => {
          onScreen = entry.isIntersecting;
          if (onScreen) measure();
        },
        { rootMargin: "160px" },
      );
      io.observe(towerRef.current);
    }

    return () => {
      if (frame) cancelAnimationFrame(frame);
      io?.disconnect();
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
        style={{ "--hub-x": "40vw", "--hub-y": "30%" } as React.CSSProperties}
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
        ref={sceneRef}
        data-testid="eco-hero-scene"
        className="relative isolate aspect-[16/11] w-full bg-transparent [perspective:1100px] sm:aspect-[16/10]"
      >
        {/* soft emerald halo behind the model */}
        <span
          ref={haloRef}
          className="absolute left-1/2 top-1/2 -z-10 h-[70%] w-[78%] rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--forest)_18%,transparent),transparent_70%)] blur-2xl transition-transform duration-500 ease-out [transform:translate(calc(-50%+var(--hx,0px)),calc(-50%+var(--hy,0px)))]"
        />
        <img
          ref={towerRef}
          src={ecoBuilding.url}
          alt=""
          data-testid="eco-hero-image"
          loading="lazy"
          decoding="async"
          width={1536}
          height={1152}
          className="absolute inset-0 mx-auto block h-full w-full bg-transparent object-contain transition-transform duration-300 ease-out will-change-transform [transform:perspective(1100px)_rotateX(var(--rx,0deg))_rotateY(var(--ry,0deg))_translate3d(var(--tx,0px),calc(4%+var(--ty,0px)),0)] motion-reduce:transform-none motion-reduce:transition-none"
        />
      </div>
    </>
  );
}
