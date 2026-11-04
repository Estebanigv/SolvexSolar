-- Synthetic integration fixture in the isolated test container.
begin;
do $$ begin if current_database()<>'solvex_crm_test' then raise exception 'Local test database required';end if;end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
insert into public.clients(id,details) values('10000000-0000-4000-8000-000000000011','{"name":"Directo"}');
insert into public.crm_leads(client_id,status) values('10000000-0000-4000-8000-000000000011','visit');
insert into public.crm_logistics(opportunity_id,client_id,kind,approval,approved_on) values('10000000-0000-4000-8000-000000000011','10000000-0000-4000-8000-000000000011','lead','visit',current_date-1);
insert into public.quotes(id,client_id,folio,created_at,payload) values('20000000-0000-4000-8000-000000000011','10000000-0000-4000-8000-000000000011','placeholder',now()-interval '7 days','{"input":{"customer":{"name":"Directo"},"proposalType":"preliminary"},"calculation":{"total":100,"lines":[]}}');
do $$ declare before_folio text;issued jsonb; begin
 select folio into strict before_folio from public.quotes where id='20000000-0000-4000-8000-000000000011';
 if before_folio !~ '^SVX-[0-9]{4}-[0-9]{6,}$' then raise exception 'Missing draft folio';end if;
 issued:=public.issue_quote('20000000-0000-4000-8000-000000000011');
 if issued->>'folio' is distinct from before_folio then raise exception 'Issuance renumbered the quote';end if;
 if (select crm_number from public.clients where id='10000000-0000-4000-8000-000000000011') is null then raise exception 'Missing direct client number';end if;
end $$;
update public.quotes set sent_on=current_date-4,sent_channel='email' where id='20000000-0000-4000-8000-000000000011';
reset role;
select private.crm_generate_reminders(((current_date::text||' 10:00:00')::timestamp at time zone 'America/Santiago'));
do $$ begin
 if not exists(select 1 from public.crm_notifications where body like '%correos sin respuesta registrada%' and user_id='00000000-0000-4000-8000-000000000002') then raise exception 'Missing email reminder';end if;
end $$;
set local role authenticated;
update public.quotes set email_reply_on=current_date-2 where id='20000000-0000-4000-8000-000000000011';
update public.quotes set sent_on=current_date-1 where id='20000000-0000-4000-8000-000000000011';
do $$ begin
 if (select email_reply_on from public.quotes where id='20000000-0000-4000-8000-000000000011') is not null then raise exception 'Old reply carried into a new send';end if;
 begin
  insert into public.crm_logistics(opportunity_id,client_id,kind,approval,approved_on) values('20000000-0000-4000-8000-000000000011','10000000-0000-4000-8000-000000000011','project','quote',current_date-1);
  raise exception 'Unaccepted quote entered logistics';
 exception when invalid_parameter_value then null;end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',true);
do $$ begin
 if exists(select 1 from public.crm_logistics where client_id='10000000-0000-4000-8000-000000000011') then raise exception 'Foreign logistics visible';end if;
end $$;
rollback;
