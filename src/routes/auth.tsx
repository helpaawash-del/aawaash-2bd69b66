import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Leaf,
  Loader2,
  Lock,
  User,
  Fingerprint,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { loginIdToEmail, validateLoginId, homePathForRole, toInternalPath, type AppRole } from "@/lib/auth";
import { bootstrapSuperAdmin, superAdminExists, touchLastLogin } from "@/lib/auth.functions";
import { getRememberPreference, setRememberPreference } from "@/lib/session-persistence";
import heroImage from "@/assets/auth-hero-tower.jpg";
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

const SURFACE = "oklch(0.975 0.012 155)";

/* ------------------------------------------------------------------ */
/*  Hero — photo panel with curved bottom wave                         */
/* ------------------------------------------------------------------ */

function EcoHero() {
  return (
    <header className="relative h-[clamp(230px,38vh,420px)] w-full shrink-0">
      <svg className="absolute h-0 w-0" aria-hidden="true">
        <defs>
          <clipPath id="authHeroWave" clipPathUnits="objectBoundingBox">
            <path d="M0,0 L1,0 L1,0.82 C0.78,0.99 0.62,0.86 0.42,0.93 C0.24,0.99 0.13,1 0,0.9 Z" />
          </clipPath>
        </defs>
      </svg>

      {/* photo */}
      <div className="absolute inset-0" style={{ clipPath: "url(#authHeroWave)" }}>
        <img
          src={heroImage}
          alt="Eco-luxury residential tower with trees growing on every balcony"
          width={1024}
          height={1536}
          className="h-full w-full object-cover object-[62%_30%]"
          draggable={false}
        />
        {/* light wash so the headline stays readable on the left */}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(100deg, oklch(0.985 0.01 155 / 0.97) 0%, oklch(0.985 0.01 155 / 0.86) 30%, oklch(0.985 0.01 155 / 0.22) 58%, transparent 78%)",
          }}
        />
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[oklch(0.985_0.01_155)/0.55] to-transparent" />
      </div>

      {/* top row: logo + sustainable pill */}
      <div className="absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6 sm:pt-5">
        <Link
          to="/"
          aria-label="Aawaash home"
          className="grid h-[58px] w-[58px] place-items-center rounded-[20px] bg-white/90 shadow-[0_16px_34px_-20px_color-mix(in_oklab,var(--primary)_80%,transparent)] ring-1 ring-primary/10 backdrop-blur-xl transition-transform duration-300 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:h-[66px] sm:w-[66px]"
        >
          <img src={logoAsset.url} alt="Aawaash" className="h-9 w-auto object-contain sm:h-11" draggable={false} />
        </Link>

        <span className="inline-flex items-center gap-2 rounded-full bg-white/90 px-3.5 py-2 text-[13px] font-semibold text-[oklch(0.26_0.03_160)] shadow-[0_14px_30px_-20px_color-mix(in_oklab,var(--primary)_80%,transparent)] ring-1 ring-primary/10 backdrop-blur-xl sm:text-sm">
          <Leaf size={16} className="text-primary" aria-hidden="true" />
          Sustainable
        </span>
      </div>

      {/* headline */}
      <div className="absolute inset-x-0 top-[92px] z-10 px-4 sm:top-[116px] sm:px-6">
        <h1
          className="text-[clamp(1.6rem,7.4vw,2.6rem)] font-extrabold leading-[1.06] tracking-[-0.03em] text-[oklch(0.24_0.03_160)]"
          style={{ fontFamily: '"Fraunces", "Plus Jakarta Sans", serif', fontOpticalSizing: "auto" }}
        >
          Building
          <br />
          a Better
          <br />
          <span className="relative text-primary">
            Tomorrow
            <Leaf
              aria-hidden="true"
              size={20}
              className="ml-1 inline-block -translate-y-1 rotate-[24deg] text-primary/80"
            />
          </span>
        </h1>
        <p className="mt-2 max-w-[16rem] text-[12.5px] leading-snug text-muted-foreground sm:max-w-xs sm:text-sm">
          Green construction for a stronger, smarter future.
        </p>
      </div>

      {/* fingerprint medallion sitting on the wave */}
      <span
        aria-hidden="true"
        className="absolute bottom-[-26px] left-1/2 z-20 grid h-[62px] w-[62px] -translate-x-1/2 place-items-center rounded-[22px] bg-[linear-gradient(155deg,oklch(0.36_0.085_155),oklch(0.2_0.05_155))] text-white shadow-[0_22px_44px_-20px_oklch(0.3_0.08_155)] ring-[6px] ring-[oklch(0.975_0.012_155)]"
        style={{ clipPath: "polygon(50% 0%, 95% 25%, 95% 75%, 50% 100%, 5% 75%, 5% 25%)" }}
      >
        <Fingerprint size={26} />
      </span>
    </header>
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
      <div className="relative grid min-h-dvh place-items-center" style={{ background: SURFACE }}>
        <div className="relative">
          <div className="absolute inset-0 -m-6 rounded-full bg-primary/10 blur-2xl" />
          <Loader2 className="relative h-9 w-9 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden text-foreground" style={{ background: SURFACE }}>
      {/* faint skyline blueprint at the base */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[46vh] opacity-[0.5]"
        style={{
          backgroundImage:
            "linear-gradient(to right, color-mix(in oklab, var(--primary) 8%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklab, var(--primary) 8%, transparent) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(120% 80% at 50% 100%, #000 15%, transparent 78%)",
        }}
      />

      <EcoHero />

      <main className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-[42px] sm:max-w-lg sm:px-7 sm:pt-12">
        {needsBootstrap ? <BootstrapForm onDone={() => setNeedsBootstrap(false)} /> : <LoginForm />}

        {/* trust strip */}
        <div className="mt-auto pt-4">
          <div className="mx-auto flex max-w-sm items-center gap-3 rounded-[22px] bg-white/80 px-4 py-3 shadow-[0_20px_44px_-34px_color-mix(in_oklab,var(--primary)_80%,transparent)] ring-1 ring-primary/10 backdrop-blur-xl">
            <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] bg-primary/10 text-primary">
              <ShieldCheck size={19} />
            </span>
            <p className="min-w-0 text-[12.5px] leading-snug text-muted-foreground">
              <span className="block font-semibold text-[oklch(0.26_0.03_160)]">Your data is safe with us.</span>
              Secure. Trusted. Green.
            </p>
          </div>
          <Link
            to="/"
            className="mx-auto mt-2.5 block rounded-md text-center text-xs font-medium text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            ← Back to home
          </Link>
        </div>
      </main>

      <style>{`
        @keyframes cardIn {
          0% { opacity: 0; transform: translateY(18px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .auth-card-in { animation: cardIn 0.7s cubic-bezier(.2,.8,.2,1) both; }
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
/*  Shared pieces                                                      */
/* ------------------------------------------------------------------ */

function SectionHead({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="auth-card-in text-center">
      <h2
        className="text-[clamp(1.45rem,6vw,1.95rem)] font-bold leading-tight tracking-[-0.025em] text-[oklch(0.24_0.03_160)]"
        style={{ fontFamily: '"Fraunces", "Plus Jakarta Sans", serif', fontOpticalSizing: "auto" }}
      >
        {title}
      </h2>
      <span aria-hidden="true" className="mx-auto mt-2 flex items-center justify-center gap-1.5">
        <i className="block h-[3px] w-10 rounded-full bg-primary" />
        <i className="block h-[3px] w-[3px] rounded-full bg-primary/60" />
      </span>
      <p className="mt-2 text-[13px] text-muted-foreground sm:text-sm">{subtitle}</p>
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
      <div className="group/field flex items-center gap-3 rounded-[20px] bg-white px-2.5 py-2.5 shadow-[0_18px_38px_-32px_color-mix(in_oklab,var(--primary)_85%,transparent)] ring-1 ring-inset ring-primary/10 transition-all duration-300 focus-within:ring-2 focus-within:ring-primary/45">
        <span
          aria-hidden="true"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-[15px] bg-primary/[0.08] text-primary transition-colors duration-300 group-focus-within/field:bg-[linear-gradient(150deg,oklch(0.36_0.085_155),oklch(0.22_0.05_155))] group-focus-within/field:text-primary-foreground"
        >
          {icon}
        </span>
        <div className="min-w-0 flex-1 pr-1">{children}</div>
      </div>
      {hint && <p className="mt-1 px-2 text-[11px] text-muted-foreground">{hint}</p>}
    </label>
  );
}

const inputClass =
  "w-full bg-transparent text-[15px] font-medium text-foreground outline-none placeholder:font-normal placeholder:text-muted-foreground/70";

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
  const [remember, setRemember] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setRemember(getRememberPreference());
  }, []);

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
      setRememberPreference(remember);
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
    <section aria-label="Sign in">
      <SectionHead title="Welcome To Aawaash" subtitle="Sign in to continue to your account" />

      <form
        onSubmit={onSubmit}
        className={`auth-card-in mt-5 space-y-3 ${error ? "shake-x" : ""}`}
        key={error ?? "ok"}
      >
        <Field icon={<User size={19} aria-hidden="true" />}>
          <input
            id="auth-login-id"
            name="loginId"
            autoComplete="username"
            spellCheck={false}
            value={loginId}
            onChange={(e) => setLoginId(e.target.value.toUpperCase())}
            placeholder="User ID"
            aria-label="User ID"
            className={inputClass}
          />
        </Field>

        <Field icon={<Lock size={19} aria-hidden="true" />}>
          <div className="flex w-full items-center gap-2">
            <input
              id="auth-password"
              name="password"
              autoComplete="current-password"
              type={showPwd ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              aria-label="Password"
              className={inputClass}
            />
            <button
              type="button"
              onClick={() => setShowPwd((v) => !v)}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label={showPwd ? "Hide password" : "Show password"}
              aria-pressed={showPwd}
            >
              {showPwd ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
            </button>
          </div>
        </Field>

        {/* remember + forgot */}
        <div className="flex items-center justify-between gap-3 px-1 pt-0.5">
          <button
            type="button"
            role="checkbox"
            aria-checked={remember}
            onClick={() => setRemember((v) => !v)}
            className="inline-flex items-center gap-2.5 rounded-lg py-1 text-[13px] font-medium text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <span
              aria-hidden="true"
              className={`grid h-[22px] w-[22px] place-items-center rounded-[7px] transition-all duration-300 ${
                remember
                  ? "bg-[linear-gradient(150deg,oklch(0.36_0.085_155),oklch(0.22_0.05_155))] text-white shadow-[0_8px_18px_-10px_oklch(0.3_0.08_155)]"
                  : "bg-white ring-1 ring-inset ring-primary/25"
              }`}
            >
              {remember && <Check size={14} strokeWidth={3} />}
            </span>
            Remember me
          </button>

          <button
            type="button"
            onClick={() => setShowHelp((v) => !v)}
            aria-expanded={showHelp}
            aria-controls="auth-forgot-help"
            className="rounded-md text-[13px] font-semibold text-primary underline-offset-4 transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Forgot Password?
          </button>
        </div>

        <div id="auth-forgot-help" aria-live="polite" className="empty:hidden">
          {showHelp && (
            <div className="flex items-start gap-2 rounded-2xl border border-primary/20 bg-primary/5 px-3.5 py-2.5 text-[12.5px] leading-snug text-foreground/80">
              <KeyRound size={15} aria-hidden="true" className="mt-0.5 shrink-0 text-primary" />
              <span>
                Passwords are reset by your administrator. Ask your team leader, or contact Aawaash support at{" "}
                <a href="tel:+919876543210" className="font-semibold text-primary underline-offset-4 hover:underline">
                  +91 98765 43210
                </a>
                .
              </span>
            </div>
          )}
        </div>

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
          className="group relative mt-1 flex h-[58px] w-full items-center justify-center overflow-hidden rounded-[22px] bg-[linear-gradient(140deg,oklch(0.38_0.09_155),oklch(0.21_0.05_155))] px-5 text-[16px] font-semibold text-primary-foreground shadow-[0_26px_50px_-24px_oklch(0.3_0.08_155),inset_0_1px_0_oklch(1_0_0/0.18)] transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -left-1/3 top-0 h-full w-1/3 skew-x-[-18deg] bg-white/15 transition-transform duration-700 group-hover:translate-x-[420%]"
          />
          {success ? (
            <span className="success-pop inline-flex items-center gap-2">
              <CheckCircle2 size={19} aria-hidden="true" /> Signed in
            </span>
          ) : submitting ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 size={19} aria-hidden="true" className="animate-spin" /> Signing in
            </span>
          ) : (
            <>
              <span>Sign In</span>
              <span
                aria-hidden="true"
                className="absolute right-2.5 grid h-11 w-11 place-items-center rounded-full bg-white text-primary transition-transform duration-300 group-hover:translate-x-0.5"
              >
                <ArrowRight size={18} />
              </span>
            </>
          )}
        </button>
      </form>
    </section>
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
    <section aria-label="Create super admin">
      <SectionHead title="Create Super Admin" subtitle="No admin exists yet — this screen locks after setup." />

      <form onSubmit={onSubmit} className="auth-card-in mt-5 space-y-3">
        <Field icon={<User size={19} aria-hidden="true" />}>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Full name"
            aria-label="Full name"
            className={inputClass}
          />
        </Field>

        <Field icon={<User size={19} aria-hidden="true" />} hint="10 digits. Becomes your Login ID.">
          <input
            value={mobile}
            onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
            inputMode="numeric"
            placeholder="Mobile number"
            aria-label="Mobile number"
            className={inputClass}
          />
        </Field>

        <Field icon={<Lock size={19} aria-hidden="true" />} hint="Minimum 8 characters.">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Choose a strong password"
            aria-label="Password"
            className={inputClass}
          />
        </Field>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
          >
            <AlertCircle size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="relative mt-1 flex h-[58px] w-full items-center justify-center rounded-[22px] bg-[linear-gradient(140deg,oklch(0.38_0.09_155),oklch(0.21_0.05_155))] px-6 text-[16px] font-semibold text-primary-foreground shadow-[0_26px_50px_-24px_oklch(0.3_0.08_155)] transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          {submitting ? <Loader2 size={19} className="animate-spin" aria-hidden="true" /> : "Create Super Admin"}
        </button>
      </form>
    </section>
  );
}
