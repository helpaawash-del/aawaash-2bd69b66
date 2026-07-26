import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Building2, Users, TrendingUp, Wallet, BarChart3, Bell, User } from "lucide-react";

import type { AppRole } from "@/lib/auth";
import { DOCK_DURATION_MS, DOCK_EASE } from "@/components/aawash/dashboard/dock-motion";

/* ------------------------------------------------------------------ *
 * EcoDock — bottom variant of the forest rail.
 * Shown on Team Leader / Team Member dashboard sub-pages (projects,
 * wallet, members, account, alerts, analytics). The dashboard homepage
 * keeps the left WaveRail instead.
 * ------------------------------------------------------------------ */

export type EcoDockItem = {
  key: string;
  label: string;
  icon: typeof Home;
  to: string;
  exact?: boolean;
  activePrefix?: string;
};

export function ecoDockItems(role: AppRole): EcoDockItem[] {
  if (role === "team_leader") {
    return [
      { key: "home", label: "Home", icon: Home, to: "/leader", exact: true },
      {
        key: "projects",
        label: "Projects",
        icon: Building2,
        to: "/leader/projects",
        activePrefix: "/leader/projects",
      },
      {
        key: "members",
        label: "Members",
        icon: Users,
        to: "/leader/members",
        activePrefix: "/leader/members",
      },
      {
        key: "wallet",
        label: "Wallet",
        icon: Wallet,
        to: "/leader/withdrawals",
        activePrefix: "/leader/withdrawals",
      },
      {
        key: "account",
        label: "Account",
        icon: User,
        to: "/leader/profile",
        activePrefix: "/leader/profile",
      },
    ];
  }
  return [
    { key: "home", label: "Home", icon: Home, to: "/member", exact: true },
    {
      key: "projects",
      label: "Projects",
      icon: Building2,
      to: "/projects",
      activePrefix: "/projects",
    },
    {
      key: "sales",
      label: "Sales",
      icon: TrendingUp,
      to: "/member/sales",
      activePrefix: "/member/sales",
    },
    {
      key: "wallet",
      label: "Wallet",
      icon: Wallet,
      to: "/member/wallet",
      activePrefix: "/member/wallet",
    },
    {
      key: "account",
      label: "Account",
      icon: User,
      to: "/member/profile",
      activePrefix: "/member/profile",
    },
  ];
}

function isActive(pathname: string, item: EcoDockItem) {
  if (item.exact) return pathname === item.to;
  if (item.activePrefix)
    return pathname === item.activePrefix || pathname.startsWith(`${item.activePrefix}/`);
  return pathname === item.to;
}

export function EcoDock({ role }: { role: AppRole }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const items = ecoDockItems(role);

  return (
    <nav
      aria-label="Dashboard navigation"
      data-testid="eco-dock"
      style={{ animationDuration: `${DOCK_DURATION_MS}ms`, animationTimingFunction: DOCK_EASE }}
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[90] animate-fade-in px-3 pb-[calc(max(0.75rem,env(safe-area-inset-bottom))+0.25rem)] motion-reduce:animate-none sm:px-6"
    >
      <ul className="pointer-events-auto mx-auto flex w-full max-w-[560px] items-center gap-1 overflow-x-auto rounded-[30px] bg-forest/95 px-2 py-2 shadow-[0_22px_50px_rgba(16,50,36,0.32)] ring-1 ring-white/10 backdrop-blur-2xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item);
          return (
            <li key={item.key} className="flex-1">
              <Link
                to={item.to}
                preload="render"
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
                data-dock-item={item.key}
                data-active={active ? "true" : "false"}
                className={`flex min-w-[52px] flex-col items-center gap-0.5 rounded-[22px] px-1.5 py-2 text-[9.5px] font-semibold transition-all duration-[420ms] ease-[cubic-bezier(0.32,0.72,0,1)] outline-none focus-visible:ring-2 focus-visible:ring-forest-foreground/60 motion-reduce:transition-none ${
                  active
                    ? "-translate-y-0.5 scale-[1.03] bg-surface text-primary shadow-[var(--shadow-float)]"
                    : "text-forest-foreground/70 hover:bg-white/10 hover:text-forest-foreground"
                }`}
              >
                <Icon size={18} className="shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
