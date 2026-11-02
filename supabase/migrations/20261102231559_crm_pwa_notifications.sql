-- Personal inbox and device subscriptions. No service-role key is needed by the app.
create table public.crm_notifications (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
 client_id uuid references public.clients(id) on delete cascade, kind text not null check(kind in ('assignment','reminder')),
 title text not null, body text not null, event_key text not null unique,
 created_at timestamptz not null default now(), read_at timestamptz
);
create index crm_notifications_user_date on public.crm_notifications(user_id,created_at desc);
create index crm_notifications_client on public.crm_notifications(client_id);
alter table public.crm_notifications enable row level security;
revoke all on public.crm_notifications from public,anon,authenticated;
grant select,update(read_at) on public.crm_notifications to authenticated;
create policy own_notifications on public.crm_notifications for select to authenticated using (
 user_id=(select auth.uid()) and exists(select 1 from public.profiles where id=(select auth.uid()) and role in ('admin','sales'))
 and (client_id is null or exists(select 1 from public.clients c where c.id=client_id and c.owner_id=(select auth.uid()) and c.deleted_at is null))
);
create policy read_own_notifications on public.crm_notifications for update to authenticated
 using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));

create table private.crm_push_devices (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
 endpoint text not null unique, p256dh text not null, auth_key text not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index crm_push_devices_user on private.crm_push_devices(user_id);
create table private.crm_push_deliveries (
 id uuid primary key default gen_random_uuid(), notification_id uuid not null references public.crm_notifications(id) on delete cascade,
 device_id uuid not null references private.crm_push_devices(id) on delete cascade,
 attempts int not null default 0, lease_until timestamptz, lease_id uuid, sent_at timestamptz, last_status int,
 unique(notification_id,device_id)
);
create index crm_push_deliveries_device on private.crm_push_deliveries(device_id);
create table private.crm_push_config (id boolean primary key default true check(id), worker_hash text not null check(length(worker_hash)=64));
alter table private.crm_push_devices enable row level security;
alter table private.crm_push_deliveries enable row level security;
alter table private.crm_push_config enable row level security;
revoke all on private.crm_push_devices,private.crm_push_deliveries,private.crm_push_config from public,anon,authenticated;

-- Endpoint is an opaque capability held by this browser, never returned in the inbox.
create function public.crm_push_device(p_endpoint text,p_p256dh text default null,p_auth text default null,p_remove boolean default false)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.profiles where id=auth.uid() and role in ('admin','sales')) then raise exception 'Member required' using errcode='42501'; end if;
 if p_remove then delete from private.crm_push_devices where endpoint=p_endpoint and user_id=auth.uid(); return; end if;
 if length(p_endpoint)>2048 or p_endpoint !~ '^https://(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9-]+\.notify\.windows\.com)/'
  or p_p256dh is null or p_p256dh !~ '^[A-Za-z0-9_-]{87}=?$' or p_auth is null or p_auth !~ '^[A-Za-z0-9_-]{22}=?=?$'
 then raise exception 'Invalid subscription'; end if;
 -- Rebinding a shared browser removes queued deliveries for its previous account.
 delete from private.crm_push_devices where endpoint=p_endpoint and user_id<>auth.uid();
 if not exists(select 1 from private.crm_push_devices where endpoint=p_endpoint) and (select count(*) from private.crm_push_devices where user_id=auth.uid())>=12 then raise exception 'Device limit reached'; end if;
 insert into private.crm_push_devices(user_id,endpoint,p256dh,auth_key) values(auth.uid(),p_endpoint,p_p256dh,p_auth)
 on conflict(endpoint) do update set p256dh=excluded.p256dh,auth_key=excluded.auth_key,updated_at=now();
end $$;
revoke all on function public.crm_push_device(text,text,text,boolean) from public,anon;
grant execute on function public.crm_push_device(text,text,text,boolean) to authenticated;

create function private.crm_notify_assignment() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.deleted_at is not null then return new; end if;
 if tg_op='UPDATE' then if new.owner_id is not distinct from old.owner_id then return new; end if; end if;
 if new.owner_id is not distinct from auth.uid() then return new; end if;
 if exists(select 1 from public.profiles where id=new.owner_id and role in ('admin','sales')) then
 insert into public.crm_notifications(user_id,client_id,kind,title,body,event_key)
 values(new.owner_id,new.id,'assignment','Lead asignado',coalesce(left(new.details->>'name',150),'Un prospecto')||' está en tu cartera.','assignment:'||gen_random_uuid());
 end if;
 return new;
end $$;
revoke all on function private.crm_notify_assignment() from public,anon,authenticated;
create trigger crm_notify_assignment after insert or update of owner_id on public.clients for each row execute function private.crm_notify_assignment();

