import logoAsset from "@/assets/aawaash-logo.png.asset.json";

type Size = "sm" | "md" | "lg";

const SIZES: Record<Size, { box: string; text: string; gap: string }> = {
  sm: { box: "h-14 w-14 md:h-16 md:w-16", text: "text-2xl md:text-3xl", gap: "gap-2.5" },
  md: { box: "h-20 w-20", text: "text-3xl md:text-4xl", gap: "gap-3" },
  lg: { box: "h-24 w-24 md:h-28 md:w-28", text: "text-4xl md:text-5xl", gap: "gap-3.5" },
};

/**
 * BrandMark — Aawaash logotype
 * Larger mark, elegant Fraunces serif wordmark that pairs with the architectural logo.
 */
export function BrandMark({
  size = "md",
  showWordmark = true,
}: {
  size?: Size;
  showWordmark?: boolean;
}) {
  const s = SIZES[size];

  return (
    <span
      className={`group/brand inline-flex items-center ${s.gap} transition-transform duration-300 ease-out hover:-translate-y-0.5`}
      aria-label="Aawaash"
    >
      <span
        className={`${s.box} relative grid shrink-0 place-items-center overflow-hidden transition-transform duration-300 ease-out group-hover/brand:scale-105`}
      >
        <img
          src={logoAsset.url}
          alt=""
          aria-hidden="true"
          className="h-full w-full object-contain"
          decoding="async"
          loading="eager"
          draggable={false}
        />
      </span>
      {showWordmark && (
        <span
          className={`${s.text} font-semibold tracking-tight text-foreground leading-none`}
          style={{
            fontFamily: '"Fraunces", "Plus Jakarta Sans", serif',
            fontOpticalSizing: "auto",
            letterSpacing: "-0.01em",
          }}
        >
          Aawaash
        </span>
      )}
    </span>
  );
}
