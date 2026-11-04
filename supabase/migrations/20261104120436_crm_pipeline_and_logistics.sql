-- Client references and official quote folios are independent series.
alter table public.clients add column crm_number bigint;
with ranked as (select id,row_number() over(order by created_at,id) as n from public.clients)
update public.clients c set crm_number=r.n from ranked r where r.id=c.id;
alter table public.clients alter column crm_number set not null, add unique(crm_number);
create table private.crm_client_counter(singleton boolean primary key check(singleton), last_number bigint not null);
revoke all on private.crm_client_counter from public,anon,authenticated;
alter table private.crm_client_counter enable row level security;
insert into private.crm_client_counter values(true,(select coalesce(max(crm_number),0) from public.clients));
create function private.number_client() returns trigger language plpgsql security definer set search_path='' as $$
begin
 update private.crm_client_counter set last_number=last_number+1 returning last_number into new.crm_number;
 return new;
end $$;
revoke all on function private.number_client() from public,anon,authenticated;
create trigger number_client before insert on public.clients for each row execute function private.number_client();

alter table public.quotes add column reserved_folio text, add column email_reply_on date;
-- Synchronize the annual counter with previously issued documents before reserving new numbers.
insert into private.quote_folio_counters as c(year,last_number)
select split_part(folio,'-',2)::int,max(split_part(folio,'-',3)::bigint) from public.quotes
where issued_at is not null and folio ~ '^SVX-[0-9]{4}-[0-9]{6,}$' group by 1
on conflict(year) do update set last_number=greatest(c.last_number,excluded.last_number);
create function private.next_quote_folio(at_time timestamptz) returns text language plpgsql security definer set search_path='' as $$
declare y integer:=extract(year from at_time at time zone 'America/Santiago'); n bigint; result text;
begin
 loop
  insert into private.quote_folio_counters as c(year,last_number) values(y,1)
  on conflict(year) do update set last_number=c.last_number+1 returning last_number into n;
  result:='SVX-'||y||'-'||lpad(n::text,greatest(6,length(n::text)),'0');
  exit when not exists(select 1 from public.quotes where folio=result);
 end loop;
 return result;
end $$;
revoke all on function private.next_quote_folio(timestamptz) from public,anon,authenticated;
create function private.reserve_quote_folio() returns trigger language plpgsql security definer set search_path='' as $$
begin
 new.reserved_folio:=private.next_quote_folio(statement_timestamp());
 new.folio:=new.reserved_folio;
 new.payload:=new.payload||jsonb_build_object('folio',new.folio);
 new.email_reply_on:=null;
 return new;
end $$;
revoke all on function private.reserve_quote_folio() from public,anon,authenticated;
create trigger reserve_quote_folio before insert on public.quotes for each row execute function private.reserve_quote_folio();

grant update(email_reply_on) on public.quotes to authenticated;
create function private.guard_email_reply() returns trigger language plpgsql set search_path='' as $$
begin
 if new.sent_on is distinct from old.sent_on or new.sent_channel is distinct from old.sent_channel then new.email_reply_on:=null; end if;
 if new.email_reply_on is not null and (new.sent_channel is distinct from 'email' or new.sent_on is null or new.email_reply_on<new.sent_on or new.email_reply_on>(now() at time zone 'America/Santiago')::date) then
  raise exception 'Invalid reply date' using errcode='22023';
 end if;
 return new;
