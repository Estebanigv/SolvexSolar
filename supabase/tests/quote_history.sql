-- Synthetic records, all rolled back. Run after workspace and history migrations.
begin;
insert into auth.users(id,email,raw_user_meta_data) values
('00000000-0000-4000-8000-000000000001','admin@history.example','{}'),
('00000000-0000-4000-8000-000000000002','sales@history.example','{}'),
('00000000-0000-4000-8000-000000000003','other@history.example','{}'),
('00000000-0000-4000-8000-000000000004','disabled@history.example','{}');
update public.profiles set role=case when email like 'admin%' then 'admin' when email like 'disabled%' then 'disabled' else 'sales' end where email like '%@history.example';
insert into public.clients(id,owner_id,details) values
('00000000-0000-4000-8000-000000000011','00000000-0000-4000-8000-000000000002','{"name":"History example"}');
insert into public.quotes(id,owner_id,client_id,folio,payload,created_at) values
('00000000-0000-4000-8000-000000000021','00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000011','HISTORY-TEST','{}',now()-interval '10 days');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
do $$declare n integer;begin
 update public.quotes set sent_on=(now() at time zone 'America/Santiago')::date,sent_channel='whatsapp' where folio='HISTORY-TEST';
 if not exists(select 1 from public.quotes where folio='HISTORY-TEST' and sent_by=auth.uid() and sent_recorded_at is not null) then raise exception 'Owner cannot register send';end if;
 begin update public.quotes set deleted_at=now() where folio='HISTORY-TEST';raise exception 'Seller deleted quote';exception when insufficient_privilege then null;end;
 begin update public.quotes set payload='{"modified":true}' where folio='HISTORY-TEST';raise exception 'Payload mutable';exception when insufficient_privilege then null;end;
 begin update public.quotes set sent_by='00000000-0000-4000-8000-000000000001' where folio='HISTORY-TEST';raise exception 'Sender spoofed';exception when insufficient_privilege then null;end;
 begin update public.quotes set sent_on=(now() at time zone 'America/Santiago')::date+1 where folio='HISTORY-TEST';raise exception 'Future send accepted';exception when invalid_parameter_value then null;end;
 begin update public.quotes set sent_on=(now() at time zone 'America/Santiago')::date-20 where folio='HISTORY-TEST';raise exception 'Send before creation accepted';exception when invalid_parameter_value then null;end;
 begin delete from public.quotes where folio='HISTORY-TEST';raise exception 'Hard delete allowed';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',true);
do $$declare n integer;begin
 if exists(select 1 from public.quotes where folio='HISTORY-TEST') then raise exception 'Cross-user read';end if;
 update public.quotes set sent_channel='email' where folio='HISTORY-TEST';get diagnostics n=row_count;if n<>0 then raise exception 'Cross-user update';end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
do $$begin
 update public.quotes set deleted_at=now() where folio='HISTORY-TEST';
 if not exists(select 1 from public.quotes where folio='HISTORY-TEST' and deleted_at is not null and deleted_by=auth.uid()) then raise exception 'Admin trash failed';end if;
 begin update public.quotes set sent_channel='email' where folio='HISTORY-TEST';raise exception 'Deleted quote edited';exception when invalid_parameter_value then null;end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
do $$begin if exists(select 1 from public.quotes where folio='HISTORY-TEST') then raise exception 'Seller reads trash';end if;end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
do $$begin
 update public.quotes set deleted_at=null where folio='HISTORY-TEST';
 if not exists(select 1 from public.quotes where folio='HISTORY-TEST' and deleted_at is null and deleted_by is null and sent_channel='whatsapp') then raise exception 'Restore lost metadata';end if;
 update public.quotes set sent_on=null,sent_channel=null where folio='HISTORY-TEST';
 if not exists(select 1 from public.quotes where folio='HISTORY-TEST' and sent_by is null and sent_recorded_at is null) then raise exception 'Clear send failed';end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000004',true);
do $$declare n integer;begin
 if exists(select 1 from public.quotes where folio='HISTORY-TEST') then raise exception 'Disabled reads';end if;
 update public.quotes set sent_on=current_date,sent_channel='email' where folio='HISTORY-TEST';get diagnostics n=row_count;if n<>0 then raise exception 'Disabled writes';end if;
end $$;
set local role anon;
do $$begin begin perform 1 from public.quotes;raise exception 'Anonymous reads';exception when insufficient_privilege then null;end;end $$;
rollback;
