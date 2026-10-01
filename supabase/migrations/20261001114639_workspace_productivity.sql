-- Additive release: existing documents and prices remain immutable.
alter table public.quotes add column project_id uuid;
alter table public.quotes add column parent_quote_id uuid references public.quotes(id);
update public.quotes set project_id=id;
alter table public.quotes alter column project_id set not null;
alter table public.quotes add constraint quotes_project_id_fkey foreign key(project_id) references public.quotes(id) deferrable initially deferred;
create index quotes_project on public.quotes(project_id,created_at desc);
create function private.quote_lineage() returns trigger language plpgsql security invoker set search_path='' as $$
declare parent public.quotes;
begin
 new.project_id:=new.id;new.parent_quote_id:=null;
 if new.payload->>'parentQuoteId' is not null then
  select * into parent from public.quotes where id=(new.payload->>'parentQuoteId')::uuid and deleted_at is null;
  if parent.id is null or parent.client_id is distinct from new.client_id then raise exception 'Invalid revision source' using errcode='42501';end if;
  new.project_id:=parent.project_id;new.parent_quote_id:=parent.id;
 end if;
 new.payload:=new.payload||jsonb_build_object('projectId',new.project_id,'parentQuoteId',new.parent_quote_id);
 return new;
end $$;
revoke all on function private.quote_lineage() from public,anon,authenticated;
create trigger quote_lineage before insert on public.quotes for each row execute function private.quote_lineage();

create table public.quote_followups(
 project_id uuid primary key references public.quotes(id),
 status text not null default 'draft' check(status in ('draft','sent','followup','accepted','rejected')),
 next_contact date,
 updated_at timestamptz not null default clock_timestamp(),
 updated_by uuid not null default auth.uid() references public.profiles(id)
);
alter table public.quote_followups enable row level security;
revoke all on public.quote_followups from public,anon,authenticated;
grant select on public.quote_followups to authenticated;
grant insert(project_id,status,next_contact),update(status,next_contact) on public.quote_followups to authenticated;
create policy followup_read on public.quote_followups for select to authenticated using(exists(select 1 from public.quotes q where q.project_id=quote_followups.project_id));
create policy followup_insert on public.quote_followups for insert to authenticated with check(exists(select 1 from public.quotes q where q.project_id=quote_followups.project_id and q.deleted_at is null));
create policy followup_update on public.quote_followups for update to authenticated using(exists(select 1 from public.quotes q where q.project_id=quote_followups.project_id and q.deleted_at is null)) with check(exists(select 1 from public.quotes q where q.project_id=quote_followups.project_id and q.deleted_at is null));
create function private.stamp_followup() returns trigger language plpgsql security invoker set search_path='' as $$ begin new.updated_by:=auth.uid();new.updated_at:=clock_timestamp();return new;end $$;
revoke all on function private.stamp_followup() from public,anon,authenticated;
create trigger followup_stamp before insert or update on public.quote_followups for each row execute function private.stamp_followup();

create table public.client_notes(id uuid primary key default gen_random_uuid(),client_id uuid not null references public.clients(id),body text not null check(length(trim(body)) between 1 and 3000),created_at timestamptz not null default clock_timestamp(),created_by uuid not null default auth.uid() references public.profiles(id));
create index client_notes_client on public.client_notes(client_id,created_at desc);
alter table public.client_notes enable row level security;
revoke all on public.client_notes from public,anon,authenticated;
grant select on public.client_notes to authenticated;
grant insert(client_id,body) on public.client_notes to authenticated;
create policy notes_read on public.client_notes for select to authenticated using(exists(select 1 from public.clients c where c.id=client_notes.client_id));
create policy notes_insert on public.client_notes for insert to authenticated with check(exists(select 1 from public.clients c where c.id=client_notes.client_id and c.deleted_at is null));

create function private.capture_productivity() returns trigger language plpgsql security definer set search_path='' as $$
declare delta jsonb;label text;
begin
 if tg_table_name='client_notes' then
  select details->>'name' into label from public.clients where id=new.client_id;
  perform private.write_activity('client',new.client_id::text,label,'updated',jsonb_build_array(jsonb_build_object('field','note','before',null,'after',new.body)));
 else
  select folio into label from public.quotes where id=new.project_id;
  delta:=private.activity_changes(case when tg_op='UPDATE' then to_jsonb(old)-'updated_at'-'updated_by' else '{}'::jsonb end,to_jsonb(new)-'updated_at'-'updated_by');
  if delta<>'[]' then perform private.write_activity('quote',new.project_id::text,label,'updated',delta);end if;
 end if;return null;
end $$;
revoke all on function private.capture_productivity() from public,anon,authenticated;
create trigger activity_followup after insert or update on public.quote_followups for each row execute function private.capture_productivity();
create trigger activity_note after insert on public.client_notes for each row execute function private.capture_productivity();

-- Recording a real send advances a draft; never roll back accepted/rejected work.
create function private.followup_on_send() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.sent_on is not null and (new.sent_on is distinct from old.sent_on or new.sent_channel is distinct from old.sent_channel) then
  insert into public.quote_followups(project_id,status) values(new.project_id,'sent')
  on conflict(project_id) do update set status='sent' where quote_followups.status='draft';
 end if;return null;
end $$;
revoke all on function private.followup_on_send() from public,anon,authenticated;
create trigger followup_on_send after update of sent_on,sent_channel on public.quotes for each row execute function private.followup_on_send();

-- Authentication writes these events; application users can never fabricate them.
create table public.member_access_events(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,occurred_at timestamptz not null,source text not null check(source in ('login','last_known')),unique(user_id,occurred_at));
create index member_access_time on public.member_access_events(occurred_at desc,id);
create index member_access_user on public.member_access_events(user_id,occurred_at desc);
alter table public.member_access_events enable row level security;
revoke all on public.member_access_events from public,anon,authenticated;
grant select on public.member_access_events to authenticated;
create policy member_access_admin on public.member_access_events for select to authenticated using((select private.current_role())='admin');
insert into public.member_access_events(user_id,occurred_at,source) select id,last_sign_in_at,'last_known' from auth.users where last_sign_in_at is not null;
create function private.capture_member_login() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.last_sign_in_at is not null and new.last_sign_in_at is distinct from old.last_sign_in_at then
  insert into public.member_access_events(user_id,occurred_at,source) values(new.id,new.last_sign_in_at,'login') on conflict(user_id,occurred_at) do nothing;
 end if;return new;
end $$;
revoke all on function private.capture_member_login() from public,anon,authenticated;
create trigger solvex_member_login after update of last_sign_in_at on auth.users for each row execute function private.capture_member_login();

create function public.member_access_summary() returns table(user_id uuid,last_login timestamptz,last_activity timestamptz) language sql stable security invoker set search_path='' as $$
 select p.id,(select max(e.occurred_at) from public.member_access_events e where e.user_id=p.id),(select max(a.occurred_at) from public.activity_log a where a.actor_id=p.id) from public.profiles p where (select private.current_role())='admin'
$$;
revoke all on function public.member_access_summary() from public,anon;
grant execute on function public.member_access_summary() to authenticated;

create function public.workspace_release_status() returns text language sql stable security invoker set search_path='' as $$ select case when (select private.current_role()) in ('admin','sales') then '20261001-productivity' else null end $$;
revoke all on function public.workspace_release_status() from public,anon;
grant execute on function public.workspace_release_status() to authenticated;
