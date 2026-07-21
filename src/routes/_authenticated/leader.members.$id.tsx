import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Phone, Mail, Calendar, Wallet, TrendingUp, IndianRupee, Trophy } from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { RoleGuard } from "@/components/aawash/AuthGuard";
import { DashboardShell } from "@/components/aawash/DashboardShell";
import {
  SectionCard,
  EmptyState,
  SkeletonBlock,
  formatINR,
  initials,
} from "@/components/aawash/dashboard-kit";
import { getMemberDetail } from "@/lib/leader.functions";

export const Route = createFileRoute("/_authenticated/leader/members/$id")({
  component: MemberDetailPage,
  head: () => ({ meta: [{ title: "Member Profile — Aawash" }] }),
});

function MemberDetailPage() {
  return (
    <RoleGuard allow={["team_leader", "super_admin"]}>
      <MemberDetailContent />
    </RoleGuard>
  );
}

function MemberDetailContent() {
  const { profile } = useSession();
  const { id } = Route.useParams();
  const fetchDetail = useServerFn(getMemberDetail);
  const { data, isLoading, error } = useQuery({
    queryKey: ["leader", "member", id],
    queryFn: () => fetchDetail({ data: { memberId: id } }),
  });

  return (
    <DashboardShell role="team_leader" profile={profile}>
      <Link
        to="/leader/members"
        className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={12} /> Back to Members
      </Link>

      {isLoading ? (
        <div className="mt-4 flex flex-col gap-3">
          <SkeletonBlock className="h-40" />
          <SkeletonBlock className="h-32" />
          <SkeletonBlock className="h-64" />
        </div>
      ) : error || !data ? (
        <div className="mt-4">
          <EmptyState
            icon={<TrendingUp size={22} />}
            title="Member not available"
            body={(error as Error)?.message || "This member isn't in your team, or has been removed."}
          />
        </div>
      ) : (
        <>
          <section className="glass-card mt-4 rounded-4xl p-5 shadow-[var(--shadow-float)] sm:p-8">
            <div className="flex flex-wrap items-center gap-4">
              <div className="grid h-16 w-16 shrink-0 place-items-center rounded-3xl bg-gradient-to-br from-primary to-leaf text-lg font-bold text-primary-foreground">
                {initials(data.member.full_name)}
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
                  {data.member.full_name}
                </h1>
                <div className="mt-1 font-mono text-xs text-muted-foreground">
                  {data.member.login_id} · {data.member.display_code}
                </div>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider ${
                  data.member.status === "active"
                    ? "bg-success/15 text-success"
                    : "bg-destructive/10 text-destructive"
                }`}
              >
                {data.member.status}
              </span>
            </div>

            <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <KV icon={<Phone size={12} />} label="Mobile" value={data.member.mobile_number} />
              <KV icon={<Mail size={12} />} label="Email" value={data.member.email ?? "—"} />
              <KV
                icon={<Calendar size={12} />}
                label="Joined"
                value={new Date(data.member.created_at).toLocaleDateString("en-IN")}
              />
              <KV icon={<TrendingUp size={12} />} label="Referrals" value={String(data.member.referral_count)} />
            </dl>
          </section>

          <section className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <MiniCard icon={<Wallet size={16} />} label="Wallet" value={formatINR(data.member.wallet_balance)} />
            <MiniCard icon={<IndianRupee size={16} />} label="Earnings" value={formatINR(data.member.total_earnings, { compact: true })} />
            <MiniCard icon={<TrendingUp size={16} />} label="Sales" value={formatINR(data.member.total_sales, { compact: true })} />
            <MiniCard icon={<Trophy size={16} />} label="Rank" value="—" accent="gold" />
          </section>

          <section className="mt-6 grid gap-5 lg:grid-cols-2">
            <SectionCard title="Recent sales">
              {data.sales.length === 0 ? (
                <EmptyState icon={<TrendingUp size={22} />} title="No sales yet" body="This member hasn't recorded any sales." />
              ) : (
                <ul className="flex flex-col gap-2">
                  {data.sales.map((s) => (
                    <li key={s.id} className="flex items-center gap-3 rounded-2xl border border-border/50 bg-surface p-3">
                      <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary-soft text-primary">
                        <TrendingUp size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-foreground">{s.buyer_name}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {new Date(s.sale_date).toLocaleDateString("en-IN")} · {s.unit_label || "Unit"}
                        </div>
                      </div>
                      <div className="text-sm font-bold text-foreground">{formatINR(s.deal_value, { compact: true })}</div>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>

            <SectionCard title="Recent commissions">
              {data.commissions.length === 0 ? (
                <EmptyState icon={<IndianRupee size={22} />} title="No commissions yet" body="Commissions appear once sales are recorded." />
              ) : (
                <ul className="flex flex-col gap-2">
                  {data.commissions.map((c) => (
                    <li key={c.id} className="flex items-center gap-3 rounded-2xl border border-border/50 bg-surface p-3">
                      <div className="grid h-9 w-9 place-items-center rounded-xl bg-gold/20 text-gold-foreground">
                        <IndianRupee size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-foreground">Tier {c.tier}</div>
                        <div className="text-[11px] capitalize text-muted-foreground">
                          {c.status} · {new Date(c.created_at).toLocaleDateString("en-IN")}
                        </div>
                      </div>
                      <div className="text-sm font-bold text-foreground">{formatINR(c.amount, { compact: true })}</div>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
          </section>

          <p className="mt-6 text-center text-[11px] text-muted-foreground">
            Only Super Admins can edit member details.
          </p>
        </>
      )}
    </DashboardShell>
  );
}

function KV({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <div className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {icon} {label}
      </div>
      <div className="mt-1 truncate text-sm font-semibold text-foreground">{value}</div>
    </div>
  );
}

function MiniCard({
  icon,
  label,
  value,
  accent = "primary",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: "primary" | "gold";
}) {
  return (
    <div className="glass-card rounded-3xl p-4 shadow-[var(--shadow-soft)]">
      <div
        className={`grid h-9 w-9 place-items-center rounded-xl ${
          accent === "gold" ? "bg-gold/15 text-gold-foreground" : "bg-primary-soft text-primary"
        }`}
      >
        {icon}
      </div>
      <div className="mt-3 text-lg font-extrabold tracking-tight text-foreground">{value}</div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
    </div>
  );
}
