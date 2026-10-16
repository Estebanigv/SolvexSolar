-- Quotes keep a stable project UUID even when the original revision is removed.
-- Never cascade deletion into other revisions or the client record.
alter table public.quotes drop constraint quotes_project_id_fkey;
alter table public.quote_followups drop constraint quote_followups_project_id_fkey;
alter table public.quotes drop constraint quotes_parent_quote_id_fkey;
alter table public.quotes add constraint quotes_parent_quote_id_fkey
 foreign key(parent_quote_id) references public.quotes(id) on delete set null;
alter table public.quotes add column purge_started_at timestamptz;

create function private.guard_quote_purge() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if old.purge_started_at is not null and new.deleted_at is distinct from old.deleted_at then
  raise exception 'PURGE_IN_PROGRESS' using errcode='55000';
 end if;
 return new;
end $$;
revoke all on function private.guard_quote_purge() from public,anon,authenticated;
create trigger guard_quote_purge before update on public.quotes for each row execute function private.guard_quote_purge();

-- Lock the parent row during uploads so an upload cannot race the purge claim.
create function private.guard_bill_purge() returns trigger language plpgsql security definer set search_path='' as $$
declare q public.quotes;
begin
 if new.bucket_id='boletas' then
  select * into q from public.quotes where id::text=(storage.foldername(new.name))[2] for share;
  if q.id is null or q.deleted_at is not null or q.purge_started_at is not null then
   raise exception 'QUOTE_NOT_ACTIVE' using errcode='42501';
  end if;
 end if;
 return new;
end $$;
revoke all on function private.guard_bill_purge() from public,anon,authenticated;
create trigger guard_bill_purge before insert or update of name,bucket_id on storage.objects
 for each row execute function private.guard_bill_purge();

create function public.trash_claim_quote(quote_id uuid,confirm_folio text) returns text
language plpgsql security definer set search_path='' as $$
declare q public.quotes; automated boolean:=coalesce(auth.jwt()->>'role','')='service_role';
begin
 if not automated and (auth.uid() is null or coalesce(private.current_role(),'')<>'admin') then
  raise exception 'ADMIN_REQUIRED' using errcode='42501';
 end if;
 select * into q from public.quotes where id=quote_id for update;
 if q.id is null or q.deleted_at is null or q.folio is distinct from confirm_folio then return null;end if;
 if automated and q.purge_started_at is null and q.deleted_at>now()-interval '30 days' then return null;end if;
 update public.quotes set purge_started_at=coalesce(purge_started_at,now()) where id=q.id;
 return q.owner_id::text||'/'||q.id::text;
end $$;
revoke all on function public.trash_claim_quote(uuid,text) from public,anon,authenticated;
grant execute on function public.trash_claim_quote(uuid,text) to authenticated,service_role;

create function public.trash_finish_quote(quote_id uuid) returns boolean
language plpgsql security definer set search_path='' as $$
declare q public.quotes;
begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' and (auth.uid() is null or coalesce(private.current_role(),'')<>'admin') then
  raise exception 'ADMIN_REQUIRED' using errcode='42501';
 end if;
 select * into q from public.quotes where id=quote_id for update;
 if q.id is null then return true;end if;
 if q.deleted_at is null or q.purge_started_at is null then return false;end if;
 if exists(select 1 from storage.objects where bucket_id='boletas' and name like q.owner_id::text||'/'||q.id::text||'/%') then return false;end if;
 delete from public.quotes where id=q.id;
 if not exists(select 1 from public.quotes where project_id=q.project_id) then
  delete from public.quote_followups where project_id=q.project_id;
 end if;
 return true;
end $$;
revoke all on function public.trash_finish_quote(uuid) from public,anon,authenticated;
grant execute on function public.trash_finish_quote(uuid) to authenticated,service_role;

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
do $$ begin
 if not exists(select 1 from vault.secrets where name='quote_trash_cron') then
  perform vault.create_secret(encode(extensions.gen_random_bytes(32),'hex'),'quote_trash_cron','Private credential for quote trash retention');
 end if;
end $$;
create function public.trash_verify_cron(token text) returns boolean language sql security definer set search_path='' as $$
 select exists(select 1 from vault.decrypted_secrets where name='quote_trash_cron' and decrypted_secret=token);
$$;
revoke all on function public.trash_verify_cron(text) from public,anon,authenticated;
grant execute on function public.trash_verify_cron(text) to service_role;
-- Daily at 09:15 UTC; 30 full days in the trash, then the next daily cleanup.
select cron.schedule('quote-trash-retention','15 9 * * *',$job$
 select net.http_post(
  url:='https://oymuqllnmocfzmghbmcp.supabase.co/functions/v1/quote-trash',
  headers:=jsonb_build_object('Content-Type','application/json','x-trash-token',
   (select decrypted_secret from vault.decrypted_secrets where name='quote_trash_cron')),
  body:='{}'::jsonb,timeout_milliseconds:=120000);
$job$);
