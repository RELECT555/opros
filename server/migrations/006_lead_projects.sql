-- Проекты для ручных заявок

create table if not exists lead_projects (
  id          bigserial    primary key,
  created_at  timestamptz  not null default now(),
  updated_at  timestamptz  not null default now(),
  name        text         not null,
  description text
);

create or replace function lead_projects_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists tr_lead_projects_updated on lead_projects;
create trigger tr_lead_projects_updated
  before update on lead_projects
  for each row execute procedure lead_projects_set_updated_at();

-- Привязываем заявки к проектам (nullable для обратной совместимости)
alter table manual_leads
  add column if not exists project_id bigint references lead_projects(id) on delete set null;

create index if not exists idx_manual_leads_project_id
  on manual_leads (project_id);
