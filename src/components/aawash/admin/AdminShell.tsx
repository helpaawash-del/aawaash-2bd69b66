import { useEffect, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  LayoutDashboard,
  Building2,
  Users,
  UserCog,
  Coins,
  Wallet,
  BarChart3,
  Activity,
  Bell,
  Search,
  Menu,
  X,
  LogOut,
  ChevronRight,
  ShieldCheck,
  Home,
  ClipboardList,
  Loader2,
  Settings2,
  UserCircle2,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AmbientBackground } from "../AmbientBackground";
import { SkylineFrame } from "../SkylineFrame";
import { BrandMark } from "../BrandMark";
import type { AawashProfile } from "@/hooks/useSession";
import type { AppRole } from "@/lib/auth";
import { globalAdminSearch } from "@/lib/admin-overview.functions";
import { listMyNotifications, markAllNotificationsRead } from "@/lib/leader.functions";

type NavGroup = {
  label: string;
  items: Array<{ to: string; label: string; icon: React.ElementType; prefix?: string }>;
};

const NAV: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Business",
    items: [
      { to: "/admin/projects", label: "Projects", icon: Building2, prefix: "/admin/projects" },
      { to: "/admin/customers", label: "Customers CRM", icon: ClipboardList, prefix: "/admin/customers" },
      { to: "/sales-workflow", label: "Sales", icon: Home, prefix: "/sales-workflow" },
    ],
  },
  {
    label: "People",
    items: [
      { to: "/admin/team-leaders", label: "Team Leaders", icon: UserCog, prefix: "/admin/team-leaders" },
      { to: "/admin/members", label: "Members", icon: Users, prefix: "/admin/members" },
      { to: "/admin/users", label: "Users Directory", icon: Users, prefix: "/admin/users" },
    ],
  },
  {
    label: "Finance",
    items: [
      { to: "/admin/finance", label: "Financial Console", icon: Coins, prefix: "/admin/finance" },
      { to: "/admin/commissions", label: "Commissions", icon: Coins, prefix: "/admin/commissions" },
      { to: "/admin/withdrawals", label: "Withdrawals", icon: Wallet, prefix: "/admin/withdrawals" },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { to: "/admin/analytics", label: "Analytics & BI", icon: BarChart3, prefix: "/admin/analytics" },
      { to: "/admin/reports", label: "Reports & Executive", icon: ClipboardList, prefix: "/admin/reports" },
      { to: "/admin/system", label: "System Health", icon: Activity, prefix: "/admin/system" },
    ],
  },
  {
    label: "Website CMS",
    items: [
      { to: "/admin/homepage", label: "Public Homepage", icon: Home, prefix: "/admin/homepage" },
      { to: "/admin/cms/pages", label: "Pages & Builder", icon: Sparkles, prefix: "/admin/cms/pages" },

      { to: "/admin/cms/brand", label: "Brand & Theme", icon: Settings2, prefix: "/admin/cms/brand" },
      { to: "/admin/cms/global", label: "Global Content", icon: ClipboardList, prefix: "/admin/cms/global" },
      { to: "/admin/media", label: "Media Library (DAM)", icon: LayoutDashboard, prefix: "/admin/media" },
    ],
  },
  {
    label: "Account",
    items: [
      { to: "/admin/notifications", label: "Notifications", icon: Bell, prefix: "/admin/notifications" },
      { to: "/admin/profile", label: "Profile", icon: UserCircle2, prefix: "/admin/profile" },
    ],
  },
];

