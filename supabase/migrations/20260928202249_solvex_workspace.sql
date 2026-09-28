-- Solvex Solar: one company, shared catalog, private customer portfolios.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  role text not null default 'pending' check (role in ('pending','sales','admin','disabled')),
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- Database roles, never user-editable JWT metadata, authorize every request.
create function private.current_role() returns text language sql stable security definer
set search_path = '' as $$
  select p.role from public.profiles p where p.id = (select auth.uid()) and auth.uid() is not null
$$;
revoke all on function private.current_role() from public, anon;
grant execute on function private.current_role() to authenticated;

-- Called only by the Auth trigger; signup cannot choose or elevate a role.
create function private.new_profile() returns trigger language plpgsql security definer
set search_path = '' as $$
begin
  insert into public.profiles(id,email,full_name) values (new.id,coalesce(new.email,''),left(coalesce(new.raw_user_meta_data->>'full_name',''),150));
  return new;
end $$;
revoke all on function private.new_profile() from public, anon, authenticated;
create trigger solvex_new_profile after insert on auth.users for each row execute function private.new_profile();

create policy profiles_read on public.profiles for select to authenticated
using (id = (select auth.uid()) or (select private.current_role()) = 'admin');
create policy profiles_admin_update on public.profiles for update to authenticated
using ((select private.current_role()) = 'admin' and id <> (select auth.uid()))
with check ((select private.current_role()) = 'admin' and id <> (select auth.uid()));
revoke all on public.profiles from anon, authenticated;
grant select, update(role) on public.profiles to authenticated;

create table public.workspace_config (
  id boolean primary key default true check(id),
  products jsonb not null check(jsonb_typeof(products) = 'array' and jsonb_array_length(products) between 1 and 1000),
  settings jsonb not null check(jsonb_typeof(settings) = 'object'),
  revision integer not null default 1 check(revision > 0),
  updated_at timestamptz not null default now()
);
alter table public.workspace_config enable row level security;
create policy workspace_read on public.workspace_config for select to authenticated
using ((select private.current_role()) in ('admin','sales'));
create policy workspace_update on public.workspace_config for update to authenticated
using ((select private.current_role()) = 'admin') with check ((select private.current_role()) = 'admin');
revoke all on public.workspace_config from anon, authenticated;
grant select, update on public.workspace_config to authenticated;

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles(id),
  details jsonb not null check(jsonb_typeof(details) = 'object' and length(trim(details->>'name')) between 1 and 150),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index clients_owner_updated on public.clients(owner_id,updated_at desc);
alter table public.clients enable row level security;
create policy clients_read on public.clients for select to authenticated using (
  (select private.current_role()) = 'admin' or ((select private.current_role()) = 'sales' and owner_id = (select auth.uid()))
);
create policy clients_insert on public.clients for insert to authenticated with check (
  (select private.current_role()) in ('admin','sales') and owner_id = (select auth.uid())
);
create policy clients_update on public.clients for update to authenticated using (
  (select private.current_role()) = 'admin' or ((select private.current_role()) = 'sales' and owner_id = (select auth.uid()))
) with check (
  (select private.current_role()) = 'admin' or ((select private.current_role()) = 'sales' and owner_id = (select auth.uid()))
);
revoke all on public.clients from anon, authenticated;
grant select, insert on public.clients to authenticated;
grant update(details,updated_at) on public.clients to authenticated;

create table public.quotes (
  id uuid primary key,
  owner_id uuid not null default auth.uid() references public.profiles(id),
  client_id uuid not null references public.clients(id),
  folio text not null unique,
  created_at timestamptz not null default now(),
  payload jsonb not null check(jsonb_typeof(payload) = 'object')
);
create index quotes_owner_created on public.quotes(owner_id,created_at desc);
create index quotes_client on public.quotes(client_id);
alter table public.quotes enable row level security;
create policy quotes_read on public.quotes for select to authenticated using (
  (select private.current_role()) = 'admin' or ((select private.current_role()) = 'sales' and owner_id = (select auth.uid()))
);
create policy quotes_insert on public.quotes for insert to authenticated with check (
  (select private.current_role()) in ('admin','sales') and owner_id = (select auth.uid())
  and exists(select 1 from public.clients c where c.id = client_id)
);
revoke all on public.quotes from anon, authenticated;
grant select, insert on public.quotes to authenticated;

-- Shared lock makes catalog revision checks and quote creation atomic.
create function public.save_workspace(expected_revision integer, new_products jsonb, new_settings jsonb)
returns integer language plpgsql security invoker set search_path = '' as $$
declare next_revision integer;
begin
  if auth.uid() is null or private.current_role() <> 'admin' then raise exception 'NOT_AUTHORIZED' using errcode='42501'; end if;
  perform pg_catalog.pg_advisory_xact_lock(794825160);
  update public.workspace_config set products=new_products, settings=new_settings, revision=revision+1, updated_at=now()
    where id and revision=expected_revision returning revision into next_revision;
  if next_revision is null then raise exception 'CATALOG_CONFLICT' using errcode='40001'; end if;
  return next_revision;
end $$;

create function public.save_quote(snapshot jsonb, expected_revision integer, customer_id uuid default null)
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
  insert into public.quotes(id,client_id,folio,payload) values(quote_id,target_client,snapshot->>'folio',saved);
  return saved;
end $$;
revoke all on function public.save_workspace(integer,jsonb,jsonb), public.save_quote(jsonb,integer,uuid) from public, anon;
grant execute on function public.save_workspace(integer,jsonb,jsonb), public.save_quote(jsonb,integer,uuid) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('boletas','boletas',false,10485760,array['application/pdf','image/jpeg','image/png']);
create policy bills_read on storage.objects for select to authenticated using (
  bucket_id='boletas' and (select private.current_role()) in ('admin','sales')
  and exists(select 1 from public.quotes q where q.id::text=(storage.foldername(name))[2] and q.owner_id::text=(storage.foldername(name))[1])
);
create policy bills_insert on storage.objects for insert to authenticated with check (
  bucket_id='boletas' and (select private.current_role()) in ('admin','sales')
  and (storage.foldername(name))[1]=(select auth.uid())::text
  and array_length(storage.foldername(name),1)=2 and storage.filename(name) in ('frente','reverso')
  and exists(select 1 from public.quotes q where q.id::text=(storage.foldername(name))[2] and q.owner_id=(select auth.uid()))
);
-- No public links or overwrite/delete policy: attachments belong to an immutable quote version.
