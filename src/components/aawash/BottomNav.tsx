import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Building2, TrendingUp, Wallet, User, LayoutDashboard } from "lucide-react";
import type { AppRole } from "@/lib/auth";

/**
 * Kinetic Emerald Dock — floating primary nav.
 * A magnetic emerald puck slides between five destinations along a polished
 * pearl-glass rail. The puck is a single absolutely-positioned element that
 * animates its transform/width for smooth 60fps motion; each cell keeps its
 * own accessible <Link> so keyboard + screen reader semantics stay intact.
 */
export function BottomNav({ role }: { role: AppRole }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const items = itemsForRole(role);
  return <DockList items={items} pathname={pathname} />;
}

export function PublicBottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const items: NavItem[] = [
    { label: "Home", icon: Home, to: "/", description: "Aawash home" },
    { label: "Projects", icon: Building2, to: "/projects", activePrefix: "/projects", description: "Browse projects" },
    { label: "Sales", icon: TrendingUp, to: "/auth", description: "Sign in to manage sales" },
    { label: "Wallet", icon: Wallet, to: "/auth", description: "Sign in to view wallet" },
    { label: "Account", icon: User, to: "/auth", activePrefix: "/auth", description: "Sign in to your account" },
  ];
  return <DockList items={items} pathname={pathname} />;
}

export function BottomNavSkeleton() {
  return (
    <nav
      role="navigation"
      aria-label="Primary"
      aria-busy="true"
      data-testid="bottom-dock-loading"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[90] px-3 pb-[calc(max(0.75rem,env(safe-area-inset-bottom))+0.25rem)] sm:px-6"
    >
      <span role="status" aria-live="polite" className="sr-only">
        Loading primary navigation
      </span>
      <div className="pointer-events-auto mx-auto flex h-[68px] w-full max-w-[380px] items-center justify-between rounded-[32px] border border-white/50 bg-white/60 px-2 shadow-[0_20px_50px_rgba(46,125,91,0.12),0_4px_12px_rgba(0,0,0,0.05)] ring-1 ring-black/5 backdrop-blur-2xl">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-1" aria-hidden="true">
            <div className="h-6 w-6 animate-pulse rounded-lg bg-muted/70" />
            <div className="h-2 w-8 animate-pulse rounded bg-muted/70" />
          </div>
        ))}
      </div>
    </nav>
  );
}

