begin;
select set_config('test.admin',gen_random_uuid()::text,true),set_config('test.sales',gen_random_uuid()::text,true);
insert into auth.users(id,email,raw_user_meta_data) select current_setting('test.'||item)::uuid,item||'@clients-test.example','{}'::jsonb from unnest(array['admin','sales']) item;
update public.profiles set role='admin' where id=current_setting('test.admin')::uuid;
update public.profiles set role='sales' where id=current_setting('test.sales')::uuid;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('test.sales'),true);
do $$ declare saved jsonb; rev integer; begin
 begin insert into public.clients(details,deleted_at) values('{"name":"Bypass"}',now());raise exception 'Inserted archived client';exception when insufficient_privilege then null;end;
 select revision into rev from public.workspace_config;
 saved:=public.save_quote(jsonb_build_object('id',gen_random_uuid(),'folio','CLIENT-TEST','input',jsonb_build_object('customer',jsonb_build_object('name','Before edit'))),rev,null);
 perform set_config('test.client',saved->>'clientId',true);
 perform set_config('test.quote',saved->>'id',true);
 update public.clients set details='{"name":"After edit"}' where id=(saved->>'clientId')::uuid;
 if (select payload#>>'{input,customer,name}' from public.quotes where id=(saved->>'id')::uuid)<>'Before edit' then raise exception 'Snapshot changed'; end if;
 begin update public.clients set deleted_at=now() where id=(saved->>'clientId')::uuid;raise exception 'Sales trashed client';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub',current_setting('test.admin'),true);
update public.clients set deleted_at=now() where id=current_setting('test.client')::uuid;
do $$ declare rev integer; begin
 if not exists(select 1 from public.clients where id=current_setting('test.client')::uuid and deleted_at is not null) then raise exception 'Trash failed';end if;
 if not exists(select 1 from public.quotes where id=current_setting('test.quote')::uuid) then raise exception 'Quote lost';end if;
 begin update public.clients set details='{"name":"Forbidden"}' where id=current_setting('test.client')::uuid;raise exception 'Edited archived client';exception when object_not_in_prerequisite_state then null;end;
 select revision into rev from public.workspace_config;
 begin perform public.save_quote(jsonb_build_object('id',gen_random_uuid(),'folio','TRASH-QUOTE','input',jsonb_build_object('customer',jsonb_build_object('name','After edit'))),rev,current_setting('test.client')::uuid);raise exception 'Quoted archived client';exception when object_not_in_prerequisite_state then null;end;
 begin delete from public.clients where id=current_setting('test.client')::uuid;raise exception 'Hard delete accepted';exception when insufficient_privilege then null;end;
end $$;
update public.clients set deleted_at=null where id=current_setting('test.client')::uuid;
update public.clients set details='{"name":"Restored client"}' where id=current_setting('test.client')::uuid;
do $$ begin
 if not exists(select 1 from public.clients where id=current_setting('test.client')::uuid and deleted_at is null and details->>'name'='Restored client') then raise exception 'Restore failed';end if;
 if (select count(*) from public.activity_log where entity_id=current_setting('test.client') and action in ('trashed','restored'))<>2 then raise exception 'Missing trash/restore audit';end if;
end $$;
rollback;
