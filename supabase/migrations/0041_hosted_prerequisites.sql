-- Inserted before 005 without changing an already-applied migration.
-- Its version is after 003 and before 005; it does not depend on 004.
-- Existing installations use `supabase db push --include-all` after reviewing the plan.
-- All statements preserve existing application rows.

create table if not exists public.profiles (
  id uuid primary key,
  email text not null,
  display_name text,
  is_global_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists idx_profiles_email_lower on public.profiles (lower(trim(email)));

alter table public.surveys add column if not exists owner_id uuid references public.profiles(id) on delete set null;
create index if not exists idx_surveys_owner_id on public.surveys (owner_id);

create table if not exists public.survey_access (
  survey_id bigint not null references public.surveys(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  granted_by uuid references public.profiles(id) on delete set null,
  granted_at timestamptz not null default now(),
  primary key (survey_id, user_id)
);
create index if not exists idx_survey_access_user_id on public.survey_access (user_id);

create table if not exists public.lead_projects (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  description text
);
create or replace function public.lead_projects_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists tr_lead_projects_updated on public.lead_projects;
create trigger tr_lead_projects_updated before update on public.lead_projects
for each row execute procedure public.lead_projects_set_updated_at();

create table if not exists public._migrations (
  id serial primary key,
  filename text unique not null,
  applied_at timestamptz not null default now()
);

-- Also close newly created tables when 005 is already marked applied remotely.
alter table public.profiles enable row level security;
alter table public.survey_access enable row level security;
alter table public.lead_projects enable row level security;
alter table public._migrations enable row level security;
revoke all on public.profiles, public.survey_access, public.lead_projects, public._migrations from anon, authenticated;
