begin;
select set_config('test.cw_owner',gen_random_uuid()::text,true),set_config('test.cw_other',gen_random_uuid()::text,true),set_config('test.cw_admin',gen_random_uuid()::text,true),set_config('test.cw_client',gen_random_uuid()::text,true),set_config('test.cw_task',gen_random_uuid()::text,true);
insert into auth.users(id,email,raw_user_meta_data) select current_setting('test.cw_'||name)::uuid,'crm-work-'||name||'-'||gen_random_uuid()||'@example.test','{}'::jsonb from unnest(array['owner','other','admin']) name;
update public.profiles set role='sales' where id in(current_setting('test.cw_owner')::uuid,current_setting('test.cw_other')::uuid);
update public.profiles set role='admin' where id=current_setting('test.cw_admin')::uuid;
insert into public.clients(id,owner_id,details) values(current_setting('test.cw_client')::uuid,current_setting('test.cw_owner')::uuid,'{"name":"CRM work synthetic client"}');
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('test.cw_owner'),true);
insert into public.crm_contact_profiles(client_id,source,tags,priority) values(current_setting('test.cw_client')::uuid,'referral',array['Residential'],'high');
insert into public.crm_tasks(id,client_id,title,kind,due_on,details) values(current_setting('test.cw_task')::uuid,current_setting('test.cw_client')::uuid,'Synthetic visit','visit','2026-10-27','Synthetic details');
insert into public.client_notes(client_id,body) values(current_setting('test.cw_client')::uuid,repeat('a',4000));
do $$ declare stamp timestamptz; begin
 select updated_at into stamp from public.crm_tasks where id=current_setting('test.cw_task')::uuid;
 update public.crm_tasks set status='completed' where id=current_setting('test.cw_task')::uuid and updated_at=stamp;
 if not found then raise exception 'Owner cannot complete task';end if;
 if (select completed_at from public.crm_tasks where id=current_setting('test.cw_task')::uuid) is null then raise exception 'Completion not stamped';end if;
 update public.crm_tasks set status='cancelled' where id=current_setting('test.cw_task')::uuid and updated_at=stamp;
 if found then raise exception 'Stale task overwrote completion';end if;
 update public.crm_tasks set status='pending' where id=current_setting('test.cw_task')::uuid;
 if (select completed_at from public.crm_tasks where id=current_setting('test.cw_task')::uuid) is not null then raise exception 'Reopen kept completion';end if;
 begin update public.crm_tasks set client_id=gen_random_uuid() where id=current_setting('test.cw_task')::uuid;raise exception 'Task reassignment bypass';exception when insufficient_privilege then null;end;
 begin update public.crm_tasks set updated_by=current_setting('test.cw_other')::uuid where id=current_setting('test.cw_task')::uuid;raise exception 'Author spoof';exception when insufficient_privilege then null;end;
 begin delete from public.crm_tasks where id=current_setting('test.cw_task')::uuid;raise exception 'Task deleted';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub',current_setting('test.cw_other'),true);
do $$ begin
 if exists(select 1 from public.crm_tasks where id=current_setting('test.cw_task')::uuid) then raise exception 'Other sales read task';end if;
 if exists(select 1 from public.crm_contact_profiles where client_id=current_setting('test.cw_client')::uuid) then raise exception 'Other sales read metadata';end if;
 if exists(select 1 from public.client_notes where client_id=current_setting('test.cw_client')::uuid) then raise exception 'Other sales read note';end if;
 update public.crm_tasks set status='completed' where id=current_setting('test.cw_task')::uuid;if found then raise exception 'Other sales modified task';end if;
 begin insert into public.crm_tasks(client_id,title,due_on) values(current_setting('test.cw_client')::uuid,'Unauthorized','2026-10-27');raise exception 'Other sales created task';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub',current_setting('test.cw_admin'),true);
do $$ begin
 if not exists(select 1 from public.crm_tasks where id=current_setting('test.cw_task')::uuid) then raise exception 'Admin cannot read tasks';end if;
 update public.crm_contact_profiles set source='website' where client_id=current_setting('test.cw_client')::uuid;if not found then raise exception 'Admin cannot edit metadata';end if;
end $$;
update public.clients set deleted_at=now() where id=current_setting('test.cw_client')::uuid;
do $$ begin
 if exists(select 1 from public.crm_tasks where id=current_setting('test.cw_task')::uuid) then raise exception 'Archived tasks visible';end if;
 update public.crm_tasks set status='completed' where id=current_setting('test.cw_task')::uuid;if found then raise exception 'Archived task modified';end if;
end $$;
reset role;
update public.clients set deleted_at=null where id=current_setting('test.cw_client')::uuid;
update public.profiles set role='disabled' where id=current_setting('test.cw_owner')::uuid;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('test.cw_owner'),true);
do $$ begin
 if exists(select 1 from public.crm_tasks where id=current_setting('test.cw_task')::uuid) then raise exception 'Disabled account reads task';end if;
 if exists(select 1 from public.crm_contact_profiles where client_id=current_setting('test.cw_client')::uuid) then raise exception 'Disabled account reads profile';end if;
end $$;
reset role;
set local role anon;
do $$ begin
 begin perform 1 from public.crm_tasks;raise exception 'Anonymous task access';exception when insufficient_privilege then null;end;
 begin perform 1 from public.crm_contact_profiles;raise exception 'Anonymous profile access';exception when insufficient_privilege then null;end;
end $$;
rollback;
