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
  KeyRound,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { loginIdToEmail, validateLoginId, homePathForRole, toInternalPath, type AppRole } from "@/lib/auth";
import { bootstrapSuperAdmin, superAdminExists, touchLastLogin } from "@/lib/auth.functions";
import { getRememberPreference, setRememberPreference } from "@/lib/session-persistence";
import heroImage from "@/assets/auth-hero-tower-v2.png";
import logoAsset from "@/assets/aawaash-logo.png.asset.json";
import societyWire from "@/assets/auth-society-wire.png";

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
/*  Hero — compact brand lockup: logo ─── connector ─── framed photo    */
/* ------------------------------------------------------------------ */

function EcoHero() {
  return (
    <header className="relative z-10 shrink-0 px-5 pt-[max(1rem,env(safe-area-inset-top))] sm:px-8">
      <div className="mx-auto w-full max-w-md sm:max-w-lg">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
          {/* logo + futuristic connector */}
          <div className="flex min-w-0 flex-col">
            <Link
              to="/"
              aria-label="Aawaash home"
              className="inline-flex w-fit rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <img
                src={logoAsset.url}
                alt="Aawaash"
                width={512}
                height={512}
                draggable={false}
                className="h-[clamp(58px,15vw,84px)] w-auto object-contain drop-shadow-[0_14px_26px_color-mix(in_oklab,var(--primary)_26%,transparent)]"
              />
            </Link>

            {/* connector: node → dashed trace → photo */}
            <svg
              aria-hidden="true"
              viewBox="0 0 200 56"
              preserveAspectRatio="none"
              className="mt-2 h-[clamp(34px,7vh,56px)] w-full text-primary"
            >
              <circle cx="16" cy="14" r="11" fill="none" stroke="currentColor" strokeOpacity="0.28" />
              <circle cx="16" cy="14" r="4" fill="currentColor" fillOpacity="0.55" />
              <path
                d="M27 14 H96 Q112 14 112 30 H186"
                fill="none"
                stroke="currentColor"
                strokeOpacity="0.4"
                strokeWidth="1.4"
                strokeDasharray="7 6"
                className="auth-trace"
              />
              <circle cx="188" cy="30" r="3.4" fill="currentColor" fillOpacity="0.7" />
            </svg>
          </div>

          {/* enlarged framed photo — stretches up toward the logo and down toward mid-screen */}
          <div className="relative -mt-[clamp(10px,3vw,26px)] w-[clamp(190px,54vw,320px)] shrink-0">
            <span
              aria-hidden="true"
              className="absolute -inset-4 rounded-[42px] opacity-70 blur-2xl"
              style={{
                background:
                  "radial-gradient(circle, color-mix(in oklab, var(--primary) 22%, transparent), transparent 70%)",
              }}
            />
            <div className="relative overflow-hidden rounded-[10px_38px_52px_38px] bg-white/60 p-1 shadow-[0_34px_70px_-34px_color-mix(in_oklab,var(--primary)_85%,transparent)] ring-1 ring-white/70 backdrop-blur">
              <img
                src={heroImage}
                alt="Green residential tower with trees growing on every balcony"
                width={1024}
                height={1536}
                decoding="async"
                fetchPriority="high"
                draggable={false}
                className="aspect-[3/4.5] w-full rounded-[8px_34px_48px_34px] object-cover object-[62%_28%]"
              />
            </div>
          </div>
        </div>

        {/* headline */}
        <div className="mt-3 sm:mt-4">
          <span className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-primary/80">
            <i aria-hidden="true" className="block h-px w-6 bg-primary/50" />
            Est. Aawaash
          </span>
          <h1
            className="mt-2 text-[clamp(1.7rem,7.6vw,2.6rem)] font-semibold leading-[1.05] tracking-[-0.035em] text-[oklch(0.2_0.03_160)]"
            style={{ fontFamily: '"Fraunces", "Plus Jakarta Sans", serif', fontOpticalSizing: "auto" }}
          >
            Welcome to{" "}
            <span className="bg-[linear-gradient(96deg,oklch(0.42_0.1_158),oklch(0.34_0.09_172))] bg-clip-text italic text-transparent">
              Aawaash
            </span>
          </h1>
          <p className="mt-1.5 max-w-xs text-[12.5px] leading-relaxed text-muted-foreground">
            Green construction for a stronger, smarter future.
          </p>
        </div>
      </div>
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
      {/* ambient aurora */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 top-1/3 h-[52vh] w-[52vh] rounded-full opacity-70 blur-[90px]"
        style={{ background: "radial-gradient(circle, color-mix(in oklab, var(--primary) 22%, transparent), transparent 70%)" }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-28 bottom-[-10vh] h-[48vh] w-[48vh] rounded-full opacity-60 blur-[100px]"
        style={{ background: "radial-gradient(circle, oklch(0.86 0.09 175 / 0.55), transparent 70%)" }}
      />
      {/* under-construction society skyline — full-bleed, starts 10% below mid-screen */}
      <img
        src={societyWire}
        alt=""
        aria-hidden="true"
        draggable={false}
        loading="lazy"
        width={1920}
        height={640}
        className="pointer-events-none absolute inset-x-0 bottom-0 top-[60%] z-0 w-full select-none object-cover object-bottom opacity-[0.14]"
        style={{ maskImage: "linear-gradient(to top, #000 55%, transparent 98%)" }}
      />
      {/* faint blueprint grid at the base */}
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

      <main className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-[clamp(14px,3vh,34px)] sm:max-w-lg sm:px-7">
        {/* floating glass sheet — taller, sharper edges, stronger glass */}
        <div className="auth-sheet relative flex min-h-[clamp(430px,58vh,560px)] flex-col justify-center overflow-hidden rounded-[20px] border border-white/60 bg-white/55 p-[clamp(1.1rem,4vw,1.75rem)] shadow-[0_44px_100px_-50px_color-mix(in_oklab,var(--primary)_90%,transparent)] ring-1 ring-primary/10 backdrop-blur-[26px] backdrop-saturate-150">


          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-8 -top-px h-px bg-gradient-to-r from-transparent via-primary/45 to-transparent"
          />
          {/* HUD corner ticks */}
          <span aria-hidden="true" className="pointer-events-none absolute left-3 top-3 h-4 w-4 rounded-tl-lg border-l border-t border-primary/25" />
          <span aria-hidden="true" className="pointer-events-none absolute right-3 top-3 h-4 w-4 rounded-tr-lg border-r border-t border-primary/25" />
          <span aria-hidden="true" className="pointer-events-none absolute bottom-3 left-3 h-4 w-4 rounded-bl-lg border-b border-l border-primary/25" />
          <span aria-hidden="true" className="pointer-events-none absolute bottom-3 right-3 h-4 w-4 rounded-br-lg border-b border-r border-primary/25" />
          {/* faint tech grid inside the sheet */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-[0.35]"
            style={{
              backgroundImage:
                "linear-gradient(to right, color-mix(in oklab, var(--primary) 7%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklab, var(--primary) 7%, transparent) 1px, transparent 1px)",
              backgroundSize: "34px 34px",
              maskImage: "radial-gradient(110% 90% at 50% 0%, #000 0%, transparent 72%)",
            }}
          />
          {needsBootstrap ? <BootstrapForm onDone={() => setNeedsBootstrap(false)} /> : <LoginForm />}
        </div>

        <div className="pt-4">
          <Link
            to="/"
            className="mx-auto block rounded-md text-center text-xs font-medium text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
        @keyframes sheetIn {
          0% { opacity: 0; transform: translateY(26px) scale(0.985); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        .auth-sheet { animation: sheetIn 0.8s cubic-bezier(.2,.8,.2,1) both; }
        @keyframes traceFlow { to { stroke-dashoffset: -26; } }
        .auth-trace { animation: traceFlow 1.8s linear infinite; }
        @media (prefers-reduced-motion: reduce) { .auth-trace { animation: none; } }
        @media (prefers-reduced-motion: reduce) {
          .auth-sheet, .auth-card-in { animation: none; }
        }

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

function SectionHead({
  eyebrow = "Aawaash",
  eyebrowLarge = false,
  title,
  subtitle,
}: {
  eyebrow?: string;
  eyebrowLarge?: boolean;
  title?: string;
  subtitle?: string;
}) {
  return (
    <div className="auth-card-in text-center">
      <span
        className={
          eyebrowLarge
            ? "mx-auto inline-flex items-center gap-2 rounded-lg bg-primary/[0.08] px-4 py-1.5 text-[clamp(1rem,4.4vw,1.35rem)] font-extrabold uppercase tracking-[0.26em] text-primary"
            : "mx-auto inline-flex items-center gap-1.5 rounded-full bg-primary/[0.08] px-3 py-1 text-[10.5px] font-semibold uppercase tracking-[0.22em] text-primary"
        }
      >
        <Leaf size={eyebrowLarge ? 18 : 12} aria-hidden="true" />
        {eyebrow}
      </span>
      {title && (
        <h2
          className="mt-2 text-[clamp(1.4rem,5.8vw,1.9rem)] font-bold leading-[1.12] tracking-[-0.03em] text-[oklch(0.22_0.03_160)]"
          style={{ fontFamily: '"Fraunces", "Plus Jakarta Sans", serif', fontOpticalSizing: "auto" }}
        >
          {title}
        </h2>
      )}
      {subtitle && <p className="mt-1.5 text-[12.5px] text-muted-foreground sm:text-sm">{subtitle}</p>}
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
      <div className="group/field relative flex items-center gap-3 overflow-hidden rounded-[18px] bg-white/85 px-2 py-1.5 ring-1 ring-inset ring-primary/12 transition-all duration-300 focus-within:bg-white focus-within:ring-primary/35 focus-within:shadow-[0_18px_40px_-30px_color-mix(in_oklab,var(--primary)_95%,transparent)]">
        <span
          aria-hidden="true"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-[13px] bg-primary/[0.07] text-primary transition-all duration-300 group-focus-within/field:scale-[1.04] group-focus-within/field:bg-[linear-gradient(150deg,oklch(0.36_0.085_155),oklch(0.22_0.05_155))] group-focus-within/field:text-primary-foreground"
        >
          {icon}
        </span>
        <div className="min-w-0 flex-1 pr-1">{children}</div>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-3 bottom-0 h-[2px] origin-left scale-x-0 rounded-full bg-[linear-gradient(90deg,var(--primary),transparent)] transition-transform duration-500 group-focus-within/field:scale-x-100"
        />
      </div>
      {hint && <p className="mt-1 px-2 text-[11px] text-muted-foreground">{hint}</p>}
    </label>
  );
}

const inputClass =
  "w-full bg-transparent text-[15px] font-medium tracking-[-0.01em] text-foreground outline-none placeholder:font-normal placeholder:tracking-[0.01em] placeholder:text-muted-foreground/60";


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
      <SectionHead title="Sign In" subtitle="Use your Aawaash Login ID to continue" />

      <form
        onSubmit={onSubmit}
        className={`auth-card-in mt-4 space-y-2.5 ${error ? "shake-x" : ""}`}
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
          className="group relative mt-1.5 flex h-[54px] w-full items-center justify-center overflow-hidden rounded-full bg-[linear-gradient(120deg,oklch(0.42_0.1_158),oklch(0.24_0.06_155)_55%,oklch(0.35_0.09_170))] px-5 text-[15.5px] font-semibold tracking-[0.01em] text-primary-foreground shadow-[0_24px_46px_-22px_oklch(0.3_0.08_155),inset_0_1px_0_oklch(1_0_0/0.22)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_30px_56px_-22px_oklch(0.3_0.08_155)] active:translate-y-0 active:scale-[0.99] disabled:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
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

      <form onSubmit={onSubmit} className="auth-card-in mt-4 space-y-2.5">
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
