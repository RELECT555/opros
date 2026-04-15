-- 003_auth_profiles.sql — профили (OAuth), владельцы опросов, выдача доступа

create table if not exists profiles (
  id                uuid primary key,
  email             text not null,
  display_name      text,
  is_global_admin   boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create unique index if not exists idx_profiles_email_lower
  on profiles (lower(trim(email)));

alter table surveys
  add column if not exists owner_id uuid references profiles(id) on delete set null;

create index if not exists idx_surveys_owner_id on surveys (owner_id);

create table if not exists survey_access (
  survey_id   bigint not null references surveys(id) on delete cascade,
  user_id     uuid not null references profiles(id) on delete cascade,
  granted_by  uuid references profiles(id) on delete set null,
  granted_at  timestamptz not null default now(),
  primary key (survey_id, user_id)
);

create index if not exists idx_survey_access_user_id on survey_access (user_id);
