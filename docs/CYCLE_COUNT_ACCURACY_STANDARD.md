# CHADWMS Cycle Count Accuracy Standard — staged specification

Status: approved business rule, **not connected to the live database**. Do not mistake the session-only worksheet for a posting workflow.

## Non-negotiable rules
1. Scan the branch and location; query all expected item/lot/LPN/UOM records for that location. Blind count: hide expected quantities from the counter, including through API responses. Allow reporting unexpected SKUs and empty bins.
2. Save the physical count with counter, branch, bin, item, UOM, lot/LPN if applicable, count timestamp, and the inventory event sequence/version observed at count time. Count zero explicitly, not as missing input.
3. If normalized counted quantity equals reconciled book quantity and all required item lines are complete, close the count automatically with **no inventory adjustment**.
4. Every nonzero variance becomes **PENDING_MANAGER_REVIEW**; do not overwrite inventory_balances, create an adjustment movement, or report it as approved stock while pending.
5. Manager can APPROVE, REJECT, or REQUEST_RECOUNT; the counter cannot approve their own count. An approved difference posts through the existing atomic inventory adjustment RPC (after inspecting its implementation), with idempotency and an audit record. Rejection leaves book stock unchanged. Recount is independent and preserves the original.
6. On approval, reconcile movements after the count snapshot under transaction-level locking; if movements cannot be unambiguously reconciled, block posting and request a fresh count. Never set on_hand to an old physical quantity after intervening legitimate movements.
7. Preserve immutable audit details: actor, timestamps, original and final book quantities, physical quantity, variance units/value, reasons, approval/recount history, transaction IDs and branch. Separate completed counts from productivity-credit counts (exclude recounts from first-pass 200/day target).
8. Check access at database/RPC level by active branch-scoped role assignments. OH01 users cannot review or post OHC changes. Do not enable unsafe permissive RLS.
9. Flag high-dollar/high-percentage variances for priority investigation; **all** nonzero discrepancies still require manager approval. Investigate wrong item/placard/UOM, misplaced stock, receipts not put away, unposted transfers, and pick discrepancies.
10. Schedule risk-based ABC counts: fast-moving, high-value, high-variance and frequently empty primaries more often; record first-pass location accuracy, variance value, recount rate and recurring root causes. Set frequency from actual branch data, not arbitrary industry percentages.

## State machine
ASSIGNED -> COUNTING -> SUBMITTED -> (CLOSED_MATCH | PENDING_MANAGER_REVIEW).
PENDING_MANAGER_REVIEW -> (APPROVED_POSTED | REJECTED | RECOUNT_REQUESTED | CONFLICT_REQUIRES_RECOUNT).
RECOUNT_REQUESTED -> COUNTING (new count linked to original).
Every state transition is server-side, auditable and retry-safe.

## Database rollout dependency
Inspect existing inventory_balances, inventory_movements, move_inventory and adjust_inventory before implementing the server-side workflow. Do not apply new ledger tables or grants blindly. Add schema, RLS, RPCs, transaction locks and tests after Supabase is healthy.

## Required acceptance tests
- Exact match closes without an inventory movement.
- +2 and -2 each require approval; rejected count does not alter balance.
- Same counter cannot approve their own variance.
- Unauthorized employee and cross-branch OH01/OHC approval both fail.
- Duplicate approval requests post at most once.
- Movement between count and approval is correctly reconciled or blocks approval.
- Multiple SKUs and UOMs, empty bin, unexpected SKU and wrong placard are handled.
- Offline retries do not duplicate counts; stale snapshots trigger reconciliation.
- Recount doesn't inflate first-pass daily production totals.

## Research
- Microsoft Dynamics 365 Supply Chain Management cycle counting: https://learn.microsoft.com/en-us/dynamics365/supply-chain/warehousing/cycle-counting
- Oracle count adjustments and approvals: https://docs.oracle.com/cd/A60725_05/html/comnls/us/inv/ccadj.htm
- SAP EWM physical inventory process: https://learning.sap.com/courses/basic-customizing-in-sap-s-4hana-ewm/outlining-the-physical-inventory-process
