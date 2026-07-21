import type { ReactNode } from "react";
import { useReveal } from "@/hooks/useReveal";

type Variant = "up" | "left" | "right" | "scale" | "fade";

const initial: Record<Variant, string> = {
  up: "translate-y-8 opacity-0",
  left: "-translate-x-8 opacity-0",
  right: "translate-x-8 opacity-0",
  scale: "scale-95 opacity-0",
  fade: "opacity-0",
};

/**
 * Reveal — wraps children and animates them in on scroll.
 */
export function Reveal({
  children,
  variant = "up",
  delay = 0,
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode;
  variant?: Variant;
  delay?: number;
  className?: string;
  as?: "div" | "section" | "article" | "li" | "header";
}) {
  const { ref, revealed } = useReveal<HTMLDivElement>();
  return (
    <Tag
      ref={ref as never}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-700 ease-out will-change-transform ${
        revealed ? "translate-x-0 translate-y-0 scale-100 opacity-100" : initial[variant]
      } ${className}`}
    >
      {children}
    </Tag>
  );
}
