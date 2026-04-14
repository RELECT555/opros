-- 002_multi_survey.sql

create table if not exists surveys (
  id          bigserial primary key,
  slug        text        unique not null,
  title       text        not null,
  description text,
  config      jsonb       not null default '{}',
  is_active   boolean     not null default true,
  created_at  timestamptz not null default now()
);

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

select setval('surveys_id_seq', (select coalesce(max(id), 1) from surveys));

alter table survey_responses
  add column if not exists survey_id bigint references surveys(id),
  add column if not exists answers   jsonb default '{}';

update survey_responses set survey_id = 1 where survey_id is null;

create index if not exists idx_survey_responses_survey_id
  on survey_responses (survey_id);

alter table survey_tokens
  add column if not exists survey_id bigint references surveys(id);

update survey_tokens set survey_id = 1 where survey_id is null;

create index if not exists idx_survey_tokens_survey_id
  on survey_tokens (survey_id);
