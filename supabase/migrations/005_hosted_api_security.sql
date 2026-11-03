-- All application data is served by the authenticated API, not the Data API.
-- No application rows are deleted by this migration.
alter table public.survey_responses add column if not exists manager_note text;

do $$
declare target text; policy record;
begin
  foreach target in array array['surveys','survey_responses','survey_tokens','survey_config',
    'profiles','survey_access','manual_leads','lead_projects','_migrations']
  loop
    execute format('alter table public.%I enable row level security', target);
    execute format('revoke all on table public.%I from anon, authenticated', target);
    for policy in select policyname from pg_policies where schemaname='public' and tablename=target
    loop
      execute format('drop policy %I on public.%I', policy.policyname, target);
    end loop;
  end loop;
end; $$;

create schema if not exists opros_private;
revoke all on schema opros_private from public, anon, authenticated;
create table if not exists opros_private.settings (key text primary key, value text not null);
create table if not exists opros_private.login_attempts (
  key text primary key,
  window_start timestamptz not null,
  attempts int not null
);
revoke all on all tables in schema opros_private from public, anon, authenticated;

-- A signing secret never appears in the browser, source tree, or API response.
insert into opros_private.settings(key, value)
values ('jwt_secret', encode(extensions.gen_random_bytes(48), 'hex'))
on conflict (key) do nothing;

create or replace function opros_private.verify_admin_login(password text, client_ip text)
returns boolean language plpgsql set search_path = '' as $$
declare counter int; scope text; stored_hash text;
begin
  delete from opros_private.login_attempts where window_start < now() - interval '1 day';
  foreach scope in array array['all', encode(extensions.digest(client_ip, 'sha256'), 'hex')]
  loop
    insert into opros_private.login_attempts(key, window_start, attempts)
    values(scope, now(), 1)
    on conflict (key) do update set
      attempts = case when login_attempts.window_start < now() - interval '1 minute'
        then 1 else login_attempts.attempts + 1 end,
      window_start = case when login_attempts.window_start < now() - interval '1 minute'
        then now() else login_attempts.window_start end
    returning attempts into counter;
    if counter > (case when scope='all' then 30 else 5 end) then return false; end if;
  end loop;
  select value into stored_hash from opros_private.settings where key='admin_password_hash';
  return coalesce(stored_hash = extensions.crypt(password, stored_hash), false);
end; $$;
revoke all on function opros_private.verify_admin_login(text,text) from public, anon, authenticated;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('survey-logos','survey-logos',true,2097152,
  array['image/png','image/jpeg','image/webp','image/gif'])
on conflict(id) do update set file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;
