-- Local only. A personal visual preference must not enable editing one's own role.
alter table public.profiles add column identification_color text
  check(identification_color in ('forest','blue','violet','amber','rose','teal',
    'navy','sky','indigo','plum','fuchsia','burgundy','coral','orange','copper','olive','mint','slate'));
grant update(identification_color) on public.profiles to authenticated;
create policy profiles_own_color on public.profiles for update to authenticated
  using (id=(select auth.uid()) and (select private.current_role())='admin')
  with check (id=(select auth.uid()) and (select private.current_role())='admin');

-- RLS selects rows, column privileges select columns. This guard enforces the
-- combination: own color only; another account's role only (existing admin flow).
create function private.guard_profile_preferences() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  if current_user='authenticated' then
    if new.identification_color is distinct from old.identification_color and
      (old.id is distinct from auth.uid() or coalesce(private.current_role(),'')<>'admin') then
      raise exception 'OWN_ADMIN_COLOR_ONLY' using errcode='42501';
    end if;
    if new.role is distinct from old.role and old.id=auth.uid() then
      raise exception 'OWN_ROLE_PROTECTED' using errcode='42501';
    end if;
  end if;
  return new;
end $$;
revoke all on function private.guard_profile_preferences() from public,anon,authenticated;
create trigger guard_profile_preferences before update on public.profiles
for each row execute function private.guard_profile_preferences();
