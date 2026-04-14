-- 001_initial_schema.sql

create table if not exists survey_responses (
  id              bigserial primary key,
  created_at      timestamptz not null default now(),
  crm_purpose     text[]      not null default '{}',
  crm_used_before text[]      not null default '{}',
  current_crm     text        not null default '',
  name            text        not null default '',
  phone           text        not null default '',
  email           text,
  comment         text,
  token           text,
  status          text        not null default 'new'
                  check (status in ('new', 'called', 'in_progress', 'closed')),
  manager_note    text
);

create index if not exists idx_survey_responses_created_at
  on survey_responses (created_at desc);

create index if not exists idx_survey_responses_token
  on survey_responses (token)
  where token is not null;

create table if not exists survey_tokens (
  token       text        primary key,
  email       text        not null,
  created_at  timestamptz not null default now(),
  opened_at   timestamptz,
  used_at     timestamptz
);

create index if not exists idx_survey_tokens_email
  on survey_tokens (email);

create table if not exists survey_config (
  id      int         primary key,
  config  jsonb       not null default '{}'
);

insert into survey_config (id, config)
values (1, '{}')
on conflict (id) do nothing;
