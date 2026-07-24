import logoAsset from "@/assets/aawaash-logo.png.asset.json";

type Size = "sm" | "md" | "lg";

const SIZES: Record<Size, { box: string; text: string; sub: string; gap: string }> = {
  sm: { box: "h-9 w-9", text: "text-base", sub: "text-[9px]", gap: "gap-2.5" },
  md: { box: "h-12 w-12", text: "text-xl", sub: "text-[10px]", gap: "gap-3" },
  lg: { box: "h-16 w-16", text: "text-3xl", sub: "text-[11px]", gap: "gap-3.5" },
};

/**
 * BrandMark — Aawaash logotype
 * Standardized sizing, spacing, and hover across every breakpoint.
 * Renders as an inline flex row so it composes cleanly inside any nav/header/footer.
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
        className={`${s.box} relative grid shrink-0 place-items-center overflow-hidden rounded-2xl transition-transform duration-300 ease-out group-hover/brand:scale-105`}
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
        <span className="flex flex-col leading-none">
          <span className={`${s.text} font-extrabold tracking-tight text-foreground`}>
            Aawaash
          </span>
          <span
            className={`mt-1 ${s.sub} font-medium uppercase tracking-[0.18em] text-muted-foreground`}
          >
            Real Estate
          </span>
        </span>
      )}
    </span>
  );
}
