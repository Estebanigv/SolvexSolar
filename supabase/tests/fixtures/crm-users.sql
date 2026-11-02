-- Synthetic local accounts; never run on a deployment database.
insert into auth.users(id,email,raw_user_meta_data) values
('00000000-0000-4000-8000-000000000001','cibaceta@solvexsolar.cl','{"full_name":"Carol Test"}'),
('00000000-0000-4000-8000-000000000002','a@example.test','{"full_name":"Owner A"}'),
('00000000-0000-4000-8000-000000000003','b@example.test','{"full_name":"Owner B"}'),
('00000000-0000-4000-8000-000000000004','admin@example.test','{"full_name":"Other admin"}'),
('00000000-0000-4000-8000-000000000005','disabled@example.test','{"full_name":"Disabled"}');
update public.profiles set role='sales';
update public.profiles set role='admin' where id in ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000004');
update public.profiles set role='disabled' where id='00000000-0000-4000-8000-000000000005';
