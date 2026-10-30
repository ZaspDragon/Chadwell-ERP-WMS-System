-- Stage-only CHADWMS identity and branch assignment model.
-- Do not apply to production until existing auth/RLS schema is reviewed.
create schema if not exists security_core;
revoke all on schema security_core from public, anon, authenticated;

create table if not exists security_core.role_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  branch_code text not null check (branch_code = upper(trim(branch_code)) and length(branch_code) between 2 and 32),
  department text not null check (department in ('inventory','receiving','fulfillment','transfers','management')),
  role text not null check (role in ('associate','coordinator','stocker','picker','specialist','lead','supervisor','department_manager','branch_manager','director')),
  active boolean not null default true,
  granted_by uuid references auth.users(id),
  granted_at timestamptz not null default now(),
  revoked_by uuid references auth.users(id),
  revoked_at timestamptz,
  constraint role_assignments_revocation_check check (
    (active and revoked_at is null and revoked_by is null)
    or (not active)
  ),
  constraint role_assignments_unique_scope unique (user_id,branch_code,department,role)
);
create index if not exists role_assignments_lookup_idx
  on security_core.role_assignments(user_id,branch_code,department)
  where active;
alter table security_core.role_assignments enable row level security;
revoke all on security_core.role_assignments from public, anon, authenticated;

-- Deliberately no public policies or role-granting RPCs. A reviewed server-side
-- authorization layer must manage these assignments, never user-editable JWT metadata.
comment on table security_core.role_assignments is
'Private role assignment foundation. Deployment requires reviewed admin workflows and branch-aware RLS on operational tables.';
