# Discrepancy notifications and investigation — production contract

Status: UI and pure workflow helpers committed as demo. This is NOT a live notification system.

## Trigger
After an authenticated count submission, the server compares the physical quantity to the reconciled book snapshot. Zero variance closes automatically. Nonzero variance creates exactly one discrepancy case per count revision, with immutable snapshot and event IDs. Generate notification recipients from active **branch-scoped** lead, supervisor and manager assignments, not client-submitted names.

## Fan-out and claiming
Create one notification per eligible recipient in a single transaction with the case. Notification delivery is asynchronous and retryable; inbox notifications are canonical even if push/email fails. Claim via a database transaction that atomically updates OPEN -> ACCEPTED with claimed_by = auth.uid(), where claimed_by is null and the user is an active eligible leader for that branch. Return conflict to second claimant. Show all recipients current claim status. An unread/read toggle must not count as a claim.

## Location route
Use authoritative item-location inventory records for the same branch and item, including primary, overstock, mezzanine, bulk, quarantine and any in-flight locations. The counted bin comes first, followed by the primary, then remaining known locations in aisle/bin order. Show expected quantity only to authorized investigators. Preserve location UOM and stock status; never assume physically adjacent locations from alphabetical ordering. Route ordering is a logical checklist until a real warehouse location topology exists. Missing or stale location master data blocks finalization.

## Investigation
Require an item/bin scan and an actual finding at each stop, plus missing-item and wrong-placard exceptions. Store timestamp, investigator, source record, and check outcome for every stop. Allow reassignment/escalation by a separate authorized action with audit history. Submission for review does not itself adjust inventory.

## Posting safeguards
Reconcile post-count stock movements, prevent duplicate postings, require authorized manager approval and reject self-approval. Use atomic inventory RPC/ledger posting with branch RLS. Do not allow the client to update inventory balances directly.

## Acceptance tests
- One variance creates one case and exactly one notification per eligible leader in the same branch.
- Two simultaneous accepts produce exactly one claimant.
- Cross-branch and unauthorized users cannot read/claim cases or expected quantities.
- All relevant known locations are included once, counted location first.
- Cannot skip a location or submit an incomplete investigation.
- Stale stock snapshots or new movements require reconciliation.
- Rejected case makes no inventory change; approved case posts once.
- Notification retries do not create duplicate cases.
