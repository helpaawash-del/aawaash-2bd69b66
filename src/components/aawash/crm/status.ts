// Status metadata for the CRM customer lifecycle.

type StatusMeta = { label: string; tone: string };

// Note: keys must match the customer_status enum in the database.
export const CUSTOMER_STATUS_META: Record<string, StatusMeta> = {
  new_lead: { label: "New Lead", tone: "bg-primary-soft text-primary" },
  contacted: { label: "Contacted", tone: "bg-primary-soft text-primary" },
  meeting_scheduled: { label: "Meeting Scheduled", tone: "bg-gold/15 text-gold-foreground" },
  meeting_completed: { label: "Meeting Done", tone: "bg-gold/15 text-gold-foreground" },
  interested: { label: "Interested", tone: "bg-leaf/15 text-primary" },
  flat_selected: { label: "Flat Selected", tone: "bg-leaf/15 text-primary" },
  price_discussion: { label: "Price Talks", tone: "bg-leaf/15 text-primary" },
  documentation: { label: "Documentation", tone: "bg-primary-soft text-primary" },
  booking_amount: { label: "Booking Amount", tone: "bg-gold/20 text-gold-foreground" },
  booking_confirmed: { label: "Booking Confirmed", tone: "bg-gold/20 text-gold-foreground" },
  agreement: { label: "Agreement", tone: "bg-gold/20 text-gold-foreground" },
  registration: { label: "Registration", tone: "bg-gold/20 text-gold-foreground" },
  sale_completed: { label: "Sale Completed", tone: "bg-success/15 text-success" },
  commission_generated: { label: "Commission", tone: "bg-success/15 text-success" },
  closed: { label: "Closed", tone: "bg-muted text-muted-foreground" },
  not_interested: { label: "Not Interested", tone: "bg-destructive/10 text-destructive" },
  on_hold: { label: "On Hold", tone: "bg-muted text-muted-foreground" },
  cancelled: { label: "Cancelled", tone: "bg-destructive/10 text-destructive" },
  lost: { label: "Lost", tone: "bg-destructive/10 text-destructive" },
  future_followup: { label: "Future Follow-up", tone: "bg-primary-soft text-primary" },
};

export function priorityStyle(p: string | null | undefined): { label: string; className: string } | null {
  if (!p || p === "normal" || p === "low") return null;
  if (p === "vip") return { label: "VIP", className: "bg-gold/20 text-gold-foreground" };
  if (p === "high") return { label: "Hot", className: "bg-destructive/15 text-destructive" };
  return null;
}
