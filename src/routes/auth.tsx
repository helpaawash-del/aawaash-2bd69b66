import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  User,
  UserRound,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { loginIdToEmail, validateLoginId, homePathForRole, toInternalPath, type AppRole } from "@/lib/auth";
import { bootstrapSuperAdmin, superAdminExists, touchLastLogin } from "@/lib/auth.functions";
import heroImage from "@/assets/auth-eco-building.jpg";
import logoAsset from "@/assets/aawaash-logo.png.asset.json";


const searchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: (search) => searchSchema.parse(search),
  component: AuthPage,
  head: () => ({
    meta: [
      { title: "Sign in — Aawaash" },
      {
        name: "description",
        content: "Sign in to Aawaash — nature-friendly constructions and the premium real estate sales ecosystem.",
      },
      { property: "og:title", content: "Sign in — Aawaash" },
      {
        property: "og:description",
        content: "Sign in to Aawaash — nature-friendly constructions and the premium real estate sales ecosystem.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

/* ------------------------------------------------------------------ */
/*  Wave hero — curved photo panel in the top-right corner             */
/* ------------------------------------------------------------------ */

function WaveHero() {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 h-[40vh] min-h-[260px] sm:h-[46vh] md:h-[52vh]">
      <svg className="absolute h-0 w-0" aria-hidden="true">
        <defs>
          <clipPath id="authWave" clipPathUnits="objectBoundingBox">
            <path d="M1,0 L1,1 L0.55,1 C0.42,0.97 0.34,0.86 0.32,0.7 C0.3,0.5 0.34,0.34 0.26,0.2 C0.19,0.08 0.09,0.04 0.02,0.02 C-0.01,0.01 0,0 0.05,0 Z" />
          </clipPath>
        </defs>
      </svg>

      {/* soft outer glow following the curve */}
      <div
        className="absolute inset-y-0 right-0 w-[96%] scale-[1.03] bg-primary/25 blur-[12px] sm:w-[78%]"
        style={{ clipPath: "url(#authWave)" }}
      />
      <div
        className="absolute inset-y-0 right-0 w-[96%] overflow-hidden sm:w-[78%]"
        style={{ clipPath: "url(#authWave)" }}
      >
        <img
          src={heroImage}
          alt="Green residential tower with trees on every balcony"
          width={1024}
          height={1536}
          className="h-full w-full object-cover object-[62%_30%]"
        />
        <div className="absolute inset-0 bg-gradient-to-bl from-transparent via-transparent to-background/80" />
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[oklch(0.975_0.012_155)] to-transparent" />
      </div>
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
        navigate({ to: toInternalPath(search.redirect) ?? homePathForRole(role), replace: true });
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
      <div className="relative grid min-h-dvh place-items-center bg-[oklch(0.975_0.012_155)]">
        <div className="relative">
          <div className="absolute inset-0 -m-6 rounded-full bg-primary/10 blur-2xl" />
          <Loader2 className="relative h-9 w-9 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-dvh overflow-hidden bg-[oklch(0.975_0.012_155)] text-foreground">
      {/* Faint blueprint wireframe behind the card */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.5]"
        style={{
          backgroundImage:
            "linear-gradient(to right, color-mix(in oklab, var(--primary) 9%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklab, var(--primary) 9%, transparent) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage: "radial-gradient(120% 70% at 50% 100%, #000 20%, transparent 75%)",
        }}
      />

      <WaveHero />

      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 pb-12 pt-8 sm:max-w-lg">
        {/* Brand */}
        <Link to="/" className="inline-flex w-fit flex-col gap-2" aria-label="Aawaash home">
          <svg viewBox="0 0 64 56" className="h-12 w-14 text-primary" fill="none" aria-hidden="true">
            <g stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round">
              <path d="M6 52V18l12-8 12 8v34" />
              <path d="M30 52V26l12-7v33" />
              <path d="M13 26h5M13 34h5M13 42h5M35 32h4M35 40h4" />
            </g>
            <path
              d="M52 14c-8 2-12 8-11 16 8 1 13-4 13-12 0-2 0-3-2-4Z"
              fill="currentColor"
              opacity="0.85"
            />
            <path d="M53 15c-6 5-8 9-9 15" stroke="oklch(0.99 0 0)" strokeWidth="1.4" />
          </svg>
          <span className="text-[11px] font-extrabold uppercase leading-tight tracking-[0.22em] text-primary">
            Nature Friendly
            <br />
            Constructions
          </span>
        </Link>

        {/* Leaf medallion */}
        <div className="mt-10 grid h-24 w-24 place-items-center rounded-full border border-dashed border-primary/30">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-[oklch(0.95_0.05_155)] shadow-[0_10px_30px_-12px_color-mix(in_oklab,var(--primary)_60%,transparent)] ring-4 ring-white/70">
            <Leaf size={22} className="text-primary" />
          </div>
        </div>

        {/* Welcome */}
        <h1 className="mt-8 text-[clamp(2.6rem,11vw,3.6rem)] font-extrabold leading-[0.98] tracking-tight text-[oklch(0.28_0.03_240)]">
          Welcome
          <br />
          <span className="text-primary">Back</span>
          <Leaf size={30} className="ml-2 inline-block -translate-y-2 fill-primary/25 text-primary" />
        </h1>
        <p className="mt-4 max-w-[20rem] text-lg leading-snug text-muted-foreground">
          Let&rsquo;s continue building
          <br />a <span className="font-semibold text-primary">better</span> tomorrow
        </p>

        {/* Card */}
        <div className="mt-10">
          {needsBootstrap ? <BootstrapForm onDone={() => setNeedsBootstrap(false)} /> : <LoginForm />}
        </div>
      </div>

      <style>{`
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
/*  Glass card shell                                                   */
/* ------------------------------------------------------------------ */

function GlassCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="auth-card-in relative rounded-[34px] border border-white/70 bg-white/55 p-6 shadow-[0_30px_60px_-30px_color-mix(in_oklab,var(--primary)_45%,transparent)] backdrop-blur-2xl sm:p-8">
      <div className="pointer-events-none absolute right-10 top-4 h-1 w-16 rounded-full bg-primary/60" />
      <div className="flex flex-col items-center">
        <div className="grid h-14 w-14 place-items-center rounded-full bg-white/90 shadow-[0_8px_24px_-12px_color-mix(in_oklab,var(--primary)_60%,transparent)]">
          <UserRound size={22} className="text-primary" />
        </div>
        <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-[oklch(0.28_0.03_240)]">{title}</h2>
        <span className="mt-2 h-[3px] w-10 rounded-full bg-primary" />
      </div>
      <div className="mt-6">{children}</div>
    </div>
  );
}

function Field({
  icon,
  hint,
  children,
}: {
  icon: React.ReactNode;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="flex items-center gap-3 rounded-[22px] border border-primary/25 bg-white/70 px-4 py-4 shadow-[inset_0_1px_0_oklch(1_0_0/0.6)] transition-all duration-300 focus-within:border-primary/60 focus-within:bg-white focus-within:shadow-[0_0_0_5px_color-mix(in_oklab,var(--primary)_12%,transparent)]">
        <span className="shrink-0 text-primary">{icon}</span>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
      {hint && <p className="mt-1.5 px-1 text-[11px] text-muted-foreground">{hint}</p>}
    </label>
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
        navigate({ to: toInternalPath(search.redirect) ?? homePathForRole(role), replace: true });
      }, 600);
    } catch {
      setError("Invalid login credentials.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <GlassCard title="Sign In">
      <form onSubmit={onSubmit} className={`space-y-4 ${error ? "shake-x" : ""}`} key={error ?? "ok"}>
        <Field
          icon={<User size={18} />}
          hint="Team Leader: mobile (9876543210). Member: TeamLetter+mobile (A9876543210)."
        >
          <input
            autoFocus
            autoComplete="username"
            inputMode="text"
            spellCheck={false}
            value={loginId}
            onChange={(e) => setLoginId(e.target.value.toUpperCase())}
            placeholder="Login ID"
            aria-label="Login ID"
            className="w-full bg-transparent text-base font-medium tracking-wide text-foreground outline-none placeholder:text-muted-foreground/70"
          />
        </Field>

        <Field icon={<Lock size={18} />}>
          <div className="flex w-full items-center gap-2">
            <input
              autoComplete="current-password"
              type={showPwd ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              aria-label="Password"
              className="w-full bg-transparent text-base font-medium tracking-wide text-foreground outline-none placeholder:text-muted-foreground/70"
            />
            <button
              type="button"
              onClick={() => setShowPwd((v) => !v)}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
              aria-label={showPwd ? "Hide password" : "Show password"}
            >
              {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
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
          className="group relative flex h-16 w-full items-center justify-center rounded-[26px] bg-[linear-gradient(140deg,oklch(0.32_0.07_155),oklch(0.24_0.06_155))] px-6 text-base font-bold text-primary-foreground shadow-[0_18px_36px_-18px_oklch(0.3_0.08_155)] transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-80"
        >
          <span className="pointer-events-none absolute inset-x-6 top-2 h-px bg-white/25" />
          {success ? (
            <span className="success-pop inline-flex items-center gap-2">
              <CheckCircle2 size={18} /> Signed in
            </span>
          ) : submitting ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 size={18} className="animate-spin" /> Signing in
            </span>
          ) : (
            <>
              <span>Sign In</span>
              <span className="absolute right-3 grid h-11 w-11 place-items-center rounded-full border border-white/35 transition-transform duration-300 group-hover:translate-x-0.5">
                <ArrowRight size={18} />
              </span>
            </>
          )}
        </button>

        <Link
          to="/"
          className="mx-auto block pt-1 text-center text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
        >
          ← Back to home
        </Link>
      </form>
    </GlassCard>
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
    <GlassCard title="Create Super Admin">
      <p className="-mt-2 mb-5 text-center text-sm text-muted-foreground">
        No admin exists yet. This screen locks permanently after setup.
      </p>
      <form onSubmit={onSubmit} className="space-y-4">
        <Field icon={<User size={18} />}>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Full name"
            aria-label="Full name"
            className="w-full bg-transparent text-base font-medium text-foreground outline-none placeholder:text-muted-foreground/70"
          />
        </Field>

        <Field icon={<User size={18} />} hint="10 digits. Becomes your Login ID.">
          <input
            value={mobile}
            onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
            inputMode="numeric"
            placeholder="Mobile number"
            aria-label="Mobile number"
            className="w-full bg-transparent text-base font-medium tracking-wide text-foreground outline-none placeholder:text-muted-foreground/70"
          />
        </Field>

        <Field icon={<Lock size={18} />} hint="Minimum 8 characters.">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Choose a strong password"
            aria-label="Password"
            className="w-full bg-transparent text-base font-medium text-foreground outline-none placeholder:text-muted-foreground/70"
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
          className="relative flex h-16 w-full items-center justify-center rounded-[26px] bg-[linear-gradient(140deg,oklch(0.32_0.07_155),oklch(0.24_0.06_155))] px-6 text-base font-bold text-primary-foreground shadow-[0_18px_36px_-18px_oklch(0.3_0.08_155)] transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-70"
        >
          {submitting ? <Loader2 size={18} className="animate-spin" /> : "Create Super Admin"}
        </button>
      </form>
    </GlassCard>
  );
}
