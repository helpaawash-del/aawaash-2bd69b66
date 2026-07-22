# Aawash — API & Server Function Reference

Every server function is defined with `createServerFn` in `src/lib/*.functions.ts`. Inputs are validated with Zod (or inline typed validators). Protected functions apply `requireSupabaseAuth` middleware and receive `{ supabase, userId, claims }` in `context`. Errors throw `Response` objects mapped to HTTP status codes.

## Convention
- **Auth**: `PROT` = requires session; `PUB` = anonymous allowed; `ADMIN` = requires `has_role(super_admin)`; `LEADER` = requires `team_leader`.
- **Errors**: `401` unauthenticated · `403` forbidden · `400` validation · `404` missing · `409` conflict · `500` unexpected.

## Auth (`auth.functions.ts`)
| Function | Auth | Purpose |
|---|---|---|
| `signIn` | PUB | Email/password login. |
| `signOut` | PROT | Ends the session. |
| `getSessionUser` | PROT | Returns hydrated profile + role. |

## Admin Overview (`admin-overview.functions.ts`)
| `getAdminOverview` | ADMIN | KPIs, sales trend, system status, activity feed for `/admin`. |

## Team Leaders (`team-leaders.functions.ts`)
| `listTeamLeaders` | ADMIN | Directory with stats. |
| `createTeamLeaderFull` | ADMIN | Creates auth user + team + profile atomically. |
| `updateTeamLeader` / `resetLeaderPassword` | ADMIN | Edit / reset flows. |
| `getLeaderDetail` | ADMIN | 6-tab profile aggregate. |

## Members (`members-admin.functions.ts`, `member.functions.ts`, `leader.functions.ts`)
| `listAllMembers` | ADMIN | Directory. |
| `createMemberFull` | ADMIN | Auth + profile + team assignment (respects 10/leader cap). |
| `updateMember`, `changeMemberTeam` | ADMIN | Edit + reassignment. |
| `getMemberDetail` | ADMIN | Aggregate. |
| `member.getDashboard`, `member.listCustomers`, `member.listTipPersons` | PROT | Member surface. |
| `leader.getTeamOverview`, `leader.listTeamMembers`, `leader.approveTeamSale` | LEADER | Leader surface. |

## Customers CRM (`customers-admin.functions.ts`, `crm.functions.ts`)
| `listCustomersAdmin` | ADMIN | Global filters (source, status, team, tags). |
| `scanCustomerDuplicates` | ADMIN | Fuzzy match by mobile + name. |
| `mergeCustomers` | ADMIN | Wraps `admin_merge_customers` RPC — keeps target. |
| `bulkReassignCustomers` | ADMIN | Wraps `admin_bulk_reassign_customers`. |
| `createCustomerDocumentSignedUrl` | PROT | Storage signed URL (10 min). |
| `crm.createCustomer` / `updateCustomer` / `deleteCustomer` | PROT | Guarded by `can_access_customer`. |

## Projects & Inventory (`projects.functions.ts`, `project-admin.functions.ts`, `inventory.functions.ts`)
| `listProjects` (PUB), `getProjectPublic` (PUB) | Public marketing surface. |
| `createProject`, `updateProject`, `duplicateProject` | ADMIN | Deep-duplication copies buildings/floors/flats. |
| `bulkCreateFlats`, `updateFlat` | ADMIN | Structural ops. |
| `inventory.getGrid` | PROT | Real-time inventory heatmap. |

## Sales (`sales.functions.ts`)
| `createSale` | PROT | Member/Leader draft; locks flat via `flat_locks`. |
| `submitSaleForApproval` | PROT | Moves to admin queue. |
| `approveSale` / `rejectSale` | ADMIN | Wraps `sales_approve`; triggers commission engine. |
| `listSalesAdmin`, `getSaleDetail` | ADMIN | Console reads. |

## Commissions (`commissions.functions.ts`)
| `listCommissionSlabs` (ADMIN), `updateCommissionSlab` (ADMIN) | Slab management. |
| `getMyCommissions` (PROT) | Ledger view. |
| `recalculateCommissions` (ADMIN) | Manual re-run for a sale. |

## Wallet (`wallet.functions.ts`)
| `getMyWallet` | PROT | 4-bucket balance + recent ledger. |
| `requestWithdrawal` | PROT | 25th—30th window; wraps `wallet_request_withdrawal`. |
| `listMyWithdrawals` | PROT | History. |
| `admin.listWithdrawals`, `admin.transitionWithdrawal` | ADMIN | Lifecycle ops. |

## Finance (`finance-admin.functions.ts`)
| `getFinancialDashboard` | ADMIN | Revenue by project/team, commission totals. |
| `listAllWallets` | ADMIN | Balance directory. |
| `adjustWallet` | ADMIN | Wraps `wallet_admin_adjust` — logged. |

## Analytics (`analytics.functions.ts`)
| `getAdminAnalytics`, `getLeaderAnalytics`, `getMemberAnalytics`, `getLeaderboards` | Role-scoped aggregates for `/admin/analytics`, `/leader/analytics`, `/member/analytics`, and `/admin/reports`. |

## CMS (`cms.functions.ts`)
| `listPages`, `getPage`, `savePageDraft`, `publishPage`, `rollbackPage` | ADMIN | Wrap `cms_*` RPCs. |
| `updateBrandSettings`, `updateGlobalContent` | ADMIN | Singletons. |

## DAM (`dam.functions.ts`)
| `getDamDashboard` | ADMIN | KPIs. |
| `listFolders`, `createFolder`, `renameFolder`, `deleteFolder` | ADMIN | Folder ops. |
| `uploadAsset`, `replaceAsset`, `rollbackAsset`, `deleteAsset` | ADMIN | Version-aware file ops. |
| `logAssetUsage` | PROT | Reverse index writes. |

## System (`system.functions.ts`)
| `getSystemHealth`, `runIntegrityChecks`, `runMaintenance` | ADMIN | Wraps `system_*` RPCs. |
| `listAuditLogs` | ADMIN | Filtered by actor/action. |

---

## HTTP Routes (`src/routes/api/`)

### `GET /api/public/health` — PUB
Machine-readable liveness. Returns 200 or 503 with per-check status (`env`, `db`, `storage`, `auth`).

### `POST /api/public/hooks/system-maintenance` — PUB (guarded)
Called by pg_cron daily. Requires **both**:
- `apikey: <SUPABASE_PUBLISHABLE_KEY>`
- `x-maintenance-secret: <SYSTEM_MAINTENANCE_SECRET>` (48-char random)

Runs `system_run_maintenance` + integrity checks. Writes to `system_job_runs`.

## Background Jobs
| Job | Trigger | Purpose |
|---|---|---|
| Daily maintenance | pg_cron 02:00 IST | Reconciles wallet balances, expires stale `flat_locks`, purges old drafts. |
| Withdrawal window watcher | Client-side derived from `system_settings.withdrawal_window`. |

## Secrets (env)
- `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `SYSTEM_MAINTENANCE_SECRET`
Redaction via `env-validation.ts`; structured JSON logs via `logger.ts`.