end $$;
revoke all on function private.guard_email_reply() from public,anon,authenticated;
create trigger validate_email_reply before update of email_reply_on,sent_on,sent_channel on public.quotes for each row execute function private.guard_email_reply();
create or replace function public.save_quote(snapshot jsonb, expected_revision integer, customer_id uuid default null)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare current_revision integer; target_client uuid; saved jsonb; quote_id uuid;
begin
  if auth.uid() is null or coalesce(private.current_role(),'') not in ('admin','sales') then raise exception 'NOT_AUTHORIZED' using errcode='42501'; end if;
  perform pg_catalog.pg_advisory_xact_lock(794825160);
  select revision into current_revision from public.workspace_config where id;
  if current_revision is distinct from expected_revision then raise exception 'CATALOG_CONFLICT' using errcode='40001'; end if;
  if coalesce(length(trim(snapshot#>>'{input,customer,name}')),0)=0 then raise exception 'CUSTOMER_REQUIRED' using errcode='22023'; end if;
  if customer_id is null then
    insert into public.clients(details) values(snapshot#>'{input,customer}') returning id into target_client;
  else
    update public.clients set details=snapshot#>'{input,customer}',updated_at=now() where id=customer_id returning id into target_client;
    if target_client is null then raise exception 'CUSTOMER_NOT_FOUND' using errcode='42501'; end if;
  end if;
  quote_id := (snapshot->>'id')::uuid;
  saved := snapshot || jsonb_build_object('clientId',target_client);
  insert into public.quotes(id,client_id,folio,payload) values(quote_id,target_client,snapshot->>'folio',saved) returning payload into saved;
  return saved;
end $$;
create or replace function private.issue_quote(quote_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare q public.quotes; caller uuid:=auth.uid(); member_role text;
 issue_time timestamptz:=now(); issue_year integer; number bigint; new_folio text;
begin
 member_role:=private.current_role();
 if caller is null or coalesce(member_role,'') not in ('admin','sales') then
  raise exception 'NOT_AUTHORIZED' using errcode='42501';
 end if;
 select * into q from public.quotes where id=quote_id for update;
 if q.id is null or q.deleted_at is not null or (member_role<>'admin' and not private.crm_can_view_all() and not exists(select 1 from public.clients c where c.id=q.client_id and c.owner_id=caller and c.deleted_at is null)) then
  raise exception 'NOT_AUTHORIZED' using errcode='42501';
 end if;
 -- Concurrent clicks/retries return the same issued document and number.
 if q.issued_at is not null then return q.payload;end if;
 if coalesce(length(trim(q.payload#>>'{input,customer,name}')),0)=0
  or coalesce((q.payload#>>'{calculation,total}')::numeric,0)<=0
  or q.payload#>>'{calculation,total}' in ('NaN','Infinity','-Infinity') then
  raise exception 'QUOTE_NOT_READY' using errcode='22023';
 end if;
 if exists(select 1 from jsonb_array_elements(q.payload#>'{calculation,lines}') line where coalesce((line->>'qty')::numeric,0)>0 and concat(line->>'category',' ',line->>'name') ~* '\mTE?\s*-?\s*1\M')
 and exists(select 1 from jsonb_array_elements(q.payload#>'{calculation,lines}') line where coalesce((line->>'qty')::numeric,0)>0 and concat(line->>'category',' ',line->>'name') ~* '\mTE\s*-?\s*4\M') then
  raise exception 'INCOMPATIBLE_CERTIFICATIONS' using errcode='22023';
 end if;
 new_folio:=coalesce(q.reserved_folio,private.next_quote_folio(issue_time));
 update public.quotes set folio=new_folio,issued_at=issue_time,issued_by=caller,
  payload=q.payload||jsonb_build_object('folio',new_folio,'issuedAt',issue_time,'issuedBy',caller,'previousFolio',q.folio,'issuanceWarnings',private.quote_issuance_warnings(q.payload))
  where id=q.id returning payload into q.payload;
 return q.payload;
end $$;
revoke all on function private.issue_quote(uuid) from public,anon;
grant execute on function private.issue_quote(uuid) to authenticated;




-- A next-contact edit must not reset the commercial stage clock.
alter table public.crm_leads add column stage_since timestamptz;
alter table public.quote_followups add column stage_since timestamptz;
create function private.stamp_crm_stage() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_op='INSERT' or new.status is distinct from old.status then new.stage_since:=clock_timestamp();end if;
 return new;
end $$;
revoke all on function private.stamp_crm_stage() from public,anon,authenticated;
create trigger crm_stage_time before insert or update of status on public.crm_leads for each row execute function private.stamp_crm_stage();
create trigger project_stage_time before insert or update of status on public.quote_followups for each row execute function private.stamp_crm_stage();

create table public.crm_logistics(
 opportunity_id uuid primary key, client_id uuid not null references public.clients(id),
 kind text not null check(kind in ('lead','project')),
 approval text not null check(approval in ('quote','visit')), approved_on date not null,
 origin text not null default '' check(length(origin)<=300), destination text not null default '' check(length(destination)<=300),
 drive_minutes int check(drive_minutes between 1 and 10080),
 planned_on date check(planned_on>=approved_on), installed_on date check(installed_on>=approved_on),
 updated_at timestamptz not null default clock_timestamp()
);
create index crm_logistics_client on public.crm_logistics(client_id);
alter table public.crm_logistics enable row level security;
revoke all on public.crm_logistics from public,anon,authenticated;
grant select,insert(opportunity_id,client_id,kind,approval,approved_on,origin,destination,drive_minutes,planned_on,installed_on),
 update(origin,destination,drive_minutes,planned_on,installed_on) on public.crm_logistics to authenticated;
create policy logistics_portfolio on public.crm_logistics to authenticated using (
 exists(select 1 from public.clients c where c.id=client_id and c.deleted_at is null and (c.owner_id=(select auth.uid()) or (select private.crm_can_view_all())))
) with check (
 exists(select 1 from public.clients c where c.id=client_id and c.deleted_at is null and (c.owner_id=(select auth.uid()) or (select private.crm_can_view_all())))
);
create function private.guard_logistics() returns trigger language plpgsql set search_path='' as $$
declare stage text; today date:=(now() at time zone 'America/Santiago')::date;
begin
 if new.approved_on>today or new.installed_on>today then raise exception 'Future actual date' using errcode='22023';end if;
 if tg_op='INSERT' then
  if new.kind='lead' and new.opportunity_id=new.client_id then
   select status into stage from public.crm_leads where client_id=new.client_id;
  elsif new.kind='project' and exists(select 1 from public.quotes where project_id=new.opportunity_id and client_id=new.client_id and deleted_at is null and not is_test) then
   select status into stage from public.quote_followups where project_id=new.opportunity_id;
  end if;
  if (new.approval='quote' and stage is distinct from 'accepted') or (new.approval='visit' and stage is distinct from 'visit') then
   raise exception 'Approval must match the current opportunity' using errcode='22023';
  end if;
 end if;
 new.updated_at:=clock_timestamp();
 return new;
end $$;
revoke all on function private.guard_logistics() from public,anon,authenticated;
create trigger guard_logistics before insert or update on public.crm_logistics for each row execute function private.guard_logistics();

create or replace function private.crm_generate_reminders(p_now timestamptz default now()) returns void language plpgsql security definer set search_path='' as $$
declare local_now timestamp := p_now at time zone 'America/Santiago';
begin
 if local_now::time < time '09:00' or local_now::time >= time '19:00' then return; end if;
 with active_clients as (
 select c.id,c.owner_id from public.clients c join public.profiles p on p.id=c.owner_id where c.deleted_at is null and p.role in ('admin','sales')
 ), latest_emails as (
 select distinct on(q.project_id) q.project_id,q.client_id,q.sent_on,q.email_reply_on
 from public.quotes q where q.deleted_at is null and not q.is_test and q.sent_channel='email' and q.sent_on is not null
 order by q.project_id,q.sent_on desc,q.sent_recorded_at desc nulls last,q.created_at desc,q.id desc
 ), waiting as (
 select c.owner_id,count(*) emails,max(local_now::date-e.sent_on) since from latest_emails e join active_clients c on c.id=e.client_id
 left join public.quote_followups f on f.project_id=e.project_id
 where e.email_reply_on is null and local_now::date-e.sent_on>=3 and coalesce(f.status,'sent') not in ('accepted','rejected') group by c.owner_id
 ), work as (
 select c.owner_id,count(*) tasks,0::bigint contacts from public.crm_tasks t join active_clients c on c.id=t.client_id where t.status='pending' and t.due_on<=local_now::date group by c.owner_id
 union all
 select c.owner_id,0,count(*) from public.crm_leads l join active_clients c on c.id=l.client_id where l.status not in ('accepted','rejected') and l.next_contact<=local_now::date
 and not exists(select 1 from public.quotes q where q.client_id=c.id and q.deleted_at is null and not q.is_test) group by c.owner_id
 union all
 select c.owner_id,0,count(*) from public.quote_followups f join (
 select distinct on(project_id) project_id,client_id from public.quotes where deleted_at is null and not is_test order by project_id,created_at desc,id
 ) q on q.project_id=f.project_id join active_clients c on c.id=q.client_id
 where f.status not in ('accepted','rejected') and f.next_contact<=local_now::date group by c.owner_id
 union all select owner_id,0,0 from waiting
 )
 insert into public.crm_notifications(user_id,kind,title,body,event_key)
 select w.owner_id,'reminder','Tu agenda comercial',sum(tasks)||' tareas y '||sum(contacts)||' contactos para hoy o vencidos.'||
 case when max(v.emails)>0 then ' '||max(v.emails)||' correos sin respuesta registrada (hasta '||max(v.since)||' días).' else '' end,
 'reminder:'||w.owner_id||':'||local_now::date from work w left join waiting v using(owner_id) group by w.owner_id
 on conflict(event_key) do nothing;
end $$;