export function AdminShell({
  profile,
  children,
}: {
  role?: AppRole;
  profile: AawashProfile | null;
  children: React.ReactNode;
}) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // Close drawer on route change
  useEffect(() => {
    setMobileOpen(false);
    setSearchOpen(false);
    setNotifOpen(false);
  }, [pathname]);

  const initials = (profile?.full_name || profile?.login_id || "AA")
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

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

  const listNotifs = useServerFn(listMyNotifications);
  const markAll = useServerFn(markAllNotificationsRead);
  const { data: notifs } = useQuery({
    queryKey: ["admin-shell", "notifications"],
    queryFn: () => listNotifs(),
    refetchInterval: 60_000,
  });
  const unreadCount = (notifs ?? []).filter((n) => !n.is_read).length;

  return (
    <div className="relative min-h-screen">
      <AmbientBackground />
      <SkylineFrame />


      {/* Sidebar — desktop */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-border/60 bg-surface/80 backdrop-blur-xl shadow-[var(--shadow-soft)] transition-[width] duration-300 lg:flex ${
          collapsed ? "w-[76px]" : "w-[260px]"
        }`}
      >
        <div className="flex h-16 items-center justify-between px-4">
          {!collapsed ? <BrandMark size="sm" /> : <BrandMark size="sm" showWordmark={false} />}
          <button
            onClick={() => setCollapsed((c) => !c)}
            aria-label="Toggle sidebar"
            className="grid h-9 w-9 place-items-center rounded-xl border border-border bg-surface text-muted-foreground hover:text-foreground"
          >
            <ChevronRight
              size={16}
              className={`transition-transform ${collapsed ? "" : "rotate-180"}`}
            />
          </button>
        </div>
        <SidebarNav pathname={pathname} collapsed={collapsed} />
        <div className="border-t border-border/60 p-3">
          <button
            disabled={signingOut}
            onClick={handleSignOut}
            className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive ${collapsed ? "justify-center" : ""}`}
          >
            {signingOut ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
            {!collapsed && <span>Sign out</span>}
          </button>
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" />
          <aside
            className="absolute inset-y-0 left-0 flex w-[280px] flex-col border-r border-border/60 bg-surface shadow-[var(--shadow-float)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex h-16 items-center justify-between px-4">
              <BrandMark size="sm" />
              <button
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
                className="grid h-9 w-9 place-items-center rounded-xl border border-border"
              >
                <X size={16} />
              </button>
            </div>
            <SidebarNav pathname={pathname} collapsed={false} />
            <div className="border-t border-border/60 p-3">
              <button
                disabled={signingOut}
                onClick={handleSignOut}
                className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                {signingOut ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
                <span>Sign out</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main column */}
      <div
        className={`relative flex min-h-screen flex-col transition-[padding] duration-300 ${
          collapsed ? "lg:pl-[76px]" : "lg:pl-[260px]"
        }`}
      >
        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-border/50 bg-background/70 backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
            <button
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-border bg-surface lg:hidden"
            >
              <Menu size={18} />
            </button>

            <button
              onClick={() => setSearchOpen(true)}
              className="glass-card flex flex-1 items-center gap-2 rounded-2xl px-4 py-2.5 text-sm text-muted-foreground shadow-[var(--shadow-soft)] transition-colors hover:text-foreground"
              aria-label="Global search"
            >
              <Search size={16} />
              <span className="hidden sm:inline">Search projects, customers, sales, people…</span>
              <span className="sm:hidden">Search…</span>
              <kbd className="ml-auto hidden rounded-md border border-border bg-surface px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline">/</kbd>
            </button>

            <div className="relative">
              <button
                onClick={() => setNotifOpen((o) => !o)}
                aria-label="Notifications"
                className="relative grid h-10 w-10 place-items-center rounded-2xl border border-border bg-surface transition-colors hover:text-primary"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 grid min-h-[18px] min-w-[18px] place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
              {notifOpen && (
                <NotificationsDropdown
                  onClose={() => setNotifOpen(false)}
                  notifs={notifs ?? []}
                  onMarkAll={async () => {
                    await markAll();
                    qc.invalidateQueries({ queryKey: ["admin-shell", "notifications"] });
                  }}
                />
              )}
            </div>

            <Link
              to="/admin/profile"
              className="hidden items-center gap-2 rounded-2xl border border-border bg-surface px-3 py-1.5 shadow-[var(--shadow-soft)] transition-colors hover:border-primary/40 sm:flex"
              aria-label="Admin profile"
            >
              <div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-primary to-leaf text-xs font-bold text-primary-foreground">
                {initials}
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-xs font-semibold text-foreground">
                  {profile?.full_name || profile?.login_id || "Admin"}
                </span>
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Super Admin
                </span>
              </div>
            </Link>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl px-4 pb-32 pt-6 sm:px-6 lg:px-8">{children}</main>
      </div>

      {searchOpen && <GlobalSearchModal onClose={() => setSearchOpen(false)} />}
    </div>
  );
}

