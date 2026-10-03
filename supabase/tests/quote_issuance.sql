-- Rollback-only fixtures: no real documents are emitted and no folios consumed.
begin;
do $$
declare actor uuid; client uuid; id1 uuid:=gen_random_uuid(); id2 uuid:=gen_random_uuid();
 source jsonb; a jsonb; b jsonb; repeat_issue jsonb; counter_before bigint;
begin
 select id into actor from public.profiles where role='admin' limit 1;
 if actor is null then raise exception 'Admin fixture required';end if;
 perform set_config('request.jwt.claim.sub',actor::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated')::text,true);
 insert into public.clients(owner_id,details) values(actor,'{"name":"Prueba transaccional","email":"qa@example.com"}') returning id into client;
 source:=jsonb_build_object('input',jsonb_build_object('proposalType','preliminary','customer',jsonb_build_object('name','Prueba transaccional','email','qa@example.com')),
  'settings',jsonb_build_object('taxMode','included'),'calculation',jsonb_build_object('complete',true,'total',119000,'tax',19000,'official',false));
 insert into public.quotes(id,owner_id,client_id,folio,payload) values
  (id1,actor,client,'TEST-'||id1,source||jsonb_build_object('id',id1,'folio','TEST-'||id1)),
  (id2,actor,client,'TEST-'||id2,source||jsonb_build_object('id',id2,'folio','TEST-'||id2));
 a:=public.issue_quote(id1);repeat_issue:=public.issue_quote(id1);b:=public.issue_quote(id2);
 if a is distinct from repeat_issue then raise exception 'Retry changed issued document';end if;
 if (split_part(b->>'folio','-',3))::bigint<>(split_part(a->>'folio','-',3))::bigint+1 then raise exception 'Numbers are not consecutive';end if;
 if a->'calculation' is distinct from source->'calculation' or a->'input' is distinct from source->'input' then raise exception 'Issuing changed original values';end if;
 if a->>'issuedBy'<>actor::text or a->>'issuedAt' is null then raise exception 'Missing issuer audit';end if;
 if exists(select 1 from public.quotes where id in(id1,id2) and sent_on is not null) then raise exception 'Issuance must not invent a send';end if;
 if has_function_privilege('anon','public.issue_quote(uuid)','execute') then raise exception 'Anonymous execution allowed';end if;
 if has_table_privilege('authenticated','private.quote_folio_counters','update') then raise exception 'Direct counter write allowed';end if;
 if has_column_privilege('authenticated','public.quotes','issued_at','update') then raise exception 'Direct issuance write allowed';end if;
 perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
 begin
  perform public.issue_quote(id1);
  raise exception 'Unauthorized user emitted a quote';
 exception when insufficient_privilege then null;end;
 raise notice 'OK: consecutive, idempotent, original amounts, audit, no fake send and permissions';
end $$;
rollback;
