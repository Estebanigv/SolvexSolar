-- Expand commercial tracking without changing document issuance or recorded sends.
alter table public.crm_leads drop constraint crm_leads_status_check;
alter table public.crm_leads add constraint crm_leads_status_check check(status in ('new','no_answer','contacted','qualified','visit','rejected'));
alter table public.quote_followups drop constraint quote_followups_status_check;
alter table public.quote_followups add constraint quote_followups_status_check check(status in ('draft','sent','visit','followup','negotiation','accepted','rejected'));
alter table public.crm_leads add column expected_close date, add column lost_reason text check(length(lost_reason)<=500);
alter table public.quote_followups add column expected_close date, add column lost_reason text check(length(lost_reason)<=500);
grant insert(expected_close,lost_reason),update(expected_close,lost_reason) on public.crm_leads,public.quote_followups to authenticated;
-- Existing owner/admin policies and version-stamping triggers cover these columns.
