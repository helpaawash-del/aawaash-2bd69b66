import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  Building2,
  ShieldCheck,
  Wallet,
  LineChart,
  Smartphone,
  Users,
  BarChart3,
  Leaf,
  Sparkles,
  MapPin,
  Star,
  Phone,
  Mail,
  MapPinned,
  Send,
  CheckCircle2,
  Search,
  SlidersHorizontal,
  Home,
  Landmark,
  Trees,
  Store,
  Gem,
  Heart,
  CalendarCheck,
  Waves,
  Dumbbell,
  Coffee,
  Bike,
  Mic,
  Calculator,
  Wand2,
  Gauge,
  GitCompare,
  Bookmark,
  ChevronRight,
  X,
  Ruler,
  Layers,
  ShieldAlert,
  Zap,
  Droplet,
  DoorOpen,
  Paintbrush,
  ArrowUpDown,
} from "lucide-react";

import heroResidenceAsset from "@/assets/hero-residence.png.asset.json";
const heroResidence = heroResidenceAsset.url;
const heroTowerTrees = heroResidenceAsset.url;
import savitriHero from "@/assets/savitri-hero.jpg.asset.json";
import savitriFacade from "@/assets/savitri-facade.jpg.asset.json";
import savitriRender from "@/assets/savitri-render.jpg";
import savitriSitePlan from "@/assets/savitri-siteplan.jpg";
import savitriFloorPlan from "@/assets/savitri-floorplan.jpg";
import savitriLocationMap from "@/assets/savitri-location.jpg";
import { Dialog, DialogContent } from "@/components/ui/dialog";



import { AmbientBackground } from "@/components/aawash/AmbientBackground";
import { BrandMark } from "@/components/aawash/BrandMark";
import { LandingNav } from "@/components/aawash/landing/LandingNav";
import { Splash } from "@/components/aawash/landing/Splash";
import { Reveal } from "@/components/aawash/landing/Reveal";
import { useReveal } from "@/hooks/useReveal";
import { useSession } from "@/hooks/useSession";
import { homePathForRole } from "@/lib/auth";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "Aawash — Premium Real Estate, Reimagined" },
      {
        name: "description",
        content:
          "Aawash is a luxury real estate ecosystem — curated residential projects, transparent commissions, and a mobile-first dashboard for your entire team.",
      },
      { property: "og:title", content: "Aawash — Premium Real Estate, Reimagined" },
      {
        property: "og:description",
        content:
          "Aawash is a luxury real estate ecosystem — curated residential projects, transparent commissions, and a mobile-first dashboard for your entire team.",
      },
    ],
  }),
});

function Landing() {
  const navigate = useNavigate();
  const { loading, user, role } = useSession();

  // If already authenticated, silently redirect to role dashboard.
  useEffect(() => {
    if (!loading && user) {
      navigate({ to: homePathForRole(role), replace: true });
    }
  }, [loading, user, role, navigate]);

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <Splash />
      <AmbientBackground />
      <LandingNav />

      <main className="relative overflow-x-hidden">
        <Hero />
        <Categories />
        <Projects />
        <Commission />
        <Stats />
        <Lifestyle />
        <SmartPanels />
        <Features />
        <BookVisit />
        <HowItWorks />
        <WhyChoose />
        <Testimonials />
        <FAQ />
        <Contact />
      </main>

      <Footer />
    </div>
  );
}

/* ------------------------------ HERO ------------------------------ */

