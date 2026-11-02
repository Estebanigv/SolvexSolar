-- CRM supervision is explicit; the generic workspace admin role is not sufficient.
create table private.crm_supervisors (
 user_id uuid primary key references public.profiles(id) on delete cascade
);
alter table private.crm_supervisors enable row level security;
revoke all on private.crm_supervisors from public,anon,authenticated;

do $$ begin
 if (select count(*) from public.profiles where lower(email)='cibaceta@solvexsolar.cl' and role in ('admin','sales'))<>1 then
  raise exception 'Expected one active Carol account';
 end if;
end $$;
insert into private.crm_supervisors(user_id)
select id from public.profiles where lower(email)='cibaceta@solvexsolar.cl' and role in ('admin','sales');

create function private.crm_can_view_all() returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists (
  select 1 from private.crm_supervisors s join public.profiles p on p.id=s.user_id
  where s.user_id=(select auth.uid()) and p.role in ('admin','sales')
 );
$$;
revoke all on function private.crm_can_view_all() from public,anon;
grant execute on function private.crm_can_view_all() to authenticated;
create function public.crm_can_view_all() returns boolean
language sql stable security invoker set search_path='' as $$ select private.crm_can_view_all() $$;
revoke all on function public.crm_can_view_all() from public,anon;
grant execute on function public.crm_can_view_all() to authenticated;

alter policy crm_leads_personal_portfolio on public.crm_leads
using (exists (select 1 from public.clients c where c.id=crm_leads.client_id and c.deleted_at is null
 and (c.owner_id=(select auth.uid()) or (select private.crm_can_view_all()))))
with check (exists (select 1 from public.clients c where c.id=crm_leads.client_id and c.deleted_at is null
 and (c.owner_id=(select auth.uid()) or (select private.crm_can_view_all()))));

alter policy crm_contact_profiles_personal_portfolio on public.crm_contact_profiles
using (exists (select 1 from public.clients c where c.id=crm_contact_profiles.client_id and c.deleted_at is null
 and (c.owner_id=(select auth.uid()) or (select private.crm_can_view_all()))))
with check (exists (select 1 from public.clients c where c.id=crm_contact_profiles.client_id and c.deleted_at is null
 and (c.owner_id=(select auth.uid()) or (select private.crm_can_view_all()))));

alter policy crm_tasks_personal_portfolio on public.crm_tasks
using (exists (select 1 from public.clients c where c.id=crm_tasks.client_id and c.deleted_at is null
 and (c.owner_id=(select auth.uid()) or (select private.crm_can_view_all()))))
with check (exists (select 1 from public.clients c where c.id=crm_tasks.client_id and c.deleted_at is null
 and (c.owner_id=(select auth.uid()) or (select private.crm_can_view_all()))));

alter policy crm_notes_personal_portfolio on public.crm_notes
using (exists (select 1 from public.clients c where c.id=crm_notes.client_id and c.deleted_at is null
 and (c.owner_id=(select auth.uid()) or (select private.crm_can_view_all()))))
with check (exists (select 1 from public.clients c where c.id=crm_notes.client_id and c.deleted_at is null
 and (c.owner_id=(select auth.uid()) or (select private.crm_can_view_all()))));

-- Keep author IDs and attachment paths intact; sales access follows the assigned client.
alter policy quotes_read on public.quotes using (
 (select private.current_role())='admin' or (
  (select private.current_role())='sales' and deleted_at is null and exists (
   select 1 from public.clients c where c.id=quotes.client_id and c.owner_id=(select auth.uid()) and c.deleted_at is null
  )
 )
);
alter policy quotes_update_tracking on public.quotes using (
 (select private.current_role())='admin' or (
  (select private.current_role())='sales' and deleted_at is null and exists (
   select 1 from public.clients c where c.id=quotes.client_id and c.owner_id=(select auth.uid()) and c.deleted_at is null
  )
 )
) with check (
 (select private.current_role())='admin' or (
  (select private.current_role())='sales' and deleted_at is null and exists (
   select 1 from public.clients c where c.id=quotes.client_id and c.owner_id=(select auth.uid()) and c.deleted_at is null
  )
 )
);

-- A supervisor can retain supervision if her workspace role changes to sales.
create policy clients_crm_supervision on public.clients for select to authenticated
using ((select private.crm_can_view_all()));
create policy quotes_crm_supervision on public.quotes for select to authenticated
using ((select private.crm_can_view_all()) and deleted_at is null);

