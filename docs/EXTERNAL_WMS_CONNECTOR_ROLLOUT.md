# External ERP/WMS connection and branch-isolation rollout

Status: CSV preview implemented; **live ERP connection and database sync are not implemented**.

## Current functionality
- Read a local CSV export with warehouse, bin, item, on_hand; optional allocated, on_hold, description.
- Normalize warehouse/bin/item identifiers, reject invalid quantities and duplicate composite keys, and filter by warehouse.
- CSV contents remain in browser memory and are NOT posted to the backend. This is a preview, not an import to official stock.
- Do not treat the warehouse selector as authorization.

## Required production configuration
1. Identify the source system, API version, supported read-only API/ODBC/export mechanism and warehouse identifiers. Great Plains, SalesPad and BinMgr may require distinct adapters.
2. Create an admin-only connector configuration stored server-side, with secrets in a managed secret store. Never place connection strings, passwords, service credentials or privileged tokens in NEXT_PUBLIC variables.
3. Map source company/site/branch/warehouse to canonical CHADWMS branch IDs, including OH01 versus OHC. Reject unmapped warehouses and ambiguous bins; a bin code is unique only within its warehouse.
4. Normalize item numbers, UOM/pack sizes, lots, inventory status, primary/overstock zones and quantity definitions. Validate that source on_hand is physical stock, not available-to-promise.
5. Import into **staging** with source row ID, source timestamp, batch ID, checksum and composite warehouse/bin/item identity. Show per-branch totals and discrepancy report before any posting.
6. Perform full initial snapshot and reconcile to source totals, then incremental change sync with durable cursor, retry/idempotency and deletion/tombstone handling. A snapshot cannot overwrite legitimate WMS movements; select one system of record or use a controlled cutover.
7. Enforce branch-scoped RLS and server authorization for read/write APIs. Cross-branch access only with explicit multi-branch grants.
8. Atomic inventory ledger updates with audit trail, rollback and reconciliation, followed by performance/load tests.

## Suggested connection flow
Connect source (read-only) -> Discover warehouses -> Map warehouses -> Preview bins/items -> Validate UOM/quantities -> Reconcile -> Approve cutover -> Schedule sync.

## Release blockers
Database availability, source credentials/permissions, API/export format, verified stock definitions, branch role policies, and end-to-end build and integration tests.
