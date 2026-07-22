# Aawash — Member Guide

## Login
- URL: `/auth`. Login ID format: `[TEAM][MOBILE]` e.g. `A6207254199`. Password from admin/leader.

## Dashboard (`/member`)
- Wallet balance, active leads, sales pipeline, month earnings.

## Customer Registration (`/member/customers/new`)
- Required: name, mobile. Optional: email, address, source, tags, tip person.
- The customer is auto-assigned to you and your team.

## Lead Management
- `/member/customers` — your pipeline. Update status (new · contacted · site-visit · negotiation · won · lost).
- Add notes, schedule meetings, upload documents.

## Referral / Tip Person
- `/member/tip-persons` — register referral contacts.
- When you close a sale with a tip person attached, they earn exactly 0.5% of your commission.
- Tip person receives payouts via your wallet (auto-split on sale approval).

## Sales
- `/member/sales/new` — pick customer + project + flat. Flat is soft-locked while you complete the form.
- Submit for approval → Leader (optional) → Super Admin.
- Approval credits your commission (30% of leader amount) to Pending balance.

## Commission
- `/member/commissions` — per-sale breakdown, slab hit, tip share deducted.

## Wallet
- `/member/wallet` — 4 buckets (Available · Pending · Locked · Lifetime).
- Withdrawal button appears only during the withdrawal window (25th—30th).

## Withdrawal
- `/member/withdrawals` — enter amount, verify bank/UPI, submit.
- Funds move from Available → Locked → paid out after admin Complete.

## Notifications & Profile
- Bell shows sale/commission/withdrawal updates.
- Profile page: edit mobile, address, bank/UPI (requires password confirmation).

## Complete Workflow Example
1. Register a customer → schedule a site visit.
2. Convert to sale, submit → status "Pending Approval".
3. Once approved, commission appears in Pending balance.
4. After settlement it rolls into Available.
5. Between 25th and 30th, request a withdrawal → track status.
