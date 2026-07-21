export type SaleStatus =
  | "draft"
  | "flat_locked"
  | "negotiation"
  | "documents_submitted"
  | "booking_received"
  | "verification"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "cancelled"
  | "on_hold"
  | "documentation_pending"
  | "loan_processing"
  | "registration_pending"
  | "registered"
  | "completed"
  | "expired"
  | "refunded";

export type ApprovalStatus =
  | "pending"
  | "submitted"
  | "approved"
  | "rejected"
  | "cancelled"
  | "changes_requested"
  | "hold";

export const SALE_STATUS_META: Record<
  SaleStatus,
  { label: string; tint: string; dot: string }
> = {
  draft: { label: "Draft", tint: "bg-muted text-muted-foreground", dot: "bg-muted-foreground" },
  flat_locked: { label: "Flat Locked", tint: "bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-100", dot: "bg-amber-500" },
  negotiation: { label: "Negotiation", tint: "bg-sky-100 text-sky-900 dark:bg-sky-500/20 dark:text-sky-100", dot: "bg-sky-500" },
  documents_submitted: { label: "Documents Submitted", tint: "bg-sky-100 text-sky-900 dark:bg-sky-500/20 dark:text-sky-100", dot: "bg-sky-500" },
  booking_received: { label: "Booking Received", tint: "bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-100", dot: "bg-emerald-500" },
  verification: { label: "Verification", tint: "bg-indigo-100 text-indigo-900 dark:bg-indigo-500/20 dark:text-indigo-100", dot: "bg-indigo-500" },
  pending_approval: { label: "Pending Approval", tint: "bg-yellow-100 text-yellow-900 dark:bg-yellow-500/20 dark:text-yellow-100", dot: "bg-yellow-500" },
  approved: { label: "Approved", tint: "bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-100", dot: "bg-emerald-500" },
  rejected: { label: "Rejected", tint: "bg-rose-100 text-rose-900 dark:bg-rose-500/20 dark:text-rose-100", dot: "bg-rose-500" },
  cancelled: { label: "Cancelled", tint: "bg-rose-100 text-rose-900 dark:bg-rose-500/20 dark:text-rose-100", dot: "bg-rose-500" },
  on_hold: { label: "On Hold", tint: "bg-slate-200 text-slate-900 dark:bg-slate-500/20 dark:text-slate-100", dot: "bg-slate-500" },
  documentation_pending: { label: "Docs Pending", tint: "bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-100", dot: "bg-amber-500" },
  loan_processing: { label: "Loan Processing", tint: "bg-blue-100 text-blue-900 dark:bg-blue-500/20 dark:text-blue-100", dot: "bg-blue-500" },
  registration_pending: { label: "Registration Pending", tint: "bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-100", dot: "bg-amber-500" },
  registered: { label: "Registered", tint: "bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-100", dot: "bg-emerald-500" },
  completed: { label: "Completed", tint: "bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-100", dot: "bg-emerald-500" },
  expired: { label: "Expired", tint: "bg-slate-200 text-slate-900 dark:bg-slate-500/20 dark:text-slate-100", dot: "bg-slate-500" },
  refunded: { label: "Refunded", tint: "bg-rose-100 text-rose-900 dark:bg-rose-500/20 dark:text-rose-100", dot: "bg-rose-500" },
};

export function saleMeta(status: string | null | undefined) {
  return SALE_STATUS_META[(status ?? "draft") as SaleStatus] ?? SALE_STATUS_META.draft;
}

export const APPROVAL_LABEL: Record<ApprovalStatus, string> = {
  pending: "Draft",
  submitted: "Awaiting Approval",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Cancelled",
  changes_requested: "Changes Requested",
  hold: "On Hold",
};
