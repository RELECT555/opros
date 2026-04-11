-- ============================================================
-- 003_multi_survey.sql
-- Поддержка нескольких опросников
-- ============================================================

-- ── surveys ──────────────────────────────────────────────────
create table if not exists surveys (
  id          bigserial primary key,
  slug        text        unique not null,
  title       text        not null,
  description text,
  config      jsonb       not null default '{}',
  is_active   boolean     not null default true,
  created_at  timestamptz not null default now()
);

-- RLS
alter table surveys enable row level security;

-- Анон может читать все опросники (активные и нет — нужно для админки, которая тоже работает на anon-ключе)
create policy "anon read surveys"
  on surveys for select to anon
  using (true);

-- Анон может обновлять конфиг опросника (нужно для QuestionsTab)
create policy "anon update surveys"
  on surveys for update to anon
  using (true) with check (true);

-- Анон может создавать опросники
create policy "anon insert surveys"
  on surveys for insert to anon
  with check (true);

create policy "service full access"
  on surveys for all to service_role
  using (true) with check (true);

-- ── Вставляем существующий CRM-опросник ──────────────────────
insert into surveys (id, slug, title, description, config)
values (
  1,
  'crm',
  'CRM-консультация',
  'Подберём решение для вашего бизнеса',
  '{
    "welcome_title": "Помогите нам стать лучше для вас",
    "welcome_sub": "Пройдите короткий опрос из 4 вопросов — и мы подберём лучшее CRM-решение для вас.",
    "questions": [
      {
        "id": "crm_purpose",
        "type": "checkbox",
        "title": "Для чего вам нужна CRM?",
        "subtitle": "Выберите всё подходящее",
        "options": ["Управление продажами","Работа с клиентской базой","Автоматизация маркетинга","Поддержка и сервис","Контроль задач и команды","Аналитика и отчёты"]
      },
      {
        "id": "crm_used_before",
        "type": "checkbox",
        "title": "Какими CRM пользовались раньше?",
        "subtitle": "Можно выбрать несколько",
        "options": ["Bitrix24","amoCRM","Salesforce","HubSpot","МойСклад","1С CRM","Pipedrive","Другая","Не использовал(а)"]
      },
      {
        "id": "current_crm",
        "type": "radio",
        "title": "Текущая ситуация",
        "subtitle": "Один вариант",
        "options": ["Да, используем CRM","Нет, работаем без CRM","Выбираем CRM прямо сейчас","Хотим сменить текущую"]
      }
    ]
  }'::jsonb
)
on conflict (id) do nothing;

-- Сбрасываем sequence чтобы следующий id шёл с 2
select setval('surveys_id_seq', (select max(id) from surveys));

-- ── Добавляем survey_id в survey_responses ────────────────────
alter table survey_responses
  add column if not exists survey_id bigint references surveys(id),
  add column if not exists answers   jsonb default '{}';

-- Привязываем существующие ответы к CRM-опроснику
update survey_responses set survey_id = 1 where survey_id is null;

create index if not exists idx_survey_responses_survey_id
  on survey_responses (survey_id);

-- ── Добавляем survey_id в survey_tokens ───────────────────────
alter table survey_tokens
  add column if not exists survey_id bigint references surveys(id);

-- Привязываем существующие токены к CRM-опроснику
update survey_tokens set survey_id = 1 where survey_id is null;

create index if not exists idx_survey_tokens_survey_id
  on survey_tokens (survey_id);
