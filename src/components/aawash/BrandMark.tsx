import logoAsset from "@/assets/aawaash-logo.png.asset.json";

/**
 * BrandMark — Aawaash logotype
 * Uses the official Aawaash building-mark logo.
 */
export function BrandMark({
  size = "md",
  showWordmark = true,
}: {
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
}) {
  const dims = {
    sm: { box: "h-9 w-9", text: "text-base" },
    md: { box: "h-12 w-12", text: "text-xl" },
    lg: { box: "h-16 w-16", text: "text-3xl" },
  }[size];

  return (
    <div className="flex items-center gap-3">
      <div className={`${dims.box} relative grid place-items-center`}>
        <img
          src={logoAsset.url}
          alt="Aawaash"
          className="h-full w-full object-contain"
          decoding="async"
        />
      </div>
      {showWordmark && (
        <div className="flex flex-col leading-none">
          <span className={`${dims.text} font-extrabold tracking-tight text-foreground`}>
            Aawaash
          </span>
          <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Real Estate
          </span>
        </div>
      )}
    </div>
  );
}
