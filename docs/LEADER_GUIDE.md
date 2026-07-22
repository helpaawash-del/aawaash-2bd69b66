# Aawash — Team Leader Guide

## Login
- URL: `/auth`. Use Login ID + password provided by admin.
- First login prompts a password change.

## Dashboard (`/leader`)
- Personal + team KPIs: active members, pending approvals, month-to-date team revenue, wallet balance.
- Recent activity feed and notifications.

## Customers
- View all customers assigned to your team (`/leader/customers`).
- Filter by member, status, source. You can reassign a customer between your members.

## Members (`/leader/members`)
- Roster of your team (up to the configured cap, default 10).
- View per-member sales, commissions, and wallet activity.
- Cannot create/delete members — that's a Super Admin action.

## Sales
- `/leader/sales` — every sale drafted by your team members.
- **Team Leader Approval** step (if enabled) before Super Admin approval.
- Reject with reason to send back for edits.

## Commission & Wallet
- `/leader/wallet` — your 4-bucket balance (Available · Pending · Locked · Lifetime).
- You receive the full slab % on each team sale; members receive 30% of that.
- Ledger drilldown per sale.

## Withdrawal
- `/leader/withdrawals` — request between 25th and 30th of each month.
- Required: amount ≤ available balance, bank/UPI details on file.
- States: pending → approved → processing → completed.

## Leaderboard
- `/leader/analytics` — team members ranked by revenue, deals, commissions.

## Notifications & Profile
- Bell icon shows real-time updates (sale approved, withdrawal state changes, admin messages).
- Profile page: update mobile, address, bank/UPI (edit requires password confirmation).

## Complete Workflow Example
1. Member drafts a sale for a customer.
2. You review in `/leader/sales` → approve or send back.
3. Super Admin approves → wallet credits appear (Pending → Available after settlement).
4. On the 25th, request withdrawal.
5. Track state in `/leader/withdrawals`; funds hit bank after admin marks Complete.
