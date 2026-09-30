-- Local preparation. Apply after quote_history when the release is approved.
create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null,
  occurred_on date not null,
  actor_id uuid,
  actor_name text not null,
  actor_email text not null,
  entity_type text not null check(entity_type in ('catalog','company','installation','client','quote','member')),
  entity_id text not null,
  entity_label text not null,
  action text not null check(action in ('created','updated','price_changed','sent','send_cleared','trashed','restored','deleted')),
  changes jsonb not null check(jsonb_typeof(changes)='array')
);
-- Actor identity is a snapshot, not a cascading FK: retain attribution after account removal.
alter table public.activity_log enable row level security;
revoke all on public.activity_log from public,anon,authenticated;
grant select on public.activity_log to authenticated;
create policy activity_admin_read on public.activity_log for select to authenticated
using ((select private.current_role())='admin');
create index activity_time on public.activity_log(occurred_at desc,id desc);
create index activity_day on public.activity_log(occurred_on desc);
create index activity_actor on public.activity_log(actor_id,occurred_at desc);
create index activity_entity on public.activity_log(entity_type,occurred_at desc);

create function private.activity_changes(before_value jsonb,after_value jsonb) returns jsonb
language sql immutable security invoker set search_path='' as $$
  select coalesce(jsonb_agg(jsonb_build_object('field',key,'before',before_value->key,'after',after_value->key) order by key),'[]'::jsonb)
  from (select jsonb_object_keys(coalesce(before_value,'{}')) as key union select jsonb_object_keys(coalesce(after_value,'{}'))) keys
  where before_value->key is distinct from after_value->key
$$;
revoke all on function private.activity_changes(jsonb,jsonb) from public,anon,authenticated;

create function private.write_activity(kind text,ref text,label text,event text,diff jsonb) returns void
language plpgsql security invoker set search_path='' as $$
declare actor uuid:=auth.uid(); actor_label text; actor_mail text; at_time timestamptz:=clock_timestamp();
begin
  select coalesce(nullif(trim(full_name),''),email),email into actor_label,actor_mail from public.profiles where id=actor;
  insert into public.activity_log(occurred_at,occurred_on,actor_id,actor_name,actor_email,entity_type,entity_id,entity_label,action,changes)
  values(at_time,(at_time at time zone 'America/Santiago')::date,actor,
    coalesce(actor_label,case when actor is null then 'Sistema / administración de base de datos' else 'Usuario no disponible' end),
    coalesce(actor_mail,''),kind,ref,coalesce(label,ref),event,diff);
end $$;
revoke all on function private.write_activity(text,text,text,text,jsonb) from public,anon,authenticated;

-- Only triggers can call this privileged function. No public RPC accepts audit entries.
create function private.capture_activity() returns trigger
language plpgsql security definer set search_path='' as $$
declare b jsonb:='{}'; a jsonb:='{}'; delta jsonb; item record; kind text; event text; label text; ref text;
begin
  if tg_op<>'INSERT' then b:=to_jsonb(old);end if;
  if tg_op<>'DELETE' then a:=to_jsonb(new);end if;
  event:=case tg_op when 'INSERT' then 'created' when 'DELETE' then 'deleted' else 'updated' end;
  ref:=coalesce(a->>'id',b->>'id');
  if tg_table_name='workspace_config' then
    for item in
      select coalesce(n.value->>'id',o.value->>'id') id,o.value previous,n.value current
      from jsonb_array_elements(coalesce(b->'products','[]')) o(value)
      full join jsonb_array_elements(coalesce(a->'products','[]')) n(value) on o.value->>'id'=n.value->>'id'
      where o.value is distinct from n.value
    loop
      delta:=private.activity_changes(item.previous,item.current);
      perform private.write_activity('catalog',item.id,coalesce(item.current->>'name',item.previous->>'name'),
        case when item.previous is null then 'created' when item.current is null then 'deleted'
          when item.previous->'price' is distinct from item.current->'price' then 'price_changed' else 'updated' end,delta);
    end loop;
    delta:=private.activity_changes(b->'settings',a->'settings');
    if delta<>'[]' then perform private.write_activity('company',ref,'Configuración de la empresa',event,delta);end if;
    if b->'installation' is distinct from a->'installation' then
      perform private.write_activity('installation',ref,'Tarifas de instalación',event,
        jsonb_build_array(jsonb_build_object('field','installation','before',b->'installation','after',a->'installation')));
    end if;
    return null;
  elsif tg_table_name='clients' then
    kind:='client';label:=coalesce(a->'details'->>'name',b->'details'->>'name');
    delta:=private.activity_changes(b->'details',a->'details');
    if tg_op='UPDATE' and b->'deleted_at' is distinct from a->'deleted_at' then
      event:=case when a->>'deleted_at' is null then 'restored' else 'trashed' end;
      delta:=delta||private.activity_changes(jsonb_build_object('deleted_at',b->'deleted_at'),jsonb_build_object('deleted_at',a->'deleted_at'));
    end if;
  elsif tg_table_name='profiles' then
    kind:='member';label:=coalesce(nullif(a->>'full_name',''),a->>'email',nullif(b->>'full_name',''),b->>'email');
    delta:=private.activity_changes(b-'id'-'created_at',a-'id'-'created_at');
  elsif tg_table_name='quotes' then
    kind:='quote';label:=coalesce(a->>'folio',b->>'folio');
    if tg_op='UPDATE' then
      delta:=private.activity_changes(b-'payload'-'sent_by'-'sent_recorded_at'-'deleted_by',a-'payload'-'sent_by'-'sent_recorded_at'-'deleted_by');
      if b->'payload' is distinct from a->'payload' then
        delta:=delta||jsonb_build_array(jsonb_build_object('field','document','before','Versión anterior','after','Documento modificado desde base de datos'));
      end if;
      if b->'deleted_at' is distinct from a->'deleted_at' then event:=case when a->>'deleted_at' is null then 'restored' else 'trashed' end;
      elsif b->'sent_on' is distinct from a->'sent_on' or b->'sent_channel' is distinct from a->'sent_channel' then event:=case when a->>'sent_on' is null then 'send_cleared' else 'sent' end;end if;
    else
      delta:=private.activity_changes(case when tg_op='DELETE' then jsonb_build_object('folio',b->'folio','total',b->'payload'->'calculation'->'total') else '{}' end,
        case when tg_op='INSERT' then jsonb_build_object('folio',a->'folio','total',a->'payload'->'calculation'->'total') else '{}' end);
    end if;
  end if;
  if delta<>'[]' then perform private.write_activity(kind,ref,label,event,delta);end if;
  return null;
end $$;
revoke all on function private.capture_activity() from public,anon,authenticated;
create trigger activity_workspace after insert or update or delete on public.workspace_config for each row execute function private.capture_activity();
create trigger activity_clients after insert or update or delete on public.clients for each row execute function private.capture_activity();
create trigger activity_quotes after insert or update or delete on public.quotes for each row execute function private.capture_activity();
create trigger activity_members after insert or update or delete on public.profiles for each row execute function private.capture_activity();
