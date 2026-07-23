import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Building2, TrendingUp, Wallet, User, LayoutDashboard } from "lucide-react";
import type { AppRole } from "@/lib/auth";

/**
 * Futuristic floating dock — visible on every device, every role.
 * Exactly 5 destinations: Home · Projects · Sales · Wallet · Account.
 * Route targets adapt to the current user's role.
 */
export function BottomNav({ role }: { role: AppRole }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const items = itemsForRole(role);

  return (
    <nav
      aria-label="Primary"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-6"
    >
      <div className="pointer-events-auto mx-auto flex w-full max-w-lg items-stretch justify-between gap-0.5 rounded-[28px] border border-border/60 bg-surface/85 p-1 shadow-[var(--shadow-float)] backdrop-blur-2xl ring-1 ring-inset ring-white/40 sm:gap-1 sm:p-1.5">
        {items.map(({ label, icon: Icon, to, activePrefix }) => {
          const active =
            pathname === to || (activePrefix ? pathname.startsWith(activePrefix) : false);
          return (
            <Link
              key={label}
              to={to}
              aria-current={active ? "page" : undefined}
              className={`group relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-1.5 transition-all duration-200 sm:px-2 sm:py-2 ${
                active
                  ? "bg-gradient-to-br from-primary to-leaf text-primary-foreground shadow-[var(--shadow-glow)]"
                  : "text-muted-foreground hover:bg-primary-soft/60 hover:text-foreground"
              }`}
            >
              <Icon
                size={18}
                strokeWidth={active ? 2.5 : 2}
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
                <span className="absolute -bottom-0.5 h-1 w-6 rounded-full bg-white/70" aria-hidden="true" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

type NavItem = {
  label: string;
  icon: typeof Home;
  to: string;
  activePrefix?: string;
};

function itemsForRole(role: AppRole): NavItem[] {
  if (role === "super_admin") {
    return [
      { label: "Home", icon: Home, to: "/admin" },
      { label: "Projects", icon: Building2, to: "/admin/projects", activePrefix: "/admin/projects" },
      { label: "Sales", icon: TrendingUp, to: "/sales-workflow", activePrefix: "/sales-workflow" },
      { label: "Wallet", icon: Wallet, to: "/admin/finance", activePrefix: "/admin/finance" },
      { label: "Account", icon: User, to: "/admin/profile", activePrefix: "/admin/profile" },
    ];
  }
  if (role === "team_leader") {
    return [
      { label: "Home", icon: Home, to: "/leader" },
      { label: "Projects", icon: Building2, to: "/leader/projects", activePrefix: "/leader/projects" },
      { label: "Sales", icon: TrendingUp, to: "/leader/members", activePrefix: "/leader/members" },
      { label: "Wallet", icon: Wallet, to: "/leader/withdrawals", activePrefix: "/leader/withdrawals" },
      { label: "Account", icon: User, to: "/leader/profile", activePrefix: "/leader/profile" },
    ];
  }
  return [
    { label: "Home", icon: Home, to: "/member" },
    { label: "Projects", icon: Building2, to: "/projects", activePrefix: "/projects" },
    { label: "Sales", icon: TrendingUp, to: "/member/sales", activePrefix: "/member/sales" },
    { label: "Wallet", icon: Wallet, to: "/member/wallet", activePrefix: "/member/wallet" },
    { label: "Account", icon: User, to: "/member/profile", activePrefix: "/member/profile" },
  ];
}

export const _DashboardIcon = LayoutDashboard;
