# Branch Security Verification Plan

Status: **NOT DEPLOYED**. The Supabase project was still COMING_UP and a read-only SQL connection test failed on 2026-10-31.

## Prepared
- `database/security_role_assignments.sql`: private branch/department/role assignments.
- `database/security_branch_capability.sql`: private function that checks the authenticated user against active assignments. It grants no public execution rights.

## Deployment prerequisites
1. Inspect `public.profiles`, `branches`, `inventory_balances`, `inventory_movements`, receiving and transfer tables, existing RLS policies and RPC definitions.
2. Review all existing policies for permissive OR rules that could bypass branch isolation.
3. Verify role assignment provisioning and revocation workflow; never accept user-editable role claims.
4. Decide precise branch identifiers and ownership joins for each table.
5. Deploy privately in staging, then grant EXECUTE only to roles that genuinely need the predicate. Create table-specific RLS using validated branch joins. Verify RLS enforcement for every stock-changing RPC, especially SECURITY DEFINER functions.
6. Test with two real test accounts: OH01 inventory associate, OHC inventory associate, plus supervisor and unauthorized user. Verify cross-branch read/write denial and same-branch authorized access.
7. Test no assignment, inactive assignment, spoofed branch parameters, and same-user approval denial.
8. Run security advisors and test transaction rollback before production rollout.

## Important
The helper alone does not secure any existing tables. No production RLS or employee accounts have been changed. Do not apply blanket policies to all tables without examining their schema and data flows.
