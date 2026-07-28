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
    <div className="pointer-events-none absolute inset-x-0 top-0 h-[44vh] min-h-[300px] sm:h-[52vh] md:h-[58vh]">
      <svg className="absolute h-0 w-0" aria-hidden="true">
        <defs>
          <clipPath id="authWave" clipPathUnits="objectBoundingBox">
            <path d="M1,0 L1,1 L0.55,1 C0.42,0.97 0.34,0.86 0.32,0.7 C0.3,0.5 0.34,0.34 0.26,0.2 C0.19,0.08 0.09,0.04 0.02,0.02 C-0.01,0.01 0,0 0.05,0 Z" />
          </clipPath>
        </defs>
      </svg>

      {/* soft outer glow following the curve */}
      <div
        className="absolute inset-y-0 right-0 w-[92%] scale-[1.03] bg-primary/25 blur-[14px] sm:w-[82%]"
        style={{ clipPath: "url(#authWave)" }}
      />
      <div
        className="absolute inset-y-0 right-0 w-[92%] overflow-hidden sm:w-[82%]"
        style={{ clipPath: "url(#authWave)" }}
      >
        <img
          src={heroImage}
          alt="Eco-luxury residential tower with trees growing on every balcony"
          width={1024}
          height={1536}
          className="h-full w-full object-cover object-[58%_35%]"
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

      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:max-w-lg sm:px-6 sm:pt-5">
        {/* Welcome block — logo sits directly above the title */}
        <div className="mt-[clamp(8rem,26vh,16rem)]">
          <Link
            to="/"
            aria-label="Aawaash home"
            className="inline-flex rounded-2xl transition-transform duration-300 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[oklch(0.975_0.012_155)]"
          >
            <img
              src={logoAsset.url}
              alt="Aawaash"
              className="h-[clamp(4rem,13vw,6rem)] w-auto object-contain drop-shadow-[0_10px_24px_color-mix(in_oklab,var(--primary)_35%,transparent)]"
              draggable={false}
            />
          </Link>

          <h1
            className="mt-2 text-[clamp(1.55rem,5.8vw,2.15rem)] font-semibold leading-[1.05] tracking-[-0.025em] text-[oklch(0.26_0.03_160)]"
            style={{ fontFamily: '"Fraunces", "Plus Jakarta Sans", serif', fontOpticalSizing: "auto" }}
          >
            Welcome To
            <br />
            <span className="text-primary">Aawaash</span>
          </h1>
          <p className="mt-1.5 max-w-[19rem] text-[12.5px] leading-snug text-muted-foreground sm:text-sm">
            Let&rsquo;s continue building a <span className="font-semibold text-primary">better</span> tomorrow
          </p>
        </div>

        {/* Card */}
        <div className="mb-auto mt-4 sm:mt-6">

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
    <section
      aria-label={title}
      className="auth-card-in relative overflow-hidden rounded-[26px] border border-white/70 bg-white/55 p-4 shadow-[0_34px_80px_-40px_color-mix(in_oklab,var(--primary)_60%,transparent)] backdrop-blur-2xl sm:rounded-[30px] sm:p-6"
    >
      {/* futuristic sheen, hairlines + corner ticks */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent" />
      <div className="pointer-events-none absolute inset-x-8 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/25 to-transparent" />
      <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-primary/12 blur-3xl" />
      <div className="pointer-events-none absolute left-3 top-3 h-4 w-4 rounded-tl-md border-l border-t border-primary/35" />
      <div className="pointer-events-none absolute bottom-3 right-3 h-4 w-4 rounded-br-md border-b border-r border-primary/35" />

      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] border border-white/80 bg-gradient-to-br from-white to-white/60 text-primary shadow-[0_10px_24px_-14px_color-mix(in_oklab,var(--primary)_70%,transparent)]">
          <ShieldCheck size={18} aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h2
            className="truncate text-[18px] font-semibold tracking-[-0.015em] text-[oklch(0.26_0.03_160)] sm:text-[20px]"
            style={{ fontFamily: '"Fraunces", "Plus Jakarta Sans", serif', fontOpticalSizing: "auto" }}
          >
            {title}
          </h2>
          <span className="mt-1 block h-[2px] w-10 rounded-full bg-gradient-to-r from-primary to-primary/10" />
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </section>
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
      <div className="group/field relative flex items-center gap-3 overflow-hidden rounded-[16px] border border-primary/20 bg-white/70 px-3 py-2.5 shadow-[inset_0_1px_0_oklch(1_0_0/0.75)] transition-all duration-300 focus-within:border-primary/60 focus-within:bg-white focus-within:shadow-[0_0_0_4px_color-mix(in_oklab,var(--primary)_12%,transparent)]">
        <span className="pointer-events-none absolute inset-x-0 bottom-0 h-px origin-left scale-x-0 bg-gradient-to-r from-primary/70 to-transparent transition-transform duration-500 group-focus-within/field:scale-x-100" />
        <span
          aria-hidden="true"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-[12px] bg-primary/10 text-primary transition-all duration-300 group-focus-within/field:bg-gradient-to-br group-focus-within/field:from-primary group-focus-within/field:to-[oklch(0.28_0.06_155)] group-focus-within/field:text-primary-foreground"
        >
          {icon}
        </span>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
      {hint && <p className="mt-1 px-1 text-[11px] text-muted-foreground">{hint}</p>}
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
    <GlassCard title="Step Into Aawash">
      <form onSubmit={onSubmit} className={`space-y-3 ${error ? "shake-x" : ""}`} key={error ?? "ok"}>
        <Field icon={<User size={17} aria-hidden="true" />}>
          <input
            autoComplete="username"
            inputMode="text"
            spellCheck={false}
            value={loginId}
            onChange={(e) => setLoginId(e.target.value.toUpperCase())}
            placeholder="LOGIN ID"
            aria-label="Login ID"
            className="w-full bg-transparent text-[15px] font-medium tracking-[0.02em] text-foreground outline-none placeholder:font-normal placeholder:tracking-[0.16em] placeholder:text-muted-foreground/70"
          />
        </Field>

        <Field icon={<Lock size={17} aria-hidden="true" />}>
          <div className="flex w-full items-center gap-2">
            <input
              autoComplete="current-password"
              type={showPwd ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="PASSWORD"
              aria-label="Password"
              className="w-full bg-transparent text-[15px] font-medium tracking-[0.02em] text-foreground outline-none placeholder:font-normal placeholder:tracking-[0.16em] placeholder:text-muted-foreground/70"
            />
            <button
              type="button"
              onClick={() => setShowPwd((v) => !v)}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label={showPwd ? "Hide password" : "Show password"}
              aria-pressed={showPwd}
            >
              {showPwd ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
            </button>
          </div>
        </Field>

        <div aria-live="polite" className="empty:hidden">
          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-[13px] font-medium text-destructive"
            >
              <AlertCircle size={15} aria-hidden="true" className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={submitting || success}
          className="group relative flex h-[52px] w-full items-center justify-center overflow-hidden rounded-[18px] bg-[linear-gradient(140deg,oklch(0.36_0.085_155),oklch(0.21_0.05_155))] px-5 text-[14px] font-semibold uppercase tracking-[0.14em] text-primary-foreground shadow-[0_22px_44px_-22px_oklch(0.3_0.08_155),inset_0_1px_0_oklch(1_0_0/0.2)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_26px_54px_-22px_oklch(0.3_0.08_155)] active:translate-y-0 disabled:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-white"
        >
          <span aria-hidden="true" className="pointer-events-none absolute inset-x-6 top-1.5 h-px bg-white/25" />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -left-1/3 top-0 h-full w-1/3 skew-x-[-18deg] bg-white/15 transition-transform duration-700 group-hover:translate-x-[420%]"
          />
          {success ? (
            <span className="success-pop inline-flex items-center gap-2">
              <CheckCircle2 size={18} aria-hidden="true" /> Signed in
            </span>
          ) : submitting ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 size={18} aria-hidden="true" className="animate-spin" /> Signing in
            </span>
          ) : (
            <>
              <span>Sign In</span>
              <span
                aria-hidden="true"
                className="absolute right-2 grid h-9 w-9 place-items-center rounded-[14px] border border-white/30 bg-white/10 transition-transform duration-300 group-hover:translate-x-0.5"
              >
                <ArrowRight size={16} />
              </span>
            </>
          )}
        </button>


        <Link
          to="/"
          className="mx-auto block rounded-md pt-0.5 text-center text-xs font-medium text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
