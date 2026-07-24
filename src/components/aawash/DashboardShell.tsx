import { useState } from "react";
import { LogOut, Loader2, Search, Bell, Command } from "lucide-react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AmbientBackground } from "./AmbientBackground";
import { BrandMark } from "./BrandMark";
import { itemsForRole } from "./BottomNav";
import type { AawashProfile } from "@/hooks/useSession";
import { roleLabel } from "@/lib/auth";
import type { AppRole } from "@/lib/auth";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

/**
 * Premium mobile-first shell used by every role-specific dashboard.
 * Establishes header, ambient backdrop, generous spacing, and sign-out hygiene.
 */
export function DashboardShell({
  role,
  profile,
  children,
}: {
  role: AppRole;
  profile: AawashProfile | null;
  children: React.ReactNode;
}) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await qc.cancelQueries();
      qc.clear();
      await supabase.auth.signOut();
    } finally {
      navigate({ to: "/auth", replace: true });
    }
  }

  const initials = (profile?.full_name || profile?.login_id || "AA")
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="relative min-h-screen">
      <AmbientBackground />

      <FloatingSideRail role={role} />

      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-32 pt-6 sm:max-w-lg md:max-w-3xl md:px-8 md:pb-32 lg:max-w-6xl lg:px-12 lg:pl-24">

        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
          <BrandMark size="md" />
          <div className="flex shrink-0 items-center gap-2">
            <div className="glass-card hidden items-center gap-3 rounded-full px-3 py-1.5 shadow-[var(--shadow-soft)] sm:flex">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-primary to-leaf text-xs font-bold text-primary-foreground">
                {initials}
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-xs font-semibold text-foreground">
                  {profile?.full_name || profile?.login_id}
                </span>
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  {roleLabel(role)}
                </span>
              </div>
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  disabled={signingOut}
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-border bg-surface text-foreground shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5 hover:border-destructive/30 hover:text-destructive disabled:opacity-50"
                  aria-label="Sign out"
                >
                  {signingOut ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <LogOut size={18} />
                  )}
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-3xl">
                <AlertDialogHeader>
                  <AlertDialogTitle>Sign out of Aawash?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Your session will end and you'll be returned to the sign-in
                    screen. You can sign back in anytime with your Login ID.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-2xl">Stay signed in</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleSignOut}
                    className="rounded-2xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Sign out
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </header>

        <main className="mt-8 flex-1">{children}</main>
      </div>
    </div>
  );
}

/**
 * FloatingSideRail
 * ----------------
 * Desktop-only glass navigation rail. Collapsed at 64px showing icons only,
 * hover-expands to 232px revealing labels with a spring transition. A single
 * emerald active indicator glides between items via translateY, powered by
 * the current route path.
 */
function FloatingSideRail({ role }: { role: AppRole }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const items = itemsForRole(role);
  const activeIndex = items.findIndex(
    ({ to, activePrefix }) => pathname === to || (activePrefix ? pathname.startsWith(activePrefix) : false),
  );
  const cell = 52; // px per item (h-11 + gap)

  return (
    <aside
      aria-label="Primary navigation rail"
      className="pointer-events-none fixed left-4 top-1/2 z-40 hidden -translate-y-1/2 lg:block"
    >
      <div className="group pointer-events-auto relative">
        <nav
          className="glass-card relative flex w-16 flex-col gap-1 rounded-[28px] p-2 shadow-[var(--shadow-float)] transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:w-[232px]"
        >
          {/* animated active indicator */}
          {activeIndex >= 0 && (
            <span
              aria-hidden
              className="pointer-events-none absolute left-2 right-2 h-11 rounded-2xl bg-gradient-to-br from-primary to-leaf shadow-[var(--shadow-glow)] transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
              style={{ transform: `translateY(${activeIndex * cell}px)` }}
            />
          )}
          {items.map((item, i) => {
            const Icon = item.icon;
            const active = i === activeIndex;
            return (
              <Link
                key={item.label}
                to={item.to}
                aria-label={item.description}
                className={`relative z-10 flex h-11 items-center gap-3 rounded-2xl px-2.5 text-sm font-semibold transition-colors ${
                  active ? "text-primary-foreground" : "text-foreground hover:text-primary"
                }`}
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center">
                  <Icon size={18} />
                </span>
                <span className="whitespace-nowrap opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}

