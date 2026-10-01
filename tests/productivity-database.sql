-- Run against an isolated PostgreSQL fixture only, after the release migration.
begin;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
set local role authenticated;
do $$ begin
 if public.workspace_release_status()<>'20261001-productivity' then raise exception 'Missing release';end if;
 if (select project_id from public.quotes where folio='QA-1')<>'44444444-4444-4444-8444-444444444444'::uuid then raise exception 'Backfill failed';end if;
end $$;
insert into public.quotes(id,client_id,folio,payload) values('55555555-5555-4555-8555-555555555555','33333333-3333-4333-8333-333333333333','QA-2','{"parentQuoteId":"44444444-4444-4444-8444-444444444444"}');
set constraints all immediate;
do $$ begin if (select project_id from public.quotes where folio='QA-2')<>'44444444-4444-4444-8444-444444444444'::uuid then raise exception 'Lineage failed';end if;end $$;
insert into public.quote_followups(project_id,status,next_contact) values('44444444-4444-4444-8444-444444444444','followup','2026-10-15');
insert into public.client_notes(client_id,body) values('33333333-3333-4333-8333-333333333333','Nota de prueba');
do $$ begin
 if not exists(select 1 from public.activity_log where actor_id=auth.uid() and changes::text like '%Nota de prueba%') then raise exception 'Missing audit';end if;
 if not exists(select 1 from public.member_access_summary() where user_id=auth.uid() and last_login is not null) then raise exception 'Missing last login';end if;
 begin insert into public.member_access_events(user_id,occurred_at,source) values(auth.uid(),now(),'login');raise exception 'Forged access permitted';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
do $$ begin
 if exists(select 1 from public.quote_followups) or exists(select 1 from public.client_notes) or exists(select 1 from public.member_access_events) then raise exception 'Cross-user data leak';end if;
 begin insert into public.client_notes(client_id,body) values('33333333-3333-4333-8333-333333333333','Unauthorized');raise exception 'Unauthorized note allowed';exception when insufficient_privilege then null;end;
end $$;
reset role;
grant usage on schema auth to supabase_auth_admin;grant update(last_sign_in_at),select on auth.users to supabase_auth_admin;
set local role supabase_auth_admin;
update auth.users set last_sign_in_at='2026-10-01T15:30Z' where id='11111111-1111-4111-8111-111111111111';
reset role;
do $$ begin if not exists(select 1 from public.member_access_events where source='login' and occurred_at='2026-10-01T15:30Z') then raise exception 'Auth login event failed';end if;end $$;
rollback;