function Hero() {
  const [scrollY, setScrollY] = useState(0);
  useEffect(() => {
    // Skip parallax + scroll listener on small screens to keep scrolling smooth.
    if (typeof window === "undefined" || window.matchMedia("(max-width: 1023px)").matches) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setScrollY(window.scrollY));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section
      id="home"
      className="relative overflow-hidden px-5 pt-24 pb-8 sm:px-8 sm:pt-28 lg:min-h-[92svh] lg:pb-[34vh] lg:pt-32"
    >
      {/* Layer 1-2 — atmospheric wash */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_-10%,color-mix(in_oklab,var(--primary)_14%,transparent),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(80%_50%_at_50%_100%,color-mix(in_oklab,var(--leaf,var(--primary))_18%,transparent),transparent_70%)]" />
      </div>

      {/* Layer 3 — architectural line-art vectors */}
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-24 -z-10 mx-auto h-[62%] w-full max-w-6xl opacity-[0.10]"
        viewBox="0 0 1200 700"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="lineFade" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.9" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        <g fill="none" stroke="url(#lineFade)" strokeWidth="1" className="text-primary">
          {Array.from({ length: 22 }).map((_, i) => (
            <line key={i} x1={i * 60} y1="0" x2={i * 60} y2="700" />
          ))}
          {Array.from({ length: 10 }).map((_, i) => (
            <line key={`h-${i}`} x1="0" y1={i * 70} x2="1200" y2={i * 70} />
          ))}
        </g>
      </svg>

      {/* Layer 6 — floating particles + leaves */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 hidden overflow-hidden lg:block">
        {Array.from({ length: 18 }).map((_, i) => {
          const left = (i * 53) % 100;
          const top = (i * 37) % 90;
          const delay = -(i * 0.7);
          const size = 3 + ((i * 7) % 5);
          return (
            <span
              key={i}
              className="animate-float absolute rounded-full bg-primary/30"
              style={{
                left: `${left}%`,
                top: `${top}%`,
                width: size,
                height: size,
                animationDelay: `${delay}s`,
                animationDuration: `${6 + (i % 5)}s`,
                filter: "blur(0.5px)",
              }}
            />
          );
        })}
        {/* Light rays */}
        <div
          className="absolute -top-32 left-1/2 h-[70vh] w-[80vw] -translate-x-1/2 rotate-[8deg] bg-[conic-gradient(from_200deg_at_50%_0%,transparent_0deg,color-mix(in_oklab,var(--primary)_10%,transparent)_30deg,transparent_60deg,color-mix(in_oklab,var(--gold,var(--primary))_8%,transparent)_120deg,transparent_180deg)] opacity-60 blur-2xl"
          style={{ transform: `translate(-50%, ${scrollY * -0.05}px) rotate(8deg)` }}
        />
      </div>

      {/* Floating pill trust indicator (top) */}
      <div className="relative z-10 mx-auto flex max-w-6xl justify-center">
        <div className="glass-card inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold text-primary shadow-[var(--shadow-soft)]">
          <Sparkles size={13} className="text-gold" />
          Curated Luxury Residences · India
        </div>
      </div>

      {/* Headline */}
      <div className="relative z-10 mx-auto mt-8 max-w-3xl text-center">
        <h1 className="text-balance text-[2.6rem] font-extrabold leading-[1.03] tracking-tight text-foreground sm:text-6xl md:text-7xl">
          Home isn't a place.{" "}
          <span className="bg-gradient-to-br from-primary via-leaf to-primary bg-clip-text text-transparent">
            It's a feeling.
          </span>
        </h1>
        {/* Mobile / tablet: transparent cutout render, no card frame, blends with page */}
        <div className="mt-4 lg:hidden">
          <div className="relative mx-auto aspect-square w-[min(92vw,26rem)] sm:w-[min(78vw,30rem)] md:w-[min(65vw,34rem)]">
            {/* Soft ground bloom to seat the building */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-10 bottom-2 h-10 rounded-[50%] bg-[radial-gradient(50%_60%_at_50%_50%,color-mix(in_oklab,var(--primary)_28%,transparent),transparent_75%)] blur-2xl"
            />
            {/* Subtle halo behind subject */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-6 top-6 bottom-8 rounded-[40%] bg-[radial-gradient(55%_60%_at_50%_45%,color-mix(in_oklab,var(--leaf)_18%,transparent),transparent_70%)] blur-3xl"
            />
            <img
              src={heroTowerTrees}
              alt="Aawash biophilic residence"
              width={1024}
              height={1024}
              loading="eager"
              decoding="async"
              fetchPriority="high"
              sizes="(min-width: 768px) 34rem, (min-width: 640px) 30rem, 92vw"
              className="relative h-full w-full select-none object-contain object-center drop-shadow-[0_30px_40px_color-mix(in_oklab,var(--primary)_22%,transparent)] motion-safe:animate-[float_9s_ease-in-out_infinite]"
            />
          </div>
          <div className="mt-5 flex justify-center">
            <a
              href="#projects"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-primary to-leaf px-6 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
            >
              Explore Projects <ArrowRight size={15} />
            </a>
          </div>
        </div>

        {/* Desktop-only: description, search pill, chips, CTAs, trust */}
        <div className="hidden lg:block">
        <p className="mx-auto mt-5 max-w-xl text-balance text-[15px] leading-relaxed text-muted-foreground sm:text-lg">
          Aawash brings together premium residential projects, a professional team system, and
          transparent commission tracking — all in one elegant, mobile-first experience.
        </p>

        {/* App-style floating search pill */}
        <form
          onSubmit={(e) => e.preventDefault()}
          role="search"
          aria-label="Search projects"
          className="group mx-auto mt-8 flex max-w-xl items-center gap-2 rounded-full border border-white/60 bg-white/70 py-1.5 pl-5 pr-1.5 shadow-[var(--shadow-float)] backdrop-blur-2xl transition-all focus-within:-translate-y-0.5 focus-within:shadow-[var(--shadow-glow)]"
        >
          <Search size={18} className="shrink-0 text-muted-foreground transition-colors group-focus-within:text-primary" />
          <input
            type="search"
            placeholder="Search by city, project, or 3 BHK…"
            className="min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            aria-label="Search"
          />
          <span className="hidden items-center gap-1 rounded-full bg-primary-soft px-2.5 py-1 text-[11px] font-semibold text-primary md:inline-flex">
            <MapPin size={11} /> Bengaluru
          </span>
          <button
            type="button"
            aria-label="Voice search"
            className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-primary-soft hover:text-primary sm:inline-flex"
          >
            <Mic size={16} />
          </button>
          <button
            type="button"
            aria-label="Filters"
            className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-primary-soft hover:text-primary sm:inline-flex"
          >
            <SlidersHorizontal size={16} />
          </button>
          <button
            type="submit"
            className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-br from-primary to-leaf px-4 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition-transform active:scale-95"
          >
            <Search size={14} />
            <span className="hidden sm:inline">Search</span>
          </button>
        </form>

        {/* Suggestion chips */}
        <div className="mx-auto mt-3 flex max-w-2xl flex-wrap justify-center gap-2">
          {["3 BHK · Whitefield", "Sea-view · Andheri", "Ready to move", "Under ₹1.5 Cr"].map((s) => (
            <button
              key={s}
              type="button"
              className="rounded-full border border-border bg-surface/80 px-3 py-1.5 text-[11px] font-semibold text-muted-foreground backdrop-blur transition-colors hover:border-primary/40 hover:text-primary"
            >
              {s}
            </button>
          ))}
        </div>

        {/* CTAs */}
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <a
            href="#projects"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-primary to-leaf px-6 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition-all hover:-translate-y-0.5 active:scale-[0.98]"
          >
            Explore Projects
            <ArrowRight size={16} />
          </a>
          <Link
            to="/auth"
            className="inline-flex h-12 items-center justify-center rounded-2xl border border-border bg-white/70 px-6 text-sm font-semibold text-foreground shadow-[var(--shadow-soft)] backdrop-blur-xl transition-all hover:-translate-y-0.5"
          >
            Login
          </Link>
        </div>

        {/* Trust row */}
        <div className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-xs font-medium text-muted-foreground">
          {["RERA-aligned", "Transparent Commissions", "Mobile-first"].map((t) => (
            <span key={t} className="inline-flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-primary" />
              {t}
            </span>
          ))}
        </div>
        </div>

      </div>

      {/* Building emerging from the bottom + floating stat chips */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 z-0 hidden h-[54vh] lg:block"
        style={{ transform: `translateY(${scrollY * 0.08}px)` }}
      >
        {/* Soft bloom behind building */}
        <div className="absolute inset-x-0 bottom-0 mx-auto h-full max-w-6xl">
          <div className="absolute bottom-0 left-1/2 h-[70%] w-[70%] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(50%_50%_at_50%_100%,color-mix(in_oklab,var(--primary)_22%,transparent),transparent_70%)] blur-2xl" />
        </div>

        {/* The building itself — transparent cutout, no frame */}
        <div className="absolute inset-x-0 bottom-0 mx-auto flex h-full max-w-5xl items-end justify-center px-4">
          <div className="relative w-[min(46vw,34rem)] xl:w-[min(40vw,38rem)]">
            <img
              src={heroTowerTrees}
              alt="Aawash biophilic residence"
              width={1024}
              height={1024}
              loading="lazy"
              decoding="async"
              sizes="(min-width: 1280px) 38rem, 46vw"
              className="mx-auto h-auto w-full select-none object-contain object-center drop-shadow-[0_40px_60px_color-mix(in_oklab,var(--primary)_24%,transparent)] animate-[float_10s_ease-in-out_infinite]"
            />
          </div>
        </div>

        {/* Floating stat chips over the scene */}
        <div className="pointer-events-none absolute inset-x-0 bottom-[38%] mx-auto max-w-6xl">
          <div className="relative mx-auto h-0 max-w-4xl">
            <div className="glass-card animate-float absolute left-3 top-0 flex items-center gap-3 rounded-2xl px-3.5 py-2.5 shadow-[var(--shadow-float)] sm:left-6">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary">
                <Building2 size={18} />
              </div>
              <div>
                <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Live Projects</div>
                <div className="text-base font-bold text-foreground">24 Cities</div>
              </div>
            </div>
            <div
              className="glass-card animate-float absolute right-3 top-8 flex items-center gap-3 rounded-2xl px-3.5 py-2.5 shadow-[var(--shadow-float)] sm:right-6"
              style={{ animationDelay: "-2s" }}
            >
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-gold/20 text-gold-foreground">
                <Wallet size={18} />
              </div>
              <div>
                <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Avg. Commission</div>
                <div className="text-base font-bold text-foreground">₹8.4L</div>
              </div>
            </div>
            <div
              className="glass-card animate-float absolute left-1/2 top-24 hidden -translate-x-1/2 items-center gap-3 rounded-2xl px-3.5 py-2.5 shadow-[var(--shadow-float)] md:flex"
              style={{ animationDelay: "-4s" }}
            >
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-leaf/20 text-primary">
                <LineChart size={18} />
              </div>
              <div>
                <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">This Month</div>
                <div className="text-base font-bold text-foreground">+38% Sales</div>
              </div>
            </div>

            {/* Lightweight 3D building miniatures — parallax tilt on hover */}
            <Mini3DBuilding
              className="absolute -left-2 top-40 hidden sm:block"
              style={{ animationDelay: "-1.5s" }}
              hue="from-primary/40 via-primary/25 to-leaf/25"
              floors={5}
              label="Serai · 24 units left"
            />
            <Mini3DBuilding
              className="absolute -right-2 top-44 hidden md:block"
              style={{ animationDelay: "-3.5s" }}
              hue="from-gold/30 via-primary/25 to-leaf/20"
              floors={7}
              label="Skyline · 3 BHK"
            />
          </div>
        </div>

      </div>
    </section>
  );
}

/* ---- Lightweight interactive 3D miniature building ---- */
function Mini3DBuilding({
  className = "",
  style,
  hue,
  floors,
  label,
}: {
  className?: string;
  style?: React.CSSProperties;
  hue: string;
  floors: number;
  label: string;
}) {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    setTilt({ x: py * -14, y: px * 18 });
  };
  const reset = () => setTilt({ x: 0, y: 0 });

  return (
    <div
      className={`group animate-tilt-float pointer-events-auto [perspective:900px] ${className}`}
      style={style}
      onMouseMove={onMove}
      onMouseLeave={reset}
    >
      <div
        className="relative h-32 w-24 rounded-2xl border border-white/50 bg-white/60 p-2 shadow-[var(--shadow-float)] backdrop-blur-xl [transform-style:preserve-3d] motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-out"
        style={{ transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)` }}
      >
        {/* Building silhouette */}
        <div className={`relative h-full w-full overflow-hidden rounded-xl bg-gradient-to-b ${hue}`}>
          <div className="absolute inset-x-2 bottom-0 top-2 flex flex-col-reverse gap-[3px]">
            {Array.from({ length: floors }).map((_, i) => (
              <div key={i} className="grid grid-cols-3 gap-[2px]">
                {Array.from({ length: 3 }).map((_, j) => (
                  <span
                    key={j}
                    className="h-2 rounded-[2px] bg-white/70 motion-safe:animate-pulse"
                    style={{ animationDelay: `${(i * 3 + j) * 220}ms`, opacity: 0.55 + ((i + j) % 3) * 0.15 }}
                  />
                ))}
              </div>
            ))}
          </div>
          {/* Rooftop */}
          <div className="absolute inset-x-1 top-1 h-2 rounded-md bg-white/40" />
          {/* Reflection */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-white/40 to-transparent" />
        </div>
        {/* Floating label chip */}
        <div className="pointer-events-none absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-white/60 bg-white/90 px-2 py-0.5 text-[9px] font-bold text-primary shadow-[var(--shadow-soft)]">
          {label}
        </div>
      </div>
    </div>
  );
}


/* ------------------------------ CATEGORIES ------------------------------ */

const CATEGORIES: { label: string; icon: typeof Home; hue: string; count: string; accent: string }[] = [
  { label: "Apartments", icon: Home, hue: "from-primary/20 to-leaf/15 text-primary", count: "1,240+ homes", accent: "bg-primary/10" },
  { label: "Villas", icon: Trees, hue: "from-leaf/25 to-primary/10 text-primary", count: "320 estates", accent: "bg-leaf/15" },
  { label: "Towers", icon: Building2, hue: "from-gold/25 to-primary/10 text-gold-foreground", count: "78 landmarks", accent: "bg-gold/15" },
  { label: "Plots", icon: Landmark, hue: "from-primary/15 to-gold/15 text-primary", count: "540 parcels", accent: "bg-primary/10" },
  { label: "Commercial", icon: Store, hue: "from-leaf/20 to-gold/20 text-primary", count: "96 spaces", accent: "bg-leaf/15" },
  { label: "Luxury", icon: Gem, hue: "from-gold/25 to-leaf/15 text-gold-foreground", count: "42 signature", accent: "bg-gold/20" },
];

function Categories() {
  const mobileCats = CATEGORIES.filter((c) =>
    ["Apartments", "Villas", "Towers", "Plots"].includes(c.label),
  );
  return (
    <section aria-labelledby="cats-title" className="relative px-5 py-14 sm:px-8 sm:py-20">
      {/* soft ambient wash */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(70%_100%_at_50%_0%,color-mix(in_oklab,var(--primary)_7%,transparent),transparent_70%)]"
      />
      <div className="relative mx-auto max-w-6xl">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="glass-card inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
              <Sparkles size={12} /> Explore
            </div>
            <h2
              id="cats-title"
              className="mt-4 text-3xl font-bold leading-[1.05] tracking-tight text-foreground sm:text-[2.75rem]"
            >
              Browse by{" "}
              <span className="bg-gradient-to-r from-primary via-leaf to-primary bg-clip-text text-transparent">
                category
              </span>
            </h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
              Six curated collections — from skyline towers to garden villas. Find the home that
              fits your lifestyle.
            </p>
          </div>
          <Link
            to="/projects"
            className="glass-card inline-flex h-11 shrink-0 items-center gap-1.5 self-start rounded-full px-5 text-sm font-semibold text-primary transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-float)] sm:self-auto"
          >
            View all <ChevronRight size={14} />
          </Link>
        </div>

        {/* Mobile / tablet: compact 4-icon grid */}
        <ul className="mt-8 grid grid-cols-4 gap-2.5 lg:hidden">
          {mobileCats.map((c, i) => (
            <li key={c.label}>
              <Link
                to="/projects"
                aria-label={`Browse ${c.label}`}
                style={{ animationDelay: `${i * 60}ms` }}
                className="group relative flex min-h-[112px] w-full flex-col items-center justify-center gap-2.5 overflow-hidden rounded-[22px] border border-white/70 bg-white/75 p-3 text-center shadow-[var(--shadow-soft)] backdrop-blur-xl transition-all duration-300 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2"
              >
                <span
                  aria-hidden
                  className={`absolute -top-6 left-1/2 h-16 w-16 -translate-x-1/2 rounded-full bg-gradient-to-br ${c.hue} opacity-50 blur-2xl`}
                />
                <span
                  className={`relative grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br ${c.hue} shadow-[var(--shadow-soft)] transition-transform duration-500 group-hover:-rotate-6 group-active:scale-110`}
                >
                  <c.icon size={22} className="motion-safe:animate-[float_6s_ease-in-out_infinite]" />
                </span>
                <span className="relative text-[12px] font-semibold tracking-tight text-foreground">
                  {c.label}
                </span>
              </Link>
            </li>
          ))}
        </ul>

        {/* Desktop: editorial category grid */}
        <ul className="mt-10 hidden gap-5 lg:grid lg:grid-cols-3">
          {CATEGORIES.map((c, i) => (
            <li key={c.label}>
              <Link
                to="/projects"
                aria-label={`Browse ${c.label}`}
                style={{ animationDelay: `${i * 60}ms` }}
                className="group relative flex h-full min-h-[188px] flex-col justify-between overflow-hidden rounded-[28px] border border-white/70 bg-white/70 p-6 text-left shadow-[var(--shadow-soft)] backdrop-blur-xl transition-all duration-500 ease-out hover:-translate-y-2 hover:border-primary/30 hover:shadow-[var(--shadow-float)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2"
              >
                {/* ambient blob */}
                <span
                  aria-hidden
                  className={`absolute -right-10 -top-10 h-36 w-36 rounded-full bg-gradient-to-br ${c.hue} opacity-60 blur-3xl transition-transform duration-700 group-hover:scale-125`}
                />
                {/* diagonal sheen */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/60 to-transparent opacity-0 transition-all duration-[900ms] ease-out group-hover:translate-x-full group-hover:opacity-100"
                />

                <div className="relative flex items-start justify-between">
                  <span
                    className={`inline-grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br ${c.hue} shadow-[var(--shadow-soft)] transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-110`}
                  >
                    <c.icon size={24} />
                  </span>
                  <span className="grid h-9 w-9 place-items-center rounded-full border border-border/50 text-muted-foreground transition-all duration-300 group-hover:border-primary/40 group-hover:bg-primary group-hover:text-primary-foreground">
                    <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>

                <div className="relative mt-6">
                  <div className="text-lg font-semibold tracking-tight text-foreground">
                    {c.label}
                  </div>
                  <div
                    className={`mt-2 inline-flex items-center gap-1 rounded-full ${c.accent} px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary`}
                  >
                    {c.count}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}



/* ------------------------------ LIFESTYLE ------------------------------ */

const AMENITIES: { label: string; icon: typeof Waves; desc: string }[] = [
  { label: "Infinity Pool", icon: Waves, desc: "Rooftop pools with skyline views" },
  { label: "Fitness Club", icon: Dumbbell, desc: "24×7 wellness & recovery" },
  { label: "Sky Lounge", icon: Coffee, desc: "Cafés and co-working" },
  { label: "Green Trails", icon: Bike, desc: "Cycling & jogging tracks" },
];

function Lifestyle() {
  return (
    <section aria-labelledby="lifestyle-title" className="relative px-5 py-14 sm:px-8 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <Reveal variant="left">
            <div className="glass-card inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold text-primary">
              <Leaf size={14} />
              Lifestyle Amenities
            </div>
            <h2 id="lifestyle-title" className="mt-4 text-3xl font-bold leading-tight text-foreground sm:text-4xl">
              A home that lives{" "}
              <span className="bg-gradient-to-r from-primary to-leaf bg-clip-text text-transparent">
                beyond four walls.
              </span>
            </h2>
            <p className="mt-4 max-w-md text-base text-muted-foreground">
              Curated amenities, biophilic design, and community spaces — every Aawash residence is
              built for calm, everyday luxury.
            </p>

            <ul className="mt-8 grid grid-cols-2 gap-3">
              {AMENITIES.map((a) => (
                <li
                  key={a.label}
                  className="rounded-2xl border border-border bg-surface p-4 shadow-[var(--shadow-soft)]"
                >
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary">
                    <a.icon size={18} />
                  </span>
                  <div className="mt-3 text-sm font-semibold text-foreground">{a.label}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{a.desc}</div>
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal variant="right" delay={100}>
            <div className="relative mx-auto aspect-[4/5] w-full max-w-sm overflow-hidden rounded-[2.5rem] border border-border bg-surface shadow-[var(--shadow-float)]">
              <img
                src={heroResidence}
                alt="Lifestyle amenities and greenery"
                loading="lazy"
                width={1408}
                height={1408}
                className="h-full w-full scale-110 object-cover"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/70 via-transparent to-background/20" />
              <div className="absolute inset-x-4 bottom-4 rounded-2xl border border-border bg-surface/95 p-4 shadow-[var(--shadow-soft)] backdrop-blur-xl">
                <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                  <Sparkles size={14} className="text-gold" />
                  Wellness-first Living
                </div>
                <div className="mt-1.5 text-sm font-semibold text-foreground">
                  Rooftop gardens, spa, and family-first design.
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------ BOOK VISIT ------------------------------ */

function BookVisit() {
  return (
    <section aria-labelledby="visit-title" className="px-5 py-10 sm:px-8 sm:py-14">
      <div className="mx-auto max-w-6xl">
        <div className="relative overflow-hidden rounded-[2rem] border border-border bg-gradient-to-br from-primary via-primary to-leaf p-8 text-primary-foreground shadow-[var(--shadow-glow)] sm:p-12">
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-gold/25 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-leaf/40 blur-3xl" />

          <div className="relative flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-lg">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/10 px-3 py-1 text-xs font-semibold backdrop-blur-md">
                <CalendarCheck size={14} />
                Book a Private Tour
              </div>
              <h2 id="visit-title" className="mt-4 text-3xl font-bold leading-tight sm:text-4xl">
                Walk through your future home in person.
              </h2>
              <p className="mt-3 text-sm opacity-90 sm:text-base">
                Personalised site visits with our concierge — pick a project, tell us a time, we do
                the rest.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <a
                href="#projects"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-primary-foreground px-5 text-sm font-semibold text-primary shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5"
              >
                Schedule a Visit
                <ArrowRight size={16} />
              </a>
              <a
                href="#contact"
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-primary-foreground/40 bg-primary-foreground/10 px-5 text-sm font-semibold text-primary-foreground backdrop-blur-md transition-all hover:bg-primary-foreground/20"
              >
                Talk to Advisor
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}



/* ------------------------------ STATS ------------------------------ */

const STATS = [
  { label: "Projects", value: 24, suffix: "+" },
  { label: "Buildings", value: 78, suffix: "" },
  { label: "Flats Sold", value: 1240, suffix: "+" },
  { label: "Happy Customers", value: 950, suffix: "+" },
];

function Stats() {
  return (
    <section className="px-5 py-12 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="glass-card grid grid-cols-2 gap-3 rounded-3xl p-4 shadow-[var(--shadow-float)] sm:grid-cols-4 sm:gap-6 sm:p-6">
          {STATS.map((s, i) => (
            <Reveal key={s.label} variant="up" delay={i * 80}>
              <Counter value={s.value} suffix={s.suffix} label={s.label} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Counter({ value, suffix, label }: { value: number; suffix: string; label: string }) {
  const { ref, revealed } = useReveal<HTMLDivElement>();
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!revealed) return;
    const start = performance.now();
    const dur = 1200;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      setN(Math.floor(value * (0.2 + 0.8 * (1 - Math.pow(1 - p, 3)))));
      if (p < 1) raf = requestAnimationFrame(tick);
      else setN(value);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [revealed, value]);

  return (
    <div ref={ref} className="text-center">
      <div className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
        {n.toLocaleString()}
        <span className="text-primary">{suffix}</span>
      </div>
      <div className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

/* ------------------------------ FEATURES ------------------------------ */

const FEATURES = [
  { icon: Building2, title: "Premium Residences", body: "Hand-picked luxury projects across India's most sought-after neighbourhoods." },
  { icon: ShieldCheck, title: "Transparent Commissions", body: "Every rupee tracked. Every slab defined. No hidden math." },
  { icon: BarChart3, title: "Live Performance", body: "Real-time sales, referrals, and earnings — beautifully visualised." },
  { icon: Users, title: "Team System", body: "Structured hierarchy of leaders and members with clear roles." },
  { icon: Wallet, title: "Wallet & Payouts", body: "Track earnings and payouts with a native, mobile-first wallet." },
  { icon: Smartphone, title: "Mobile-first", body: "Designed for your thumb. Optimised for on-the-go teams." },
  { icon: LineChart, title: "Deep Analytics", body: "Understand what's converting — projects, members, months." },
  { icon: Leaf, title: "Eco-forward Design", body: "A calmer, greener aesthetic across every screen." },
];

function Features() {
  return (
    <section className="px-5 py-20 sm:px-8" id="features">
      <div className="mx-auto max-w-6xl">
        <SectionHeader
          eyebrow="Why Aawash"
          title="Built for premium real estate teams."
          subtitle="Every detail crafted for clarity, speed, and trust — from the first tap to the final payout."
        />
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} variant="up" delay={(i % 4) * 80}>
              <div className="glass-card group relative flex h-full flex-col rounded-3xl p-5 shadow-[var(--shadow-soft)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-float)]">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-primary-soft to-primary-soft/40 text-primary">
                  <f.icon size={20} />
                </div>
                <h3 className="mt-4 text-base font-bold text-foreground">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------ PROJECTS ------------------------------ */

type UnitPlan = {
  code: string;
  area: string;
  config: string;
  balconies: number;
  washrooms: number;
  flats: string;
};

type ProjectDetail = {
  slug: string;
  name: string;
  tagline: string;
  developer: string;
  developerNote: string;
  location: string;
  address: string;
  price: string;
  units: string;
  tag: string;
  images: string[];
  highlights: string[];
  usps: { title: string; body: string }[];
  unitPlans: UnitPlan[];
  specs: { icon: typeof Building2; label: string; body: string }[];
  amenities: string[];
  contact: { phone: string; email: string; office: string; website: string };
};

const SAVITRI: ProjectDetail = {
  slug: "savitri-enclave",
  name: "Savitri Enclave",
  tagline: "Unveil a new chapter of refined living.",
  developer: "S.B.P. Buildcon Pvt. Ltd.",
  developerNote:
    "A construction company committed to high-quality residential & commercial developments with a focus on innovation, sustainability, and customer satisfaction.",
  location: "Near JP Chowk, Bhagwan Das Mohalla, Darbhanga",
  address: "Near JP Chowk, Bhagwan Das Mohalla, Darbhanga, Bihar",
  price: "On Request",
  units: "3 BHK · 1,763 – 2,016 sqft",
  tag: "New Launch",
  images: [savitriHero.url, savitriFacade.url, savitriRender, savitriSitePlan],
  highlights: [
    "5 unit types across 4 floors",
    "Dual vertical circulation cores",
    "Earthquake-resistant RCC frame",
    "Automatic Johnson / Kone elevator",
  ],
  usps: [
    {
      title: "Maximised parking density",
      body: "High ratio of dedicated resident spots with generous turning radius and wide aisles.",
    },
    {
      title: "Dual vertical circulation",
      body: "Two independent cores serve Lobby A and Lobby B — enhanced privacy and reduced traffic.",
    },
    {
      title: "Integrated perimeter greenery",
      body: "A lush aesthetic and natural screen buffer wrapping the entire site.",
    },
    {
      title: "Controlled, secure entry",
      body: "A defined single entrance with layered security for peace of mind.",
    },
  ],
  unitPlans: [
    { code: "Unit 1", area: "2,016 sqft", config: "3 BHK · Drawing + Dining · Kitchen", balconies: 4, washrooms: 3, flats: "101, 201, 301, 401" },
    { code: "Unit 2", area: "1,821 sqft", config: "3 BHK · Drawing + Dining · Kitchen", balconies: 3, washrooms: 3, flats: "102, 202, 302, 402" },
    { code: "Unit 3", area: "1,894 sqft", config: "3 BHK · Drawing + Dining · Kitchen", balconies: 4, washrooms: 3, flats: "103, 203, 303, 403" },
    { code: "Unit 4", area: "1,782 sqft", config: "3 BHK · Drawing + Dining · Kitchen", balconies: 3, washrooms: 3, flats: "104, 204, 304, 404" },
    { code: "Unit 5", area: "1,763 sqft", config: "3 BHK · Drawing + Dining · Kitchen", balconies: 4, washrooms: 3, flats: "105, 205, 305, 405" },
  ],
  specs: [
    { icon: ShieldAlert, label: "Structure", body: "Earthquake-resistant RCC frame with cement-mortar brickwork per structural consultants." },
    { icon: DoorOpen, label: "Doors & Windows", body: "Laminated flush doors. Aluminium / UPVC two-track sliding windows with MS safety grills." },
    { icon: Layers, label: "Flooring", body: "Glazed vitrified tiles in living, bedrooms & kitchen. Anti-skid tiles in washrooms & balconies." },
    { icon: Droplet, label: "Kitchen", body: "Granite counter with SS sink, 2 ft tiled dado, hot & cold water, RO point." },
    { icon: Waves, label: "Bathrooms", body: "Jaguar / Hindware chinaware & CP fittings with concealed hot & cold supply." },
    { icon: Zap, label: "Electrical", body: "Concealed copper wiring with Anchor / Havells modular switches and generous outlets." },
    { icon: Paintbrush, label: "Finishes", body: "White-putty walls with premium paint. Birla Opus / Asian Paints exterior with elevation railings." },
    { icon: ArrowUpDown, label: "Elevator", body: "Automatic Johnson / Kone brand elevator serving both cores." },
  ],
  amenities: [
    "Intercom in every flat",
    "Covered parking",
    "24×7 security & controlled entry",
    "Landscaped perimeter",
    "Dual lobbies",
    "Power backup provision",
  ],
  contact: {
    phone: "+91 82103 36686",
    email: "rahul8580@gmail.com",
    office: "VIP Road, Bela Fardan, Darbhanga",
    website: "www.satyabhawani.com",
  },
};

const PROJECTS: ProjectDetail[] = [SAVITRI];

function Projects() {
  const navigate = useNavigate();
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());
  const [activeImg, setActiveImg] = useState<Record<string, number>>({});
  const [openProject, setOpenProject] = useState<ProjectDetail | null>(null);
  const toggleWish = (name: string) =>
    setWishlist((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });

  return (
    <section id="projects" className="relative px-5 py-24 sm:px-8 sm:py-28">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-10 h-72 bg-[radial-gradient(60%_100%_at_50%_0%,color-mix(in_oklab,var(--leaf)_8%,transparent),transparent_72%)]"
      />
      <div className="relative mx-auto max-w-3xl">
        <div className="flex flex-col items-center text-center">
          <div className="glass-card inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.24em] text-primary">
            <Sparkles size={12} className="text-gold" /> Featured Residence
          </div>
          <h2 className="mt-5 text-[2rem] font-bold leading-[1.05] tracking-tight text-foreground sm:text-[3.25rem]">
            A home to{" "}
            <span className="relative inline-block">
              <span className="bg-gradient-to-r from-primary via-leaf to-primary bg-clip-text text-transparent">
                come home to.
              </span>
              <span
                aria-hidden
                className="absolute -bottom-1 left-0 h-[3px] w-full rounded-full bg-gradient-to-r from-primary/60 via-leaf/50 to-transparent"
              />
            </span>
          </h2>
          <p className="mt-5 max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
            One curated residence, hand-picked by Aawash — every specification, plan and
            amenity, transparent up front.
          </p>
          <Link
            to="/projects"
            className="mt-7 inline-flex h-11 items-center gap-1.5 rounded-full border border-border/60 bg-surface/70 px-5 text-sm font-semibold text-primary backdrop-blur transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-float)]"
          >
            View all projects <ChevronRight size={14} />
          </Link>
        </div>


        {/* One project per row — spacious, editorial */}
        <div className="mt-14 flex flex-col gap-16">
          {PROJECTS.map((p, i) => {
            const wished = wishlist.has(p.name);
            const idx = activeImg[p.name] ?? 0;
            return (
              <Reveal key={p.name} variant="up" delay={i * 100}>
                <div className="rounded-[2.5rem] bg-gradient-to-br from-primary/25 via-leaf/15 to-gold/20 p-[1.5px] shadow-[var(--shadow-float)]">
                <article
                  role="link"
                  tabIndex={0}
                  onClick={(event) => {
                    const target = event.target as HTMLElement;
                    if (target.closest("a,button")) return;
                    navigate({ to: "/projects/$slug", params: { slug: p.slug } });
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" && event.key !== " ") return;
                    event.preventDefault();
                    navigate({ to: "/projects/$slug", params: { slug: p.slug } });
                  }}
                  className="group relative cursor-pointer overflow-hidden rounded-[2.4rem] bg-surface transition-all duration-500 ease-out hover:-translate-y-1.5 hover:shadow-[var(--shadow-glow)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2"
                >
                  {/* Image — clean, no overlaid copy */}
                  <div className="relative m-2 aspect-[4/3] overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary/10 to-leaf/10 sm:m-2.5 sm:aspect-[16/10]">
                    <img
                      src={p.images[idx]}
                      alt={`${p.name} — view ${idx + 1}`}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover transition-transform duration-[1600ms] ease-out group-hover:scale-[1.05]"
                    />
                    {/* Soft top vignette so chips read on any image */}
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/30 to-transparent" />
                    <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-primary shadow-sm backdrop-blur">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary motion-safe:animate-pulse" />
                      {p.tag}
                    </span>
                    <button
                      type="button"
                      aria-label={wished ? "Remove from wishlist" : "Save to wishlist"}
                      aria-pressed={wished}
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleWish(p.name); }}
                      className={`absolute right-4 top-4 z-30 grid h-11 w-11 place-items-center rounded-full bg-white/95 shadow-[var(--shadow-soft)] backdrop-blur transition-all duration-300 hover:-translate-y-0.5 active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 ${
                        wished ? "text-destructive" : "text-primary"
                      }`}
                    >
                      <Heart size={17} fill={wished ? "currentColor" : "none"} />
                    </button>

                    {p.images.length > 1 && (
                      <div className="absolute inset-x-0 bottom-4 z-30 flex justify-center">
                        <div className="flex items-center gap-1.5 rounded-full bg-black/25 px-2.5 py-1.5 backdrop-blur-md">
                          {p.images.map((_, ii) => (
                            <button
                              key={ii}
                              type="button"
                              aria-label={`View image ${ii + 1}`}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setActiveImg((prev) => ({ ...prev, [p.name]: ii }));
                              }}
                              className={`h-1.5 rounded-full transition-all ${
                                ii === idx ? "w-7 bg-white" : "w-1.5 bg-white/60 hover:bg-white/90"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Info block */}
                  <div className="relative z-20 px-6 pb-7 pt-4 sm:px-8 sm:pb-8 sm:pt-5">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                      <div className="min-w-0">
                        <div className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                          <MapPin size={12} className="text-primary" /> Darbhanga, Bihar
                        </div>
                        <Link
                          to="/projects/$slug"
                          params={{ slug: p.slug }}
                          className="mt-2 block truncate text-2xl font-semibold tracking-tight text-foreground transition-colors hover:text-primary sm:text-[1.75rem]"
                        >
                          {p.name}
                        </Link>
                        <p className="mt-1.5 truncate text-sm text-muted-foreground">{p.tagline}</p>
                      </div>
                      <div className="flex items-center justify-between gap-4 sm:justify-end">
                        <div className="sm:text-right">
                          <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                            From
                          </div>
                          <div className="text-lg font-bold tracking-tight text-foreground">
                            {p.price}
                          </div>
                        </div>
                        <Link
                          to="/projects/$slug"
                          params={{ slug: p.slug }}
                          aria-label={`Explore ${p.name}`}
                          className="inline-flex h-12 items-center gap-2 rounded-full bg-gradient-to-r from-primary to-leaf px-5 text-xs font-bold uppercase tracking-[0.12em] text-primary-foreground shadow-[var(--shadow-glow)] transition-all hover:-translate-y-0.5 hover:brightness-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2"
                        >
                          Explore <ArrowRight size={14} />
                        </Link>
                      </div>
                    </div>

                    {/* Spec strip */}
                    <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-border/50 pt-5">
                      <SpecPill icon={<Ruler size={13} />} label={p.units} />
                      <SpecPill icon={<Building2 size={13} />} label={p.developer} />
                    </div>
                  </div>
                </article>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>

      <ProjectDetailModal
        project={openProject}
        onClose={() => setOpenProject(null)}
      />
    </section>
  );
}

/* -------------------- Project Detail Modal -------------------- */

function ProjectDetailModal({
  project,
  onClose,
}: {
  project: ProjectDetail | null;
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (project) setIdx(0);
  }, [project]);

  if (!project) {
    return (
      <Dialog open={false} onOpenChange={(o) => !o && onClose()}>
        <DialogContent />
      </Dialog>
    );
  }

  const p = project;
  const gallery = [...p.images, savitriFloorPlan, savitriLocationMap];

  return (
    <Dialog open={!!project} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-h-[92vh] w-[min(100vw-1rem,64rem)] max-w-none overflow-hidden rounded-[1.75rem] border border-border/60 bg-surface p-0 shadow-[var(--shadow-float)] sm:w-[min(100vw-2rem,64rem)]"
      >
        {/* Custom close (Dialog already has one; hide via absolute cover for consistent style) */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 z-30 grid h-10 w-10 place-items-center rounded-full bg-white/95 text-foreground shadow-[var(--shadow-soft)] backdrop-blur transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        >
          <X size={16} />
        </button>

        <div className="max-h-[92vh] overflow-y-auto">
          {/* Hero image */}
          <div className="relative aspect-[16/10] w-full overflow-hidden bg-gradient-to-br from-primary/10 to-leaf/10">
            <img
              src={gallery[idx]}
              alt={`${p.name} — view ${idx + 1}`}
              className="h-full w-full object-cover"
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
            <span className="absolute left-5 top-5 rounded-full bg-white/95 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-primary shadow-sm">
              {p.tag}
            </span>
            <div className="absolute inset-x-0 bottom-5 flex justify-center gap-1.5">
              {gallery.map((_, ii) => (
                <button
                  key={ii}
                  type="button"
                  aria-label={`View image ${ii + 1}`}
                  onClick={() => setIdx(ii)}
                  className={`h-1.5 rounded-full transition-all ${
                    ii === idx ? "w-7 bg-white" : "w-1.5 bg-white/60 hover:bg-white/85"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Body */}
          <div className="px-6 pb-10 pt-8 sm:px-10">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <MapPin size={12} className="text-primary" /> {p.location}
              </span>
              <span aria-hidden className="h-1 w-1 rounded-full bg-border" />
              <span>{p.units}</span>
            </div>
            <h3 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {p.name}
            </h3>
            <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
              {p.tagline}
            </p>
            <div className="mt-1.5 text-[13px] font-medium text-muted-foreground/80">
              By {p.developer}
            </div>

            {/* Quick facts */}
            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <FactCard icon={<Home size={15} />} label="Configuration" value="3 BHK" />
              <FactCard icon={<Ruler size={15} />} label="Sizes" value="1,763–2,016 sqft" />
              <FactCard icon={<Layers size={15} />} label="Floors" value="G + 4" />
              <FactCard icon={<Building2 size={15} />} label="Units / Floor" value="5" />
            </div>

            {/* USPs */}
            <SectionTitle eyebrow="Why Savitri Enclave" title="Signature advantages" />
            <div className="grid gap-4 sm:grid-cols-2">
              {p.usps.map((u) => (
                <div
                  key={u.title}
                  className="rounded-2xl border border-border/60 bg-background/40 p-5"
                >
                  <div className="text-[13px] font-bold text-foreground">{u.title}</div>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                    {u.body}
                  </p>
                </div>
              ))}
            </div>

            {/* Unit plans */}
            <SectionTitle eyebrow="Floor plans" title="Five 3 BHK residences" />
            <div className="overflow-hidden rounded-2xl border border-border/60">
              <table className="w-full text-left text-[13px]">
                <thead className="bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Unit</th>
                    <th className="px-4 py-3">Area</th>
                    <th className="hidden px-4 py-3 sm:table-cell">Balconies</th>
                    <th className="hidden px-4 py-3 sm:table-cell">Baths</th>
                    <th className="px-4 py-3">Flats</th>
                  </tr>
                </thead>
                <tbody>
                  {p.unitPlans.map((u) => (
                    <tr key={u.code} className="border-t border-border/60 text-foreground">
                      <td className="px-4 py-3 font-semibold">{u.code}</td>
                      <td className="px-4 py-3">{u.area}</td>
                      <td className="hidden px-4 py-3 sm:table-cell">{u.balconies}</td>
                      <td className="hidden px-4 py-3 sm:table-cell">{u.washrooms}</td>
                      <td className="px-4 py-3 text-muted-foreground">{u.flats}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Specifications */}
            <SectionTitle eyebrow="Specifications" title="Built to a premium standard" />
            <div className="grid gap-3 sm:grid-cols-2">
              {p.specs.map((s) => (
                <div
                  key={s.label}
                  className="flex gap-3 rounded-2xl border border-border/60 bg-background/40 p-4"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                    <s.icon size={16} />
                  </span>
                  <div>
                    <div className="text-[13px] font-bold text-foreground">{s.label}</div>
                    <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
                      {s.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Amenities */}
            <SectionTitle eyebrow="Community" title="Everyday amenities" />
            <div className="flex flex-wrap gap-2">
              {p.amenities.map((a) => (
                <span
                  key={a}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/60 px-3 py-1.5 text-[12px] font-medium text-foreground/85"
                >
                  <CheckCircle2 size={12} className="text-primary" /> {a}
                </span>
              ))}
            </div>

            {/* Developer + contact */}
            <SectionTitle eyebrow="About the developer" title={p.developer} />
            <p className="text-[14px] leading-relaxed text-muted-foreground">
              {p.developerNote}
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <DetailContactRow icon={<Phone size={14} />} label="Phone" value={p.contact.phone} />
              <DetailContactRow icon={<Mail size={14} />} label="Email" value={p.contact.email} />
              <DetailContactRow
                icon={<MapPinned size={14} />}
                label="Office"
                value={p.contact.office}
              />
              <DetailContactRow
                icon={<Landmark size={14} />}
                label="Website"
                value={p.contact.website}
              />
            </div>

            {/* CTAs */}
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/auth"
                className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-primary to-leaf text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition hover:-translate-y-0.5 active:scale-95"
              >
                Enquire now <ArrowRight size={15} />
              </Link>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-border bg-surface px-6 text-sm font-semibold text-foreground transition hover:border-primary/40 hover:text-primary"
              >
                Close
              </button>
            </div>

            <p className="mt-6 text-[11px] leading-relaxed text-muted-foreground/70">
              Disclaimer — Details reflect the developer's brochure and are indicative. Images
              are conceptual; specifications may be revised at the developer's discretion.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FactCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/40 p-4">
      <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        <span className="text-primary">{icon}</span>
        {label}
      </div>
      <div className="mt-1.5 text-[15px] font-bold text-foreground">{value}</div>
    </div>
  );
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-4 mt-10">
      <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
        {eyebrow}
      </div>
      <h4 className="mt-1.5 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
        {title}
      </h4>
    </div>
  );
}

function DetailContactRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-background/40 px-4 py-3">
      <span className="grid h-8 w-8 place-items-center rounded-full bg-primary-soft text-primary">
        {icon}
      </span>
      <div className="min-w-0">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div className="truncate text-[13px] font-semibold text-foreground">{value}</div>
      </div>
    </div>
  );
}




/* ------------------------------ SMART PANELS ------------------------------ */

const SMART_PANELS: { icon: typeof Calculator; title: string; body: string; tone: string; iconTone: string }[] = [
  { icon: Calculator, title: "EMI Calculator", body: "Model monthly payments across tenures and rates.", tone: "from-primary-soft to-primary-soft/40", iconTone: "bg-primary/15 text-primary" },
  { icon: Wand2, title: "AI Property Match", body: "Tell us your lifestyle — we surface the right homes.", tone: "from-leaf/20 to-primary-soft/30", iconTone: "bg-leaf/25 text-primary" },
  { icon: CalendarCheck, title: "Site Visit Booking", body: "Pick a slot. Concierge handles the rest.", tone: "from-gold/20 to-primary-soft/30", iconTone: "bg-gold/25 text-gold-foreground" },
  { icon: Gauge, title: "Investment Score", body: "See appreciation & rental yield at a glance.", tone: "from-primary-soft to-leaf/25", iconTone: "bg-primary/15 text-primary" },
  { icon: GitCompare, title: "Compare Projects", body: "Side-by-side view — specs, price, timelines.", tone: "from-leaf/25 to-gold/15", iconTone: "bg-leaf/25 text-primary" },
  { icon: Bookmark, title: "Saved Properties", body: "Your wishlist, synced across every device.", tone: "from-primary-soft to-gold/15", iconTone: "bg-primary/15 text-primary" },
];

function SmartPanels() {
  return (
    <section aria-labelledby="smart-title" className="px-5 py-20 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <SectionHeader
          eyebrow="Smart Tools"
          title="Everything a modern buyer needs."
          subtitle="Native app widgets — designed for tapping, not scrolling."
        />
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SMART_PANELS.map((panel, i) => (
            <Reveal key={panel.title} variant="up" delay={(i % 3) * 80}>
              <button
                type="button"
                className={`group relative flex h-full w-full flex-col items-start gap-3 overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br ${panel.tone} p-5 text-left shadow-[var(--shadow-soft)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-float)]`}
              >
                <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/40 blur-2xl transition-opacity group-hover:opacity-70" />
                <div className={`grid h-12 w-12 place-items-center rounded-2xl ${panel.iconTone} shadow-[var(--shadow-soft)]`}>
                  <panel.icon size={22} />
                </div>
                <div className="relative">
                  <h3 className="text-base font-bold text-foreground">{panel.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{panel.body}</p>
                </div>
                <span className="relative mt-1 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                  Open <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
                </span>
              </button>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------ HOW IT WORKS ------------------------------ */

const STEPS = [
  { title: "Company", body: "Aawash curates and lists premium residential projects." },
  { title: "Team Leader", body: "Each leader owns a team and drives regional sales." },
  { title: "Members", body: "Members work with buyers and close sales on the ground." },
  { title: "Customer Purchase", body: "Buyers book their home with total transparency." },
  { title: "Commission Distribution", body: "Earnings flow automatically through the ladder." },
];

function HowItWorks() {
  return (
    <section id="how-it-works" className="px-5 py-20 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <SectionHeader
          eyebrow="Team System"
          title="A clear ladder, from listing to payout."
          subtitle="Aawash's simple structure keeps everyone aligned — company, leaders, members, and customers."
        />
        <div className="relative mt-10">
          <div className="pointer-events-none absolute left-6 top-0 hidden h-full w-px bg-gradient-to-b from-primary/40 via-primary/20 to-transparent md:block" />
          <ol className="grid gap-4 md:grid-cols-1">
            {STEPS.map((s, i) => (
              <Reveal key={s.title} variant="left" delay={i * 80}>
                <li className="glass-card relative flex items-start gap-4 rounded-3xl p-5 shadow-[var(--shadow-soft)]">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary to-leaf text-sm font-bold text-primary-foreground shadow-[var(--shadow-glow)]">
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-bold text-foreground">{s.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
                  </div>
                  {i < STEPS.length - 1 && (
                    <ArrowRight
                      size={16}
                      className="absolute -bottom-3 left-8 hidden text-primary/60 md:block"
                    />
                  )}
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------ COMMISSION ------------------------------ */

const SLABS = [
  { range: "₹0 – 1 Cr", tone: "from-primary-soft to-primary-soft/30" },
  { range: "₹1 – 3 Cr", tone: "from-primary-soft to-leaf/20" },
  { range: "₹3 – 5 Cr", tone: "from-leaf/25 to-primary-soft" },
  { range: "₹5 – 7 Cr", tone: "from-leaf/30 to-gold/15" },
  { range: "₹7 – 10 Cr", tone: "from-gold/20 to-primary-soft" },
  { range: "₹10 Cr+", tone: "from-gold/30 to-leaf/20" },
];

function Commission() {
  return (
    <section id="commission" className="px-5 py-20 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <SectionHeader
          eyebrow="Commission Slabs"
          title="Simple, tiered, transparent."
          subtitle="Commission ladders scale with deal value — clearly defined and visible in your dashboard."
        />
        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
          {SLABS.map((slab, i) => (
            <Reveal key={slab.range} variant="scale" delay={i * 60}>
              <div
                className={`glass-card flex aspect-square flex-col items-center justify-center rounded-3xl bg-gradient-to-br ${slab.tone} p-3 text-center shadow-[var(--shadow-soft)]`}
              >
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Deal Value
                </div>
                <div className="mt-1.5 text-base font-extrabold tracking-tight text-foreground sm:text-lg">
                  {slab.range}
                </div>
                <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-surface/70 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  <Sparkles size={10} /> Tier {i + 1}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------ WHY CHOOSE ------------------------------ */

const WHY = [
  { icon: ShieldCheck, title: "Trusted Platform", body: "Built for professionals who value clarity and consistency." },
  { icon: Building2, title: "Luxury Projects", body: "Only well-vetted developments — nothing filler." },
  { icon: Users, title: "Team Structure", body: "Roles that mirror how your teams actually operate." },
  { icon: LineChart, title: "Fast Tracking", body: "See sales and commissions the moment they happen." },
  { icon: Wallet, title: "Secure Accounts", body: "Invite-only access. RBAC and audit trails, always on." },
  { icon: Leaf, title: "Eco-Forward Vision", body: "Calmer aesthetics, quieter animations, cleaner UX." },
];

function WhyChoose() {
  return (
    <section id="about" className="px-5 py-20 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <SectionHeader eyebrow="Why Choose Aawash" title="An experience worth signing in to." />
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {WHY.map((w, i) => (
            <Reveal key={w.title} variant="up" delay={(i % 3) * 80}>
              <div className="glass-card flex h-full items-start gap-4 rounded-3xl p-5 shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gold/20 text-gold-foreground">
                  <w.icon size={20} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-foreground">{w.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{w.body}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------ TESTIMONIALS ------------------------------ */

const REVIEWS = [
  {
    name: "Ritu Malhotra",
    role: "Team Leader — Bengaluru",
    review:
      "Aawash finally makes commission tracking feel like a modern app. My members onboard in minutes.",
    rating: 5,
  },
  {
    name: "Aditya Rao",
    role: "Member — Team A",
    review:
      "The dashboard is calm, fast, and beautiful. It's the first CRM my team actually wants to open.",
    rating: 5,
  },
  {
    name: "Sneha Iyer",
    role: "Homebuyer",
    review:
      "Every step of the purchase felt transparent. It's what buying a home should feel like.",
    rating: 5,
  },
];

function Testimonials() {
  return (
    <section className="px-5 py-20 sm:px-8" id="testimonials">
      <div className="mx-auto max-w-6xl">
        <SectionHeader
          eyebrow="Testimonials"
          title="Loved by teams and buyers alike."
          subtitle="A preview of stories we're gathering as Aawash expands city by city."
        />
        <div className="mt-10 -mx-5 overflow-x-auto pb-4 sm:mx-0">
          <div className="flex gap-4 px-5 sm:grid sm:grid-cols-3 sm:gap-5 sm:px-0">
            {REVIEWS.map((r, i) => (
              <Reveal key={r.name} variant="up" delay={i * 100} className="w-[85%] shrink-0 sm:w-auto">
                <div className="glass-card flex h-full flex-col gap-4 rounded-3xl p-5 shadow-[var(--shadow-soft)]">
                  <div className="flex items-center gap-1 text-gold">
                    {Array.from({ length: r.rating }).map((_, k) => (
                      <Star key={k} size={14} fill="currentColor" strokeWidth={0} />
                    ))}
                  </div>
                  <p className="text-sm leading-relaxed text-foreground">"{r.review}"</p>
                  <div className="mt-auto flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-primary to-leaf text-xs font-bold text-primary-foreground">
                      {r.name
                        .split(" ")
                        .map((s) => s[0])
                        .slice(0, 2)
                        .join("")}
                    </div>
                    <div className="leading-tight">
                      <div className="text-sm font-semibold text-foreground">{r.name}</div>
                      <div className="text-[11px] text-muted-foreground">{r.role}</div>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------ FAQ ------------------------------ */

const FAQS = [
  {
    q: "How do I get access to Aawash?",
    a: "Aawash is invite-only. Your Team Leader or Super Admin creates your account and shares your Login ID.",
  },
  {
    q: "What is my Login ID?",
    a: "Team Leaders and Super Admins sign in with their 10-digit mobile number. Members sign in with their Team Letter followed by their mobile — e.g. A9876543210.",
  },
  {
    q: "How is commission calculated?",
    a: "Every project defines commission slabs by deal value. Once a sale is recorded, Aawash automatically distributes commission across the team ladder.",
  },
  {
    q: "Is Aawash available on mobile?",
    a: "Yes. Aawash is built mobile-first — it feels like a native app on your phone, tablet, and desktop alike.",
  },
  {
    q: "How secure is my data?",
    a: "Aawash uses role-based access control, row-level security in the database, and full audit logging on sensitive actions.",
  },
];

function FAQ() {
  return (
    <section id="faq" className="px-5 py-20 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <SectionHeader eyebrow="Frequently Asked" title="Answers, in plain words." />
        <Reveal variant="up" className="mt-8">
          <div className="glass-card rounded-3xl p-2 shadow-[var(--shadow-soft)] sm:p-4">
            <Accordion type="single" collapsible className="w-full">
              {FAQS.map((f, i) => (
                <AccordionItem
                  key={f.q}
                  value={`item-${i}`}
                  className="border-b border-border last:border-b-0"
                >
                  <AccordionTrigger className="px-3 py-4 text-left text-sm font-semibold text-foreground hover:no-underline sm:text-base">
                    {f.q}
                  </AccordionTrigger>
                  <AccordionContent className="px-3 pb-4 text-sm leading-relaxed text-muted-foreground">
                    {f.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------ CONTACT ------------------------------ */

function Contact() {
  const [sent, setSent] = useState(false);
  return (
    <section id="contact" className="px-5 py-20 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <SectionHeader
          eyebrow="Contact"
          title="Let's build your team on Aawash."
          subtitle="Reach out — we'll help you onboard leaders, members, and your first project."
        />
        <div className="mt-10 grid gap-5 lg:grid-cols-2">
          <Reveal variant="left">
            <div className="glass-card flex h-full flex-col gap-5 rounded-3xl p-6 shadow-[var(--shadow-soft)]">
              <ContactRow icon={Phone} label="Phone" value="+91 90000 00000" />
              <ContactRow icon={Mail} label="Email" value="hello@aawash.app" />
              <ContactRow icon={MapPinned} label="Office" value="Bengaluru · Mumbai · Delhi NCR" />
              <div className="mt-2 aspect-[16/9] w-full overflow-hidden rounded-2xl bg-gradient-to-br from-primary-soft to-leaf/20">
                <div className="grid h-full w-full place-items-center text-xs font-semibold text-muted-foreground">
                  Map preview
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal variant="right">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setSent(true);
              }}
              className="glass-card flex h-full flex-col gap-4 rounded-3xl p-6 shadow-[var(--shadow-soft)]"
            >
              <Field label="Your Name" placeholder="e.g. Ritu Malhotra" />
              <Field label="Email" type="email" placeholder="you@example.com" />
              <Field label="Mobile" type="tel" placeholder="10-digit mobile" />
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Message
                </label>
                <textarea
                  rows={4}
                  placeholder="Tell us a little about your team…"
                  className="mt-1.5 w-full resize-none rounded-2xl border border-input bg-surface px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <button
                type="submit"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-primary to-leaf text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition-all hover:-translate-y-0.5"
              >
                {sent ? "Thanks — we'll be in touch" : "Send message"}
                {!sent && <Send size={14} />}
              </button>
            </form>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function ContactRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Phone;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-4">
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary">
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div className="truncate text-sm font-semibold text-foreground">{value}</div>
      </div>
    </div>
  );
}

function Field({
  label,
  type = "text",
  placeholder,
}: {
  label: string;
  type?: string;
  placeholder: string;
}) {
  return (
    <div>
      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        className="mt-1.5 w-full rounded-2xl border border-input bg-surface px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  );
}

/* ------------------------------ FOOTER ------------------------------ */

function Footer() {
  return (
    <footer className="border-t border-border/60 bg-surface-warm/50 px-5 py-12 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <BrandMark size="sm" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              A premium real estate ecosystem — curated projects, transparent commissions, and a
              beautiful mobile-first dashboard.
            </p>
          </div>
          <FooterCol
            title="Explore"
            links={[
              { label: "Projects", href: "#projects" },
              { label: "How It Works", href: "#how-it-works" },
              { label: "Commission", href: "#commission" },
              { label: "FAQ", href: "#faq" },
            ]}
          />
          <FooterCol
            title="Company"
            links={[
              { label: "About", href: "#about" },
              { label: "Contact", href: "#contact" },
              { label: "Privacy", href: "#" },
              { label: "Terms", href: "#" },
            ]}
          />
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              For Teams
            </div>
            <Link
              to="/auth"
              className="mt-3 inline-flex h-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-leaf px-4 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)]"
            >
              Login to Dashboard
            </Link>
          </div>
        </div>
        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-border/60 pt-6 text-xs text-muted-foreground sm:flex-row">
          <div>© {new Date().getFullYear()} Aawaash. All rights reserved.</div>
          <div>Made with care for premium real estate teams.</div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </div>
      <ul className="mt-3 flex flex-col gap-2">
        {links.map((l) => (
          <li key={l.label}>
            <a
              href={l.href}
              className="text-sm font-medium text-foreground transition-colors hover:text-primary"
            >
              {l.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------ SHARED ------------------------------ */

function SectionHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <Reveal variant="up">
      <div className="mx-auto max-w-2xl text-center">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
          {eyebrow}
        </div>
        <h2 className="mt-4 text-balance text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-3 text-balance text-sm leading-relaxed text-muted-foreground sm:text-base">
            {subtitle}
          </p>
        )}
      </div>
    </Reveal>
  );
}
