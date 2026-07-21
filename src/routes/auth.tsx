import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { useServerFn } from "@tanstack/react-start";
import { Eye, EyeOff, Loader2, Lock, ShieldCheck, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { loginIdToEmail, validateLoginId, homePathForRole, type AppRole } from "@/lib/auth";
import { bootstrapSuperAdmin, superAdminExists, touchLastLogin } from "@/lib/auth.functions";
import { AmbientBackground } from "@/components/aawash/AmbientBackground";
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

function AuthPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [checking, setChecking] = useState(true);
  const [needsBootstrap, setNeedsBootstrap] = useState(false);

  const check = useServerFn(superAdminExists);

  useEffect(() => {
    let cancelled = false;
    // Already signed in? Bounce to role home.
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
      // Check bootstrap state
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
      <div className="relative min-h-screen">
        <AmbientBackground />
        <div className="grid min-h-screen place-items-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <AmbientBackground />
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 py-8 sm:max-w-md md:py-14">
        <header className="flex items-center justify-between">
          <BrandMark size="md" />
          <Link
            to="/"
            className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            ← Home
          </Link>
        </header>

        <div className="mt-10 flex flex-1 flex-col justify-center">
          {needsBootstrap ? <BootstrapForm onDone={() => setNeedsBootstrap(false)} /> : <LoginForm />}
        </div>

        <footer className="mt-8 text-center text-[11px] text-muted-foreground">
          Protected by end-to-end encryption · Accounts are invite only
        </footer>
      </div>
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

      // Fetch role for routing
      const { data: r } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id)
        .order("role", { ascending: true })
        .limit(1)
        .maybeSingle();
      const role = (r?.role as AppRole | null) ?? null;

      // Record login (fire-and-forget)
      touch().catch(() => undefined);

      navigate({ to: search.redirect ?? homePathForRole(role), replace: true });
    } catch {
      setError("Invalid login credentials.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="glass-card overflow-hidden rounded-4xl border border-border bg-surface p-6 shadow-[var(--shadow-float)] sm:p-8">
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
          <ShieldCheck size={12} /> Secure sign-in
        </div>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground">
          Welcome back
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter your Aawash Login ID and password to continue.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
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
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted-foreground hover:text-foreground"
              aria-label={showPwd ? "Hide password" : "Show password"}
            >
              {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </Field>

        {error && (
          <div className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[var(--shadow-float)] disabled:opacity-70"
        >
          {submitting ? <Loader2 size={16} className="animate-spin" /> : "Sign in"}
        </button>
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
    <div className="glass-card overflow-hidden rounded-4xl border border-border bg-surface p-6 shadow-[var(--shadow-float)] sm:p-8">
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 rounded-full bg-gold/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-gold-foreground">
          <ShieldCheck size={12} /> One-time setup
        </div>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground">
          Create Super Admin
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          No admin exists yet. Create the first Super Admin account. This
          screen will lock permanently after setup — all future accounts are
          created from inside the Admin Panel.
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
          <div className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[var(--shadow-float)] disabled:opacity-70"
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
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface-warm px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] transition-colors focus-within:border-primary/40 focus-within:bg-surface">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
          {icon}
        </span>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
      {hint && <p className="mt-1.5 text-[11px] text-muted-foreground">{hint}</p>}
    </label>
  );
}
