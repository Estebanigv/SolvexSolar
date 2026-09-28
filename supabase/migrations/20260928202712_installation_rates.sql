alter table public.workspace_config add column installation jsonb not null default '[]'::jsonb
check(jsonb_typeof(installation) = 'array');
