-- CRM is a personal portfolio, including for workspace administrators.
-- Shared quoting/client administration retains its existing permissions.

create policy crm_leads_personal_portfolio
on public.crm_leads as restrictive for all to authenticated
using (exists (
  select 1 from public.clients c
  where c.id = crm_leads.client_id
    and c.owner_id = (select auth.uid())
    and c.deleted_at is null
))
with check (exists (
  select 1 from public.clients c
  where c.id = crm_leads.client_id
    and c.owner_id = (select auth.uid())
    and c.deleted_at is null
));

create policy crm_contact_profiles_personal_portfolio
on public.crm_contact_profiles as restrictive for all to authenticated
using (exists (
  select 1 from public.clients c
  where c.id = crm_contact_profiles.client_id
    and c.owner_id = (select auth.uid())
    and c.deleted_at is null
))
with check (exists (
  select 1 from public.clients c
  where c.id = crm_contact_profiles.client_id
    and c.owner_id = (select auth.uid())
    and c.deleted_at is null
));

create policy crm_tasks_personal_portfolio
on public.crm_tasks as restrictive for all to authenticated
using (exists (
  select 1 from public.clients c
  where c.id = crm_tasks.client_id
    and c.owner_id = (select auth.uid())
    and c.deleted_at is null
))
with check (exists (
  select 1 from public.clients c
  where c.id = crm_tasks.client_id
    and c.owner_id = (select auth.uid())
    and c.deleted_at is null
));

create policy crm_notes_personal_portfolio
on public.crm_notes as restrictive for all to authenticated
using (exists (
  select 1 from public.clients c
  where c.id = crm_notes.client_id
    and c.owner_id = (select auth.uid())
    and c.deleted_at is null
))
with check (exists (
  select 1 from public.clients c
  where c.id = crm_notes.client_id
    and c.owner_id = (select auth.uid())
    and c.deleted_at is null
));
