-- Synthetic records only. All changes are rolled back, including test users.
begin;
select set_config('test.crm_owner',gen_random_uuid()::text,true),
       set_config('test.crm_other',gen_random_uuid()::text,true),
       set_config('test.crm_admin',gen_random_uuid()::text,true),
       set_config('test.crm_client',gen_random_uuid()::text,true);
insert into auth.users(id,email,raw_user_meta_data)
select current_setting('test.crm_'||name)::uuid,'crm-'||name||'-'||gen_random_uuid()||'@example.test','{}'::jsonb
from unnest(array['owner','other','admin']) name;
update public.profiles set role='sales' where id in (current_setting('test.crm_owner')::uuid,current_setting('test.crm_other')::uuid);
update public.profiles set role='admin' where id=current_setting('test.crm_admin')::uuid;
insert into public.clients(id,owner_id,details) values(current_setting('test.crm_client')::uuid,current_setting('test.crm_owner')::uuid,'{"name":"CRM synthetic client"}');
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('test.crm_owner'),true);
insert into public.crm_leads(client_id,status,next_contact) values(current_setting('test.crm_client')::uuid,'contacted','2026-10-27');
insert into public.crm_notes(client_id,body) values(current_setting('test.crm_client')::uuid,'Synthetic CRM note');
do $$ declare stamp timestamptz; changed integer; begin
  select updated_at into stamp from public.crm_leads where client_id=current_setting('test.crm_client')::uuid;
  update public.crm_leads set status='qualified' where client_id=current_setting('test.crm_client')::uuid and updated_at=stamp;
  if not found then raise exception 'Owner cannot update own lead'; end if;
  update public.crm_leads set status='rejected' where client_id=current_setting('test.crm_client')::uuid and updated_at=stamp;
  get diagnostics changed=row_count;
  if changed<>0 then raise exception 'Stale write overwrote lead'; end if;
  begin update public.crm_notes set body='tamper' where client_id=current_setting('test.crm_client')::uuid; raise exception 'Notes mutable'; exception when insufficient_privilege then null; end;
  begin insert into public.crm_notes(client_id,body,author_id) values(current_setting('test.crm_client')::uuid,'Spoof',current_setting('test.crm_other')::uuid); raise exception 'Author spoof allowed'; exception when insufficient_privilege then null; end;
  begin insert into public.crm_notes(client_id,body) values(current_setting('test.crm_client')::uuid,' '); raise exception 'Blank note allowed'; exception when check_violation then null; end;
end $$;
select set_config('request.jwt.claim.sub',current_setting('test.crm_other'),true);
do $$ begin
  if exists(select 1 from public.crm_leads where client_id=current_setting('test.crm_client')::uuid) then raise exception 'Other sales can read lead'; end if;
  if exists(select 1 from public.crm_notes where client_id=current_setting('test.crm_client')::uuid) then raise exception 'Other sales can read notes'; end if;
  update public.crm_leads set status='rejected' where client_id=current_setting('test.crm_client')::uuid;
  if found then raise exception 'Other sales can update lead'; end if;
  begin insert into public.crm_notes(client_id,body) values(current_setting('test.crm_client')::uuid,'Unauthorized'); raise exception 'Other sales can add note'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub',current_setting('test.crm_admin'),true);
do $$ begin
  if (select status from public.crm_leads where client_id=current_setting('test.crm_client')::uuid) is distinct from 'qualified' then raise exception 'Admin cannot read lead'; end if;
  if (select count(*) from public.crm_notes where client_id=current_setting('test.crm_client')::uuid)<>1 then raise exception 'Admin cannot read notes'; end if;
end $$;
update public.clients set deleted_at=now() where id=current_setting('test.crm_client')::uuid;
do $$ begin
  if exists(select 1 from public.crm_leads where client_id=current_setting('test.crm_client')::uuid) then raise exception 'Archived lead visible'; end if;
  begin insert into public.crm_notes(client_id,body) values(current_setting('test.crm_client')::uuid,'Archived'); raise exception 'Archived note allowed'; exception when insufficient_privilege then null; end;
end $$;
reset role;
update public.clients set deleted_at=null where id=current_setting('test.crm_client')::uuid;
update public.profiles set role='disabled' where id=current_setting('test.crm_owner')::uuid;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('test.crm_owner'),true);
do $$ begin
  if exists(select 1 from public.crm_leads where client_id=current_setting('test.crm_client')::uuid) then raise exception 'Disabled account can read lead'; end if;
  if exists(select 1 from public.crm_notes where client_id=current_setting('test.crm_client')::uuid) then raise exception 'Disabled account can read notes'; end if;
end $$;
reset role;
set local role anon;
do $$ begin
  begin perform 1 from public.crm_notes; raise exception 'Anonymous can read notes'; exception when insufficient_privilege then null; end;
  begin perform 1 from public.crm_leads; raise exception 'Anonymous can read leads'; exception when insufficient_privilege then null; end;
end $$;
rollback;
