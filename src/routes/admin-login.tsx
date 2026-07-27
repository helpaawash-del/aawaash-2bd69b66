import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { AlertCircle, KeyRound, Loader2, Lock, ShieldCheck } from "lucide-react";
import { BrandMark } from "@/components/aawash/BrandMark";
import { supabase } from "@/integrations/supabase/client";
import { isAdminPanelUnlocked, unlockAdminPanel } from "@/lib/admin-passcode.functions";
import { toInternalPath } from "@/lib/auth";

const searchSchema = z.object({ redirect: z.string().optional() });

export const Route = createFileRoute("/admin-login")({
  validateSearch: (search) => searchSchema.parse(search),
  component: AdminLoginPage,
  head: () => ({
    meta: [
      { title: "Admin Login — Aawash" },
      { name: "description", content: "Private Aawash admin passcode access." },
      { property: "og:title", content: "Admin Login — Aawash" },
      { property: "og:description", content: "Private Aawash admin passcode access." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function AdminLoginPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const check = useServerFn(isAdminPanelUnlocked);
  const unlock = useServerFn(unlockAdminPanel);
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [shake, setShake] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!lockedUntil) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [lockedUntil]);

  const { data, isLoading } = useQuery({ queryKey: ["admin", "passcode"], queryFn: () => check() });

  // Normalize any redirect target to an internal path. Older links may have
  // passed the full URL (window.location.href), which breaks navigate({ to }).
  const safeRedirect = toInternalPath(search.redirect) ?? "/admin";

  useEffect(() => {
    if (!data?.unlocked) return;
    supabase.auth.getUser().then(({ data: userData }) => {
      if (userData.user) navigate({ to: safeRedirect, replace: true });
    });
  }, [data?.unlocked, navigate, safeRedirect]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!/^\d{4}$/.test(passcode)) {
      setError(
        passcode.length === 0
          ? "Enter your 4-digit admin passcode to continue."
          : `Passcode must be exactly 4 digits — you entered ${passcode.length}.`,
      );
      setShake((n) => n + 1);
      return;
    }
    setSubmitting(true);
    try {
      const result = await unlock({ data: { passcode } });
      if (!result.ok) {
        setError(result.message);
        setLockedUntil(
          result.reason === "rate_limited" && result.retryAfterSeconds
            ? Date.now() + result.retryAfterSeconds * 1000
            : null,
        );
        setPasscode("");
        setShake((n) => n + 1);
        return;
      }
      setLockedUntil(null);

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        if (!result.tokenHash) {
          setError("Admin account is not configured yet. Contact support.");
          return;
        }
        const { error: otpError } = await supabase.auth.verifyOtp({
          token_hash: result.tokenHash,
          type: "magiclink",
        });
        if (otpError) {
          setError("Could not start the admin session. Please try again.");
          return;
        }
      }
      navigate({ to: safeRedirect, replace: true });
    } catch {
      setError("Something went wrong while verifying the passcode. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }



  const locked = lockedUntil !== null && lockedUntil > now;
  const lockRemaining = locked ? Math.ceil((lockedUntil! - now) / 1000) : 0;

  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden bg-background px-4 py-10 text-foreground">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-primary-soft to-transparent" />
        <svg viewBox="0 0 900 360" className="absolute bottom-0 h-72 w-full text-primary opacity-15" aria-hidden="true">
          <g fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M40 300h820" />
            <path d="M130 300V150h92v150M156 178h40M156 212h40M156 246h40" />
            <path d="M290 300V92h120v208M318 125h22M360 125h22M318 166h22M360 166h22M318 207h22M360 207h22M318 248h22M360 248h22" />
            <path d="M500 300V130h88v170M522 162h44M522 198h44M522 234h44" />
            <path d="M650 300V78h104v222M680 112h44M680 152h44M680 192h44M680 232h44" />
          </g>
        </svg>
      </div>

      <section className="glass-card relative w-full max-w-md rounded-4xl p-7 text-center shadow-[var(--shadow-float)] sm:p-9">
        <div className="mx-auto mb-5 flex justify-center"><BrandMark size="md" /></div>
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary-soft text-primary">
          {isLoading ? <Loader2 size={24} className="animate-spin" /> : <ShieldCheck size={24} />}
        </div>
        <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-foreground">Admin Panel Login</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          This is separate from the main website sign-in. Enter the 4-digit admin passcode to continue.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4 text-left">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Admin passcode</span>
            <div
              key={shake}
              className={`mt-2 flex items-center gap-3 rounded-2xl border bg-surface px-4 py-3 ${
                error ? "animate-[shake_0.35s_ease-in-out] border-destructive/60" : "border-border focus-within:border-primary"
              }`}
            >
              <Lock size={16} className={error ? "text-destructive" : "text-muted-foreground"} />
              <input
                autoFocus
                inputMode="numeric"
                autoComplete="one-time-code"
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? "admin-passcode-error" : undefined}
                value={passcode}
                disabled={locked}
                onChange={(e) => {
                  setPasscode(e.target.value.replace(/\D/g, "").slice(0, 4));
                  if (error) setError(null);
                }}
                placeholder="0000"
                className="w-full bg-transparent text-center font-mono text-2xl font-extrabold tracking-[0.5em] text-foreground outline-none placeholder:text-muted-foreground/30"
              />
            </div>
          </label>

          {error && (
            <div
              id="admin-passcode-error"
              role="alert"
              aria-live="assertive"
              className="flex items-start gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive"
            >
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}



          <button type="submit" disabled={submitting || isLoading || locked} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3.5 text-sm font-extrabold uppercase tracking-wider text-primary-foreground shadow-[var(--shadow-glow)] transition-transform hover:-translate-y-0.5 disabled:opacity-70">
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
            {locked ? `Locked — retry in ${lockRemaining}s` : "Continue to admin"}
          </button>
        </form>
      </section>
    </main>
  );
}