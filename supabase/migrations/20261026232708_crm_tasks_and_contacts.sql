-- Keep one shared notes history for both the CRM and the existing client directory.
alter table public.client_notes drop constraint client_notes_body_check;
alter table public.client_notes add constraint client_notes_body_check check(length(btrim(body)) between 1 and 4000);
insert into public.client_notes(id,client_id,body,created_at,created_by)
select id,client_id,body,created_at,author_id from public.crm_notes on conflict(id) do nothing;

create table public.crm_contact_profiles (
 client_id uuid primary key references public.clients(id),
 source text not null default 'unknown' check(source in ('unknown','website','whatsapp','referral','phone','event','other')),
 tags text[] not null default '{}' check(cardinality(tags)<=12 and array_to_string(tags,'') is not null and length(array_to_string(tags,''))<=360),
 priority text not null default 'normal' check(priority in ('normal','high','low')),
 updated_at timestamptz not null default clock_timestamp(),
 updated_by uuid not null default auth.uid() references public.profiles(id)
);
create index crm_contact_profiles_updated_by on public.crm_contact_profiles(updated_by);
alter table public.crm_contact_profiles enable row level security;
revoke all on public.crm_contact_profiles from public,anon,authenticated;
grant select on public.crm_contact_profiles to authenticated;
grant insert(client_id,source,tags,priority),update(source,tags,priority) on public.crm_contact_profiles to authenticated;
create policy crm_contact_read on public.crm_contact_profiles for select to authenticated using(exists(select 1 from public.clients c where c.id=client_id and c.deleted_at is null));
create policy crm_contact_insert on public.crm_contact_profiles for insert to authenticated with check(exists(select 1 from public.clients c where c.id=client_id and c.deleted_at is null));
create policy crm_contact_update on public.crm_contact_profiles for update to authenticated using(exists(select 1 from public.clients c where c.id=client_id and c.deleted_at is null)) with check(exists(select 1 from public.clients c where c.id=client_id and c.deleted_at is null));
create trigger crm_contact_stamp before insert or update on public.crm_contact_profiles for each row execute function private.stamp_followup();

create table public.crm_tasks (
 id uuid primary key default gen_random_uuid(),
 client_id uuid not null references public.clients(id),
 title text not null check(length(btrim(title)) between 1 and 180),
 kind text not null default 'followup' check(kind in ('call','visit','proposal','followup')),
 due_on date not null,
 priority text not null default 'normal' check(priority in ('normal','high','low')),
 details text not null default '' check(length(details)<=2000),
 status text not null default 'pending' check(status in ('pending','completed','cancelled')),
 created_at timestamptz not null default clock_timestamp(),
 updated_at timestamptz not null default clock_timestamp(),
 updated_by uuid not null default auth.uid() references public.profiles(id),
 completed_at timestamptz
);
create index crm_tasks_client_due on public.crm_tasks(client_id,due_on,id);
create index crm_tasks_status_due on public.crm_tasks(status,due_on,id);
create index crm_tasks_updated_by on public.crm_tasks(updated_by);
alter table public.crm_tasks enable row level security;
revoke all on public.crm_tasks from public,anon,authenticated;
grant select on public.crm_tasks to authenticated;
grant insert(id,client_id,title,kind,due_on,priority,details),update(title,kind,due_on,priority,details,status) on public.crm_tasks to authenticated;
create policy crm_tasks_read on public.crm_tasks for select to authenticated using(exists(select 1 from public.clients c where c.id=client_id and c.deleted_at is null));
create policy crm_tasks_insert on public.crm_tasks for insert to authenticated with check(exists(select 1 from public.clients c where c.id=client_id and c.deleted_at is null));
create policy crm_tasks_update on public.crm_tasks for update to authenticated using(exists(select 1 from public.clients c where c.id=client_id and c.deleted_at is null)) with check(exists(select 1 from public.clients c where c.id=client_id and c.deleted_at is null));
create function private.stamp_crm_task() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 new.updated_by:=auth.uid();new.updated_at:=clock_timestamp();
 if new.status='completed' then
  if tg_op='INSERT' or old.status<>'completed' then new.completed_at:=clock_timestamp();end if;
 else new.completed_at:=null;end if;
 return new;
end $$;
revoke all on function private.stamp_crm_task() from public,anon,authenticated;
create trigger crm_task_stamp before insert or update on public.crm_tasks for each row execute function private.stamp_crm_task();
