import logoAsset from "@/assets/aawaash-logo.png.asset.json";

type Size = "sm" | "md" | "lg";

const SIZES: Record<Size, { box: string; text: string; gap: string }> = {
  sm: { box: "h-11 w-11 sm:h-14 sm:w-14 md:h-16 md:w-16", text: "text-sm sm:text-base md:text-lg", gap: "gap-1.5 sm:gap-2" },
  md: { box: "h-14 w-14 sm:h-20 sm:w-20 md:h-24 md:w-24", text: "text-base sm:text-lg md:text-xl", gap: "gap-2" },
  lg: { box: "h-20 w-20 sm:h-28 sm:w-28 md:h-32 md:w-32", text: "text-lg sm:text-xl md:text-2xl", gap: "gap-2.5" },
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