function SidebarNav({ pathname, collapsed }: { pathname: string; collapsed: boolean }) {
  return (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
      {NAV.map((group) => (
        <div key={group.label}>
          {!collapsed && (
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {group.label}
            </div>
          )}
          <ul className="space-y-1">
            {group.items.map((item) => {
              const Icon = item.icon;
              const active =
                pathname === item.to ||
                (item.prefix && pathname.startsWith(item.prefix)) ||
                false;
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className={`group relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition-all ${
                      active
                        ? "bg-gradient-to-r from-primary to-leaf text-primary-foreground shadow-[var(--shadow-glow)]"
                        : "text-muted-foreground hover:bg-primary-soft hover:text-foreground"
                    } ${collapsed ? "justify-center" : ""}`}
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon size={18} strokeWidth={active ? 2.4 : 2} />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function NotificationsDropdown({
  onClose,
  notifs,
  onMarkAll,
}: {
  onClose: () => void;
  notifs: Array<{ id: string; title: string; body: string | null; is_read: boolean; created_at: string }>;
  onMarkAll: () => Promise<void>;
}) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute right-0 top-12 z-50 w-[min(92vw,380px)] overflow-hidden rounded-3xl border border-border bg-surface shadow-[var(--shadow-float)]">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="text-sm font-bold text-foreground">Notifications</div>
          <button
            onClick={onMarkAll}
            className="text-[11px] font-semibold text-primary hover:underline"
          >
            Mark all read
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {notifs.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">
              You're all caught up.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {notifs.slice(0, 12).map((n) => (
                <li
                  key={n.id}
                  className={`px-4 py-3 ${n.is_read ? "" : "bg-primary-soft/40"}`}
                >
                  <div className="flex items-start gap-2">
                    {!n.is_read && (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                    )}
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-foreground">
                        {n.title}
                      </div>
                      {n.body && (
                        <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                          {n.body}
                        </div>
                      )}
                      <div className="mt-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        {new Date(n.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="border-t border-border bg-surface-warm/50 px-4 py-2 text-right">
          <Link
            to="/admin/notifications"
            className="text-xs font-semibold text-primary hover:underline"
          >
            View all →
          </Link>
        </div>
      </div>
    </>
  );
}

function GlobalSearchModal({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const search = useServerFn(globalAdminSearch);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 220);
    return () => clearTimeout(t);
  }, [q]);

  const { data, isFetching } = useQuery({
    queryKey: ["admin-search", debounced],
    queryFn: () => search({ data: { q: debounced } }),
    enabled: debounced.length > 1,
  });

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 pt-[10vh]" onClick={onClose}>
      <div className="absolute inset-0 bg-foreground/25 backdrop-blur-md" />
      <div
        className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-border bg-surface shadow-[var(--shadow-float)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <Search size={18} className="text-muted-foreground" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search projects, customers, sales, people…"
            className="flex-1 bg-transparent text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          {isFetching && <Loader2 size={16} className="animate-spin text-muted-foreground" />}
          <button
            onClick={onClose}
            aria-label="Close search"
            className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-primary-soft"
          >
            <X size={16} />
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {debounced.length <= 1 ? (
            <div className="px-6 py-10 text-center text-sm text-muted-foreground">
              Start typing to search across the platform.
            </div>
          ) : !data ? null : (
            <div className="divide-y divide-border">
              <ResultGroup label="Projects" items={data.projects.map((p) => ({
                to: `/projects/${p.slug}`,
                title: p.name,
                sub: p.location ?? "",
              }))} />
              <ResultGroup label="Customers" items={data.customers.map((c) => ({
                to: `/crm/${c.id}`,
                title: c.full_name,
                sub: c.mobile_number ?? "",
              }))} />
              <ResultGroup label="Sales" items={data.sales.map((s) => ({
                to: `/sales-workflow/${s.id}`,
                title: s.buyer_name || s.sale_number || "Sale",
                sub: s.sale_status,
              }))} />
              <ResultGroup label="People" items={data.users.map((u) => ({
                to: `/admin/users`,
                title: u.full_name,
                sub: `${u.login_id} · ${u.mobile_number ?? ""}`,
              }))} />
              {data.projects.length === 0 && data.customers.length === 0 &&
                data.sales.length === 0 && data.users.length === 0 && (
                <div className="px-6 py-10 text-center text-sm text-muted-foreground">
                  No results for "{debounced}"
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ResultGroup({
  label,
  items,
}: {
  label: string;
  items: Array<{ to: string; title: string; sub: string }>;
}) {
  if (items.length === 0) return null;
  return (
    <div className="px-2 py-2">
      <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <ul>
        {items.map((it) => (
          <li key={it.to + it.title}>
            <Link
              to={it.to}
              className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors hover:bg-primary-soft"
            >
              <div className="min-w-0">
                <div className="truncate font-semibold text-foreground">{it.title}</div>
                {it.sub && <div className="truncate text-xs text-muted-foreground">{it.sub}</div>}
              </div>
              <ChevronRight size={14} className="text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Re-export unused icons so tree-shakers keep them for future expansion.
export const _AdminShellIcons = { ShieldCheck, UserCog, Settings2, Sparkles };
