import { useEffect, useState } from "react";
import { BrandMark } from "@/components/aawash/BrandMark";

/**
 * Splash — brief animated intro overlay, fades out after ~2.4s.
 * Only shows once per browser session.
 */
export function Splash() {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const seen = window.sessionStorage.getItem("aawash:splash");
    if (seen) {
      setVisible(false);
      return;
    }
    window.sessionStorage.setItem("aawash:splash", "1");
    const t1 = window.setTimeout(() => setFading(true), 1800);
    const t2 = window.setTimeout(() => setVisible(false), 2400);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      aria-hidden={fading}
      className={`fixed inset-0 z-[60] grid place-items-center bg-background transition-opacity duration-500 ${
        fading ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      {/* soft glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="animate-drift absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/12 blur-3xl" />
        <div
          className="animate-drift absolute left-[30%] top-[30%] h-[280px] w-[280px] rounded-full bg-gold/12 blur-3xl"
          style={{ animationDelay: "-4s" }}
        />
      </div>

      {/* leaf particles */}
      <div className="pointer-events-none absolute inset-0">
        {Array.from({ length: 10 }).map((_, i) => (
          <span
            key={i}
            className="absolute block h-1.5 w-1.5 rounded-full bg-primary/40 animate-float"
            style={{
              left: `${(i * 97) % 100}%`,
              top: `${(i * 61) % 100}%`,
              animationDelay: `${(i % 5) * 0.4}s`,
              animationDuration: `${5 + (i % 4)}s`,
            }}
          />
        ))}
      </div>

      <div className="relative flex flex-col items-center gap-6 text-center">
        <div className="animate-float">
          <BrandMark size="lg" showWordmark={false} />
        </div>
        <div>
          <div className="text-4xl font-extrabold tracking-tight text-foreground">Aawash</div>
          <div className="mt-2 text-xs font-medium uppercase tracking-[0.3em] text-muted-foreground">
            Home, Redefined
          </div>
        </div>
        <div className="mt-2 flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 animate-shimmer rounded-full bg-primary" />
          <span
            className="h-1.5 w-1.5 animate-shimmer rounded-full bg-primary"
            style={{ animationDelay: "0.2s" }}
          />
          <span
            className="h-1.5 w-1.5 animate-shimmer rounded-full bg-primary"
            style={{ animationDelay: "0.4s" }}
          />
        </div>
      </div>
    </div>
  );
}
