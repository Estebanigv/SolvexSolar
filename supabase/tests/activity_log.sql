-- Synthetic fixtures only. All changes, including audit entries, roll back.
begin;
insert into auth.users(id,email,raw_user_meta_data) values
('10000000-0000-4000-8000-000000000001','admin@audit.example','{"full_name":"Audit Admin"}'),
('10000000-0000-4000-8000-000000000002','sales@audit.example','{"full_name":"Audit Sales"}'),
('10000000-0000-4000-8000-000000000003','disabled@audit.example','{}');
update public.profiles set role=case when email like 'admin%' then 'admin' when email like 'sales%' then 'sales' else 'disabled' end where email like '%@audit.example';
insert into public.workspace_config(products,settings) values ('[{"id":"test-panel","name":"Audit Panel","price":100000}]','{"validDays":15}')
on conflict(id) do update set products=excluded.products,settings=excluded.settings;
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
do $$declare n integer;r integer;begin
 select count(*) into n from public.activity_log;
 update public.workspace_config set products='[{"id":"test-panel","name":"Audit Panel","price":120000}]';
 if (select count(*) from public.activity_log)<>n+1 then raise exception 'Expected exactly one price event';end if;
 if not exists(select 1 from public.activity_log where entity_id='test-panel' and action='price_changed' and actor_id=auth.uid() and actor_name='Audit Admin' and actor_email='admin@audit.example' and changes='[{"field":"price","before":100000,"after":120000}]'::jsonb and occurred_on=(occurred_at at time zone 'America/Santiago')::date) then raise exception 'Wrong price diff or actor/time';end if;
 select count(*) into n from public.activity_log;
 update public.workspace_config set products=products,updated_at=now(),revision=revision+1;
 if (select count(*) from public.activity_log)<>n then raise exception 'No-op produced audit';end if;
 begin update public.workspace_config set products='[{"id":"test-panel","name":"Audit Panel","price":999}]';raise exception 'rollback-test';exception when raise_exception then null;end;
 if (select count(*) from public.activity_log)<>n then raise exception 'Rolled-back edit retained audit';end if;
 select revision into r from public.workspace_config;
 begin perform public.save_workspace(r-1,'[{"id":"test-panel","price":555}]','{}');raise exception 'Conflict accepted';exception when serialization_failure then null;end;
 if (select count(*) from public.activity_log)<>n then raise exception 'Conflict retained audit';end if;
 update public.workspace_config set settings='{"validDays":30}';
 if not exists(select 1 from public.activity_log where entity_type='company' and actor_id=auth.uid() and changes @> '[{"field":"validDays","before":15,"after":30}]') then raise exception 'Company change missing';end if;
 -- A real application administrator cannot forge, rewrite, delete or truncate the log.
 begin insert into public.activity_log select * from public.activity_log limit 1;raise exception 'Insert allowed';exception when insufficient_privilege then null;end;
 begin update public.activity_log set actor_name='Forged';raise exception 'Update allowed';exception when insufficient_privilege then null;end;
 begin delete from public.activity_log;raise exception 'Delete allowed';exception when insufficient_privilege then null;end;
 begin truncate public.activity_log;raise exception 'Truncate allowed';exception when insufficient_privilege then null;end;
 begin perform private.write_activity('catalog','fake','Fake','updated','[]');raise exception 'Writer callable';exception when insufficient_privilege then null;end;
 begin perform private.capture_activity();raise exception 'Trigger callable';exception when insufficient_privilege then null;end;
 insert into public.clients(id,details) values ('10000000-0000-4000-8000-000000000011','{"name":"Audit client","commune":"Santiago"}');
 update public.clients set details='{"name":"Audit client","commune":"Ñuñoa"}' where id='10000000-0000-4000-8000-000000000011';
 if not exists(select 1 from public.activity_log where entity_type='client' and action='updated' and changes @> '[{"field":"commune","before":"Santiago","after":"Ñuñoa"}]') then raise exception 'Client diff missing';end if;
 insert into public.quotes(id,client_id,folio,payload) values ('10000000-0000-4000-8000-000000000021','10000000-0000-4000-8000-000000000011','AUDIT-TEST','{"calculation":{"total":120000}}');
 update public.quotes set sent_on=(now() at time zone 'America/Santiago')::date,sent_channel='whatsapp' where folio='AUDIT-TEST';
 update public.quotes set deleted_at=now() where folio='AUDIT-TEST';
 update public.quotes set deleted_at=null where folio='AUDIT-TEST';
 if (select count(distinct action) from public.activity_log where entity_type='quote' and entity_label='AUDIT-TEST' and action in ('created','sent','trashed','restored') and actor_id=auth.uid())<>4 then raise exception 'Quote lifecycle missing';end if;
 update public.profiles set role='admin' where id='10000000-0000-4000-8000-000000000002';
 if not exists(select 1 from public.activity_log where entity_type='member' and entity_id='10000000-0000-4000-8000-000000000002' and actor_id=auth.uid() and changes @> '[{"field":"role","before":"sales","after":"admin"}]') then raise exception 'Member actor or diff wrong';end if;
 update public.profiles set role='sales' where id='10000000-0000-4000-8000-000000000002';
end $$;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
do $$begin
 if exists(select 1 from public.activity_log) then raise exception 'Sales reads audit';end if;
 insert into public.clients(id,details) values ('10000000-0000-4000-8000-000000000012','{"name":"Sales audit client"}');
end $$;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
do $$begin if not exists(select 1 from public.activity_log where entity_id='10000000-0000-4000-8000-000000000012' and actor_name='Audit Sales') then raise exception 'Sales writes not audited';end if;end $$;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000003',true);
do $$begin if exists(select 1 from public.activity_log) then raise exception 'Disabled reads audit';end if;end $$;
reset role;
-- Stored identity survives later name changes.
update public.profiles set full_name='Renamed Admin' where id='10000000-0000-4000-8000-000000000001';
do $$begin if not exists(select 1 from public.activity_log where action='price_changed' and actor_name='Audit Admin') then raise exception 'Historical identity lost';end if;end $$;
set local role anon;
do $$begin begin perform 1 from public.activity_log;raise exception 'Anonymous reads audit';exception when insufficient_privilege then null;end;end $$;
rollback;
