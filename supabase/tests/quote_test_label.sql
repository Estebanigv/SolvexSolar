-- Isolated synthetic records, rolled back including audit entries.
begin;
insert into auth.users(id,email,raw_user_meta_data) values
('00000000-0000-4000-8000-000000000081','owner@label.example','{}'),
('00000000-0000-4000-8000-000000000082','other@label.example','{}');
update public.profiles set role='sales' where email like '%@label.example';
insert into public.clients(id,owner_id,details) values
('00000000-0000-4000-8000-000000000083','00000000-0000-4000-8000-000000000081','{"name":"Synthetic label test"}');
insert into public.quotes(id,owner_id,client_id,folio,payload) values
('00000000-0000-4000-8000-000000000084','00000000-0000-4000-8000-000000000081','00000000-0000-4000-8000-000000000083','QA-LABEL-ONLY','{"input":{"isTest":true}}');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000081',true);
do $$declare original jsonb;begin
 select payload into original from public.quotes where folio='QA-LABEL-ONLY';
 if not exists(select 1 from public.quotes where folio='QA-LABEL-ONLY' and is_test) then raise exception 'Label not initialized';end if;
 update public.quotes set is_test=false where folio='QA-LABEL-ONLY';
 if not exists(select 1 from public.quotes where folio='QA-LABEL-ONLY' and not is_test and payload=original) then raise exception 'Label update failed or altered document';end if;
 begin update public.quotes set payload='{}' where folio='QA-LABEL-ONLY';raise exception 'Payload mutable';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000082',true);
do $$declare n integer;begin
 update public.quotes set is_test=true where folio='QA-LABEL-ONLY';get diagnostics n=row_count;
 if n<>0 then raise exception 'Cross-user label update';end if;
end $$;
rollback;
