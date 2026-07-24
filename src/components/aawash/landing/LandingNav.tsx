import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { BrandMark } from "@/components/aawash/BrandMark";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const NAV_ITEMS: { label: string; href: string; route?: boolean }[] = [
  { label: "Home", href: "/", route: true },
  { label: "Projects", href: "/projects", route: true },
  { label: "How It Works", href: "/#how-it-works" },
  { label: "About", href: "/#about" },
  { label: "Contact", href: "/#contact" },
];

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="fixed inset-x-0 top-0 z-40 px-3 pt-3 sm:px-6 sm:pt-4">
      <nav
        className={`mx-auto flex max-w-6xl items-center justify-between gap-3 rounded-3xl px-4 py-2.5 transition-all duration-300 sm:px-6 sm:py-3 ${
          scrolled
            ? "border border-border bg-background shadow-[var(--shadow-float)]"
            : "border border-transparent bg-transparent"
        }`}
      >
        <Link to="/" className="shrink-0">
          <BrandMark size="sm" />
        </Link>

        <ul className="hidden items-center gap-1 lg:flex">
          {NAV_ITEMS.map((item) => (
            <li key={item.href}>
              <a
                href={item.href}
                className="rounded-full px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-primary-soft hover:text-primary"
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          <Link
            to="/auth"
            className="hidden h-10 items-center rounded-2xl border border-border bg-surface px-4 text-sm font-semibold text-foreground shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5 sm:inline-flex"
          >
            Login
          </Link>
          <a
            href="/projects"
            className="hidden h-10 items-center rounded-2xl bg-gradient-to-br from-primary to-leaf px-4 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition-all hover:-translate-y-0.5 sm:inline-flex"
          >
            Explore
          </a>

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button
                aria-label="Open menu"
                className="grid h-11 w-11 place-items-center rounded-2xl border border-border bg-surface text-foreground shadow-[var(--shadow-soft)] lg:hidden"
              >
                <Menu size={18} />
              </button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-[85vw] max-w-sm rounded-l-3xl border-l border-border bg-background/95 p-0 backdrop-blur-xl"
            >
              <div className="flex h-full flex-col p-6">
                <div className="flex items-center justify-between">
                  <BrandMark size="sm" />
                  <button
                    onClick={() => setOpen(false)}
                    aria-label="Close menu"
                    className="grid h-10 w-10 place-items-center rounded-2xl border border-border bg-surface text-foreground"
                  >
                    <X size={16} />
                  </button>
                </div>

                <ul className="mt-8 flex flex-col gap-1">
                  {NAV_ITEMS.map((item) => (
                    <li key={item.href}>
                      <a
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className="flex items-center rounded-2xl px-4 py-3.5 text-base font-semibold text-foreground transition-colors hover:bg-primary-soft hover:text-primary"
                      >
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ul>

                <div className="mt-auto flex flex-col gap-3 pt-8">
                  <Link
                    to="/auth"
                    onClick={() => setOpen(false)}
                    className="inline-flex h-12 items-center justify-center rounded-2xl border border-border bg-surface text-sm font-semibold text-foreground shadow-[var(--shadow-soft)]"
                  >
                    Login
                  </Link>
                  <a
                    href="/projects"
                    onClick={() => setOpen(false)}
                    className="inline-flex h-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-leaf text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)]"
                  >
                    Explore Projects
                  </a>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </div>
  );
}
