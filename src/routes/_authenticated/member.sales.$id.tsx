import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Building2, Phone, User, IndianRupee, TrendingUp, Clock, FileText, CheckCircle2 } from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { RoleGuard } from "@/components/aawash/AuthGuard";
import { DashboardShell } from "@/components/aawash/DashboardShell";
import {
  SectionCard,
  EmptyState,
  SkeletonBlock,
  formatINR,
} from "@/components/aawash/dashboard-kit";
import { getMySaleDetail } from "@/lib/member.functions";

export const Route = createFileRoute("/_authenticated/member/sales/$id")({
  component: SaleDetailPage,
  head: () => ({ meta: [{ title: "Sale Details — Aawash" }] }),
});

function SaleDetailPage() {
  return (
    <RoleGuard allow={["member", "team_leader", "super_admin"]}>
      <SaleDetailContent />
    </RoleGuard>
  );
}

function SaleDetailContent() {
  const { profile } = useSession();
  const { id } = Route.useParams();
  const fn = useServerFn(getMySaleDetail);
  const { data, isLoading, error } = useQuery({
    queryKey: ["member", "sale", id],
    queryFn: () => fn({ data: { id } }),
  });

  return (
    <DashboardShell role="member" profile={profile}>
      <Link
        to="/member/sales"
        className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={12} /> Back to Sales
      </Link>

      {isLoading ? (
        <div className="mt-4 grid gap-3">
          <SkeletonBlock className="h-40" />
          <SkeletonBlock className="h-32" />
        </div>
      ) : error || !data ? (
        <div className="mt-4">
          <EmptyState
            icon={<FileText size={22} />}
            title="Sale unavailable"
            body="This sale isn't accessible from your account."
          />
        </div>
      ) : (
        <>
          <section className="glass-card mt-4 rounded-4xl p-5 shadow-[var(--shadow-float)] sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
                  Sale #{data.sale.id.slice(0, 8).toUpperCase()}
                </div>
                <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
                  {data.project?.name || "Project"}
                </h1>
                <div className="mt-1 text-sm text-muted-foreground">
                  {data.project?.location || "—"} · Unit {data.sale.unit_label || "—"}
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-extrabold tracking-tight text-foreground">
                  {formatINR(data.sale.deal_value)}
                </div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Deal value
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <StatusChip label={`Sale: ${data.sale.status}`} tone={toneFor(data.sale.status)} />
              <StatusChip label={`Payment: ${data.sale.payment_status}`} tone={toneFor(data.sale.payment_status)} />
              <StatusChip label={`Customer: ${data.sale.customer_status}`} tone="neutral" />
            </div>
          </section>

          <section className="mt-5 grid gap-5 lg:grid-cols-2">
            <SectionCard title="Customer">
              <div className="grid gap-3">
                <KV icon={<User size={12} />} label="Name" value={data.sale.buyer_name} />
                <KV icon={<Phone size={12} />} label="Contact" value={data.sale.buyer_mobile || "Hidden by Admin"} mono={!!data.sale.buyer_mobile} />
                <KV icon={<Building2 size={12} />} label="Project" value={data.project?.name || "—"} />
                <KV icon={<Clock size={12} />} label="Sale date" value={new Date(data.sale.sale_date).toLocaleDateString("en-IN")} />
              </div>
            </SectionCard>

            <SectionCard title="Commission">
              {data.commissions.length === 0 ? (
                <EmptyState icon={<IndianRupee size={22} />} title="Not credited yet" body="Commission appears once the sale is settled." />
              ) : (
                <ul className="flex flex-col gap-2">
                  {data.commissions.map((c) => (
                    <li key={c.id} className="flex items-center gap-3 rounded-2xl border border-border/50 bg-surface p-3">
                      <div className="grid h-9 w-9 place-items-center rounded-xl bg-gold/20 text-gold-foreground">
                        <IndianRupee size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-foreground">Tier {c.tier}</div>
                        <div className="text-[11px] capitalize text-muted-foreground">{c.status}</div>
                      </div>
                      <div className="text-sm font-bold text-foreground">{formatINR(c.amount)}</div>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
          </section>

          <section className="mt-5">
            <SectionCard title="Timeline">
              <ol className="relative flex flex-col gap-4 border-l border-border/50 pl-5">
                <TimelineItem
                  icon={<TrendingUp size={12} />}
                  title="Sale submitted"
                  date={data.sale.created_at}
                  tone="primary"
                  done
                />
                <TimelineItem
                  icon={<CheckCircle2 size={12} />}
                  title={`Sale ${data.sale.status}`}
                  date={data.sale.created_at}
                  tone={data.sale.status === "confirmed" ? "success" : data.sale.status === "cancelled" ? "destructive" : "warning"}
                  done={data.sale.status !== "pending"}
                />
                <TimelineItem
                  icon={<IndianRupee size={12} />}
                  title="Commission credited"
                  date={data.commissions[0]?.created_at ?? null}
                  tone="gold"
                  done={data.commissions.length > 0}
                />
              </ol>
            </SectionCard>
          </section>

          <section className="mt-5">
            <SectionCard title="Documents" subtitle="Attachments will appear here once available.">
              <EmptyState icon={<FileText size={22} />} title="No documents yet" body="Your Admin can attach agreements and receipts later." />
            </SectionCard>
          </section>
        </>
      )}
    </DashboardShell>
  );
}

function toneFor(status: string): "success" | "warning" | "destructive" | "neutral" {
  if (["confirmed", "paid", "approved", "purchased"].includes(status)) return "success";
  if (["pending", "partial", "not_scheduled", "open"].includes(status)) return "warning";
  if (["cancelled", "rejected"].includes(status)) return "destructive";
  return "neutral";
}

function StatusChip({ label, tone }: { label: string; tone: "success" | "warning" | "destructive" | "neutral" }) {
  const map: Record<string, string> = {
    success: "bg-success/15 text-success",
    warning: "bg-warning/15 text-warning",
    destructive: "bg-destructive/10 text-destructive",
    neutral: "bg-muted text-muted-foreground",
  };
  return (
    <span className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wider ${map[tone]}`}>
      {label}
    </span>
  );
}

function KV({ icon, label, value, mono = false }: { icon: React.ReactNode; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/50 bg-surface p-3">
      <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {icon} {label}
      </div>
      <div className={`truncate text-sm font-semibold text-foreground ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}

function TimelineItem({
  icon,
  title,
  date,
  tone,
  done,
}: {
  icon: React.ReactNode;
  title: string;
  date: string | null;
  tone: "primary" | "success" | "warning" | "destructive" | "gold";
  done: boolean;
}) {
  const dotMap: Record<string, string> = {
    primary: "bg-primary text-primary-foreground",
    success: "bg-success text-white",
    warning: "bg-warning text-white",
    destructive: "bg-destructive text-destructive-foreground",
    gold: "bg-gold text-gold-foreground",
  };
  return (
    <li className="relative">
      <span
        className={`absolute -left-[26px] top-1 grid h-5 w-5 place-items-center rounded-full ring-4 ring-background ${
          done ? dotMap[tone] : "bg-muted text-muted-foreground"
        }`}
      >
        {icon}
      </span>
      <div className="text-sm font-semibold text-foreground">{title}</div>
      <div className="text-[11px] text-muted-foreground">
        {date ? new Date(date).toLocaleString("en-IN") : "Pending"}
      </div>
    </li>
  );
}
