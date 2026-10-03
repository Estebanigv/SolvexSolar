-- Emission is distinct from technical approval and from recording an actual send.
-- Existing documents keep their original identifiers until explicitly emitted.
alter table public.quotes
 add column issued_at timestamptz,
 add column issued_by uuid references public.profiles(id);

create table private.quote_folio_counters (
 year integer primary key,
 last_number bigint not null check(last_number>0)
);
alter table private.quote_folio_counters enable row level security;
revoke all on private.quote_folio_counters from public,anon,authenticated;

create function private.guard_quote_issuance_insert() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if new.issued_at is not null or new.issued_by is not null then
  raise exception 'EMIT_USING_ISSUE_QUOTE' using errcode='42501';
 end if;
 new.payload:=new.payload-'issuedAt'-'issuedBy'-'previousFolio';
 return new;
end $$;
revoke all on function private.guard_quote_issuance_insert() from public,anon,authenticated;
create trigger guard_quote_issuance_insert before insert on public.quotes
 for each row execute function private.guard_quote_issuance_insert();

-- Narrow privileged operation: immutable amounts/input are never replaced.
-- The authenticated caller must be active and own the quote or be an admin.
create function private.issue_quote(quote_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare q public.quotes; caller uuid:=auth.uid(); member_role text;
 issue_time timestamptz:=now(); issue_year integer; number bigint; new_folio text;
begin
 member_role:=private.current_role();
 if caller is null or coalesce(member_role,'') not in ('admin','sales') then
  raise exception 'NOT_AUTHORIZED' using errcode='42501';
 end if;
 select * into q from public.quotes where id=quote_id for update;
 if q.id is null or q.deleted_at is not null or (member_role<>'admin' and q.owner_id<>caller) then
  raise exception 'NOT_AUTHORIZED' using errcode='42501';
 end if;
 -- Concurrent clicks/retries return the same issued document and number.
 if q.issued_at is not null then return q.payload;end if;
 if coalesce(length(trim(q.payload#>>'{input,customer,name}')),0)=0
  or (coalesce(length(trim(q.payload#>>'{input,customer,email}')),0)=0
      and coalesce(length(trim(q.payload#>>'{input,customer,phone}')),0)=0)
  or coalesce((q.payload#>>'{calculation,complete}')::boolean,false)=false
  or coalesce((q.payload#>>'{calculation,total}')::numeric,0)<=0
  or q.payload#>>'{calculation,tax}' is null
  or coalesce(q.payload#>>'{settings,taxMode}','pending')='pending'
  or (coalesce(q.payload#>>'{input,proposalType}','final')<>'preliminary'
      and coalesce((q.payload#>>'{calculation,official}')::boolean,false)=false) then
  raise exception 'QUOTE_NOT_READY' using errcode='22023';
 end if;
 issue_year:=extract(year from issue_time at time zone 'America/Santiago');
 loop
  insert into private.quote_folio_counters as c(year,last_number) values(issue_year,1)
   on conflict(year) do update set last_number=c.last_number+1 returning last_number into number;
  new_folio:='SVX-'||issue_year||'-'||lpad(number::text,greatest(6,length(number::text)),'0');
  exit when not exists(select 1 from public.quotes where folio=new_folio);
 end loop;
 update public.quotes set folio=new_folio,issued_at=issue_time,issued_by=caller,
  payload=q.payload||jsonb_build_object('folio',new_folio,'issuedAt',issue_time,'issuedBy',caller,'previousFolio',q.folio)
  where id=q.id returning payload into q.payload;
 return q.payload;
end $$;
revoke all on function private.issue_quote(uuid) from public,anon;
grant execute on function private.issue_quote(uuid) to authenticated;

create function public.issue_quote(quote_id uuid) returns jsonb
language sql security invoker set search_path='' as $$
 select private.issue_quote(quote_id);
$$;
revoke all on function public.issue_quote(uuid) from public,anon;
grant execute on function public.issue_quote(uuid) to authenticated;
