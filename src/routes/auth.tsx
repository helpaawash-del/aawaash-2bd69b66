import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { useServerFn } from "@tanstack/react-start";
import {
  Eye,
  EyeOff,
  Loader2,
  Lock,
  ShieldCheck,
  User,
  Sparkles,
  Building2,
  KeyRound,
  Leaf,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { loginIdToEmail, validateLoginId, homePathForRole, type AppRole } from "@/lib/auth";
import { bootstrapSuperAdmin, superAdminExists, touchLastLogin } from "@/lib/auth.functions";
import { BrandMark } from "@/components/aawash/BrandMark";

const searchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: (search) => searchSchema.parse(search),
  component: AuthPage,
  head: () => ({
    meta: [
      { title: "Sign in — Aawash" },
      {
        name: "description",
        content: "Sign in to Aawash — the premium real estate sales ecosystem.",
      },
    ],
  }),
});

/* ------------------------------------------------------------------ */
/*  Ambient scene: skyline + floating particles                        */
/* ------------------------------------------------------------------ */

function SkylineScene() {
  return (
    <svg
      viewBox="0 0 1200 700"
      className="absolute inset-0 h-full w-full"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="sky" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.99 0.005 155)" />
          <stop offset="55%" stopColor="oklch(0.97 0.02 155)" />
          <stop offset="100%" stopColor="oklch(0.93 0.05 155)" />
        </linearGradient>
        <linearGradient id="tower" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.86 0.04 155)" stopOpacity="0.9" />
          <stop offset="100%" stopColor="oklch(0.72 0.09 155)" stopOpacity="0.95" />
        </linearGradient>
        <linearGradient id="towerDeep" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.7 0.09 155)" stopOpacity="0.9" />
          <stop offset="100%" stopColor="oklch(0.55 0.13 155)" />
        </linearGradient>
        <linearGradient id="glassPane" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.98 0.02 155)" stopOpacity="0.9" />
          <stop offset="100%" stopColor="oklch(0.85 0.08 155)" stopOpacity="0.4" />
        </linearGradient>
        <radialGradient id="sun" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="oklch(0.95 0.09 90)" stopOpacity="0.9" />
          <stop offset="100%" stopColor="oklch(0.95 0.09 90)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="ground" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.94 0.04 155)" />
          <stop offset="100%" stopColor="oklch(0.86 0.08 148)" />
        </linearGradient>
      </defs>

      {/* Sky */}
      <rect width="1200" height="700" fill="url(#sky)" />

      {/* Sun halo */}
      <circle cx="900" cy="200" r="220" fill="url(#sun)" />
      <circle cx="900" cy="200" r="46" fill="oklch(0.97 0.05 90)" opacity="0.7" />

      {/* Distant hills */}
      <path
        d="M0,470 C160,420 260,460 380,440 C520,415 620,455 760,435 C900,415 1020,455 1200,430 L1200,700 L0,700 Z"
        fill="oklch(0.93 0.03 155)"
        opacity="0.8"
      />

      {/* Background trees */}
      {[80, 220, 990, 1120].map((x, i) => (
        <g key={`bg-tree-${i}`} transform={`translate(${x} 450)`}>
          <ellipse cx="0" cy="-24" rx="26" ry="34" fill="oklch(0.74 0.11 148)" opacity="0.55" />
          <rect x="-3" y="0" width="6" height="18" fill="oklch(0.55 0.07 60)" opacity="0.6" />
        </g>
      ))}

      {/* Skyline — back layer */}
      <g opacity="0.6">
        <rect x="60" y="330" width="90" height="200" fill="url(#tower)" rx="4" />
        <rect x="170" y="290" width="70" height="240" fill="url(#tower)" rx="4" />
        <rect x="260" y="350" width="110" height="180" fill="url(#tower)" rx="4" />
        <rect x="820" y="310" width="80" height="220" fill="url(#tower)" rx="4" />
        <rect x="920" y="270" width="95" height="260" fill="url(#tower)" rx="4" />
        <rect x="1035" y="340" width="80" height="190" fill="url(#tower)" rx="4" />
      </g>

      {/* Skyline — mid layer with windows */}
      <g>
        {/* Iconic tower */}
        <rect x="540" y="180" width="120" height="360" fill="url(#towerDeep)" rx="6" />
        <rect x="556" y="140" width="88" height="50" fill="url(#towerDeep)" rx="4" />
        <rect x="592" y="90" width="16" height="60" fill="oklch(0.55 0.13 155)" />
        <rect x="597" y="60" width="6" height="35" fill="oklch(0.78 0.12 85)" />
        {/* Glass panels */}
        {Array.from({ length: 14 }).map((_, r) =>
          Array.from({ length: 5 }).map((_, c) => (
            <rect
              key={`p-${r}-${c}`}
              x={548 + c * 22}
              y={196 + r * 24}
              width="18"
              height="18"
              fill="url(#glassPane)"
              opacity={0.55 + ((r + c) % 3) * 0.12}
              rx="2"
            />
          )),
        )}

        {/* Left tower */}
        <rect x="390" y="260" width="90" height="280" fill="url(#tower)" rx="6" />
        {Array.from({ length: 11 }).map((_, r) =>
          Array.from({ length: 4 }).map((_, c) => (
            <rect
              key={`l-${r}-${c}`}
              x={398 + c * 20}
              y={272 + r * 22}
              width="16"
              height="14"
              fill="url(#glassPane)"
              opacity={0.55 + ((r * c) % 3) * 0.14}
              rx="2"
            />
          )),
        )}

        {/* Right tower */}
        <rect x="700" y="230" width="100" height="310" fill="url(#tower)" rx="6" />
        <rect x="716" y="200" width="68" height="34" fill="url(#tower)" rx="4" />
        {Array.from({ length: 12 }).map((_, r) =>
          Array.from({ length: 4 }).map((_, c) => (
            <rect
              key={`r-${r}-${c}`}
              x={710 + c * 22}
              y={242 + r * 22}
              width="18"
              height="14"
              fill="url(#glassPane)"
              opacity={0.6 + ((r + c) % 2) * 0.18}
              rx="2"
            />
          )),
        )}
      </g>

      {/* Ground */}
      <rect x="0" y="530" width="1200" height="170" fill="url(#ground)" />

      {/* Foreground trees */}
      {[40, 340, 480, 680, 860, 1050, 1160].map((x, i) => (
        <g key={`fg-tree-${i}`} transform={`translate(${x} 540)`}>
          <ellipse cx="0" cy="-30" rx="30" ry="40" fill="oklch(0.62 0.14 148)" opacity="0.85" />
          <ellipse cx="-14" cy="-20" rx="18" ry="24" fill="oklch(0.7 0.14 148)" opacity="0.7" />
          <ellipse cx="14" cy="-24" rx="16" ry="22" fill="oklch(0.68 0.14 148)" opacity="0.65" />
          <rect x="-3" y="0" width="6" height="24" fill="oklch(0.5 0.07 60)" />
        </g>
      ))}

      {/* Path */}
      <path d="M0,690 Q600,610 1200,690" fill="none" stroke="oklch(0.85 0.02 150)" strokeWidth="6" opacity="0.6" />
    </svg>
  );
}

