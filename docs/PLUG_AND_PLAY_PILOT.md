# Plug-and-play WMS pilot (October 23, 2026)

## What exists
The new `/workflows` page provides a branch-scoped **workflow draft editor**:
- Create workflows; set branch and module; add/remove fields; choose required scan, text, or positive quantity inputs.
- Test data capture using keyboard-wedge USB/Bluetooth scanners, manual entry, and the native browser BarcodeDetector camera interface where supported.
- Run required-field and positive-quantity **simulation** checks, not inventory writes.
- Import/export JSON workflow drafts to move prototypes between browsers.

## Important operational boundaries
- Workflow drafts use **browser localStorage** and are **not synced across branches, users, or devices**. Export JSON backups before clearing browser data.
- JSON import is syntactically validated but **must not be trusted as an authorization policy**.
- The camera requires HTTPS, explicit permission, and compatible browser support. Test specific Zebra/Honeywell devices and iOS/Android models; native BarcodeDetector support varies.
- The workflow builder is authentication-gated but **does not implement admin-only RBAC**. Do not expose configuration publishing to warehouse employees until roles are enforced server-side.
- No backend workflow interpreter, permissions engine, integrations, event log, ERP posting, label printing, or offline queue have been implemented by this pilot. No stock is changed through `/workflows`.

## Next architecture steps (required before any company-wide rollout)
1. Define immutable workflow template versions, branch overrides, typed data contracts, and central PostgreSQL tables secured by Supabase RLS. Branch access must be verified on every server-side action, not merely via UI labels.
2. Implement a server-side execution engine with required scans, SKU and bin lookup, idempotency keys, optimistic locking/transactions, quantity variance handling, role-based approvals, and an immutable audit trail.
3. Keep Great Plains/SalesPad as system of record initially; use a staging adapter with mapping for PO, transfer, item, bin, UOM, and quantities. Never dual-write without reconciliation and rollback strategy.
4. Add hardware adapters: keyboard wedge; optional supported browser BarcodeDetector; a tested camera fallback library; Zebra DataWedge intent/native bridge if required; printer service for Zebra/ZPL and StickerPrice labels.
5. Test receiving, transfer picking, bin moves, inventory holds, network loss, duplicate scans, access controls, and partial postings with real branch test data in staging.
6. Publish to one controlled OH01 pilot group only after sign-off. Gradually expand per branch with feature flags and a rollback switch.

## Suggested tomorrow demonstration
- Import or create OH01 receiving workflow.
- Scan PO, pallet LPN, SKU, quantity and location through a keyboard-wedge scanner or supported camera.
- Show missing scan and invalid quantity validation.
- Export workflow configuration, import on another device, and verify matching steps.
- **Do not** use this simulation to receive, pick or adjust real warehouse stock.
