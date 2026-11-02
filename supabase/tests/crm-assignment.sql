-- LOCAL ONLY: synthetic users are installed by the isolated PostgreSQL test bootstrap.
-- Refuse to run against any deployment database.
do $$ begin if current_database()<>'solvex_crm_test' then raise exception 'Local test database required';end if;end $$;
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
insert into public.clients(id,details) values ('10000000-0000-4000-8000-000000000001','{"name":"Local lead A"}');
insert into public.crm_leads(client_id) values ('10000000-0000-4000-8000-000000000001');
insert into public.crm_contact_profiles(client_id,source) values ('10000000-0000-4000-8000-000000000001','referral');
insert into public.crm_tasks(client_id,title,due_on) values ('10000000-0000-4000-8000-000000000001','Local followup',current_date);
insert into public.client_notes(client_id,body) values ('10000000-0000-4000-8000-000000000001','Original note');
insert into public.quotes(id,client_id,folio,payload) values
('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','LOCAL-1','{"input":{"customer":{"name":"Local lead A"},"proposalType":"preliminary"},"calculation":{"total":100,"lines":[]}}');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',true);
insert into public.clients(id,details) values ('10000000-0000-4000-8000-000000000002','{"name":"Local lead B"}');
insert into public.crm_leads(client_id) values ('10000000-0000-4000-8000-000000000002');
do $$ begin
 if public.crm_can_view_all() then raise exception 'Sales received supervision';end if;
 if (select count(*) from public.crm_leads)<>1 then raise exception 'Sales portfolio leaked';end if;
 if (select count(*) from public.crm_team())<>4 then raise exception 'Team includes inactive user or excludes active user';end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000004',true);
do $$ begin
 if public.crm_can_view_all() then raise exception 'Generic admin received supervision';end if;
 if exists(select 1 from public.crm_leads) then raise exception 'Generic admin saw foreign leads';end if;
 begin
  perform public.crm_reassign_client('10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000002',now());
  raise exception 'Generic admin reassigned a foreign lead';
 exception when insufficient_privilege then null;end;
 begin update public.clients set owner_id=auth.uid() where id='10000000-0000-4000-8000-000000000001';raise exception 'Direct reassignment allowed';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
do $$ begin
 if not public.crm_can_view_all() or (select count(*) from public.crm_leads)<>2 then raise exception 'Carol cannot supervise';end if;
 if (select count(*) from public.crm_tasks)<>1 then raise exception 'Carol cannot see tasks';end if;
 update public.crm_leads set status='qualified' where client_id='10000000-0000-4000-8000-000000000001';
 if not found then raise exception 'Carol cannot update supervised lead';end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
do $$ declare stamp timestamptz; begin
 select updated_at into stamp from public.clients where id='10000000-0000-4000-8000-000000000001';
 begin
  perform public.crm_reassign_client('10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000005',auth.uid(),stamp);
  raise exception 'Inactive recipient accepted';
 exception when invalid_parameter_value then null;end;
 begin
  perform public.crm_reassign_client('10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000003',auth.uid(),stamp-interval '1 second');
  raise exception 'Stale reassignment accepted';
 exception when serialization_failure then null;end;
 perform public.crm_reassign_client('10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000003',auth.uid(),stamp);
 if exists(select 1 from public.clients where id='10000000-0000-4000-8000-000000000001') or exists(select 1 from public.crm_leads) or exists(select 1 from public.crm_tasks) or exists(select 1 from public.quotes) then
  raise exception 'Previous owner retains assigned portfolio';
 end if;
 begin
  perform public.crm_reassign_client('10000000-0000-4000-8000-000000000001',auth.uid(),'00000000-0000-4000-8000-000000000003',stamp);
  raise exception 'Previous owner reclaimed lead';
 exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',true);
do $$ begin
 if (select count(*) from public.crm_leads)<>2 or (select count(*) from public.crm_tasks)<>1 then raise exception 'Assignment lost CRM history';end if;
 if (select count(*) from public.client_notes)<>2 then raise exception 'Original note or assignment audit missing';end if;
 if (select source from public.crm_contact_profiles limit 1)<>'referral' then raise exception 'Contact profile lost';end if;
 if (select owner_id from public.quotes limit 1)<>'00000000-0000-4000-8000-000000000002'::uuid then raise exception 'Quote author changed';end if;
 perform public.issue_quote('20000000-0000-4000-8000-000000000001');
 if (select issued_by from public.quotes limit 1)<>auth.uid() then raise exception 'Assigned owner cannot issue quote';end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
do $$ declare stamp timestamptz; begin
 select updated_at into stamp from public.clients where id='10000000-0000-4000-8000-000000000001';
 perform public.crm_reassign_client('10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000003',stamp);
 if (select count(*) from public.crm_leads)<>2 then raise exception 'Carol loses supervision after assignment';end if;
end $$;
reset role;
update public.profiles set role='disabled' where id='00000000-0000-4000-8000-000000000001';
set local role authenticated;
do $$ begin if public.crm_can_view_all() then raise exception 'Disabled supervisor retained access';end if;end $$;
reset role;
rollback;
select 'PASS: supervisor, own portfolios, transfer, conflicts, inactive users, audit and quote continuity' as result;
