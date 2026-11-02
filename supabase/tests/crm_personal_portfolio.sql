-- Read-only regression for the live CRM ownership policies.
-- API behavior, including attempted foreign writes, is covered by tests/crm-route.test.mjs.
begin read only;
do $$ declare tab text; begin
 foreach tab in array array['crm_leads','crm_contact_profiles','crm_tasks','crm_notes'] loop
  if not exists (
   select 1 from pg_policies
   where schemaname='public' and tablename=tab
     and policyname=tab||'_personal_portfolio'
     and permissive='RESTRICTIVE' and cmd='ALL'
     and qual like '%owner_id%auth.uid()%'
     and with_check like '%owner_id%auth.uid()%'
     and qual like '%deleted_at IS NULL%'
     and with_check like '%deleted_at IS NULL%'
  ) then raise exception 'Missing restrictive ownership policy on %',tab; end if;
  if not exists (
   select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
   where n.nspname='public' and c.relname=tab and c.relrowsecurity
  ) then raise exception 'RLS disabled on %',tab; end if;
 end loop;
end $$;
rollback;
select 'PASS: restrictive ownership policies protect reads and writes on all four CRM tables' as result;
