# CHADWMS Enterprise Implementation Sequence

Status: implementation roadmap, not proof of production readiness.

## Phase 1: Inventory integrity and security
1. Movement audit: read-only branch/date/item movement viewer. Implemented at /inventory/movements; requires deployment and access testing.
2. Inventory ledger: design a canonical transaction journal with unique idempotency keys, item/branch/location quantities, actor, timestamps, document reference, reason, and reversal linkage. Do not migrate live stock until reconciled.
3. Server authorization: current WmsAuthGuard confirms a login, but does not enforce department, branch, or Tier 1–7 permissions. Add server-side authorization and database RLS before expanding write APIs.
4. Approval rules: adjustments, recount variances, and high-value exceptions require approvals and prohibit self-approval.
5. Automated tests: ensure no negative available stock, no double posting, correct cross-branch transfers, and reversal traceability.

## Phase 2: Warehouse execution
6. Cycle count tasks and live totals: deduplicate count credit by item/location/count cycle; distinguish count, recount, and variance.
7. Lift driver moves: scan LPN or item, source, and destination; atomic inventory move; one movement credit and 0.5 credit for qualifying pulldowns, with no double count.
8. Primary-only picking: replace sample orders with validated order lines and primary location assignments; create replenishment tasks on shortages.
9. Receiving and putaway: enforce receiving verification, pallet labels, OSD, staging and putaway scan confirmation.
10. Interbranch transfers: reserve source, dispatch in-transit, verify receipt at destination; avoid double counting.
11. Offline scanning: queue signed scan intents, reconcile conflicts, and prevent replay on reconnect.

## Phase 3: ERP replacement
12. Sales and customer accounts, pricing, sales orders, shipping, returns.
13. Purchasing, vendor management, receipts and three-way match.
14. Accounting: GL, AP, AR, valuation, COGS, tax, financial period locks.
15. Great Plains migration: schema mapping, staged imports, parallel operations, daily reconciliation and rollback plan.

## Phase 4: Enterprise operations
16. Branch-aware workforce and certification management.
17. Help center: persisted tickets, chat delivery, routing, escalation and attachments.
18. Dashboards: operational KPIs, exception alerts, cross-branch reporting.
19. Observability, backups, disaster recovery, audit exports and incident response.
20. OH01 pilot, training, performance testing and controlled rollout.

## Mandatory release gates
- No production inventory changes without authorization, idempotency and audit records.
- Do not expose service-role credentials to browsers.
- All exposed tables require appropriate RLS policies; authenticated alone is not sufficient.
- Every write path must validate branch ownership and department permissions on the server.
- Run migrations in staging, test reconciliation, then obtain approval before production rollout.
- Distinguish prototypes and mock data from connected production functions.
