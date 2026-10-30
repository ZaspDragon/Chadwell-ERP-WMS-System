# CHADWMS Security Implementation — Stage 1

## Delivered
`lib/security/policy.ts` defines Tier 1–7 roles, department scope, branch scope, capability thresholds and a separation-of-duties helper. It defaults to denial when a role, branch, department or capability does not match.

**This is a policy definition, not live enforcement.** Do not rely on client-side use of these functions to protect warehouse data.

## Next mandatory integration gates
1. Restore connected Supabase project availability and inspect `profiles`, role assignment tables, existing RLS policies, and all stock-changing RPC definitions.
2. Create a server-managed `user_role_assignments` table containing `user_id`, `role`, `department`, `branch_id`, `active`, and audit timestamps. No client can grant or edit its own roles.
3. Write RLS policies and server-side checks that validate the authenticated actor against active assignments and the requested branch and department.
4. Review every existing RPC (`move_inventory`, `adjust_inventory`, receiving/transfer posting) and prohibit bypass paths.
5. Require a distinct approver for sensitive adjustments; record approval history and limits.
6. Add integration tests for unauthorized cross-branch access, role escalation, stale assignments, duplicate postings, and approval self-dealing.
7. Only after verification, integrate UI role-specific navigation.

## Caution
Do not infer role from client `user_metadata`, form fields, URL parameters, or a hard-coded branch. Server authorization must rely on trusted role assignments. Tier 6 and 7 still require explicit branch scope. RLS must be verified before exposing data to the client.
