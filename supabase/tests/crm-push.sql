do $$ begin if current_database()<>'solvex_crm_test' then raise exception 'Local database required';end if;end $$;
begin;
insert into private.crm_push_config(worker_hash) values(encode(sha256(convert_to(repeat('s',64),'UTF8')),'hex'));
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
select public.crm_push_device('https://fcm.googleapis.com/test-a',repeat('a',87),repeat('a',22));
insert into public.clients(id,details) values('20000000-0000-4000-8000-000000000001','{"name":"Push test"}');
do $$ begin
 if exists(select 1 from public.crm_notifications) then raise exception 'Self creation notified';end if;
 begin perform public.crm_push_device('https://fcmXgoogleapisXcom/test',repeat('a',87),repeat('a',22));raise exception 'SSRF endpoint accepted';
 exception when raise_exception then if sqlerrm='SSRF endpoint accepted' then raise;end if;end;
 begin perform 1 from private.crm_push_devices;raise exception 'Devices leaked';exception when insufficient_privilege then null;end;
end $$;
reset role;
-- Give the test device an earlier timestamp than this transaction's notification.
update private.crm_push_devices set created_at=now()-interval '1 minute';
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000004',true);
update public.clients set owner_id='00000000-0000-4000-8000-000000000003' where id='20000000-0000-4000-8000-000000000001';
update public.clients set owner_id='00000000-0000-4000-8000-000000000002' where id='20000000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000004',true);
do $$ begin if exists(select 1 from public.crm_notifications) then raise exception 'Admin sees foreign inbox';end if;end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',true);
do $$ begin if exists(select 1 from public.crm_notifications) then raise exception 'Old owner sees stale lead notice';end if;end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
do $$ begin if (select count(*) from public.crm_notifications)<>1 then raise exception 'New owner missing notice';end if;end $$;
reset role;
set local role anon;
do $$ begin
 begin perform public.crm_push_claim('bad');raise exception 'Worker unauthorized';exception when insufficient_privilege then null;end;
 begin perform 1 from public.crm_notifications;raise exception 'Anonymous inbox';exception when insufficient_privilege then null;end;
end $$;
reset role;
create temp table claimed as select * from public.crm_push_claim(repeat('s',64));
do $$ begin
 if (select count(*) from claimed)<>1 then raise exception 'Wrong recipient or missing device';end if;
 if exists(select 1 from public.crm_push_claim(repeat('s',64))) then raise exception 'Duplicate lease';end if;
 if exists(select 1 from claimed where body like '%Push test%') then raise exception 'Personal name in lock screen';end if;
end $$;
-- Stale acknowledgements cannot finish another worker's lease.
select public.crm_push_finish(repeat('s',64),delivery_id,gen_random_uuid(),201) from claimed;
do $$ begin if exists(select 1 from private.crm_push_deliveries where sent_at is not null) then raise exception 'Stale ack accepted';end if;end $$;
select public.crm_push_finish(repeat('s',64),delivery_id,lease_id,503) from claimed;
update private.crm_push_deliveries set lease_until=now()-interval '1 minute';
truncate claimed;
insert into claimed select * from public.crm_push_claim(repeat('s',64));
do $$ begin if (select count(*) from claimed)<>1 then raise exception 'Retry missing';end if;end $$;
select public.crm_push_finish(repeat('s',64),delivery_id,lease_id,201) from claimed;
do $$ begin if exists(select 1 from public.crm_push_claim(repeat('s',64))) then raise exception 'Sent notification repeated';end if;end $$;
-- Rebinding one browser cannot leak the previous user's queued notifications.
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',true);
select public.crm_push_device('https://fcm.googleapis.com/test-a',repeat('b',87),repeat('b',22));
reset role;
do $$ begin
 if (select count(*) from private.crm_push_devices)<>1 or exists(select 1 from private.crm_push_deliveries) then raise exception 'Shared device retained old queue';end if;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000005',true);
do $$ begin
 begin perform public.crm_push_device('https://fcm.googleapis.com/test-disabled',repeat('a',87),repeat('a',22));raise exception 'Disabled subscribed';exception when insufficient_privilege then null;end;
 if exists(select 1 from public.crm_notifications) then raise exception 'Disabled inbox';end if;
end $$;
reset role;
-- Morning schedule, overdue work and daily deduplication.
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
insert into public.crm_leads(client_id,next_contact) values('20000000-0000-4000-8000-000000000001','2026-11-02');
insert into public.crm_tasks(client_id,title,due_on) values('20000000-0000-4000-8000-000000000001','Pending call','2026-11-03');
insert into public.crm_tasks(client_id,title,due_on,status) values('20000000-0000-4000-8000-000000000001','Done call','2026-11-02','completed');
select private.crm_generate_reminders('2026-11-03 08:59 America/Santiago');
do $$ begin if exists(select 1 from public.crm_notifications where event_key like 'reminder:%:2026-11-03') then raise exception 'Early reminder';end if;end $$;
select private.crm_generate_reminders('2026-11-03 09:00 America/Santiago');
select private.crm_generate_reminders('2026-11-03 12:00 America/Santiago');
do $$ begin
 if (select count(*) from public.crm_notifications where event_key like 'reminder:%:2026-11-03')<>1 then raise exception 'Digest duplicated or missing';end if;
 if not exists(select 1 from public.crm_notifications where event_key like 'reminder:%:2026-11-03' and body='1 tareas y 1 contactos para hoy o vencidos.') then raise exception 'Incorrect pending count';end if;
end $$;
rollback;
select 'PASS: own inbox, assignment, disabled accounts, endpoint validation, leases, retries, deduplication and shared-device isolation' as result;
