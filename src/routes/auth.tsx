import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { useServerFn } from "@tanstack/react-start";
import { Eye, EyeOff, Loader2, Lock, ShieldCheck, User, Sparkles, Building2, KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { loginIdToEmail, validateLoginId, homePathForRole, type AppRole } from "@/lib/auth";
import { bootstrapSuperAdmin, superAdminExists, touchLastLogin } from "@/lib/auth.functions";
import { BrandMark } from "@/components/aawash/BrandMark";
import skylineArt from "@/assets/auth-skyline.jpg";

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
      <div className="relative grid min-h-screen place-items-center bg-[#0A0F1F]">
        <StarField />
        <Loader2 className="h-8 w-8 animate-spin text-[#D4AF37]" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0A0F1F] text-[#F5F7FA]">
      {/* Ambient gradient orbs */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full bg-[#D4AF37]/10 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-[560px] w-[560px] rounded-full bg-[#3B6FA0]/20 blur-[140px]" />
      <StarField />

      <div className="relative z-10 grid min-h-screen lg:grid-cols-[1.15fr_1fr]">
        {/* Left: hero visual */}
        <aside className="relative hidden overflow-hidden lg:block">
          <img
            src={skylineArt}
            alt="Aawash luxury skyline"
            className="absolute inset-0 h-full w-full object-cover opacity-90 animate-[skylineZoom_28s_ease-in-out_infinite_alternate]"
          />
          <div className="absolute inset-0 bg-gradient-to-tr from-[#0A0F1F] via-[#0A0F1F]/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0A0F1F]/70 via-transparent to-[#0A0F1F]/95" />

          {/* Content overlay */}
          <div className="relative flex h-full flex-col justify-between p-12 xl:p-16">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl border border-[#D4AF37]/40 bg-white/5 backdrop-blur-xl">
                <Building2 size={20} className="text-[#D4AF37]" />
              </div>
              <div>
                <div className="text-lg font-bold tracking-wide">Aawash</div>
                <div className="text-[11px] uppercase tracking-[0.24em] text-[#D4AF37]/80">Luxury Living</div>
              </div>
            </div>

            <div className="max-w-lg">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#D4AF37] backdrop-blur-md">
                <Sparkles size={12} /> Elevate Your World
              </div>
              <h2 className="mt-6 text-5xl font-extrabold leading-[1.05] tracking-tight text-white xl:text-6xl">
                Where skylines
                <br />
                <span className="bg-gradient-to-r from-[#D4AF37] via-[#F0D78C] to-[#D4AF37] bg-clip-text text-transparent">
                  become homes.
                </span>
              </h2>
              <p className="mt-5 max-w-md text-base leading-relaxed text-white/70">
                Sign in to the premium real estate ecosystem powering India's most
                iconic residences.
              </p>

              <div className="mt-8 grid grid-cols-3 gap-3">
                {[
                  { k: "Live", v: "Projects" },
                  { k: "Real-time", v: "Inventory" },
                  { k: "Instant", v: "Payouts" },
                ].map((it) => (
                  <div
                    key={it.v}
                    className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 backdrop-blur-md"
                  >
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-[#D4AF37]">
                      {it.k}
                    </div>
                    <div className="mt-0.5 text-sm font-bold text-white">{it.v}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-[11px] uppercase tracking-[0.25em] text-white/40">
              © {new Date().getFullYear()} Aawash · Secured by end-to-end encryption
            </div>
          </div>
        </aside>

        {/* Right: form panel */}
        <main className="relative flex min-h-screen flex-col justify-center px-5 py-10 sm:px-10">
          <header className="mb-8 flex items-center justify-between lg:hidden">
            <BrandMark size="md" />
            <Link
              to="/"
              className="text-xs font-medium text-white/60 transition-colors hover:text-white"
            >
              ← Home
            </Link>
          </header>

          <div className="mx-auto w-full max-w-md">
            {needsBootstrap ? <BootstrapForm onDone={() => setNeedsBootstrap(false)} /> : <LoginForm />}
          </div>

          <div className="mx-auto mt-8 hidden max-w-md text-center text-[11px] uppercase tracking-[0.25em] text-white/40 lg:block">
            Invite-only · Protected by end-to-end encryption
          </div>
        </main>
      </div>

      <style>{`
        @keyframes skylineZoom {
          0% { transform: scale(1) translateY(0); }
          100% { transform: scale(1.08) translateY(-1%); }
        }
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 1; }
        }
        @keyframes floatIn {
          0% { opacity: 0; transform: translateY(16px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .auth-float-in { animation: floatIn 0.7s cubic-bezier(.2,.8,.2,1) both; }
      `}</style>
    </div>
  );
}

function StarField() {
  // Deterministic tiny star field
  const stars = Array.from({ length: 60 }).map((_, i) => {
    const seed = (i * 9301 + 49297) % 233280;
    const x = (seed % 100);
    const y = ((seed * 7) % 100);
    const s = ((seed * 3) % 3) + 1;
    const d = ((seed * 5) % 4) + 2;
    return { x, y, s, d, i };
  });
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {stars.map((s) => (
        <span
          key={s.i}
          className="absolute rounded-full bg-white"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.s,
            height: s.s,
            opacity: 0.5,
            animation: `twinkle ${s.d}s ease-in-out ${s.i * 0.15}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

function LoginForm() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const touch = useServerFn(touchLastLogin);

  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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

      navigate({ to: search.redirect ?? homePathForRole(role), replace: true });
    } catch {
      setError("Invalid login credentials.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-float-in relative overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-b from-white/[0.07] to-white/[0.02] p-7 shadow-[0_30px_100px_-20px_rgba(0,0,0,0.7)] backdrop-blur-2xl sm:p-9">
      {/* Gold sheen */}
      <div className="pointer-events-none absolute -top-24 -right-24 h-56 w-56 rounded-full bg-[#D4AF37]/25 blur-3xl" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/60 to-transparent" />

      <div className="relative mb-7">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#D4AF37]">
          <ShieldCheck size={12} /> Secure Sign-In
        </div>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          Welcome back.
        </h1>
        <p className="mt-2 text-sm text-white/60">
          Enter your Aawash Login ID and password to continue.
        </p>
      </div>

      <form onSubmit={onSubmit} className="relative space-y-4">
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
            className="w-full bg-transparent text-base font-medium tracking-wide text-white outline-none placeholder:text-white/30"
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
              className="w-full bg-transparent text-base font-medium tracking-wide text-white outline-none placeholder:text-white/30"
            />
            <button
              type="button"
              onClick={() => setShowPwd((v) => !v)}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-white/50 transition-colors hover:text-white"
              aria-label={showPwd ? "Hide password" : "Show password"}
            >
              {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </Field>

        {error && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-200">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="group relative mt-3 inline-flex h-13 w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-[#D4AF37] via-[#F0D78C] to-[#D4AF37] py-3.5 text-sm font-bold uppercase tracking-[0.18em] text-[#0A0F1F] shadow-[0_20px_50px_-15px_rgba(212,175,55,0.6)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_25px_60px_-15px_rgba(212,175,55,0.8)] disabled:opacity-70"
        >
          <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
          {submitting ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <>
              <KeyRound size={14} /> Enter Aawash
            </>
          )}
        </button>

        <Link
          to="/"
          className="mx-auto mt-2 hidden text-center text-[11px] font-medium text-white/40 transition-colors hover:text-white/80 lg:block"
        >
          ← Back to home
        </Link>
      </form>
    </div>
  );
}

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
    <div className="auth-float-in relative overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-b from-white/[0.07] to-white/[0.02] p-7 shadow-[0_30px_100px_-20px_rgba(0,0,0,0.7)] backdrop-blur-2xl sm:p-9">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/60 to-transparent" />
      <div className="relative mb-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#D4AF37]">
          <ShieldCheck size={12} /> One-Time Setup
        </div>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white">
          Create Super Admin
        </h1>
        <p className="mt-2 text-sm text-white/60">
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
            className="w-full bg-transparent text-base font-medium text-white outline-none placeholder:text-white/30"
          />
        </Field>

        <Field label="Mobile number" icon={<User size={16} />} hint="10 digits. Becomes your Login ID.">
          <input
            value={mobile}
            onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
            inputMode="numeric"
            placeholder="9876543210"
            className="w-full bg-transparent text-base font-medium tracking-wide text-white outline-none placeholder:text-white/30"
          />
        </Field>

        <Field label="Password" icon={<Lock size={16} />} hint="Minimum 8 characters.">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Choose a strong password"
            className="w-full bg-transparent text-base font-medium text-white outline-none placeholder:text-white/30"
          />
        </Field>

        {error && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-200">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#D4AF37] via-[#F0D78C] to-[#D4AF37] text-sm font-bold uppercase tracking-[0.18em] text-[#0A0F1F] shadow-[0_20px_50px_-15px_rgba(212,175,55,0.6)] transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-70"
        >
          {submitting ? <Loader2 size={16} className="animate-spin" /> : "Create Super Admin"}
        </button>
      </form>
    </div>
  );
}

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
      <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.22em] text-white/50">
        {label}
      </span>
      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5 backdrop-blur-md transition-all focus-within:border-[#D4AF37]/50 focus-within:bg-white/[0.08] focus-within:shadow-[0_0_0_4px_rgba(212,175,55,0.08)]">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[#D4AF37]/25 bg-[#D4AF37]/10 text-[#D4AF37]">
          {icon}
        </span>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
      {hint && <p className="mt-1.5 text-[11px] text-white/40">{hint}</p>}
    </label>
  );
}
