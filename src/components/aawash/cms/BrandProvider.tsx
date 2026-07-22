import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { cmsGetBrand, cmsGetGlobal } from "@/lib/cms.functions";

type BrandColors = Record<string, string>;
type BrandFonts = { display?: string; body?: string };

export function BrandProvider({ children }: { children: React.ReactNode }) {
  const brandFn = useServerFn(cmsGetBrand);
  const { data } = useQuery({ queryKey: ["cms-brand"], queryFn: () => brandFn(), staleTime: 5 * 60_000 });

  useEffect(() => {
    if (!data) return;
    const root = document.documentElement;
    const colors = (data.colors ?? {}) as BrandColors;
    Object.entries(colors).forEach(([k, v]) => {
      if (typeof v === "string" && v.length > 0) root.style.setProperty(`--${k}`, v);
    });
    const fonts = (data.fonts ?? {}) as BrandFonts;
    if (fonts.display) root.style.setProperty("--font-display", fonts.display);
    if (fonts.body) root.style.setProperty("--font-body", fonts.body);
  }, [data]);

  return <>{children}</>;
}

export function useGlobalContent() {
  const fn = useServerFn(cmsGetGlobal);
  return useQuery({ queryKey: ["cms-global"], queryFn: () => fn(), staleTime: 5 * 60_000 });
}
