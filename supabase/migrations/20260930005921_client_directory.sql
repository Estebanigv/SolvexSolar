-- Recoverable client deletion; historical quote snapshots and bill links remain intact.
alter table public.clients add column deleted_at timestamptz;
grant update(deleted_at) on public.clients to authenticated;
create index clients_active_updated on public.clients(updated_at desc) where deleted_at is null;
create function private.guard_client_directory() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if tg_op='INSERT' then
   if new.deleted_at is not null then raise exception 'NEW_CLIENT_MUST_BE_ACTIVE' using errcode='42501';end if;
   return new;
 end if;
 if old.deleted_at is distinct from new.deleted_at and coalesce(private.current_role(),'')<>'admin' then
   raise exception 'ADMIN_REQUIRED' using errcode='42501';
 end if;
 if old.deleted_at is not null and old.details is distinct from new.details then
   raise exception 'CLIENT_IN_TRASH' using errcode='55000';
 end if;
 return new;
end $$;
create trigger guard_client_directory before insert or update on public.clients for each row execute function private.guard_client_directory();
create function private.guard_quote_active_client() returns trigger language plpgsql security invoker set search_path='' as $$
declare archived timestamptz;
begin
 select deleted_at into archived from public.clients where id=new.client_id for share;
 if not found then raise exception 'CLIENT_NOT_FOUND' using errcode='42501'; end if;
 if archived is not null then raise exception 'CLIENT_IN_TRASH' using errcode='55000'; end if;
 return new;
end $$;
create trigger guard_quote_active_client before insert on public.quotes for each row execute function private.guard_quote_active_client();
revoke all on function private.guard_client_directory(),private.guard_quote_active_client() from public,anon,authenticated;
