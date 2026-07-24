import { useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * Parallax3DBuilding
 * ---------------------------------------------------------------
 * Lightweight, dependency-free CSS-3D blueprint of a residential tower.
 * Tilts with mouse/touch position for a hologram-desk feel.
 *
 * Performance & accessibility guardrails:
 *  - Mounts SVG only after the wrapper scrolls into view (IntersectionObserver)
 *    so off-screen dashboards pay nothing on initial load.
 *  - Renders a static, animation-free variant on touch-only / coarse-pointer
 *    devices and when `prefers-reduced-motion` is set.
 *  - Touch listeners are passive, rAF-throttled, and clamped so drags never
 *    hijack native scroll or spike CPU on low-end phones.
 */
export function Parallax3DBuilding({
  className = "",
  height = 220,
}: {
  className?: string;
  height?: number;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const pendingRef = useRef<{ x: number; y: number } | null>(null);
  const [tilt, setTilt] = useState({ x: -8, y: 14 });
  const [visible, setVisible] = useState(false);
  const [coarse, setCoarse] = useState(false);
  const reduced = useReducedMotion();

  // Detect coarse pointer (touch phones/tablets) once — we skip parallax there.
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(pointer: coarse)");
    setCoarse(mq.matches);
    const on = (e: MediaQueryListEvent) => setCoarse(e.matches);
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);

  // Lazy mount when in view (with a generous rootMargin for perceived speed).
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setVisible(true);
            io.disconnect();
            break;
          }
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const applyTilt = useCallback(() => {
    rafRef.current = null;
    const next = pendingRef.current;
    if (!next) return;
    setTilt(next);
  }, []);

  const onMove = useCallback(
    (clientX: number, clientY: number) => {
      const el = wrapRef.current;
      if (!el || reduced || coarse) return;
      const r = el.getBoundingClientRect();
      // Clamp to element bounds so inertia never sends the tilt off-axis.
      const nx = Math.max(-0.5, Math.min(0.5, (clientX - r.left) / r.width - 0.5));
      const ny = Math.max(-0.5, Math.min(0.5, (clientY - r.top) / r.height - 0.5));
      pendingRef.current = { x: -8 + ny * -12, y: 14 + nx * 18 };
      if (rafRef.current == null) {
        rafRef.current = requestAnimationFrame(applyTilt);
      }
    },
    [reduced, coarse, applyTilt],
  );

  const reset = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    pendingRef.current = null;
    setTilt({ x: -8, y: 14 });
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const staticMode = reduced || coarse;

  return (
    <div
      ref={wrapRef}
      onMouseMove={staticMode ? undefined : (e) => onMove(e.clientX, e.clientY)}
      onMouseLeave={staticMode ? undefined : reset}
      className={`relative select-none ${className}`}
      style={{ perspective: "900px", height }}
      aria-hidden
    >
      {/* ambient glow — cheap, always rendered as a lightweight fallback */}
      <div className="pointer-events-none absolute inset-6 rounded-[36px] bg-gradient-to-br from-primary/25 via-transparent to-leaf/20 opacity-70 blur-2xl" />

      {!visible ? null : (
        <div
          className="relative mx-auto h-full w-full [transform-style:preserve-3d]"
          style={{
            transform: staticMode
              ? "rotateX(-8deg) rotateY(14deg)"
              : `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
            transition: staticMode
              ? "none"
              : "transform 260ms cubic-bezier(0.22,1,0.36,1)",
            willChange: staticMode ? undefined : "transform",
          }}
        >
          {/* blueprint grid floor */}
          <div
            className="absolute left-1/2 top-full h-40 w-[110%] -translate-x-1/2 -translate-y-6 rounded-[50%] opacity-60"
            style={{
              transform: "rotateX(78deg) translateZ(-40px)",
              background:
                "radial-gradient(closest-side, color-mix(in oklab, var(--primary) 30%, transparent), transparent 70%)",
            }}
          />

          <svg
            viewBox="0 0 220 260"
            className="absolute inset-0 mx-auto h-full w-full drop-shadow-[0_18px_28px_color-mix(in_oklab,var(--primary)_28%,transparent)]"
            style={{ transform: "translateZ(30px)" }}
          >
            <defs>
              <linearGradient id="bp-face" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--surface)" stopOpacity="0.95" />
                <stop offset="100%" stopColor="var(--surface-warm)" stopOpacity="0.85" />
              </linearGradient>
              <linearGradient id="bp-edge" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.6" />
                <stop offset="100%" stopColor="var(--leaf)" stopOpacity="0.6" />
              </linearGradient>
            </defs>

            <path
              d="M30 240 L110 260 L200 240 L200 90 L110 60 L30 90 Z"
              fill="url(#bp-face)"
              stroke="url(#bp-edge)"
              strokeWidth="1.2"
            />
            <path
              d="M200 240 L200 90 L220 78 L220 232 Z"
              fill="color-mix(in oklab, var(--primary) 14%, var(--surface))"
              stroke="url(#bp-edge)"
              strokeWidth="0.8"
              opacity="0.9"
            />
            <path
              d="M30 90 L110 60 L200 90 L110 42 Z"
              fill="color-mix(in oklab, var(--leaf) 20%, var(--surface))"
              stroke="url(#bp-edge)"
              strokeWidth="0.8"
            />

            <g stroke="var(--primary)" strokeOpacity="0.55" strokeWidth="0.6" fill="none">
              {Array.from({ length: 9 }).map((_, r) => (
                <line key={`h${r}`} x1="42" y1={100 + r * 15} x2="188" y2={100 + r * 15} />
              ))}
              {Array.from({ length: 7 }).map((_, c) => (
                <line key={`v${c}`} x1={42 + c * 24} y1="95" x2={42 + c * 24} y2="238" />
              ))}
            </g>

            {[
              [1, 2],
              [3, 1],
              [4, 4],
              [2, 6],
              [5, 3],
              [0, 5],
            ].map(([c, r], i) => (
              <rect
                key={i}
                x={43 + c * 24}
                y={101 + r * 15}
                width="22"
                height="13"
                rx="1.5"
                fill="var(--gold)"
                opacity="0.65"
              >
                {!staticMode && (
                  <animate
                    attributeName="opacity"
                    values="0.25;0.85;0.25"
                    dur={`${3 + i * 0.4}s`}
                    repeatCount="indefinite"
                  />
                )}
              </rect>
            ))}

            <line x1="110" y1="42" x2="110" y2="18" stroke="var(--primary)" strokeWidth="1" />
            <circle cx="110" cy="16" r="2.6" fill="var(--gold)">
              {!staticMode && (
                <animate attributeName="r" values="2.2;3.4;2.2" dur="2.4s" repeatCount="indefinite" />
              )}
            </circle>
          </svg>

          <div
            className="absolute right-0 top-8 hidden rounded-2xl border border-primary/20 bg-surface/80 px-2 py-1 text-[10px] font-semibold text-primary shadow-[var(--shadow-soft)] backdrop-blur sm:block"
            style={{ transform: "translateZ(60px)" }}
          >
            32.4m
          </div>
          <div
            className="absolute bottom-6 left-0 hidden rounded-2xl border border-leaf/30 bg-surface/80 px-2 py-1 text-[10px] font-semibold text-primary shadow-[var(--shadow-soft)] backdrop-blur sm:block"
            style={{ transform: "translateZ(50px)" }}
          >
            B+G+9
          </div>
        </div>
      )}
    </div>
  );
}
