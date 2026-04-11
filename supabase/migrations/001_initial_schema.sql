-- ============================================================
-- 001_initial_schema.sql
-- Исходная схема базы данных для проекта OPROS
-- ============================================================

-- ── survey_responses ─────────────────────────────────────────
create table if not exists survey_responses (
  id              bigserial primary key,
  created_at      timestamptz not null default now(),

  -- Ответы на вопросы
  crm_purpose     text[]      not null default '{}',
  crm_used_before text[]      not null default '{}',
  current_crm     text        not null default '',

  -- Контакты
  name            text        not null default '',
  phone           text        not null default '',
  email           text,
  comment         text,

  -- Источник
  token           text,

  -- Управление
  status          text        not null default 'new'
                  check (status in ('new', 'called', 'in_progress', 'closed')),
  manager_note    text
);

-- Индекс для сортировки по дате (самый частый запрос)
create index if not exists idx_survey_responses_created_at
  on survey_responses (created_at desc);

-- Индекс для поиска по токену
create index if not exists idx_survey_responses_token
  on survey_responses (token)
  where token is not null;

-- ── survey_tokens ─────────────────────────────────────────────
create table if not exists survey_tokens (
  token       text        primary key,
  email       text        not null,
  created_at  timestamptz not null default now(),
  opened_at   timestamptz,
  used_at     timestamptz
);

-- Индекс для поиска по email
create index if not exists idx_survey_tokens_email
  on survey_tokens (email);

-- ── survey_config ─────────────────────────────────────────────
create table if not exists survey_config (
  id      int         primary key,
  config  jsonb       not null default '{}'
);

-- Вставляем строку конфига по умолчанию (id=1)
insert into survey_config (id, config)
values (1, '{}')
on conflict (id) do nothing;

-- ============================================================
-- Row Level Security
-- ============================================================

-- survey_responses: только аноним может вставлять, читать нельзя
alter table survey_responses enable row level security;

create policy "anon insert only"
  on survey_responses
  for insert
  to anon
  with check (true);

-- Чтение и обновление только через service_role (backend / Edge Functions)
create policy "service full access"
  on survey_responses
  for all
  to service_role
  using (true)
  with check (true);

-- survey_tokens: аноним может читать свой токен и обновлять opened_at
alter table survey_tokens enable row level security;

create policy "anon read token"
  on survey_tokens
  for select
  to anon
  using (true);

create policy "anon update opened_at"
  on survey_tokens
  for update
  to anon
  using (true)
  with check (true);

create policy "service full access"
  on survey_tokens
  for all
  to service_role
  using (true)
  with check (true);

-- survey_config: аноним может только читать
alter table survey_config enable row level security;

create policy "anon read config"
  on survey_config
  for select
  to anon
  using (true);

create policy "service full access"
  on survey_config
  for all
  to service_role
  using (true)
  with check (true);
