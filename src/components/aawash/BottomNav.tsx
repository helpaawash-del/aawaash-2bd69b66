import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Building2, TrendingUp, Wallet, User, LayoutDashboard } from "lucide-react";
import type { AppRole } from "@/lib/auth";

/**
 * Futuristic floating dock — visible on every device, every role.
 * Exactly 5 destinations: Home · Projects · Sales · Wallet · Account.
 * Route targets adapt to the current user's role.
 *
 * Accessibility:
 *  - <nav aria-label="Primary"> with role="navigation".
 *  - Each Link is a real anchor (native Tab/Enter/Space support) with an
 *    aria-label describing its destination and aria-current="page" while active.
 *  - Focus ring uses the design-system token so keyboard focus is visible
 *    against the glass background on every viewport.
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

function DockList({ items, pathname }: { items: NavItem[]; pathname: string }) {
  return (
    <nav
      role="navigation"
      aria-label="Primary"
      data-testid="bottom-dock"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[90] px-2 pb-[calc(max(0.75rem,env(safe-area-inset-bottom))+0.25rem)] sm:px-6"
    >
      <ul className="pointer-events-auto mx-auto flex w-full max-w-lg items-stretch justify-between gap-0.5 rounded-[28px] border border-border/70 bg-surface/95 p-1 shadow-[var(--shadow-float)] backdrop-blur-2xl ring-1 ring-inset ring-white/60 sm:gap-1 sm:p-1.5">
        {items.map(({ label, icon: Icon, to, activePrefix, description }) => {
          const active =
            pathname === to || (activePrefix ? pathname.startsWith(activePrefix) : false);
          return (
            <li key={label} className="flex min-w-0 flex-1">
              <Link
                to={to}
                aria-label={`${label} — ${description}`}
                aria-current={active ? "page" : undefined}
                data-testid={`dock-link-${label.toLowerCase()}`}
                className={`group relative flex min-h-11 min-w-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-1.5 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:px-2 sm:py-2 ${
                  active
                    ? "bg-gradient-to-br from-primary to-leaf text-primary-foreground shadow-[var(--shadow-glow)]"
                    : "text-muted-foreground hover:bg-primary-soft/60 hover:text-foreground"
                }`}
              >
                <Icon
                  size={18}
                  strokeWidth={active ? 2.5 : 2}
                  aria-hidden="true"
                  className="shrink-0 transition-transform group-active:scale-90"
                />
                <span
                  className={`w-full truncate text-center text-[9px] font-bold leading-none tracking-wide sm:text-[10px] ${
                    active ? "text-primary-foreground" : ""
                  }`}
                >
                  {label}
                </span>
                {active && (
                  <span
                    className="absolute -bottom-0.5 h-1 w-6 rounded-full bg-white/70"
                    aria-hidden="true"
                  />
                )}
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

function itemsForRole(role: AppRole): NavItem[] {
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
