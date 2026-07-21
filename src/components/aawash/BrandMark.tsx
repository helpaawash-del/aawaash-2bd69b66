import { Leaf } from "lucide-react";

/**
 * BrandMark — Aawash logotype
 * Placeholder crest until the official logo asset is provided.
 * Uses semantic tokens only.
 */
export function BrandMark({
  size = "md",
  showWordmark = true,
}: {
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
}) {
  const dims = {
    sm: { box: "h-8 w-8", icon: 16, text: "text-base" },
    md: { box: "h-11 w-11", icon: 22, text: "text-xl" },
    lg: { box: "h-16 w-16", icon: 32, text: "text-3xl" },
  }[size];

  return (
    <div className="flex items-center gap-3">
      <div
        className={`${dims.box} relative grid place-items-center rounded-2xl bg-gradient-to-br from-primary to-leaf shadow-[var(--shadow-glow)]`}
      >
        <Leaf size={dims.icon} className="text-primary-foreground" strokeWidth={2.2} />
        <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/20" />
      </div>
      {showWordmark && (
        <div className="flex flex-col leading-none">
          <span className={`${dims.text} font-extrabold tracking-tight text-foreground`}>
            Aawash
          </span>
          <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Real Estate
          </span>
        </div>
      )}
    </div>
  );
}
