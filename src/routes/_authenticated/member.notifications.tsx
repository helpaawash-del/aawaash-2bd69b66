import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Bell, Trash2, Search, CheckCheck, Circle } from "lucide-react";
import { useMemo, useState } from "react";
import { useSession } from "@/hooks/useSession";
import { RoleGuard } from "@/components/aawash/AuthGuard";
import { DashboardShell } from "@/components/aawash/DashboardShell";
import { SectionCard, EmptyState, SkeletonBlock } from "@/components/aawash/dashboard-kit";
import {
  listMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  deleteNotification,
} from "@/lib/leader.functions";

export const Route = createFileRoute("/_authenticated/member/notifications")({
  component: NotificationsPage,
  head: () => ({ meta: [{ title: "Notifications — Aawash" }] }),
});

function NotificationsPage() {
  return (
    <RoleGuard allow={["member", "team_leader", "super_admin"]}>
      <NotificationsContent />
    </RoleGuard>
  );
}

function NotificationsContent() {
  const { profile } = useSession();
  const qc = useQueryClient();
  const listFn = useServerFn(listMyNotifications);
  const markAllFn = useServerFn(markAllNotificationsRead);
  const markOneFn = useServerFn(markNotificationRead);
  const deleteFn = useServerFn(deleteNotification);

  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [q, setQ] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["member", "notifications"],
    queryFn: () => listFn(),
  });

  const markAll = useMutation({
    mutationFn: () => markAllFn(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["member", "notifications"] }),
  });
  const markOne = useMutation({
    mutationFn: (id: string) => markOneFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["member", "notifications"] }),
  });
  const del = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["member", "notifications"] }),
  });

  const filtered = useMemo(() => {
    let list = data ?? [];
    if (filter === "unread") list = list.filter((n) => !n.is_read);
    if (q.trim()) {
      const t = q.trim().toLowerCase();
      list = list.filter((n) => n.title.toLowerCase().includes(t) || (n.body || "").toLowerCase().includes(t));
    }
    return list;
  }, [data, filter, q]);

  const unread = (data ?? []).filter((n) => !n.is_read).length;

  return (
    <DashboardShell role="member" profile={profile}>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
            Inbox
          </div>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Notifications
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {unread > 0 ? `${unread} unread` : "You're all caught up."}
          </p>
        </div>
        <button
          onClick={() => markAll.mutate()}
          disabled={markAll.isPending || unread === 0}
          className="inline-flex h-10 items-center gap-1.5 rounded-2xl border border-border bg-surface px-3 text-xs font-semibold text-foreground shadow-[var(--shadow-soft)] disabled:opacity-50"
        >
          <CheckCheck size={14} /> Mark all read
        </button>
      </header>

      <section className="mt-6 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="Search notifications…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-12 w-full rounded-2xl border border-input bg-surface pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="glass-card flex items-center gap-1 rounded-2xl p-1">
          {(["all", "unread"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`h-10 rounded-xl px-3 text-xs font-semibold capitalize transition-colors ${
                filter === k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {k}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-4">
        <SectionCard title="Recent">
          {isLoading ? (
            <div className="grid gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonBlock key={i} className="h-16" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<Bell size={22} />}
              title="No notifications"
              body={q || filter === "unread" ? "Nothing matches your filter." : "You'll see commission, sales, and system alerts here."}
            />
          ) : (
            <ul className="flex flex-col gap-2">
              {filtered.map((n) => (
                <li
                  key={n.id}
                  className={`flex items-start gap-3 rounded-2xl border p-3 ${
                    n.is_read ? "border-border/40 bg-surface" : "border-primary/30 bg-primary-soft/40"
                  }`}
                >
                  <div className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl ${n.is_read ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground"}`}>
                    <Bell size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="truncate text-sm font-semibold text-foreground">{n.title}</div>
                      {!n.is_read && <Circle size={6} className="shrink-0 fill-primary text-primary" />}
                    </div>
                    {n.body && <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{n.body}</p>}
                    <div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                      {new Date(n.created_at).toLocaleString("en-IN")}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    {!n.is_read && (
                      <button
                        onClick={() => markOne.mutate(n.id)}
                        aria-label="Mark read"
                        className="grid h-8 w-8 place-items-center rounded-xl text-muted-foreground hover:bg-primary-soft hover:text-primary"
                      >
                        <CheckCheck size={14} />
                      </button>
                    )}
                    <button
                      onClick={() => del.mutate(n.id)}
                      aria-label="Delete"
                      className="grid h-8 w-8 place-items-center rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </section>
    </DashboardShell>
  );
}