function Particles() {
  const dots = useMemo(
    () =>
      Array.from({ length: 22 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        top: Math.random() * 100,
        size: 3 + Math.random() * 6,
        delay: Math.random() * 8,
        duration: 10 + Math.random() * 14,
        opacity: 0.15 + Math.random() * 0.35,
      })),
    [],
  );
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {dots.map((d) => (
        <span
          key={d.id}
          className="absolute rounded-full bg-primary/40 blur-[1px]"
          style={{
            left: `${d.left}%`,
            top: `${d.top}%`,
            width: d.size,
            height: d.size,
            opacity: d.opacity,
            animation: `particleFloat ${d.duration}s ease-in-out ${d.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

function AuthPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [checking, setChecking] = useState(true);
  const [needsBootstrap, setNeedsBootstrap] = useState(false);

  const check = useServerFn(superAdminExists);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(async ({ data }) => {
      if (cancelled) return;
      if (data.user) {
        const { data: r } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.user.id)
          .order("role", { ascending: true })
          .limit(1)
          .maybeSingle();
        const role = (r?.role as AppRole | null) ?? null;
        navigate({ to: search.redirect ?? homePathForRole(role), replace: true });
        return;
      }
      try {
        const res = await check();
        if (!cancelled) setNeedsBootstrap(!res.exists);
      } catch {
        if (!cancelled) setNeedsBootstrap(false);
      } finally {
        if (!cancelled) setChecking(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (checking) {
    return (
      <div className="relative grid min-h-dvh place-items-center bg-background">
        <div className="relative">
          <div className="absolute inset-0 -m-6 rounded-full bg-primary/10 blur-2xl" />
          <Loader2 className="relative h-9 w-9 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-dvh overflow-hidden bg-background text-foreground">
      {/* Ambient light orbs */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full bg-primary/10 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-[560px] w-[560px] rounded-full bg-gold/10 blur-[140px]" />
      <div className="pointer-events-none absolute top-1/3 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-leaf/10 blur-[120px]" />

      <div className="relative z-10 grid min-h-dvh lg:grid-cols-[1.15fr_1fr]">
        {/* Left: hero visual */}
        <aside className="relative hidden overflow-hidden lg:block">
          <div className="absolute inset-0 animate-[skylineDrift_30s_ease-in-out_infinite_alternate]">
            <SkylineScene />
          </div>
          <Particles />
          {/* Soft wash */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-white/10 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/10 to-transparent" />

          <div className="relative flex h-full flex-col justify-between p-12 xl:p-16">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl border border-primary/30 bg-surface/80 backdrop-blur-xl shadow-soft">
                <Building2 size={20} className="text-primary" />
              </div>
              <div>
                <div className="text-lg font-bold tracking-wide text-foreground">Aawash</div>
                <div className="text-[11px] uppercase tracking-[0.24em] text-primary/80">Luxury Living</div>
              </div>
            </div>

            <div className="max-w-lg animate-[floatIn_0.9s_cubic-bezier(.2,.8,.2,1)_both]">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-surface/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary backdrop-blur-md shadow-soft">
                <Sparkles size={12} /> A Green Skyline Awaits
              </div>
              <h2 className="mt-6 text-5xl font-extrabold leading-[1.05] tracking-tight text-foreground xl:text-6xl">
                Where skylines
                <br />
                <span className="bg-gradient-to-r from-primary via-leaf to-gold bg-clip-text text-transparent">
                  become homes.
                </span>
              </h2>
              <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground">
                Step into the premium real-estate ecosystem powering India&rsquo;s most
                iconic residences — a treehouse of glass, gardens, and light.
              </p>

              <div className="mt-8 grid grid-cols-3 gap-3">
                {[
                  { k: "Live", v: "Projects", icon: Building2 },
                  { k: "Real-time", v: "Inventory", icon: Sparkles },
                  { k: "Green", v: "Certified", icon: Leaf },
                ].map((it) => (
                  <div
                    key={it.v}
                    className="group rounded-2xl border border-border bg-surface/80 p-3 backdrop-blur-md shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-glow"
                  >
                    <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                      <it.icon size={11} /> {it.k}
                    </div>
                    <div className="mt-0.5 text-sm font-bold text-foreground">{it.v}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
              © {new Date().getFullYear()} Aawash · Secured end-to-end
            </div>
          </div>
        </aside>

        {/* Right: form panel */}
        <main className="relative flex min-h-dvh flex-col justify-center px-5 py-10 sm:px-10">
          {/* Mobile-only mini skyline */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-52 overflow-hidden lg:hidden">
            <SkylineScene />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/60 to-background" />
          </div>
          <Particles />

          <header className="relative mb-6 flex items-center justify-between lg:hidden">
            <BrandMark size="md" />
            <Link
              to="/"
              className="rounded-full border border-border bg-surface/80 px-3 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-md transition-colors hover:text-foreground"
            >
              ← Home
            </Link>
          </header>

          <div className="relative mx-auto w-full max-w-md">
            {needsBootstrap ? <BootstrapForm onDone={() => setNeedsBootstrap(false)} /> : <LoginForm />}
          </div>

          <div className="relative mx-auto mt-8 hidden max-w-md items-center gap-2 text-center text-[11px] uppercase tracking-[0.25em] text-muted-foreground lg:flex">
            <ShieldCheck size={12} className="text-primary" />
            Invite-only · End-to-end encrypted
          </div>
        </main>
      </div>

      <style>{`
        @keyframes skylineDrift {
          0% { transform: scale(1) translateY(0); }
          100% { transform: scale(1.06) translateY(-1.2%); }
        }
        @keyframes floatIn {
          0% { opacity: 0; transform: translateY(18px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes particleFloat {
          0%, 100% { transform: translate3d(0, 0, 0); opacity: 0.25; }
          50% { transform: translate3d(12px, -28px, 0); opacity: 0.7; }
        }
        @keyframes cardIn {
          0% { opacity: 0; transform: translateY(20px) scale(0.98); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        .auth-card-in { animation: cardIn 0.8s cubic-bezier(.2,.8,.2,1) both; }
        @keyframes successPop {
          0% { transform: scale(0.4); opacity: 0; }
          60% { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .success-pop { animation: successPop 0.5s cubic-bezier(.2,.8,.2,1) both; }
        @keyframes shakeX {
          0%,100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
        .shake-x { animation: shakeX 0.4s ease-in-out; }
      `}</style>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Login form                                                         */
/* ------------------------------------------------------------------ */

function LoginForm() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const touch = useServerFn(touchLastLogin);

  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const v = validateLoginId(loginId);
    if (!v.ok) {
      setError("Invalid login credentials.");
      return;
    }
    if (password.length < 6) {
      setError("Invalid login credentials.");
      return;
    }
    setSubmitting(true);
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: loginIdToEmail(v.normalized),
        password,
      });
      if (signInError || !data.user) {
        setError("Invalid login credentials.");
        return;
      }

      const { data: r } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id)
        .order("role", { ascending: true })
        .limit(1)
        .maybeSingle();
      const role = (r?.role as AppRole | null) ?? null;

      touch().catch(() => undefined);
      setSuccess(true);
      setTimeout(() => {
        navigate({ to: search.redirect ?? homePathForRole(role), replace: true });
      }, 600);
    } catch {
      setError("Invalid login credentials.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-card-in relative overflow-hidden rounded-[32px] border border-border bg-surface/85 p-7 shadow-float backdrop-blur-2xl sm:p-9">
      {/* Emerald + gold sheen */}
      <div className="pointer-events-none absolute -top-24 -right-24 h-56 w-56 rounded-full bg-primary/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-gold/15 blur-3xl" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

      <div className="relative mb-7">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">
          <ShieldCheck size={12} /> Secure Sign-In
        </div>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          Welcome back.
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter your Aawash Login ID and password to continue.
        </p>
      </div>

      <form onSubmit={onSubmit} className={`relative space-y-4 ${error ? "shake-x" : ""}`} key={error ?? "ok"}>
        <Field
          label="Login ID"
          icon={<User size={16} />}
          hint="Team Leader: mobile (9876543210). Member: TeamLetter+mobile (A9876543210)."
        >
          <input
            autoFocus
            autoComplete="username"
            inputMode="text"
            spellCheck={false}
            value={loginId}
            onChange={(e) => setLoginId(e.target.value.toUpperCase())}
            placeholder="A9876543210"
            className="w-full bg-transparent text-base font-medium tracking-wide text-foreground outline-none placeholder:text-muted-foreground/60"
          />
        </Field>

        <Field label="Password" icon={<Lock size={16} />}>
          <div className="flex w-full items-center gap-2">
            <input
              autoComplete="current-password"
              type={showPwd ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full bg-transparent text-base font-medium tracking-wide text-foreground outline-none placeholder:text-muted-foreground/60"
            />
            <button
              type="button"
              onClick={() => setShowPwd((v) => !v)}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground"
              aria-label={showPwd ? "Hide password" : "Show password"}
            >
              {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </Field>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
          >
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || success}
          className="group relative mt-3 inline-flex h-13 min-h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-primary via-leaf to-primary py-3.5 text-sm font-bold uppercase tracking-[0.18em] text-primary-foreground shadow-glow transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-80"
        >
          <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
          {success ? (
            <span className="success-pop inline-flex items-center gap-2">
              <CheckCircle2 size={16} /> Signed in
            </span>
          ) : submitting ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Signing in
            </>
          ) : (
            <>
              <KeyRound size={14} /> Enter Aawash
            </>
          )}
        </button>

        <Link
          to="/"
          className="mx-auto mt-2 hidden text-center text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground lg:block"
        >
          ← Back to home
        </Link>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Bootstrap form                                                     */
/* ------------------------------------------------------------------ */

function BootstrapForm({ onDone }: { onDone: () => void }) {
  const bootstrap = useServerFn(bootstrapSuperAdmin);
  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (fullName.trim().length < 2) return setError("Enter your full name.");
    if (!/^\d{10}$/.test(mobile)) return setError("Mobile must be 10 digits.");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    setSubmitting(true);
    try {
      await bootstrap({ data: { fullName: fullName.trim(), mobile, password } });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-card-in relative overflow-hidden rounded-[32px] border border-border bg-surface/85 p-7 shadow-float backdrop-blur-2xl sm:p-9">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      <div className="pointer-events-none absolute -top-24 -right-24 h-56 w-56 rounded-full bg-primary/15 blur-3xl" />
      <div className="relative mb-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">
          <ShieldCheck size={12} /> One-Time Setup
        </div>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground">
          Create Super Admin
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          No admin exists yet. Create the first Super Admin account. This screen
          locks permanently after setup.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Full name" icon={<User size={16} />}>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Your name"
            className="w-full bg-transparent text-base font-medium text-foreground outline-none placeholder:text-muted-foreground/60"
          />
        </Field>

        <Field label="Mobile number" icon={<User size={16} />} hint="10 digits. Becomes your Login ID.">
          <input
            value={mobile}
            onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
            inputMode="numeric"
            placeholder="9876543210"
            className="w-full bg-transparent text-base font-medium tracking-wide text-foreground outline-none placeholder:text-muted-foreground/60"
          />
        </Field>

        <Field label="Password" icon={<Lock size={16} />} hint="Minimum 8 characters.">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Choose a strong password"
            className="w-full bg-transparent text-base font-medium text-foreground outline-none placeholder:text-muted-foreground/60"
          />
        </Field>

        {error && (
          <div className="flex items-start gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 inline-flex h-12 min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary via-leaf to-primary text-sm font-bold uppercase tracking-[0.18em] text-primary-foreground shadow-glow transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-70"
        >
          {submitting ? <Loader2 size={16} className="animate-spin" /> : "Create Super Admin"}
        </button>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Field                                                              */
/* ------------------------------------------------------------------ */

function Field({
  label,
  icon,
  hint,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </span>
      <div className="group flex items-center gap-3 rounded-2xl border border-border bg-surface/80 px-4 py-3.5 backdrop-blur-md transition-all duration-300 focus-within:-translate-y-0.5 focus-within:border-primary/60 focus-within:bg-surface focus-within:shadow-[0_0_0_5px_color-mix(in_oklab,var(--primary)_14%,transparent)] hover:border-primary/30">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-primary/25 bg-gradient-to-br from-primary/15 to-leaf/10 text-primary transition-transform duration-300 group-focus-within:scale-105">
          {icon}
        </span>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
      {hint && <p className="mt-1.5 text-[11px] text-muted-foreground">{hint}</p>}
    </label>
  );
}
