# CHADWMS — Enterprise Implementation Checkpoint
Updated: 2026-10-31

## Verified committed files
The following paths were fetched successfully from the repository default branch:

| Workstream | Committed path | Status |
| --- | --- | --- |
| Primary-only picking | `app/primary-picking/page.tsx` | UI prototype with sample orders; no live stock posting |
| Help Center | `app/help/page.tsx` | UI prototype; no persistent ticket/chat service |
| Navigation | `components/WmsSidebar.tsx` | Links to new modules |
| Movement Audit | `app/inventory/movements/page.tsx` | Database-connected read-only viewer; deployment and access testing outstanding |
| Inventory ledger | `database/inventory_core_foundation.sql` | Private append-only journal schema committed; not deployed |
| Inventory ledger integration | `docs/INVENTORY_LEDGER_INTEGRATION.md` | Atomic posting design and safety gates |
| Enterprise roadmap | `docs/ENTERPRISE_ROADMAP.md` | Planned phased rollout |
| Role policy | `lib/security/policy.ts` | Role/capability/branch policy definitions only; not server enforcement |
| Role assignment schema | `database/security_role_assignments.sql` | Private employee role assignments schema committed; not deployed |
| Security rollout | `docs/SECURITY_ROLLOUT.md` | Authorization rollout plan |

## Steps completed so far
1. Primary Picking and Help Center **prototype pages** created.
2. Sidebar navigation updated for new pages.
3. Read-only Movement Audit page created.
4. Inventory journal **schema foundation** designed and committed.
5. Tier 1–7 permission **policy definitions** designed and committed.
6. Branch-scoped role assignment **schema foundation** designed and committed.
7. Enterprise rollout and integration documentation committed.

## Not completed
- Supabase SQL deployment, real role assignments, or branch-aware RLS.
- Server-enforced authorization on inventory/receiving/transfer RPCs.
- Atomic inventory ledger posting, idempotency tests, or balance reconciliation.
- Live primary-only picking and help-ticket persistence.
- Build, end-to-end tests, staging release, or verified deployment.
- Full ERP financials and Great Plains replacement.

## Blocker
The connected Supabase project **Chadwell WMS** (project ref `ckkmszxnqknssygyyxtl`) last reported `INACTIVE` when checked. No production database mutation was attempted.

## Next implementation sequence
1. Restore Supabase project availability and inspect current schema and security policies.
2. Add tested branch-scoped server-side authorization and deny-by-default RLS.
3. Add atomic, idempotent inventory posting and reconciled journal writes.
4. Integrate cycle counts, driver moves, replenishment, and picking.
5. Validate and stage before any production rollout.

## Safety statement
A GitHub commit is not equivalent to a deployed, tested, or production-ready feature. Existing stock and employee access must remain unchanged until schema review and staged tests pass.
