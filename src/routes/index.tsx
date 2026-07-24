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
} from "lucide-react";
import heroResidence from "@/assets/hero-residence.jpg";


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
    <div className="relative min-h-screen">
      <Splash />
      <AmbientBackground />
      <LandingNav />

      <main className="relative">
        <Hero />
        <Categories />
        <Projects />
        <Stats />
        <Lifestyle />
        <SmartPanels />
        <Features />
        <BookVisit />
        <HowItWorks />
        <Commission />
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
      className="relative min-h-[100svh] overflow-hidden px-5 pb-[54vh] pt-28 sm:px-8 sm:pt-32 md:pb-[46vh] md:pt-36"
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
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
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

      {/* Building emerging from the bottom + floating stat chips */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-[58vh] md:h-[50vh]"
        style={{ transform: `translateY(${scrollY * 0.08}px)` }}
      >
        {/* Soft bloom behind building */}
        <div className="absolute inset-x-0 bottom-0 mx-auto h-full max-w-6xl">
          <div className="absolute bottom-0 left-1/2 h-[70%] w-[110%] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(50%_50%_at_50%_100%,color-mix(in_oklab,var(--primary)_22%,transparent),transparent_70%)] blur-2xl" />
        </div>

        {/* The building itself */}
        <div className="absolute inset-x-0 bottom-0 mx-auto flex h-full max-w-5xl items-end justify-center px-4">
          <div className="relative w-full max-w-3xl">
            <img
              src={heroResidence}
              alt="Aawash luxury residential architecture render"
              width={1408}
              height={1408}
              className="mx-auto h-auto w-full select-none rounded-t-[3rem] object-cover animate-[float_10s_ease-in-out_infinite]"
              style={{
                maskImage:
                  "linear-gradient(to top, black 55%, rgba(0,0,0,0.85) 78%, transparent 100%), linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)",
                WebkitMaskImage:
                  "linear-gradient(to top, black 55%, rgba(0,0,0,0.85) 78%, transparent 100%), linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)",
                maskComposite: "intersect",
                WebkitMaskComposite: "source-in",
              }}
            />
            {/* Blend into background */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-background via-background/60 to-transparent" />
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
  return (
    <section aria-labelledby="cats-title" className="px-5 py-10 sm:px-8 sm:py-14">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">Explore</div>
            <h2 id="cats-title" className="mt-1 text-2xl font-bold text-foreground sm:text-3xl">
              Browse by category
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">Find the home that fits your lifestyle.</p>
          </div>
          <Link to="/projects" className="hidden shrink-0 items-center gap-1 text-sm font-semibold text-primary sm:inline-flex">
            View all <ChevronRight size={14} />
          </Link>
        </div>

        {/* Premium horizontally scrollable swipe cards */}
        <div className="-mx-5 mt-6 overflow-x-auto px-5 pb-3 pt-2 [-ms-overflow-style:none] [scrollbar-width:none] sm:-mx-8 sm:px-8 [&::-webkit-scrollbar]:hidden">
          <ul className="flex snap-x snap-mandatory gap-4">
            {CATEGORIES.map((c, i) => (
              <li key={c.label} className="snap-start">
                <button
                  type="button"
                  style={{ animationDelay: `${i * 60}ms` }}
                  className="group relative flex h-48 w-40 shrink-0 flex-col justify-between overflow-hidden rounded-[26px] border border-white/60 bg-white/70 p-4 text-left shadow-[var(--shadow-soft)] backdrop-blur-xl transition-all duration-500 ease-out hover:-translate-y-1.5 hover:shadow-[var(--shadow-float)] active:scale-[0.97] sm:h-52 sm:w-44"
                >
                  {/* Illustrative gradient blob */}
                  <span
                    aria-hidden
                    className={`absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br ${c.hue} opacity-70 blur-2xl transition-transform duration-700 group-hover:scale-125`}
                  />
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_60%_at_50%_100%,color-mix(in_oklab,var(--primary)_10%,transparent),transparent_70%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                  />

                  <div className="relative">
                    <span
                      className={`inline-grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br ${c.hue} shadow-[var(--shadow-soft)] transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-110`}
                    >
                      <c.icon size={22} />
                    </span>
                  </div>

                  <div className="relative">
                    <div className="text-sm font-bold text-foreground">{c.label}</div>
                    <div className={`mt-1 inline-flex items-center gap-1 rounded-full ${c.accent} px-2 py-0.5 text-[10px] font-semibold text-primary`}>
                      {c.count}
                    </div>
                    <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-primary opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                      Explore <ArrowRight size={11} className="transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
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

const PROJECTS = [
  {
    name: "The Serai Residences",
    location: "Whitefield, Bengaluru",
    price: "₹1.85 Cr onwards",
    units: "3 & 4 BHK",
    hue: "from-primary/30 to-leaf/25",
    tag: "New Launch",
  },
  {
    name: "Aawash Skyline",
    location: "Andheri West, Mumbai",
    price: "₹3.25 Cr onwards",
    units: "2 & 3 BHK",
    hue: "from-gold/25 to-primary/20",
    tag: "Premium",
  },
  {
    name: "Verdant Heights",
    location: "Sector 62, Noida",
    price: "₹1.15 Cr onwards",
    units: "2, 3 & 4 BHK",
    hue: "from-leaf/25 to-primary/25",
    tag: "Ready to Move",
  },
];

function Projects() {
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());
  const toggleWish = (name: string) =>
    setWishlist((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });

  return (
    <section id="projects" className="px-5 py-20 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
              Featured Projects
            </div>
            <h2 className="mt-2 text-3xl font-bold text-foreground sm:text-4xl">
              Homes worth coming home to.
            </h2>
            <p className="mt-2 max-w-lg text-sm text-muted-foreground sm:text-base">
              A preview of the curated projects Aawash partners are actively selling.
            </p>
          </div>
          <Link
            to="/projects"
            className="hidden shrink-0 items-center gap-1 text-sm font-semibold text-primary sm:inline-flex"
          >
            View all <ChevronRight size={14} />
          </Link>
        </div>

        {/* Horizontal swipe rail with overlapping cards on desktop */}
        <div className="-mx-5 mt-8 overflow-x-auto pb-6 pt-2 [-ms-overflow-style:none] [scrollbar-width:none] sm:-mx-8 [&::-webkit-scrollbar]:hidden">
          <ul className="flex snap-x snap-mandatory gap-4 px-5 sm:px-8 lg:gap-0">
            {PROJECTS.map((p, i) => {
              const wished = wishlist.has(p.name);
              return (
                <li
                  key={p.name}
                  className="snap-start shrink-0 basis-[85%] sm:basis-[60%] md:basis-[46%] lg:basis-[38%]"
                  style={{ marginLeft: i > 0 ? "-2.5rem" : undefined, zIndex: PROJECTS.length - i }}
                >
                  <Reveal variant="up" delay={i * 100}>
                    <article className="group relative flex h-full flex-col overflow-hidden rounded-[2rem] border border-border/60 bg-surface shadow-[var(--shadow-float)] transition-all duration-500 ease-out [transform-style:preserve-3d] hover:-translate-y-2 hover:rotate-[-0.6deg] hover:shadow-[var(--shadow-glow)]">
                      <div className={`relative aspect-[4/5] w-full overflow-hidden bg-gradient-to-br ${p.hue}`}>
                        <img
                          src={heroResidence}
                          alt={p.name}
                          loading="lazy"
                          className="h-full w-full scale-105 object-cover transition-transform duration-[1400ms] ease-out group-hover:scale-[1.14]"
                        />
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-foreground/75 via-foreground/10 to-transparent" />

                        {/* subtle sheen sweep on hover */}
                        <div className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-0 transition-all duration-1000 ease-out group-hover:translate-x-full group-hover:opacity-100" />

                        <span className="glass-card absolute left-4 top-4 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                          {p.tag}
                        </span>
                        <button
                          type="button"
                          aria-label={wished ? "Remove from wishlist" : "Save to wishlist"}
                          aria-pressed={wished}
                          onClick={() => toggleWish(p.name)}
                          className={`glass-card absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full shadow-[var(--shadow-soft)] transition-all duration-300 hover:-translate-y-0.5 active:scale-90 ${
                            wished ? "text-destructive" : "text-primary"
                          }`}
                        >
                          <Heart
                            size={17}
                            fill={wished ? "currentColor" : "none"}
                            className={`transition-transform duration-300 ${wished ? "scale-110" : ""}`}
                          />
                        </button>

                        {/* Rating chip */}
                        <span className="glass-card absolute bottom-[9.5rem] left-4 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold text-foreground sm:bottom-[10.5rem]">
                          <Star size={11} className="fill-gold text-gold" /> 4.9 · Concierge
                        </span>

                        {/* Info glass overlay — richer */}
                        <div className="absolute inset-x-4 bottom-4 rounded-2xl border border-white/40 bg-white/85 p-4 shadow-[var(--shadow-soft)] backdrop-blur-xl">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h3 className="truncate text-base font-bold text-foreground">{p.name}</h3>
                              <div className="mt-0.5 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                <MapPin size={11} /> {p.location}
                              </div>
                            </div>
                            <span className="shrink-0 rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-semibold text-primary">
                              {p.units}
                            </span>
                          </div>

                          <div className="mt-3 flex items-end justify-between gap-2">
                            <div className="min-w-0">
                              <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                                Starting
                              </div>
                              <div className="truncate text-sm font-extrabold text-foreground">{p.price}</div>
                            </div>
                            <Link
                              to="/auth"
                              aria-label={`Explore ${p.name}`}
                              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-leaf text-primary-foreground shadow-[var(--shadow-glow)] transition-all duration-300 hover:-translate-y-0.5 hover:rotate-6 active:scale-95"
                            >
                              <ArrowRight size={14} />
                            </Link>
                          </div>
                        </div>
                      </div>
                    </article>
                  </Reveal>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
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
          <div>© {new Date().getFullYear()} Aawash. All rights reserved.</div>
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
