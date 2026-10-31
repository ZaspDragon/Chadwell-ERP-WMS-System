# Inventory employee workflow checkpoint — 2026-10-31

## Committed UI improvements
- Cycle count: bin retained after each count, Enter advances from bin to item to quantity, save returns focus to item, Undo last entry restores it for correction, CSV export remains available.
- Driver restocks: choose driver to filter the task list; supervisor configuration collapses; driver can start and complete their selected task with scan validation.

## Employee instructions (preview)
Cycle counter: select branch and bin, scan item, enter actual whole-unit quantity (including 0), press Save count & next item. Repeat for each SKU. Export CSV before leaving; drafts are **not persisted**.
Lift driver: choose your name, open assigned restock, start it, scan source bin, destination bin and item, enter moved quantity, complete. Exception reason if stock cannot be moved. No real inventory transfer occurs.

## Release blockers — do not claim production ready
- The driver selector is **not authenticated identity**. Supervisor setup is only hidden visually, not access controlled. Server-side authorization and branch RLS are required.
- Driver tasks and cycle counts are browser-session examples; refresh loses changes.
- No actual barcode-camera decoding, unprinted order feed, automatic notifications, count variance approvals, or inventory movement posting.
- Verify TypeScript build and mobile usability in CI/deployment before rollout.
- Restore Supabase and inspect existing schema/RPCs before persistence and transactional posting.

## Next implementation sequence
1. Build authenticated server-side employee task and count endpoints with branch/role checks.
2. Persist count sessions and restock requests with idempotency, including mobile retry behavior.
3. Connect inventory bins, expected item list and unprinted order demand.
4. Implement supervisor variance review, movement reconciliation and atomic adjustment posting.
5. Connect live driver assignment, attendance and verified transfer posting.
