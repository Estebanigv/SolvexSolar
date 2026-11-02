-- LOCAL ONLY. Exercise policies as real roles, without production data.
do $$ begin if current_database()<>'solvex_crm_test' then raise exception 'Local test database required';end if;end $$;
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
insert into public.clients(id,details) values ('10000000-0000-4000-8000-000000000001','{"name":"Portfolio A"}');
insert into public.crm_leads(client_id) values ('10000000-0000-4000-8000-000000000001');
insert into public.crm_contact_profiles(client_id,source) values ('10000000-0000-4000-8000-000000000001','referral');
insert into public.crm_tasks(client_id,title,due_on) values ('10000000-0000-4000-8000-000000000001','Call A',current_date);
insert into public.crm_notes(client_id,body) values ('10000000-0000-4000-8000-000000000001','Original note');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',true);
insert into public.clients(id,details) values ('10000000-0000-4000-8000-000000000002','{"name":"Portfolio B"}');
insert into public.crm_leads(client_id) values ('10000000-0000-4000-8000-000000000002');
do $$ begin
 if public.crm_can_view_all() then raise exception 'Sales received global access';end if;
 if (select count(*) from public.crm_leads)<>1 then raise exception 'Sales portfolio leaked';end if;
 update public.crm_leads set status='qualified' where client_id='10000000-0000-4000-8000-000000000001';
 if found then raise exception 'Sales modified foreign lead';end if;
 begin
  insert into public.crm_notes(client_id,body) values ('10000000-0000-4000-8000-000000000001','Unauthorized');
  raise exception 'Sales wrote foreign note';
 exception when insufficient_privilege then null;end;
end $$;
-- Ordinary admin, with no supervisor entry, sees and edits both portfolios.
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000004',true);
do $$ begin
 if not public.crm_can_view_all() then raise exception 'Admin cannot view all';end if;
 if (select count(*) from public.crm_leads)<>2 then raise exception 'Admin missing leads';end if;
 if (select count(*) from public.crm_leads l join public.clients c on c.id=l.client_id where c.owner_id=auth.uid())<>0 then raise exception 'My leads uses wrong identity';end if;
 if (select count(*) from public.crm_tasks)<>1 or (select count(*) from public.crm_notes)<>1 then raise exception 'Admin missing task/note';end if;
 update public.crm_leads set status='qualified' where client_id='10000000-0000-4000-8000-000000000001';
 if not found then raise exception 'Admin cannot update lead';end if;
 update public.crm_tasks set title='Updated by admin' where client_id='10000000-0000-4000-8000-000000000001';
 if not found then raise exception 'Admin cannot update task';end if;
 update public.crm_contact_profiles set priority='high' where client_id='10000000-0000-4000-8000-000000000001';
 if not found then raise exception 'Admin cannot update contact';end if;
 insert into public.crm_notes(client_id,body) values ('10000000-0000-4000-8000-000000000001','Admin note');
 if (select owner_id from public.clients where id='10000000-0000-4000-8000-000000000001')<>'00000000-0000-4000-8000-000000000002'::uuid then raise exception 'Edit changed responsible person';end if;
 if (select updated_by from public.crm_leads where client_id='10000000-0000-4000-8000-000000000001')<>auth.uid() then raise exception 'Editor attribution lost';end if;
 if (select author_id from public.crm_notes where body='Admin note')<>auth.uid() then raise exception 'Note author attribution lost';end if;
 begin update public.clients set owner_id=auth.uid() where id='10000000-0000-4000-8000-000000000001';raise exception 'Direct reassignment allowed';exception when insufficient_privilege then null;end;
end $$;
-- Explicit sales supervision is preserved; demotion/disable revokes generic admin access immediately.
reset role;
update public.profiles set role='sales' where id in ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000004');
set local role authenticated;
do $$ begin if public.crm_can_view_all() or exists(select 1 from public.crm_leads) then raise exception 'Demoted admin retained global access';end if;end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
do $$ begin if not public.crm_can_view_all() then raise exception 'Explicit sales supervisor lost access';end if;end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000005',true);
do $$ begin if public.crm_can_view_all() or exists(select 1 from public.crm_leads) then raise exception 'Disabled account retained access';end if;end $$;
select set_config('request.jwt.claim.sub','',true);
do $$ begin if public.crm_can_view_all() then raise exception 'Missing identity authorized';end if;end $$;
reset role;
set local role anon;
do $$ begin
 begin perform public.crm_can_view_all();raise exception 'Anonymous RPC allowed';exception when insufficient_privilege then null;end;
 begin perform 1 from public.crm_leads;raise exception 'Anonymous leads allowed';exception when insufficient_privilege then null;end;
end $$;
reset role;
rollback;
select 'PASS: all admins share CRM, own filtering, edits preserve ownership and authors; sales, demoted, disabled and anonymous restrictions hold' as result;
