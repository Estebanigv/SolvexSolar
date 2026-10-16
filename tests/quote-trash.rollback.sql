begin;

do $test$
declare q public.quotes; active_q public.quotes; owner uuid; result text;
begin
 select id into owner from public.profiles where role='admin' limit 1;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',owner,'role','authenticated')::text,true);
 select * into active_q from public.quotes where deleted_at is null limit 1;
 if public.trash_claim_quote(active_q.id,active_q.folio) is not null then raise exception 'Active quote was claimable';end if;
 select * into q from public.quotes where deleted_at is not null and not exists(select 1 from storage.objects s where bucket_id='boletas' and name like quotes.owner_id::text||'/'||quotes.id::text||'/%') limit 1;
 if public.trash_claim_quote(q.id,'WRONG') is not null then raise exception 'Wrong folio accepted';end if;
 perform set_config('request.jwt.claims','{"role":"service_role"}',true);
 if public.trash_claim_quote(q.id,q.folio) is not null then raise exception 'Recent trash purged automatically';end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',owner,'role','authenticated')::text,true);
 result:=public.trash_claim_quote(q.id,q.folio);
 if result is null then raise exception 'Admin claim failed';end if;
 begin
  update public.quotes set deleted_at=null where id=q.id;
  raise exception 'Restoration allowed after claim';
 exception when sqlstate '55000' then null;end;
 if not public.trash_finish_quote(q.id) then raise exception 'Finish failed';end if;
 if exists(select 1 from public.quotes where id=q.id) then raise exception 'Quote still exists';end if;
 if not exists(select 1 from public.clients where id=q.client_id) then raise exception 'Client was deleted';end if;
 select * into q from public.quotes where deleted_at is not null and exists(select 1 from storage.objects s where bucket_id='boletas' and name like quotes.owner_id::text||'/'||quotes.id::text||'/%') limit 1;
 if q.id is not null then
  perform public.trash_claim_quote(q.id,q.folio);
  if public.trash_finish_quote(q.id) then raise exception 'Quote deleted while attachments remain';end if;
 end if;
 perform set_config('request.jwt.claims','{}',true);
 begin
  perform public.trash_claim_quote(active_q.id,active_q.folio);
  raise exception 'Anonymous claim allowed';
 exception when insufficient_privilege then null;end;
end $test$;

do $test$
declare base public.quotes; root_id uuid; child_id uuid; owner uuid;
begin
 select id into owner from public.profiles where role='admin' limit 1;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',owner,'role','authenticated')::text,true);
 select q.* into base from public.quotes q join public.clients c on c.id=q.client_id where q.deleted_at is null and c.deleted_at is null limit 1;
 insert into public.quotes(id,owner_id,client_id,folio,payload)
 values(gen_random_uuid(),owner,base.client_id,'TEST-TRASH-ROOT',base.payload-'parentQuoteId') returning id into root_id;
 insert into public.quotes(id,owner_id,client_id,folio,payload)
 values(gen_random_uuid(),owner,base.client_id,'TEST-TRASH-CHILD',base.payload||jsonb_build_object('parentQuoteId',root_id)) returning id into child_id;
 insert into public.quote_followups(project_id,status) values(root_id,'draft');
 update public.quotes set deleted_at=now() where id=root_id;
 perform public.trash_claim_quote(root_id,'TEST-TRASH-ROOT');
 if not public.trash_finish_quote(root_id) then raise exception 'Root purge failed';end if;
 if not exists(select 1 from public.quotes where id=child_id and project_id=root_id and parent_quote_id is null) then raise exception 'Child lineage was lost';end if;
 if not exists(select 1 from public.quote_followups where project_id=root_id) then raise exception 'Shared followup was deleted';end if;
 update public.quotes set deleted_at=now() where id=child_id;
 perform public.trash_claim_quote(child_id,'TEST-TRASH-CHILD');
 if not public.trash_finish_quote(child_id) then raise exception 'Child purge failed';end if;
 if exists(select 1 from public.quote_followups where project_id=root_id) then raise exception 'Orphaned followup';end if;
end $test$;
rollback;
select 'PASS: purge authorization, attachments, recovery lock, retention, revision lineage and followup cleanup; no data persisted' as verification;
