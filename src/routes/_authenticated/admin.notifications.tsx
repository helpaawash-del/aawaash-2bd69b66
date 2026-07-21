import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Bell, CheckCheck, Trash2, Search, Filter } from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { RoleGuard } from "@/components/aawash/AuthGuard";
import { AdminShell } from "@/components/aawash/admin/AdminShell";
import {
  listMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  deleteNotification,
} from "@/lib/leader.functions";

export const Route = createFileRoute("/_authenticated/admin/notifications")({
  component: AdminNotificationsPage,
  head: () => ({ meta: [{ title: "Notifications — Admin" }] }),
});

function AdminNotificationsPage() {
  return (
    <RoleGuard allow={["super_admin"]}>
      <Content />
    </RoleGuard>
  );
}

type Filter = "all" | "unread" | "read";

function Content() {
  const { profile } = useSession();
  const qc = useQueryClient();
  const list = useServerFn(listMyNotifications);
  const markAll = useServerFn(markAllNotificationsRead);
  const markOne = useServerFn(markNotificationRead);
  const del = useServerFn(deleteNotification);
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");

  const { data } = useQuery({
    queryKey: ["admin-notifications"],
    queryFn: () => list(),
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-notifications"] });

  const filtered = (data ?? []).filter((n) => {
    if (filter === "unread" && n.is_read) return false;
    if (filter === "read" && !n.is_read) return false;
    if (q && !`${n.title} ${n.body ?? ""}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <AdminShell role="super_admin" profile={profile}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            Notification center
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Financial, security, CRM and system alerts routed to your admin account.
          </p>
        </div>
        <button
          onClick={async () => {
            await markAll();
            refresh();
          }}
          className="inline-flex items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-2 text-sm font-semibold text-foreground shadow-[var(--shadow-soft)] hover:border-primary/40"
        >
          <CheckCheck size={16} /> Mark all read
        </button>
      </div>

      <div className="glass-card mb-4 flex flex-wrap items-center gap-3 rounded-3xl px-4 py-3 shadow-[var(--shadow-soft)]">
        <div className="flex flex-1 items-center gap-2">
          <Search size={16} className="text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search notifications"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-1.5 rounded-2xl border border-border bg-surface p-1">
          {(["all", "unread", "read"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold capitalize ${
                filter === f
                  ? "bg-gradient-to-r from-primary to-leaf text-primary-foreground shadow-[var(--shadow-glow)]"
                  : "text-muted-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="glass-card rounded-3xl p-2 shadow-[var(--shadow-soft)]">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-full bg-primary-soft text-primary">
              <Bell size={22} />
            </div>
            <div className="text-sm font-semibold text-foreground">You're all caught up</div>
            <div className="text-xs text-muted-foreground">
              New notifications from Aawash will appear here.
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((n) => (
              <li key={n.id} className={`flex items-start gap-3 px-4 py-4 ${n.is_read ? "" : "bg-primary-soft/40"}`}>
                <span
                  className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${n.is_read ? "bg-border" : "bg-primary"}`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-foreground">{n.title}</span>
                    <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                      {n.kind}
                    </span>
                  </div>
                  {n.body && (
                    <div className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {n.body}
                    </div>
                  )}
                  <div className="mt-1 text-[11px] font-medium text-muted-foreground">
                    {new Date(n.created_at).toLocaleString()}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {!n.is_read && (
                    <button
                      onClick={async () => {
                        await markOne({ data: { id: n.id } });
                        refresh();
                      }}
                      aria-label="Mark read"
                      className="grid h-9 w-9 place-items-center rounded-xl border border-border bg-surface text-muted-foreground hover:text-primary"
                    >
                      <CheckCheck size={15} />
                    </button>
                  )}
                  <button
                    onClick={async () => {
                      await del({ data: { id: n.id } });
                      refresh();
                    }}
                    aria-label="Delete"
                    className="grid h-9 w-9 place-items-center rounded-xl border border-border bg-surface text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-4 flex items-center gap-2 text-[11px] text-muted-foreground">
        <Filter size={12} /> Priority routing, push notifications and category preferences arrive in a
        future release.
      </div>
    </AdminShell>
  );
}
