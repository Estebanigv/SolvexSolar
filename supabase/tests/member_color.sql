begin;
insert into auth.users(id,email,raw_user_meta_data) values
('20000000-0000-4000-8000-000000000001','admin@color.example','{"full_name":"Color Admin"}'),
('20000000-0000-4000-8000-000000000002','other@color.example','{}'),
('20000000-0000-4000-8000-000000000003','sales@color.example','{}'),
('20000000-0000-4000-8000-000000000004','disabled@color.example','{}');
update public.profiles set role=case when email like 'sales%' then 'sales' when email like 'disabled%' then 'disabled' else 'admin' end where email like '%@color.example';
set local role authenticated;
select set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000001',true);
do $$declare n integer;begin
 update public.profiles set identification_color='violet' where id=auth.uid();
 if not exists(select 1 from public.profiles where id=auth.uid() and identification_color='violet' and role='admin') then raise exception 'Own color failed';end if;
 if not exists(select 1 from public.activity_log where actor_id=auth.uid() and entity_type='member' and changes @> '[{"field":"identification_color","before":null,"after":"violet"}]') then raise exception 'Color audit missing';end if;
 select count(*) into n from public.activity_log;
 update public.profiles set identification_color='violet' where id=auth.uid();
 if (select count(*) from public.activity_log)<>n then raise exception 'No-op audited';end if;
 begin update public.profiles set identification_color='red' where id=auth.uid();raise exception 'Invalid color allowed';exception when check_violation then null;end;
 begin update public.profiles set identification_color='blue' where id='20000000-0000-4000-8000-000000000002';raise exception 'Other color editable';exception when insufficient_privilege then null;end;
 begin update public.profiles set role='disabled',identification_color='blue' where id=auth.uid();raise exception 'Own role editable';exception when insufficient_privilege then null;end;
 begin update public.profiles set full_name='spoofed' where id=auth.uid();raise exception 'Other column writable';exception when insufficient_privilege then null;end;
 update public.profiles set role='disabled' where id='20000000-0000-4000-8000-000000000002';
 if not exists(select 1 from public.profiles where id='20000000-0000-4000-8000-000000000002' and role='disabled') then raise exception 'Existing role management broken';end if;
 update public.profiles set identification_color=null where id=auth.uid();
 if not exists(select 1 from public.profiles where id=auth.uid() and identification_color is null) then raise exception 'Automatic reset failed';end if;
end $$;
select set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000003',true);
do $$declare n integer;begin
 update public.profiles set identification_color='blue' where id=auth.uid();get diagnostics n=row_count;
 if n<>0 then raise exception 'Sales updated color';end if;
 update public.profiles set role='admin' where id=auth.uid();get diagnostics n=row_count;
 if n<>0 then raise exception 'Sales escalated role';end if;
end $$;
select set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000004',true);
do $$declare n integer;begin
 update public.profiles set identification_color='blue' where id=auth.uid();get diagnostics n=row_count;
 if n<>0 then raise exception 'Disabled updated color';end if;
end $$;
set local role anon;
do $$begin begin update public.profiles set identification_color='blue';raise exception 'Anon update';exception when insufficient_privilege then null;end;end $$;
rollback;
