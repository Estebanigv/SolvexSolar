-- Missing information is disclosed at issuance; it is never marked as approved.
create or replace function private.quote_issuance_warnings(snapshot jsonb) returns jsonb
language sql immutable security invoker set search_path='' as $$
 select coalesce(jsonb_agg(message order by first_position),'[]'::jsonb) from (
  select message,min(position) as first_position from (
   select value as message,ordinality as position from jsonb_array_elements_text(coalesce(snapshot#>'{calculation,warnings}','[]'::jsonb)) with ordinality
   union all select 'Falta correo o teléfono de contacto del cliente.',10001 where coalesce(length(trim(snapshot#>>'{input,customer,email}')),0)=0 and coalesce(length(trim(snapshot#>>'{input,customer,phone}')),0)=0
   union all select 'Equipamiento o precios pendientes de completar. El importe es parcial y está sujeto a revisión.',10002 where coalesce((snapshot#>>'{calculation,complete}')::boolean,false)=false
   union all select 'Tratamiento del IVA pendiente de confirmar.',10003 where snapshot#>>'{calculation,tax}' is null or coalesce(snapshot#>>'{settings,taxMode}','pending')='pending'
   union all select 'Validaciones finales pendientes. Esta emisión no constituye una aprobación técnica.',10004 where coalesce(snapshot#>>'{input,proposalType}','final')<>'preliminary' and coalesce((snapshot#>>'{calculation,official}')::boolean,false)=false
  ) pending where length(trim(message))>0 group by message
 ) unique_messages;
$$;
revoke all on function private.quote_issuance_warnings(jsonb) from public,anon,authenticated;

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
 if q.id is null or q.deleted_at is not null or (member_role<>'admin' and q.owner_id<>caller) then
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


create or replace function private.guard_quote_issuance_insert() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if new.issued_at is not null or new.issued_by is not null then
  raise exception 'EMIT_USING_ISSUE_QUOTE' using errcode='42501';
 end if;
 new.payload:=new.payload-'issuedAt'-'issuedBy'-'previousFolio'-'issuanceWarnings';
 return new;
end $$;
revoke all on function private.guard_quote_issuance_insert() from public,anon,authenticated;