function DockList({ items, pathname }: { items: NavItem[]; pathname: string }) {
  if (!items.length) {
    return (
      <nav
        role="navigation"
        aria-label="Primary"
        data-testid="bottom-dock-empty"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[90] px-3 pb-[calc(max(0.75rem,env(safe-area-inset-bottom))+0.25rem)] sm:px-6"
      >
        <p
          role="status"
          aria-live="polite"
          className="pointer-events-auto mx-auto max-w-[380px] rounded-[32px] border border-white/50 bg-white/70 px-4 py-3 text-center text-xs font-semibold text-muted-foreground shadow-[0_20px_50px_rgba(46,125,91,0.12)] backdrop-blur-2xl"
        >
          Navigation unavailable
        </p>
      </nav>
    );
  }

  const activeIndex = items.findIndex(
    ({ to, activePrefix }) => pathname === to || (activePrefix ? pathname.startsWith(activePrefix) : false),
  );
  const activeItem = activeIndex >= 0 ? items[activeIndex] : undefined;

  const listRef = useRef<HTMLUListElement | null>(null);
  const itemRefs = useRef<Array<HTMLLIElement | null>>([]);
  const [puck, setPuck] = useState<{ x: number; w: number; ready: boolean }>({ x: 0, w: 0, ready: false });
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);

  // Hide on scroll-down, reappear on scroll-up.
  useEffect(() => {
    lastY.current = window.scrollY;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const y = window.scrollY;
        const dy = y - lastY.current;
        if (Math.abs(dy) < 6) return;
        if (y < 40) setHidden(false);
        else if (dy > 0) setHidden(true);
        else setHidden(false);
        lastY.current = y;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  useLayoutEffect(() => {
    const measure = () => {
      const list = listRef.current;
      const el = activeIndex >= 0 ? itemRefs.current[activeIndex] : null;
      if (!list || !el) {
        setPuck((p) => ({ ...p, ready: false }));
        return;
      }
      const listRect = list.getBoundingClientRect();
      const rect = el.getBoundingClientRect();
      setPuck({ x: rect.left - listRect.left, w: rect.width, ready: true });
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (listRef.current) ro.observe(listRef.current);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [activeIndex, items.length]);

  // Re-measure once after mount to catch font/layout settle.
  useEffect(() => {
    const t = window.setTimeout(() => {
      const list = listRef.current;
      const el = activeIndex >= 0 ? itemRefs.current[activeIndex] : null;
      if (!list || !el) return;
      const listRect = list.getBoundingClientRect();
      const rect = el.getBoundingClientRect();
      setPuck({ x: rect.left - listRect.left, w: rect.width, ready: true });
    }, 60);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <nav
      role="navigation"
      aria-label="Primary"
      data-testid="bottom-dock"
      className={`pointer-events-none fixed inset-x-0 bottom-0 z-[90] px-3 pb-[calc(max(0.75rem,env(safe-area-inset-bottom))+0.25rem)] sm:px-6 motion-safe:transition-[transform,opacity] motion-safe:duration-[420ms] motion-safe:ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
        hidden ? "translate-y-[130%] opacity-0" : "translate-y-0 opacity-100"
      }`}
    >

      <span aria-live="polite" aria-atomic="true" className="sr-only">
        {activeItem ? `${activeItem.label} section active` : "Navigation ready"}
      </span>

      {/* Ambient emerald bloom under the dock */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 mx-auto h-10 max-w-[300px] rounded-full bg-[color:var(--primary,#2E7D5B)]/15 blur-2xl"
      />

      <ul
        ref={listRef}
        className="pointer-events-auto relative mx-auto flex h-[68px] w-full max-w-[380px] items-stretch justify-between rounded-[32px] border border-white/50 bg-white/65 px-1.5 shadow-[0_20px_50px_rgba(46,125,91,0.14),0_4px_12px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.7)] ring-1 ring-black/5 backdrop-blur-2xl"
      >
        {/* Magnetic Emerald Puck */}
        <li
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-1.5 overflow-hidden rounded-[24px] bg-gradient-to-br from-[#2E7D5B] to-[#3E9E74] shadow-[0_10px_22px_-6px_rgba(46,125,91,0.55),inset_0_1px_1px_rgba(255,255,255,0.35)] motion-safe:transition-[transform,width,opacity] motion-safe:duration-[520ms] motion-reduce:transition-none"
          style={{
            width: puck.w ? `${puck.w}px` : 0,
            transform: `translate3d(${puck.x}px, 0, 0)`,
            transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)",
            opacity: puck.ready ? 1 : 0,
          }}
        >
          <span className="absolute inset-x-4 -top-px h-px bg-white/60 blur-[0.5px]" />
          {/* Shimmer sweep */}
          <span
            className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 bg-gradient-to-r from-transparent via-white/25 to-transparent motion-safe:animate-[dock-shimmer_3.6s_ease-in-out_infinite]"
          />
        </li>


        {items.map(({ label, icon: Icon, to, activePrefix, description }, i) => {
          const active =
            pathname === to || (activePrefix ? pathname.startsWith(activePrefix) : false);
          return (
            <li
              key={label}
              ref={(el) => {
                itemRefs.current[i] = el;
              }}
              className="relative z-10 flex min-w-0 flex-1"
            >
              <Link
                to={to}
                aria-label={`${label} — ${description}`}
                aria-current={active ? "page" : undefined}
                data-testid={`dock-link-${label.toLowerCase()}`}
                className={`group relative flex min-h-11 min-w-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-[24px] px-1 outline-none transition-colors duration-300 focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#2E7D5B]/40 ${
                  active ? "text-white" : "text-slate-500 hover:text-[#2E7D5B]"
                }`}
              >
                <span
                  className={`grid place-items-center transition-transform duration-300 group-active:scale-90 ${
                    active ? "-translate-y-[1px] scale-[1.06]" : "group-hover:-translate-y-[1px]"
                  }`}
                >
                  <Icon
                    size={22}
                    strokeWidth={active ? 2.4 : 2}
                    aria-hidden="true"
                    className={active ? "drop-shadow-[0_1px_2px_rgba(0,0,0,0.15)]" : ""}
                  />
                </span>
                <span
                  className={`w-full truncate text-center text-[10px] leading-none tracking-tight transition-all duration-300 ${
                    active
                      ? "font-semibold text-white opacity-100"
                      : "font-medium opacity-90 group-hover:opacity-100"
                  }`}
                >
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

type NavItem = {
  label: string;
  icon: typeof Home;
  to: string;
  activePrefix?: string;
  description: string;
};

export function itemsForRole(role: AppRole): NavItem[] {
  if (role === "super_admin") {
    return [
      { label: "Home", icon: Home, to: "/admin", description: "Admin dashboard home" },
      { label: "Projects", icon: Building2, to: "/admin/projects", activePrefix: "/admin/projects", description: "Manage projects and inventory" },
      { label: "Sales", icon: TrendingUp, to: "/sales-workflow", activePrefix: "/sales-workflow", description: "Sales workflow console" },
      { label: "Wallet", icon: Wallet, to: "/admin/finance", activePrefix: "/admin/finance", description: "Finance and wallets" },
      { label: "Account", icon: User, to: "/admin/profile", activePrefix: "/admin/profile", description: "Admin account settings" },
    ];
  }
  if (role === "team_leader") {
    return [
      { label: "Home", icon: Home, to: "/leader", description: "Team leader home" },
      { label: "Projects", icon: Building2, to: "/leader/projects", activePrefix: "/leader/projects", description: "Team projects" },
      { label: "Sales", icon: TrendingUp, to: "/leader/members", activePrefix: "/leader/members", description: "Team sales and members" },
      { label: "Wallet", icon: Wallet, to: "/leader/withdrawals", activePrefix: "/leader/withdrawals", description: "Withdrawals and wallet" },
      { label: "Account", icon: User, to: "/leader/profile", activePrefix: "/leader/profile", description: "Leader profile" },
    ];
  }
  return [
    { label: "Home", icon: Home, to: "/member", description: "Member home" },
    { label: "Projects", icon: Building2, to: "/projects", activePrefix: "/projects", description: "Browse projects" },
    { label: "Sales", icon: TrendingUp, to: "/member/sales", activePrefix: "/member/sales", description: "Your sales" },
    { label: "Wallet", icon: Wallet, to: "/member/wallet", activePrefix: "/member/wallet", description: "Your wallet" },
    { label: "Account", icon: User, to: "/member/profile", activePrefix: "/member/profile", description: "Your account" },
  ];
}

export const _DashboardIcon = LayoutDashboard;
