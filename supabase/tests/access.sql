-- Run against a prepared project. All synthetic users and records roll back.
begin;
select set_config('test.admin',gen_random_uuid()::text,true),set_config('test.seller_a',gen_random_uuid()::text,true),set_config('test.seller_b',gen_random_uuid()::text,true),set_config('test.pending',gen_random_uuid()::text,true);
insert into auth.users(id,email,raw_user_meta_data)
select current_setting('test.'||item)::uuid,item||'@solvex-rls-test.example','{}'::jsonb
from unnest(array['admin','seller_a','seller_b','pending']) item;
update public.profiles set role=case when id=current_setting('test.admin')::uuid then 'admin' else 'sales' end
where id in (current_setting('test.admin')::uuid,current_setting('test.seller_a')::uuid,current_setting('test.seller_b')::uuid);

set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('test.seller_a'),true);
do $$
declare saved jsonb; rev integer; existing_count integer;
begin
  select revision into rev from public.workspace_config;
  if rev is null then raise exception 'Seller cannot read catalog'; end if;
  saved:=public.save_quote(jsonb_build_object('id',gen_random_uuid(),'folio','TEST-'||gen_random_uuid(),'input',jsonb_build_object('customer',jsonb_build_object('name','Synthetic client A'))),rev,null);
  perform set_config('test.client_a',saved->>'clientId',true);
  perform set_config('test.quote_a',saved->>'id',true);
  insert into storage.objects(bucket_id,name,owner_id) values('boletas',auth.uid()::text||'/'||(saved->>'id')||'/frente',auth.uid()::text);
  begin
    insert into storage.objects(bucket_id,name,owner_id) values('boletas',auth.uid()::text||'/'||(saved->>'id')||'/tercero',auth.uid()::text);
    raise exception 'Extra bill slot accepted';
  exception when insufficient_privilege then null;
  end;
  if not exists(select 1 from public.clients where id=(saved->>'clientId')::uuid) then raise exception 'Customer not persisted'; end if;
  select count(*) into existing_count from public.clients;
  begin
    perform public.save_quote(jsonb_build_object('id',gen_random_uuid(),'folio','TEST-CONFLICT','input',jsonb_build_object('customer',jsonb_build_object('name','Must not persist'))),rev+1,null);
    raise exception 'Catalog conflict was accepted';
  exception when serialization_failure then null;
  end;
  if (select count(*) from public.clients)<>existing_count then raise exception 'Conflict created orphan customer'; end if;
  begin
    perform public.save_workspace(rev,'[]'::jsonb,'{}'::jsonb);
    raise exception 'Seller changed catalog';
  exception when insufficient_privilege then null;
  end;
  update public.profiles set role='admin' where id=auth.uid();
  if private.current_role()<>'sales' then raise exception 'Seller elevated own role'; end if;
  begin
    update public.clients set owner_id=current_setting('test.seller_b')::uuid where id=current_setting('test.client_a')::uuid;
    raise exception 'Seller reassigned client ownership';
  exception when insufficient_privilege then null;
  end;
end $$;

select set_config('request.jwt.claim.sub',current_setting('test.seller_b'),true);
do $$ begin
  if exists(select 1 from public.clients where id=current_setting('test.client_a')::uuid) then raise exception 'Cross-user client leak'; end if;
  if exists(select 1 from storage.objects where bucket_id='boletas' and name like current_setting('test.seller_a')||'/%') then raise exception 'Cross-user bill leak'; end if;
  if exists(select 1 from public.quotes where owner_id=current_setting('test.seller_a')::uuid) then raise exception 'Cross-user quote leak'; end if;
  begin
    perform public.save_quote(jsonb_build_object('id',gen_random_uuid(),'folio','TEST-CROSS','input',jsonb_build_object('customer',jsonb_build_object('name','Stolen client'))),(select revision from public.workspace_config),current_setting('test.client_a')::uuid);
    raise exception 'Cross-user update accepted';
  exception when insufficient_privilege then null;
  end;
end $$;

select set_config('request.jwt.claim.sub',current_setting('test.pending'),true);
do $$ begin
  if exists(select 1 from public.workspace_config) or exists(select 1 from public.clients) or exists(select 1 from public.quotes) then raise exception 'Pending user accessed private data'; end if;
end $$;

select set_config('request.jwt.claim.sub',current_setting('test.admin'),true);
do $$ begin
  if not exists(select 1 from public.clients where id=current_setting('test.client_a')::uuid) then raise exception 'Admin cannot read team data'; end if;
  update public.profiles set role='disabled' where id=current_setting('test.seller_a')::uuid;
  update public.profiles set role='disabled' where id=auth.uid();
  if private.current_role()<>'admin' then raise exception 'Admin disabled own account'; end if;
end $$;
select set_config('request.jwt.claim.sub',current_setting('test.seller_a'),true);
do $$ begin
  if exists(select 1 from public.clients) or exists(select 1 from public.quotes) or exists(select 1 from public.workspace_config) then raise exception 'Disabled user retained access'; end if;
end $$;

set local role anon;
do $$ begin
  begin
    perform count(*) from public.clients;
    raise exception 'Anonymous data access accepted';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
select 'PASS: ownership, admin, pending, revocation, anon, private bill storage, atomic quote and catalog conflicts' as result;
rollback;
