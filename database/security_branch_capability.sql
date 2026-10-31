-- CHADWMS staged security helper; install only after reviewing existing schema.
-- A private, deliberately narrowly scoped authorization function.
create or replace function security_core.has_branch_capability(
  p_branch_code text,
  p_department text,
  p_minimum_tier integer
) returns boolean
language sql stable security definer
set search_path = ''
as $$
  select
    auth.uid() is not null
    and p_branch_code is not null
    and p_department in ('inventory','receiving','fulfillment','transfers','management')
    and p_minimum_tier between 1 and 7
    and exists (
      select 1
      from security_core.role_assignments a
      where a.user_id = auth.uid()
        and a.active = true
        and a.branch_code = upper(trim(p_branch_code))
        and (
          a.department = p_department
          or a.role in ('branch_manager','director')
        )
        and case a.role
          when 'associate' then 1
          when 'coordinator' then 1
          when 'stocker' then 1
          when 'picker' then 1
          when 'specialist' then 2
          when 'lead' then 3
          when 'supervisor' then 4
          when 'department_manager' then 5
          when 'branch_manager' then 6
          when 'director' then 7
          else 0
        end >= p_minimum_tier
    );
$$;
-- No public execution; only grant the exact role needed after reviewing
-- which RLS policies and callers will use this function.
revoke all on function security_core.has_branch_capability(text,text,integer)
  from public, anon, authenticated;
comment on function security_core.has_branch_capability(text,text,integer)
  is 'Staging-only private branch permission predicate. Requires reviewed RLS integration and least-privilege EXECUTE grants.';
