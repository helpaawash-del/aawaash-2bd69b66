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
} from "lucide-react";

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
        <Stats />
        <Features />
        <Projects />
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
  return (
    <section id="home" className="relative overflow-hidden px-5 pb-16 pt-32 sm:px-8 sm:pt-36 md:pt-40">
      <div className="mx-auto max-w-6xl">
        <div className="grid items-center gap-12 md:grid-cols-2 md:gap-8">
          <Reveal variant="up">
            <div className="glass-card inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold text-primary">
              <Sparkles size={14} className="text-gold" />
              Curated Luxury Residences
            </div>
            <h1 className="mt-5 text-balance text-4xl font-extrabold leading-[1.05] tracking-tight text-foreground sm:text-5xl md:text-6xl">
              Home isn't a place.{" "}
              <span className="bg-gradient-to-br from-primary to-leaf bg-clip-text text-transparent">
                It's a feeling.
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-balance text-base leading-relaxed text-muted-foreground sm:text-lg">
              Aawash brings together premium residential projects, a professional team system, and
              transparent commission tracking — all in one elegant, mobile-first experience.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a
                href="#projects"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-primary to-leaf px-5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition-all hover:-translate-y-0.5"
              >
                Explore Projects
                <ArrowRight size={16} />
              </a>
              <Link
                to="/auth"
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-border bg-surface px-5 text-sm font-semibold text-foreground shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5"
              >
                Login
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs font-medium text-muted-foreground">
              {[
                "RERA-aligned Projects",
                "Transparent Commissions",
                "Mobile-first Dashboard",
              ].map((t) => (
                <span key={t} className="inline-flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-primary" />
                  {t}
                </span>
              ))}
            </div>
          </Reveal>

          <Reveal variant="scale" delay={120}>
            <HeroVisual />
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function HeroVisual() {
  return (
    <div className="relative mx-auto aspect-[4/5] w-full max-w-md">
      {/* main render card */}
      <div className="glass-card absolute inset-0 overflow-hidden rounded-[2rem] shadow-[var(--shadow-float)]">
        <div className="relative h-full w-full bg-gradient-to-br from-primary/25 via-leaf/15 to-gold/20">
          {/* skyline silhouette */}
          <svg
            viewBox="0 0 400 500"
            className="absolute inset-0 h-full w-full"
            preserveAspectRatio="xMidYMid slice"
            aria-hidden
          >
            <defs>
              <linearGradient id="bldg" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="oklch(0.42 0.09 155)" stopOpacity="0.85" />
                <stop offset="100%" stopColor="oklch(0.62 0.15 148)" stopOpacity="0.6" />
              </linearGradient>
            </defs>
            <g fill="url(#bldg)">
              <rect x="40" y="200" width="60" height="260" rx="6" />
              <rect x="110" y="140" width="80" height="320" rx="8" />
              <rect x="200" y="180" width="55" height="280" rx="6" />
              <rect x="265" y="100" width="90" height="360" rx="10" />
              <rect x="365" y="230" width="30" height="230" rx="4" />
            </g>
            {/* windows */}
            <g fill="oklch(0.99 0.005 100)" opacity="0.5">
              {Array.from({ length: 40 }).map((_, i) => (
                <rect
                  key={i}
                  x={50 + (i % 8) * 42}
                  y={160 + Math.floor(i / 8) * 45}
                  width="8"
                  height="8"
                  rx="1"
                />
              ))}
            </g>
          </svg>
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-background/70 to-transparent" />
        </div>
      </div>

      {/* floating stat card 1 */}
      <div className="glass-card animate-float absolute -left-4 top-16 flex items-center gap-3 rounded-2xl px-3.5 py-2.5 shadow-[var(--shadow-float)] sm:-left-6">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary">
          <Building2 size={18} />
        </div>
        <div>
          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Live Projects
          </div>
          <div className="text-base font-bold text-foreground">24 Cities</div>
        </div>
      </div>

      {/* floating stat card 2 */}
      <div
        className="glass-card animate-float absolute -right-3 top-1/3 flex items-center gap-3 rounded-2xl px-3.5 py-2.5 shadow-[var(--shadow-float)] sm:-right-6"
        style={{ animationDelay: "-2s" }}
      >
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-gold/20 text-gold-foreground">
          <Wallet size={18} />
        </div>
        <div>
          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Avg. Commission
          </div>
          <div className="text-base font-bold text-foreground">₹8.4L</div>
        </div>
      </div>

      {/* floating stat card 3 */}
      <div
        className="glass-card animate-float absolute -bottom-2 left-6 flex items-center gap-3 rounded-2xl px-3.5 py-2.5 shadow-[var(--shadow-float)]"
        style={{ animationDelay: "-4s" }}
      >
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-leaf/20 text-primary">
          <LineChart size={18} />
        </div>
        <div>
          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            This Month
          </div>
          <div className="text-base font-bold text-foreground">+38% Sales</div>
        </div>
      </div>
    </div>
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
  return (
    <section id="projects" className="px-5 py-20 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <SectionHeader
          eyebrow="Featured Projects"
          title="Homes worth coming home to."
          subtitle="A preview of the curated projects Aawash partners are actively selling."
        />
        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {PROJECTS.map((p, i) => (
            <Reveal key={p.name} variant="up" delay={i * 100}>
              <article className="glass-card group flex h-full flex-col overflow-hidden rounded-3xl shadow-[var(--shadow-soft)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-float)]">
                <div
                  className={`relative aspect-[16/11] w-full bg-gradient-to-br ${p.hue}`}
                >
                  <div className="absolute inset-0 opacity-40">
                    <svg viewBox="0 0 400 250" className="h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden>
                      <g fill="oklch(0.42 0.09 155 / 0.6)">
                        <rect x="30" y="110" width="70" height="120" rx="6" />
                        <rect x="115" y="70" width="90" height="160" rx="8" />
                        <rect x="220" y="90" width="70" height="140" rx="6" />
                        <rect x="300" y="50" width="80" height="180" rx="8" />
                      </g>
                    </svg>
                  </div>
                  <span className="glass-card absolute left-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                    {p.tag}
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="text-lg font-bold text-foreground">{p.name}</h3>
                  <div className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin size={12} /> {p.location}
                  </div>
                  <div className="mt-4 flex items-end justify-between">
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Starting
                      </div>
                      <div className="text-base font-extrabold text-foreground">{p.price}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Units
                      </div>
                      <div className="text-sm font-semibold text-foreground">{p.units}</div>
                    </div>
                  </div>
                  <Link
                    to="/auth"
                    className="mt-5 inline-flex h-11 items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-br from-primary to-leaf text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition-all group-hover:-translate-y-0.5"
                  >
                    Explore <ArrowRight size={14} />
                  </Link>
                </div>
              </article>
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
