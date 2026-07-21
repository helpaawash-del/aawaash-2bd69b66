import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Building2, LayoutDashboard, Bell, User } from "lucide-react";
import { homePathForRole, type AppRole } from "@/lib/auth";

/**
 * Native app-style bottom navigation for authenticated mobile users.
 */
export function BottomNav({ role }: { role: AppRole }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const dash = homePathForRole(role);

  const items = [
    { label: "Home", icon: Home, href: "/" as const },
    { label: "Projects", icon: Building2, href: "/#projects" as const, external: true },
    { label: "Dashboard", icon: LayoutDashboard, href: dash },
    { label: "Alerts", icon: Bell, href: "/#" as const, external: true },
    { label: "Profile", icon: User, href: dash },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden">
      <div className="glass-card mx-auto flex max-w-md items-center justify-between rounded-3xl px-2 py-2 shadow-[var(--shadow-float)]">
        {items.map(({ label, icon: Icon, href, external }) => {
          const active = !external && pathname === href;
          const content = (
            <>
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
            </>
          );
          const className = `flex flex-1 flex-col items-center gap-0.5 rounded-2xl px-2 py-1.5 transition-all ${
            active ? "bg-primary-soft" : "hover:bg-primary-soft/60"
          }`;
          return external ? (
            <a key={label} href={href} className={className}>
              {content}
            </a>
          ) : (
            <Link key={label} to={href} className={className}>
              {content}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
