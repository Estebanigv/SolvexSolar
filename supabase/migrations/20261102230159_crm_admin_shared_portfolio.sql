-- All active administrators supervise the CRM. Explicit sales supervisors retain access.
-- Ownership, author IDs, RLS policies and assignment audit remain unchanged.
create or replace function private.crm_can_view_all() returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists (
  select 1 from public.profiles p
  where p.id=(select auth.uid()) and (
   p.role='admin' or (p.role='sales' and exists (
    select 1 from private.crm_supervisors s where s.user_id=p.id
   ))
  )
 );
$$;
revoke all on function private.crm_can_view_all() from public,anon;
grant execute on function private.crm_can_view_all() to authenticated;