-- One morning digest per owner and Chilean date; includes overdue work, excludes closed/deleted/test opportunities.
create function private.crm_generate_reminders(p_now timestamptz default now()) returns void language plpgsql security definer set search_path='' as $$
declare local_now timestamp := p_now at time zone 'America/Santiago';
begin
 if local_now::time < time '09:00' or local_now::time >= time '19:00' then return; end if;
 with active_clients as (
 select c.id,c.owner_id from public.clients c join public.profiles p on p.id=c.owner_id where c.deleted_at is null and p.role in ('admin','sales')
 ), work as (
 select c.owner_id,count(*) tasks,0::bigint contacts from public.crm_tasks t join active_clients c on c.id=t.client_id where t.status='pending' and t.due_on<=local_now::date group by c.owner_id
 union all
 select c.owner_id,0,count(*) from public.crm_leads l join active_clients c on c.id=l.client_id where l.status not in ('accepted','rejected') and l.next_contact<=local_now::date
 and not exists(select 1 from public.quotes q where q.client_id=c.id and q.deleted_at is null and not q.is_test) group by c.owner_id
 union all
 select c.owner_id,0,count(*) from public.quote_followups f join (
 select distinct on(project_id) project_id,client_id from public.quotes where deleted_at is null and not is_test order by project_id,created_at desc,id
 ) q on q.project_id=f.project_id join active_clients c on c.id=q.client_id
 where f.status not in ('accepted','rejected') and f.next_contact<=local_now::date group by c.owner_id
 )
 insert into public.crm_notifications(user_id,kind,title,body,event_key)
 select owner_id,'reminder','Tu agenda comercial',sum(tasks)||' tareas y '||sum(contacts)||' contactos para hoy o vencidos.','reminder:'||owner_id||':'||local_now::date from work group by owner_id
 on conflict(event_key) do nothing;
end $$;
revoke all on function private.crm_generate_reminders(timestamptz) from public,anon,authenticated;

create function private.crm_push_authorize(p_secret text) returns void language plpgsql security definer set search_path='' as $$
begin
 if p_secret is null or length(p_secret)<32 or not exists(
 select 1 from private.crm_push_config where worker_hash=encode(sha256(convert_to(p_secret,'UTF8')),'hex')
 ) then raise exception 'Unauthorized worker' using errcode='42501'; end if;
end $$;
revoke all on function private.crm_push_authorize(text) from public,anon,authenticated;

create function public.crm_push_claim(p_secret text) returns table(delivery_id uuid,lease_id uuid,endpoint text,p256dh text,auth_key text,notification_id uuid,title text,body text)
language plpgsql security definer set search_path='' as $$
begin
 perform private.crm_push_authorize(p_secret);
 perform private.crm_generate_reminders();
 -- Retain the inbox for 90 days. A new device receives only future events.
 delete from public.crm_notifications where created_at<now()-interval '90 days';
 delete from private.crm_push_devices where updated_at<now()-interval '90 days';
 insert into private.crm_push_deliveries(notification_id,device_id)
 select n.id,d.id from public.crm_notifications n join private.crm_push_devices d on d.user_id=n.user_id
 join public.profiles p on p.id=n.user_id and p.role in ('admin','sales')
 where n.created_at>=d.created_at and n.created_at>now()-interval '1 day' and n.read_at is null
 and (n.client_id is null or exists(select 1 from public.clients c where c.id=n.client_id and c.deleted_at is null and c.owner_id=n.user_id))
 on conflict on constraint crm_push_deliveries_notification_id_device_id_key do nothing;
 return query with picked as (
 select d.id from private.crm_push_deliveries d join public.crm_notifications n on n.id=d.notification_id
 join private.crm_push_devices s on s.id=d.device_id and s.user_id=n.user_id
 join public.profiles p on p.id=n.user_id and p.role in ('admin','sales')
 where d.sent_at is null and d.attempts<5 and (d.lease_until is null or d.lease_until<now()) and n.read_at is null and n.created_at>now()-interval '1 day'
 and (n.client_id is null or exists(select 1 from public.clients c where c.id=n.client_id and c.owner_id=n.user_id and c.deleted_at is null))
 order by n.created_at,d.id for update of d skip locked limit 40
 ), claimed as (
 update private.crm_push_deliveries d set attempts=attempts+1,lease_until=now()+interval '5 minutes',lease_id=gen_random_uuid()
 from picked where d.id=picked.id returning d.*
 )
 select d.id,d.lease_id,s.endpoint,s.p256dh,s.auth_key,n.id,n.title,
 case when n.kind='assignment' then 'Tienes un nuevo prospecto en tu cartera. Abre el CRM para revisarlo.' else n.body end
 from claimed d join private.crm_push_devices s on s.id=d.device_id join public.crm_notifications n on n.id=d.notification_id;
end $$;
create function public.crm_push_finish(p_secret text,p_id uuid,p_lease uuid,p_status int) returns void language plpgsql security definer set search_path='' as $$
declare device uuid;
begin
 perform private.crm_push_authorize(p_secret);
 select device_id into device from private.crm_push_deliveries where id=p_id and lease_id=p_lease and sent_at is null for update;
 if not found then return; end if;
 if p_status in (404,410) then delete from private.crm_push_devices where id=device;
 else update private.crm_push_deliveries set last_status=p_status,sent_at=case when p_status between 200 and 299 then now() else null end,lease_until=now()+interval '10 minutes' where id=p_id and lease_id=p_lease; end if;
end $$;
revoke all on function public.crm_push_claim(text),public.crm_push_finish(text,uuid,uuid,int) from public,anon,authenticated;
grant execute on function public.crm_push_claim(text),public.crm_push_finish(text,uuid,uuid,int) to anon;

