-- Leads share the existing client directory; commercial projects retain quote_followups.
create table public.crm_leads (
  client_id uuid primary key references public.clients(id),
  status text not null default 'new' check(status in ('new','contacted','qualified','rejected')),
  next_contact date,
  updated_at timestamptz not null default clock_timestamp(),
  updated_by uuid not null default auth.uid() references public.profiles(id)
);
alter table public.crm_leads enable row level security;
revoke all on public.crm_leads from public, anon, authenticated;
grant select on public.crm_leads to authenticated;
grant insert(client_id,status,next_contact), update(status,next_contact) on public.crm_leads to authenticated;
create policy crm_leads_read on public.crm_leads for select to authenticated
  using (exists(select 1 from public.clients c where c.id=client_id and c.deleted_at is null));
create policy crm_leads_insert on public.crm_leads for insert to authenticated
  with check (exists(select 1 from public.clients c where c.id=client_id and c.deleted_at is null));
create policy crm_leads_update on public.crm_leads for update to authenticated
  using (exists(select 1 from public.clients c where c.id=client_id and c.deleted_at is null))
  with check (exists(select 1 from public.clients c where c.id=client_id and c.deleted_at is null));
create trigger crm_leads_stamp before insert or update on public.crm_leads
  for each row execute function private.stamp_followup();

create table public.crm_notes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id),
  body text not null check(length(btrim(body)) between 1 and 4000),
  created_at timestamptz not null default clock_timestamp(),
  author_id uuid not null default auth.uid() references public.profiles(id)
);
create index crm_notes_client_date on public.crm_notes(client_id,created_at desc,id);
create index crm_notes_author on public.crm_notes(author_id);
create index crm_leads_updated_by on public.crm_leads(updated_by);
alter table public.crm_notes enable row level security;
revoke all on public.crm_notes from public, anon, authenticated;
grant select on public.crm_notes to authenticated;
grant insert(client_id,body) on public.crm_notes to authenticated;
create policy crm_notes_read on public.crm_notes for select to authenticated
  using (exists(select 1 from public.clients c where c.id=client_id and c.deleted_at is null));
create policy crm_notes_insert on public.crm_notes for insert to authenticated
  with check (author_id=(select auth.uid()) and exists(select 1 from public.clients c where c.id=client_id and c.deleted_at is null));
