# Inventory Ledger — Integration Contract

## Current state
The SQL foundation is committed at `database/inventory_core_foundation.sql` but **not deployed**. The connected Chadwell WMS Supabase project was INACTIVE when inspected. Existing `inventory_balances`, `inventory_movements`, `move_inventory`, and `adjust_inventory` remain unchanged.

## Journal design
- Private `inventory_core.stock_events` table, no direct client access.
- Unique `event_key` to support idempotent requests.
- Branch, item, movement type, positive quantity, source/destination, actor, timestamps, source document, reason, and reversal reference.
- No UPDATE/DELETE; corrections require new, validated reversal events.
- Indices for branch, item, document, and actor audit searches.

## Required before enabling writes
1. Restore Supabase availability; inspect actual production schema and function definitions.
2. Map `inventory_balances`, `inventory_movements`, and branch/location/item identifiers.
3. Implement a single database transaction that validates authenticated actor, branch and tier, available stock, primary/overstock restrictions, and idempotency; atomically updates balance and writes the event.
4. For transfer dispatch/receipt, use an in-transit holding account or state and reconcile across branches.
5. Validate reversal against the original event (matching branch/item/quantity and allowed type), including approval and single-reversal constraint.
6. Block direct client writes to stock balances; migrate existing RPCs to the posting service only after tests pass.
7. Test duplicate scans, concurrent picks, insufficient quantity, partial receipt, permissions, failed transaction rollback, and financial reconciliation.
8. Deploy in staging first and compare balances against Great Plains before production cutover.

## Important
A unique event key prevents duplicate journal rows, but it does **not** by itself make inventory updates atomic. Do not integrate the new journal by writing to it and updating balances in separate API calls.
