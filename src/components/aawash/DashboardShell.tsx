import { useState } from "react";
import { LogOut, Loader2, Search, Bell, Command } from "lucide-react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AmbientBackground } from "./AmbientBackground";
import { BrandMark } from "./BrandMark";
import { itemsForRole } from "./BottomNav";
import type { AawashProfile } from "@/hooks/useSession";
import { homePathForRole, roleLabel } from "@/lib/auth";
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

  const base = homePathForRole(role);

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

      {role === "super_admin" && <FloatingSideRail role={role} />}

      <div
        className={`mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-32 pt-6 sm:max-w-lg md:max-w-3xl md:px-10 md:pb-32 lg:max-w-6xl lg:px-12 xl:max-w-7xl xl:px-16 ${
          role === "super_admin" ? "lg:pl-28 xl:pl-32" : ""
        }`}
      >
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:gap-4">
          <BrandMark size="sm" />

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {/* Command / search pill — desktop only */}
            <div className="glass-card hidden h-11 items-center gap-2 rounded-full pl-4 pr-1.5 shadow-[var(--shadow-soft)] transition-all focus-within:-translate-y-0.5 focus-within:shadow-[var(--shadow-glow)] lg:flex lg:w-72">
              <Search size={15} className="shrink-0 text-muted-foreground" />
              <input
                type="search"
                aria-label="Search"
                placeholder="Search projects, members, sales…"
                className="min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
              <kbd className="inline-flex h-7 items-center gap-1 rounded-full bg-primary-soft px-2 text-[10px] font-semibold text-primary">
                <Command size={10} /> K
              </kbd>
            </div>

            {/* Notifications */}
            <Link
              to={`${base}/notifications` as never}
              aria-label="Notifications"
              className="group relative grid h-11 w-11 min-h-11 min-w-11 shrink-0 place-items-center rounded-2xl border border-border bg-surface text-foreground shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <Bell size={17} />
              <span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_0_2px_var(--card)]" />
            </Link>

            {/* User chip */}
            <Link
              to={`${base}/profile` as never}
              aria-label="Open your profile"
              className="glass-card hidden min-h-11 items-center gap-2.5 rounded-full py-1 pl-1 pr-3 shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-float)] sm:inline-flex outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-primary to-leaf text-xs font-bold text-primary-foreground ring-2 ring-white/70">
                {initials}
              </span>
              <span className="flex flex-col leading-tight">
                <span className="text-xs font-semibold text-foreground">
                  {profile?.full_name || profile?.login_id}
                </span>
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  {roleLabel(role)}
                </span>
              </span>
            </Link>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  disabled={signingOut}
                  className="grid h-11 w-11 min-h-11 min-w-11 shrink-0 place-items-center rounded-2xl border border-border bg-surface text-foreground shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5 hover:border-destructive/30 hover:text-destructive disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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
                    Your session will end and you'll be returned to the sign-in screen. You can sign
                    back in anytime with your Login ID.
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

        <main id="main-content" className="mt-8 flex-1 md:mt-9 lg:mt-10">
          {children}
        </main>
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
    ({ to, activePrefix }) =>
      pathname === to || (activePrefix ? pathname.startsWith(activePrefix) : false),
  );
  const cell = 52; // px per item (h-11 + gap)

  return (
    <aside
      aria-label="Primary navigation rail"
      className="pointer-events-none fixed left-4 top-1/2 z-40 hidden -translate-y-1/2 lg:block"
    >
      <div className="group pointer-events-auto relative">
        <nav className="glass-card relative flex w-16 flex-col gap-1 rounded-[28px] p-2 shadow-[var(--shadow-float)] transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:w-[232px]">
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
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
                title={item.description}
                className={`relative z-10 flex h-11 min-h-11 items-center gap-3 rounded-2xl px-2.5 text-sm font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
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
