-- Synthetic fixtures only; never retain test users, clients or quotes.
begin;
select set_config('test.crm_owner',gen_random_uuid()::text,true),
 set_config('test.crm_other',gen_random_uuid()::text,true),
 set_config('test.crm_client',gen_random_uuid()::text,true),
 set_config('test.crm_project',gen_random_uuid()::text,true);
insert into auth.users(id,email,raw_user_meta_data)
select current_setting('test.crm_'||name)::uuid,'crm-sales-'||name||'-'||gen_random_uuid()||'@example.test','{}'::jsonb from unnest(array['owner','other']) name;
update public.profiles set role='sales' where id in(current_setting('test.crm_owner')::uuid,current_setting('test.crm_other')::uuid);
insert into public.clients(id,owner_id,details) values(current_setting('test.crm_client')::uuid,current_setting('test.crm_owner')::uuid,'{"name":"Synthetic CRM sales"}');
insert into public.quotes(id,owner_id,client_id,folio,payload) values(current_setting('test.crm_project')::uuid,current_setting('test.crm_owner')::uuid,current_setting('test.crm_client')::uuid,'CRM-TEST-'||current_setting('test.crm_project'),'{}');
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('test.crm_owner'),true);
insert into public.crm_leads(client_id,status,expected_close,lost_reason) values(current_setting('test.crm_client')::uuid,'no_answer','2026-11-20','Proyecto postergado');
insert into public.quote_followups(project_id,status,expected_close,lost_reason) values(current_setting('test.crm_project')::uuid,'visit','2026-11-20','Presupuesto');
do $$ declare stamp timestamptz; begin
 update public.crm_leads set status='visit' where client_id=current_setting('test.crm_client')::uuid;
 select updated_at into stamp from public.quote_followups where project_id=current_setting('test.crm_project')::uuid;
 update public.quote_followups set status='negotiation' where project_id=current_setting('test.crm_project')::uuid and updated_at=stamp;
 if not found then raise exception 'Owner cannot edit new stage';end if;
 update public.quote_followups set expected_close=null where project_id=current_setting('test.crm_project')::uuid and updated_at=stamp;
 if found then raise exception 'Stale closing edit succeeded';end if;
 if not exists(select 1 from public.quote_followups where project_id=current_setting('test.crm_project')::uuid and lost_reason='Presupuesto' and expected_close='2026-11-20') then raise exception 'Legacy update erased closing fields';end if;
 begin update public.quote_followups set lost_reason=repeat('x',501) where project_id=current_setting('test.crm_project')::uuid;raise exception 'Oversized reason accepted';exception when check_violation then null;end;
 begin update public.crm_leads set status='negotiation' where client_id=current_setting('test.crm_client')::uuid;raise exception 'Unquoted lead negotiated';exception when check_violation then null;end;
 begin update public.quote_followups set updated_by=current_setting('test.crm_other')::uuid where project_id=current_setting('test.crm_project')::uuid;raise exception 'Author spoof allowed';exception when insufficient_privilege then null;end;
 if exists(select 1 from public.quotes where id=current_setting('test.crm_project')::uuid and sent_on is not null) then raise exception 'CRM stage fabricated a send';end if;
end $$;
select set_config('request.jwt.claim.sub',current_setting('test.crm_other'),true);
do $$ begin
 if exists(select 1 from public.quote_followups where project_id=current_setting('test.crm_project')::uuid) then raise exception 'Other sales can read closure';end if;
 update public.quote_followups set lost_reason='Tamper' where project_id=current_setting('test.crm_project')::uuid;
 if found then raise exception 'Other sales edited closure';end if;
 update public.crm_leads set expected_close=null where client_id=current_setting('test.crm_client')::uuid;
 if found then raise exception 'Other sales edited lead closure';end if;
end $$;
select set_config('request.jwt.claim.sub',current_setting('test.crm_owner'),true);
update public.quote_followups set expected_close=null,lost_reason=null where project_id=current_setting('test.crm_project')::uuid;
do $$ begin
 if not exists(select 1 from public.quote_followups where project_id=current_setting('test.crm_project')::uuid and expected_close is null and lost_reason is null) then raise exception 'Explicit clearing failed';end if;
end $$;
rollback;
