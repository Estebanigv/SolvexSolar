-- Local preparation only: apply to production together with the history release.
alter table public.quotes
  add column sent_on date,
  add column sent_channel text check(sent_channel in ('whatsapp','email','other')),
  add column sent_by uuid references public.profiles(id),
  add column sent_recorded_at timestamptz,
  add column deleted_at timestamptz,
  add column deleted_by uuid references public.profiles(id),
  add constraint quote_sent_consistent check ((sent_on is null) = (sent_channel is null));
create index quotes_sent_on on public.quotes(sent_on desc,id) where deleted_at is null and sent_on is not null;
create index quotes_deleted_at on public.quotes(deleted_at desc) where deleted_at is not null;

drop policy quotes_read on public.quotes;
create policy quotes_read on public.quotes for select to authenticated using (
  (select private.current_role())='admin' or
  ((select private.current_role())='sales' and owner_id=(select auth.uid()) and deleted_at is null)
);
create policy quotes_update_tracking on public.quotes for update to authenticated using (
  (select private.current_role())='admin' or
  ((select private.current_role())='sales' and owner_id=(select auth.uid()) and deleted_at is null)
) with check (
  (select private.current_role())='admin' or
  ((select private.current_role())='sales' and owner_id=(select auth.uid()) and deleted_at is null)
);
-- Immutable payload, owner and client remain outside UPDATE grants. No hard DELETE grant.
grant update(sent_on,sent_channel,deleted_at) on public.quotes to authenticated;
create function private.guard_quote_tracking() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  if tg_op='INSERT' then
    if new.sent_on is not null or new.sent_channel is not null or new.sent_by is not null
       or new.sent_recorded_at is not null or new.deleted_at is not null or new.deleted_by is not null then
      raise exception 'TRACKING_MUST_BE_REGISTERED' using errcode='42501';
    end if;
    return new;
  end if;
  if new.deleted_at is distinct from old.deleted_at then
    if coalesce(private.current_role(),'') <> 'admin' then
      raise exception 'ADMIN_REQUIRED' using errcode='42501';
    end if;
    new.deleted_at:=case when new.deleted_at is null then null else now() end;
    new.deleted_by:=case when new.deleted_at is null then null else auth.uid() end;
  end if;
  if new.sent_on is distinct from old.sent_on or new.sent_channel is distinct from old.sent_channel then
    if old.deleted_at is not null or new.deleted_at is not null then
      raise exception 'RESTORE_BEFORE_EDITING' using errcode='22023';
    end if;
    if new.sent_on is not null and
      (new.sent_on>(now() at time zone 'America/Santiago')::date or
       new.sent_on<(new.created_at at time zone 'America/Santiago')::date) then
      raise exception 'INVALID_SENT_DATE' using errcode='22023';
    end if;
    new.sent_by:=case when new.sent_on is null then null else auth.uid() end;
    new.sent_recorded_at:=case when new.sent_on is null then null else now() end;
  end if;
  return new;
end $$;
revoke all on function private.guard_quote_tracking() from public,anon,authenticated;
create trigger guard_quote_tracking before insert or update on public.quotes
for each row execute function private.guard_quote_tracking();
