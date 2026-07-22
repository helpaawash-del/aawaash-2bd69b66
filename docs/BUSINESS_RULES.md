# Aawash — Business Rules

Canonical business logic. Any change here MUST propagate to migrations, RPCs, and UI simultaneously.

## Commission Split
| Role | Share |
|---|---|
| Team Leader | Full slab % of `deal_value` |
| Member (Seller) | **Exactly 30%** of the Team Leader amount |
| Tip Person | **Exactly 0.5%** of the Member amount |

Enforced in `commission_engine` RPC and `commission_settings` singleton. Percentages are locked constants; slab % is admin-configurable via `commission_slabs`.

## Commission Slabs
Default enterprise slabs (₹0 → ₹10Cr+). Slab match is `deal_value BETWEEN min AND max`. Changing a slab does not retroactively re-price approved sales; use `recalculateCommissions` for that.

## Withdrawal Window
- Allowed only on days **25—30** (inclusive) of each calendar month, in the platform timezone.
- Enforced server-side by `wallet_request_withdrawal`. UI hides the button outside the window but never trusts it.
- Configurable in `system_settings.withdrawal_window`.

## Inventory Integrity
- A flat's `status` transitions: `available → hold → sold`. Sold is terminal unless admin reverses via `flat_admin_reset`.
- `flat_locks` expire automatically (default 30 min) and are cleared by daily maintenance.
- Approving a sale sets flat to `sold` and prevents any concurrent draft from being approved (unique partial index on `sales(flat_id) WHERE approval_status = 'approved'`).

## Wallet Integrity
- Balance columns on `profiles` are guarded by `profiles_guard_self_update` — self-updates that touch balances are silently reverted.
- Only `wallet_*` RPCs may write balances. Every RPC writes a matching `commission_ledger` row and `audit_logs` entry.
- Invariant: `SUM(commission_ledger.credit - debit) per user == profiles.lifetime_earnings - profiles.pending_balance_reserved`. Verified nightly by `system_run_integrity_checks`.

## Sales Approval Authority
- Only Super Admin may set `approval_status = approved`. Leader approval (if enabled) sets `leader_approved_at` but not final status.
- `sales_guard_self_update` reverts any attempt by the seller to modify `deal_value` or `approval_status`.

## No Manual Financial Edits
- There is no direct UI or RPC that patches a wallet balance without a matching ledger row and audit log.
- `wallet_admin_adjust` requires a reason and creates both.

## Team Limits
- Max active team leaders: 3 (configurable).
- Max active members per leader: 10 (configurable).
- Enforced in `createTeamLeaderFull` and `createMemberFull`.

## Customer Access
- A customer is visible only to: assigned member, that team's leader, and Super Admin.
- Centralized in `can_access_customer(uuid)`; all customer-child tables delegate here.
