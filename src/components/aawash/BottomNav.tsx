import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Users, Bell, User, Building2, LayoutDashboard, Wallet, Trophy } from "lucide-react";
import type { AppRole } from "@/lib/auth";

/**
 * Native app-style bottom navigation for authenticated mobile users.
 * Items differ per role. All targets are real routes inside `_authenticated`.
 */
export function BottomNav({ role }: { role: AppRole }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const items = itemsForRole(role);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden">
      <div className="glass-card mx-auto flex max-w-md items-center justify-between rounded-3xl px-2 py-2 shadow-[var(--shadow-float)]">
        {items.map(({ label, icon: Icon, to, activePrefix }) => {
          const active =
            pathname === to || (activePrefix && pathname.startsWith(activePrefix));
          return (
            <Link
              key={label}
              to={to}
              className={`flex flex-1 flex-col items-center gap-0.5 rounded-2xl px-2 py-1.5 transition-all ${
                active ? "bg-primary-soft" : "hover:bg-primary-soft/60"
              }`}
            >
              <Icon
                size={20}
                className={active ? "text-primary" : "text-muted-foreground"}
                strokeWidth={active ? 2.4 : 1.9}
              />
              <span
                className={`text-[10px] font-semibold ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function itemsForRole(role: AppRole) {
  if (role === "team_leader") {
    return [
      { label: "Home", icon: Home, to: "/leader" as const },
      { label: "Members", icon: Users, to: "/leader/members" as const, activePrefix: "/leader/members" },
      { label: "Projects", icon: Building2, to: "/leader/projects" as const },
      { label: "Alerts", icon: Bell, to: "/leader/notifications" as const },
      { label: "Profile", icon: User, to: "/leader/profile" as const },
    ];
  }
  if (role === "super_admin") {
    return [
      { label: "Home", icon: Home, to: "/admin" as const },
      { label: "Users", icon: Users, to: "/admin/users" as const, activePrefix: "/admin/users" },
      { label: "Projects", icon: Building2, to: "/leader/projects" as const },
      { label: "Alerts", icon: Bell, to: "/leader/notifications" as const },
      { label: "Profile", icon: User, to: "/leader/profile" as const },
    ];
  }
  // member
  return [
    { label: "Home", icon: Home, to: "/member" as const },
    { label: "Projects", icon: Building2, to: "/leader/projects" as const },
    { label: "Wallet", icon: Wallet, to: "/leader/withdrawals" as const },
    { label: "Rank", icon: Trophy, to: "/leader/leaderboard" as const },
    { label: "Profile", icon: User, to: "/leader/profile" as const },
  ];
}

// Re-export a sensible fallback in case a role slips through.
export const _DashboardIcon = LayoutDashboard;
