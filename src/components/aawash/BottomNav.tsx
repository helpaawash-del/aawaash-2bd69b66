import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Home,
  Building2,
  TrendingUp,
  Wallet,
  User,
  Users,
  UserCog,
  PhoneCall,
  LayoutDashboard,
} from "lucide-react";
import type { AppRole } from "@/lib/auth";

/**
 * Aawaash Dock — floating, app-like primary navigation.
 *
 * • Context aware: the five destinations change per surface
 *   (public site, member, team leader, admin).
 * • Fast: every destination is preloaded on render, so tapping a dock item
 *   navigates from cache with no round-trip wait.
 * • Motion: a single magnetic emerald puck slides + resizes behind the
 *   active cell; the active label expands inline (iOS-style pill).
 */

type NavItem = {
  key: string;
  label: string;
  icon: typeof Home;
  to: string;
  hash?: string;
  activePrefix?: string;
  exact?: boolean;
  description: string;
};

export function BottomNav({ role }: { role: AppRole }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return <DockList items={itemsFor(pathname, role)} pathname={pathname} />;
}

export function PublicBottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return <DockList items={itemsFor(pathname, null)} pathname={pathname} />;
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
      <div className="pointer-events-auto mx-auto flex h-[66px] w-full max-w-[420px] items-center justify-between rounded-[30px] border border-white/60 bg-white/70 px-2.5 shadow-[0_22px_50px_rgba(46,125,91,0.14)] ring-1 ring-black/5 backdrop-blur-2xl">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex flex-1 items-center justify-center" aria-hidden="true">
            <div className="h-9 w-9 animate-pulse rounded-2xl bg-muted/70" />
          </div>
        ))}
      </div>
    </nav>
  );
}

function isActive(pathname: string, item: NavItem) {
  if (item.exact) return pathname === item.to;
  if (item.activePrefix) return pathname === item.activePrefix || pathname.startsWith(`${item.activePrefix}/`);
  return pathname === item.to;
}

