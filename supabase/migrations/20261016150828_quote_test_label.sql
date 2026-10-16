-- Internal metadata only. Existing quotes remain unlabelled; payloads stay immutable.
alter table public.quotes add column is_test boolean not null default false;
grant update(is_test) on public.quotes to authenticated;
create function private.initialize_quote_test_label() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 new.is_test:=coalesce(new.payload->'input'->>'isTest','false')='true';
 return new;
end $$;
revoke all on function private.initialize_quote_test_label() from public,anon,authenticated;
create trigger initialize_quote_test_label before insert on public.quotes
for each row execute function private.initialize_quote_test_label();
