import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowLeft, Search, User, Home, IndianRupee, Loader2 } from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { RoleGuard } from "@/components/aawash/AuthGuard";
import { DashboardShell } from "@/components/aawash/DashboardShell";
import { SectionCard, EmptyState, formatINR } from "@/components/aawash/dashboard-kit";
import { listCustomers } from "@/lib/crm.functions";
import { createDraftSale, listAvailableFlats } from "@/lib/sales.functions";

export const Route = createFileRoute("/_authenticated/sales-workflow/new")({
  component: NewDraftGuarded,
  head: () => ({ meta: [{ title: "New Sale Draft — Aawash" }] }),
});

function NewDraftGuarded() {
  return (
    <RoleGuard allow={["member", "team_leader", "super_admin"]}>
      <NewDraftInner />
    </RoleGuard>
  );
}

function NewDraftInner() {
  const { role, profile } = useSession();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const fetchCustomers = useServerFn(listCustomers);
  const fetchInventory = useServerFn(listAvailableFlats);
  const submit = useServerFn(createDraftSale);

  const [customerId, setCustomerId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [flatId, setFlatId] = useState<string | null>(null);
  const [saleAmount, setSaleAmount] = useState<string>("");
  const [bookingAmount, setBookingAmount] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [customerQ, setCustomerQ] = useState("");

  const customersQ = useQuery({
    queryKey: ["sales-new-customers"],
    queryFn: () => fetchCustomers({ data: { scope: "mine", limit: 200 } }),
  });

  const inventoryQ = useQuery({
    queryKey: ["sales-new-inventory", projectId],
    queryFn: () => fetchInventory({ data: projectId ? { project_id: projectId } : {} }),
  });

  const mutation = useMutation({
    mutationFn: async () => {
      if (!customerId || !flatId || !saleAmount) throw new Error("Please complete every field.");
      return submit({
        data: {
          customer_id: customerId,
          flat_id: flatId,
          sale_amount: Number(saleAmount),
          booking_amount: Number(bookingAmount || 0),
          notes: notes || undefined,
          lock_minutes: 1440,
        },
      });
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["sales-list"] });
      qc.invalidateQueries({ queryKey: ["sales-overview"] });
      navigate({ to: "/sales-workflow/$id", params: { id: res.id } });
    },
  });

  const filteredCustomers = useMemo(() => {
    const list = customersQ.data ?? [];
    if (!customerQ.trim()) return list;
    const s = customerQ.trim().toLowerCase();
    return list.filter(
      (c) =>
        c.full_name.toLowerCase().includes(s) ||
        c.mobile_number.includes(s) ||
        (c.customer_code ?? "").toLowerCase().includes(s),
    );
  }, [customersQ.data, customerQ]);

  const selectedFlat = inventoryQ.data?.flats.find((f) => f.id === flatId) ?? null;

  return (
    <DashboardShell role={role ?? "member"} profile={profile}>
      <button
        type="button"
        onClick={() => navigate({ to: "/sales-workflow" })}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft size={16} /> Back to sales
      </button>

      <div className="space-y-6">
        <SectionCard title="1 · Customer" subtitle="Only your assigned customers can be attached to a draft sale.">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={customerQ}
              onChange={(e) => setCustomerQ(e.target.value)}
              placeholder="Search customer name / mobile / code"
              className="w-full rounded-full border border-border/60 bg-background/60 py-2 pl-9 pr-3 text-sm outline-none focus:border-primary/40"
            />
          </div>
          <div className="mt-3 max-h-72 space-y-1 overflow-y-auto rounded-2xl border border-border/50 bg-card/40 p-2">
            {customersQ.isLoading ? (
              <div className="p-3 text-sm text-muted-foreground">Loading…</div>
            ) : filteredCustomers.length === 0 ? (
              <EmptyState icon={<User className="size-6" />} title="No customers" body="Create a customer in CRM first." />
            ) : (
              filteredCustomers.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCustomerId(c.id)}
                  className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm transition ${
                    customerId === c.id ? "bg-primary/10 text-primary" : "hover:bg-muted/60"
                  }`}
                >
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{c.full_name}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {c.customer_code} · {c.mobile_number}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </SectionCard>

        <SectionCard title="2 · Flat" subtitle="Only available flats can be locked into a draft.">
          <div className="flex flex-wrap gap-2">
            <select
              value={projectId ?? ""}
              onChange={(e) => {
                setProjectId(e.target.value || null);
                setFlatId(null);
              }}
              className="rounded-full border border-border/60 bg-background/60 px-4 py-2 text-sm"
            >
              <option value="">All projects</option>
              {(inventoryQ.data?.projects ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-3 grid max-h-72 grid-cols-2 gap-2 overflow-y-auto rounded-2xl border border-border/50 bg-card/40 p-2 sm:grid-cols-3 md:grid-cols-4">
            {inventoryQ.isLoading ? (
              <div className="col-span-full p-3 text-sm text-muted-foreground">Loading inventory…</div>
            ) : (inventoryQ.data?.flats.length ?? 0) === 0 ? (
              <div className="col-span-full">
                <EmptyState icon={<Home className="size-6" />} title="No available flats" body="Try a different project." />
              </div>
            ) : (
              inventoryQ.data!.flats.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFlatId(f.id)}
                  className={`rounded-xl border p-2 text-left text-xs transition ${
                    flatId === f.id
                      ? "border-primary/60 bg-primary/10 text-primary"
                      : "border-border/50 hover:border-primary/30"
                  }`}
                >
                  <div className="font-mono font-semibold">{f.unit_code}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {f.configuration ?? "—"} · {f.area_sqft ? `${f.area_sqft} sqft` : "—"}
                  </div>
                  <div className="mt-0.5 text-[11px] font-semibold text-foreground">
                    {f.price ? formatINR(f.price) : "Price on request"}
                  </div>
                </button>
              ))
            )}
          </div>
        </SectionCard>

        <SectionCard title="3 · Pricing" subtitle="Locking creates a 24-hour reservation on the flat.">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Sale amount (₹)
              </span>
              <div className="relative">
                <IndianRupee className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="number"
                  inputMode="decimal"
                  value={saleAmount}
                  onChange={(e) => setSaleAmount(e.target.value)}
                  placeholder={selectedFlat?.price ? String(selectedFlat.price) : "2500000"}
                  className="w-full rounded-2xl border border-border/60 bg-background/60 py-2 pl-9 pr-3 text-sm outline-none focus:border-primary/40"
                />
              </div>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Booking amount (₹)
              </span>
              <div className="relative">
                <IndianRupee className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="number"
                  inputMode="decimal"
                  value={bookingAmount}
                  onChange={(e) => setBookingAmount(e.target.value)}
                  placeholder="100000"
                  className="w-full rounded-2xl border border-border/60 bg-background/60 py-2 pl-9 pr-3 text-sm outline-none focus:border-primary/40"
                />
              </div>
            </label>
          </div>
          <label className="mt-3 block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Notes (optional)
            </span>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any negotiation notes for the leader / admin…"
              className="w-full rounded-2xl border border-border/60 bg-background/60 p-3 text-sm outline-none focus:border-primary/40"
            />
          </label>

          {mutation.error ? (
            <div className="mt-3 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {(mutation.error as Error).message}
            </div>
          ) : null}

          <button
            type="button"
            disabled={mutation.isPending || !customerId || !flatId || !saleAmount}
            onClick={() => mutation.mutate()}
            className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-primary to-leaf px-5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] disabled:opacity-50"
          >
            {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Lock flat & create draft
          </button>
        </SectionCard>
      </div>
    </DashboardShell>
  );
}
