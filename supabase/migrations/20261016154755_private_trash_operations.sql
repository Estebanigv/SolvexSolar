-- Privileged implementations stay outside the exposed API schema.
alter function public.trash_claim_quote(uuid,text) set schema private;
alter function public.trash_finish_quote(uuid) set schema private;
alter function public.trash_verify_cron(text) set schema private;
grant usage on schema private to service_role;
create function public.trash_claim_quote(quote_id uuid,confirm_folio text) returns text
language sql security invoker set search_path='' as $$
 select private.trash_claim_quote(quote_id,confirm_folio);
$$;
create function public.trash_finish_quote(quote_id uuid) returns boolean
language sql security invoker set search_path='' as $$
 select private.trash_finish_quote(quote_id);
$$;
create function public.trash_verify_cron(token text) returns boolean
language sql security invoker set search_path='' as $$
 select private.trash_verify_cron(token);
$$;
revoke all on function public.trash_claim_quote(uuid,text),public.trash_finish_quote(uuid),public.trash_verify_cron(text) from public,anon,authenticated;
grant execute on function public.trash_claim_quote(uuid,text),public.trash_finish_quote(uuid) to authenticated,service_role;
grant execute on function public.trash_verify_cron(text) to service_role;