function DockList({ items, pathname }: { items: NavItem[]; pathname: string }) {
  const listRef = useRef<HTMLUListElement | null>(null);
  const itemRefs = useRef<Array<HTMLLIElement | null>>([]);
  const [puck, setPuck] = useState<{ x: number; w: number; ready: boolean }>({ x: 0, w: 0, ready: false });
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);
  const pinnedUntil = useRef(0);
  const [focusIndex, setFocusIndex] = useState(-1);

  const activeIndex = items.findIndex((item) => isActive(pathname, item));
  const activeItem = activeIndex >= 0 ? items[activeIndex] : undefined;

  /** Roving keyboard navigation: ←/→ move, Home/End jump, Enter/Space activate. */
  const focusAt = (i: number) => {
    const next = (i + items.length) % items.length;
    setFocusIndex(next);
    const link = itemRefs.current[next]?.querySelector("a");
    (link as HTMLAnchorElement | null)?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLAnchorElement>, i: number) => {
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        e.preventDefault();
        focusAt(i + 1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        e.preventDefault();
        focusAt(i - 1);
        break;
      case "Home":
        e.preventDefault();
        focusAt(0);
        break;
      case "End":
        e.preventDefault();
        focusAt(items.length - 1);
        break;
      case " ":
      case "Spacebar":
        e.preventDefault();
        (e.currentTarget as HTMLAnchorElement).click();
        break;
      default:
        break;
    }
  };

  // Always reveal the dock after a route change.
  useEffect(() => {
    setHidden(false);
  }, [pathname]);

  // Hide on scroll-down, reappear on scroll-up.
  useEffect(() => {
    lastY.current = window.scrollY;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const y = window.scrollY;
        const dy = y - lastY.current;
        lastY.current = y;
        // Keep the dock pinned right after a dock activation (e.g. hash jumps).
        if (Date.now() < pinnedUntil.current) {
          setHidden(false);
          return;
        }
        if (Math.abs(dy) < 6) return;
        if (y < 40) setHidden(false);
        else setHidden(dy > 0);
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
    const raf = requestAnimationFrame(measure);
    const t = window.setTimeout(measure, 80);
    const ro = new ResizeObserver(measure);
    if (listRef.current) ro.observe(listRef.current);
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(t);
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [activeIndex, items.length, items.map((i) => i.key).join("|")]);

  if (!items.length) return null;

  return (
    <nav
      role="navigation"
      aria-label="Primary"
      data-testid="bottom-dock"
      className={`pointer-events-none fixed inset-x-0 bottom-0 z-[90] px-3 pb-[calc(max(0.75rem,env(safe-area-inset-bottom))+0.25rem)] sm:px-6 motion-safe:transition-[transform,opacity] motion-safe:duration-[380ms] motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)] ${
        hidden ? "translate-y-[130%] opacity-0" : "translate-y-0 opacity-100"
      }`}
    >
      <span aria-live="polite" aria-atomic="true" className="sr-only">
        {activeItem ? `${activeItem.label} section active` : "Navigation ready"}
      </span>

      {/* Ambient emerald bloom under the dock */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-1 mx-auto h-10 max-w-[320px] rounded-full bg-[color:var(--primary,#2E7D5B)]/20 blur-2xl"
      />

      <ul
        ref={listRef}
        role="toolbar"
        aria-orientation="horizontal"
        aria-label="Dock destinations"
        className="pointer-events-auto relative mx-auto flex h-[66px] w-full max-w-[420px] items-stretch justify-between gap-0.5 rounded-[30px] border border-white/60 bg-white/72 p-1.5 shadow-[0_24px_60px_-18px_rgba(46,125,91,0.45),0_4px_14px_rgba(15,23,42,0.06),inset_0_1px_0_rgba(255,255,255,0.85)] ring-1 ring-black/5 backdrop-blur-2xl"
      >
        {/* Magnetic emerald puck */}
        <li
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-1.5 overflow-hidden rounded-[22px] bg-gradient-to-br from-[#2E7D5B] via-[#35916A] to-[#43A97C] shadow-[0_10px_22px_-8px_rgba(46,125,91,0.7),inset_0_1px_1px_rgba(255,255,255,0.4)] motion-safe:transition-[transform,width,opacity] motion-safe:duration-[420ms] motion-reduce:transition-none"
          style={{
            width: puck.w ? `${puck.w}px` : 0,
            transform: `translate3d(${puck.x}px, 0, 0)`,
            transitionTimingFunction: "cubic-bezier(0.22, 1.4, 0.36, 1)",
            opacity: puck.ready ? 1 : 0,
          }}
        >
          <span className="absolute inset-x-4 -top-px h-px bg-white/70" />
          <span className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 bg-gradient-to-r from-transparent via-white/25 to-transparent motion-safe:animate-[dock-shimmer_3.6s_ease-in-out_infinite]" />
        </li>

        {items.map((item, i) => {
          const { label, icon: Icon, to, hash, description, key } = item;
          const active = i === activeIndex;
          const tabbable = i === (focusIndex >= 0 ? focusIndex : activeIndex >= 0 ? activeIndex : 0);
          return (
            <li
              key={key}
              ref={(el) => {
                itemRefs.current[i] = el;
              }}
              role="none"
              className={`relative z-10 flex min-w-0 transition-[flex] duration-300 ${active ? "flex-[1.5]" : "flex-1"}`}
            >
              <Link
                to={to}
                hash={hash}
                preload="render"
                resetScroll={!hash}
                aria-label={`${label} — ${description}`}
                aria-current={active ? "page" : undefined}
                tabIndex={tabbable ? 0 : -1}
                onFocus={() => {
                  setFocusIndex(i);
                  setHidden(false);
                }}
                onClick={() => {
                  pinnedUntil.current = Date.now() + 1200;
                  setHidden(false);
                }}
                onKeyDown={(e) => onKeyDown(e, i)}
                data-testid={`dock-link-${label.toLowerCase().replace(/\s+/g, "-")}`}
                className={`group relative flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-[22px] px-1 outline-none transition-colors duration-300 focus-visible:ring-2 focus-visible:ring-[#2E7D5B]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-white ${
                  active ? "text-white" : "text-slate-500 hover:text-[#2E7D5B]"
                }`}
              >
                <span
                  className={`grid place-items-center transition-transform duration-300 group-active:scale-90 ${
                    active ? "scale-[1.05]" : "group-hover:-translate-y-0.5"
                  }`}
                >
                  <Icon size={21} strokeWidth={active ? 2.4 : 2} aria-hidden="true" />
                </span>
                <span
                  className={`overflow-hidden whitespace-nowrap text-[11px] font-semibold leading-none tracking-tight transition-all duration-300 ${
                    active ? "max-w-[86px] opacity-100" : "max-w-0 opacity-0"
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

/* ------------------------------------------------------------------ */
/* Context-aware destination sets                                      */
/* ------------------------------------------------------------------ */

const HOME = { key: "home", label: "Home", icon: Home, description: "Aawaash home" };

/** Public site (home + project pages) — same set for guests and signed-in users. */
function publicItems(role: AppRole | null): NavItem[] {
  const salesTo =
    role === "super_admin" ? "/sales-workflow" : role === "team_leader" ? "/leader" : role === "member" ? "/member/sales" : "/auth";
  const accountTo =
    role === "super_admin"
      ? "/admin/profile"
      : role === "team_leader"
        ? "/leader/profile"
        : role === "member"
          ? "/member/profile"
          : "/auth";
  return [
    { ...HOME, to: "/", exact: true },
    { key: "projects", label: "Projects", icon: Building2, to: "/projects", activePrefix: "/projects", description: "Browse residences" },
    { key: "contact", label: "Contact", icon: PhoneCall, to: "/", hash: "contact", description: "Talk to the Aawaash team" },
    { key: "sales", label: "Sales", icon: TrendingUp, to: salesTo, activePrefix: salesTo, description: "Sales console" },
    { key: "account", label: "Account", icon: User, to: accountTo, activePrefix: accountTo, description: "Your account" },
  ];
}

function leaderItems(): NavItem[] {
  return [
    { ...HOME, to: "/leader", exact: true, description: "Team leader home" },
    { key: "projects", label: "Projects", icon: Building2, to: "/leader/projects", activePrefix: "/leader/projects", description: "Team projects" },
    { key: "members", label: "Members", icon: Users, to: "/leader/members", activePrefix: "/leader/members", description: "Your team members" },
    { key: "wallet", label: "Wallet", icon: Wallet, to: "/leader/withdrawals", activePrefix: "/leader/withdrawals", description: "Wallet and withdrawals" },
    { key: "account", label: "Account", icon: User, to: "/leader/profile", activePrefix: "/leader/profile", description: "Leader profile" },
  ];
}

function memberItems(): NavItem[] {
  return [
    { ...HOME, to: "/member", exact: true, description: "Member home" },
    { key: "projects", label: "Projects", icon: Building2, to: "/projects", activePrefix: "/projects", description: "Browse residences" },
    { key: "sales", label: "Sales", icon: TrendingUp, to: "/member/sales", activePrefix: "/member/sales", description: "Your sales" },
    { key: "wallet", label: "Wallet", icon: Wallet, to: "/member/wallet", activePrefix: "/member/wallet", description: "Your wallet" },
    { key: "account", label: "Account", icon: User, to: "/member/profile", activePrefix: "/member/profile", description: "Your account" },
  ];
}

function adminItems(): NavItem[] {
  return [
    { ...HOME, to: "/admin", exact: true, description: "Admin control centre" },
    { key: "projects", label: "Projects", icon: Building2, to: "/admin/projects", activePrefix: "/admin/projects", description: "Manage projects" },
    { key: "leaders", label: "Leaders", icon: UserCog, to: "/admin/team-leaders", activePrefix: "/admin/team-leaders", description: "Team leader console" },
    { key: "members", label: "Members", icon: Users, to: "/admin/members", activePrefix: "/admin/members", description: "Member console" },
    { key: "wallets", label: "Wallets", icon: Wallet, to: "/admin/finance", activePrefix: "/admin/finance", description: "Wallets and finance" },
  ];
}

/** Public surfaces keep the marketing dock even when signed in. */
function isPublicSurface(pathname: string) {
  return pathname === "/" || pathname === "/projects" || pathname.startsWith("/projects/");
}

export function itemsFor(pathname: string, role: AppRole | null): NavItem[] {
  if (isPublicSurface(pathname)) return publicItems(role);
  if (pathname.startsWith("/admin")) return adminItems();
  if (pathname.startsWith("/leader")) return leaderItems();
  if (pathname.startsWith("/member")) return memberItems();
  if (role === "super_admin") return adminItems();
  if (role === "team_leader") return leaderItems();
  if (role === "member") return memberItems();
  return publicItems(role);
}

export function itemsForRole(role: AppRole): NavItem[] {
  return itemsFor("", role);
}

export const _DashboardIcon = LayoutDashboard;
