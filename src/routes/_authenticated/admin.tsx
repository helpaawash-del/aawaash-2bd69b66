import { useState } from "react";
import { Outlet } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AlertCircle, KeyRound, Loader2, Lock, ShieldCheck } from "lucide-react";
import { isAdminPanelUnlocked, unlockAdminPanel } from "@/lib/admin-passcode.functions";
import { BrandMark } from "@/components/aawash/BrandMark";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const check = useServerFn(isAdminPanelUnlocked);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin", "passcode"],
    queryFn: () => check(),
  });

  if (isLoading) {
    return (
      <main className="grid min-h-dvh place-items-center bg-background px-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </main>
    );
  }

  if (!data?.unlocked) return <AdminPasscodeScreen onUnlocked={() => refetch()} />;
  return <Outlet />;
}

function AdminPasscodeScreen({ onUnlocked }: { onUnlocked: () => Promise<unknown> }) {
  const unlock = useServerFn(unlockAdminPanel);
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!/^\d{4}$/.test(passcode)) {
      setError("Enter the 4-digit admin passcode.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await unlock({ data: { passcode } });
      if (!result.ok) {
        setError("Invalid admin passcode.");
        return;
      }
      await onUnlocked();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden bg-background px-4 py-10 text-foreground">
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <div className="absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-primary-soft to-transparent" />
        <div className="absolute left-1/2 top-1/2 h-[460px] w-[460px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/10" />
        <div className="absolute left-1/2 top-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-gold/20" />
        <svg viewBox="0 0 900 360" className="absolute bottom-0 h-72 w-full" aria-hidden="true">
          <g fill="none" stroke="currentColor" className="text-primary" opacity="0.12">
            <path d="M40 300h820" />
            <path d="M130 300V150h92v150M156 178h40M156 212h40M156 246h40" />
            <path d="M290 300V92h120v208M318 125h22M360 125h22M318 166h22M360 166h22M318 207h22M360 207h22M318 248h22M360 248h22" />
            <path d="M500 300V130h88v170M522 162h44M522 198h44M522 234h44" />
            <path d="M650 300V78h104v222M680 112h44M680 152h44M680 192h44M680 232h44" />
          </g>
        </svg>
      </div>

      <section className="glass-card relative w-full max-w-md rounded-4xl p-7 text-center shadow-[var(--shadow-float)] sm:p-9">
        <div className="mx-auto mb-5 flex justify-center">
          <BrandMark size="md" />
        </div>
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary-soft text-primary">
          <ShieldCheck size={24} />
        </div>
        <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-foreground">Admin Panel Access</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Enter the private 4-digit passcode to open the administrative control center.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4 text-left">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Passcode</span>
            <div className="mt-2 flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 focus-within:border-primary">
              <Lock size={16} className="text-muted-foreground" />
              <input
                autoFocus
                inputMode="numeric"
                autoComplete="one-time-code"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="0000"
                className="w-full bg-transparent text-center font-mono text-2xl font-extrabold tracking-[0.5em] text-foreground outline-none placeholder:text-muted-foreground/30"
              />
            </div>
          </label>

          {error && (
            <div className="flex items-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3.5 text-sm font-extrabold uppercase tracking-wider text-primary-foreground shadow-[var(--shadow-glow)] transition-transform hover:-translate-y-0.5 disabled:opacity-70"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
            Unlock admin panel
          </button>
        </form>
      </section>
    </main>
  );
}