-- Minimal directory: assignment never exposes emails or account-management fields.
create function private.crm_team() returns table(id uuid,full_name text)
language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or coalesce(private.current_role(),'') not in ('admin','sales') then
  raise exception 'NOT_AUTHORIZED' using errcode='42501';
 end if;
 return query select p.id,p.full_name from public.profiles p where p.role in ('admin','sales') order by p.full_name,p.id;
end $$;
revoke all on function private.crm_team() from public,anon;
grant execute on function private.crm_team() to authenticated;
create function public.crm_team() returns table(id uuid,full_name text)
language sql stable security invoker set search_path='' as $$ select * from private.crm_team() $$;
revoke all on function public.crm_team() from public,anon;
grant execute on function public.crm_team() to authenticated;

-- Only this narrow function may change ownership. No UPDATE(owner_id) grant.
create function private.crm_reassign_client(client_id uuid,new_owner_id uuid,expected_owner_id uuid,expected_updated_at timestamptz)
returns jsonb language plpgsql security definer set search_path='' as $$
declare c public.clients; target_name text; previous_name text; caller uuid:=auth.uid();
begin
 if caller is null or coalesce(private.current_role(),'') not in ('admin','sales') then
  raise exception 'NOT_AUTHORIZED' using errcode='42501';
 end if;
 select * into c from public.clients where id=client_id for update;
 if c.id is null or c.deleted_at is not null or (c.owner_id<>caller and not private.crm_can_view_all()) then
  raise exception 'CLIENT_NOT_AVAILABLE' using errcode='42501';
 end if;
 if c.owner_id is distinct from expected_owner_id or c.updated_at is distinct from expected_updated_at then
  raise exception 'ASSIGNMENT_CONFLICT' using errcode='40001';
 end if;
 select p.full_name into target_name from public.profiles p where p.id=new_owner_id and p.role in ('admin','sales') for share;
 if not found then raise exception 'INACTIVE_ASSIGNEE' using errcode='22023'; end if;
 if c.owner_id=new_owner_id then return jsonb_build_object('client_id',c.id,'owner_id',c.owner_id); end if;
 select full_name into previous_name from public.profiles where id=c.owner_id;
 update public.clients set owner_id=new_owner_id,updated_at=clock_timestamp() where id=c.id;
 insert into public.client_notes(client_id,body,created_by) values(c.id,
  'Reasignación de responsable: '||coalesce(nullif(previous_name,''),'Sin nombre')||' → '||coalesce(nullif(target_name,''),'Sin nombre')||'. Se conservan los proyectos, notas y tareas del cliente.',caller);
 return jsonb_build_object('client_id',c.id,'owner_id',new_owner_id);
end $$;
revoke all on function private.crm_reassign_client(uuid,uuid,uuid,timestamptz) from public,anon;
grant execute on function private.crm_reassign_client(uuid,uuid,uuid,timestamptz) to authenticated;
create function public.crm_reassign_client(client_id uuid,new_owner_id uuid,expected_owner_id uuid,expected_updated_at timestamptz)
returns jsonb language sql security invoker set search_path='' as $$
 select private.crm_reassign_client(client_id,new_owner_id,expected_owner_id,expected_updated_at);
$$;
revoke all on function public.crm_reassign_client(uuid,uuid,uuid,timestamptz) from public,anon;
grant execute on function public.crm_reassign_client(uuid,uuid,uuid,timestamptz) to authenticated;

-- Issuance authorization follows current responsibility, not the original author.
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
 issue_year:=extract(year from issue_time at time zone 'America/Santiago');
 loop
  insert into private.quote_folio_counters as c(year,last_number) values(issue_year,1)
   on conflict(year) do update set last_number=c.last_number+1 returning last_number into number;
  new_folio:='SVX-'||issue_year||'-'||lpad(number::text,greatest(6,length(number::text)),'0');
  exit when not exists(select 1 from public.quotes where folio=new_folio);
 end loop;
 update public.quotes set folio=new_folio,issued_at=issue_time,issued_by=caller,
  payload=q.payload||jsonb_build_object('folio',new_folio,'issuedAt',issue_time,'issuedBy',caller,'previousFolio',q.folio,'issuanceWarnings',private.quote_issuance_warnings(q.payload))
  where id=q.id returning payload into q.payload;
 return q.payload;
end $$;
revoke all on function private.issue_quote(uuid) from public,anon;
grant execute on function private.issue_quote(uuid) to authenticated;


