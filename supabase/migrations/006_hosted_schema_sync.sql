-- Complete the hosted schema after 004 creates manual_leads.
alter table public.manual_leads
  add column if not exists project_id bigint references public.lead_projects(id) on delete set null;
create index if not exists idx_manual_leads_project_id on public.manual_leads (project_id);

alter table public.survey_responses drop constraint if exists survey_responses_survey_id_fkey;
alter table public.survey_responses add constraint survey_responses_survey_id_fkey
  foreign key (survey_id) references public.surveys(id) on delete cascade;
alter table public.survey_tokens drop constraint if exists survey_tokens_survey_id_fkey;
alter table public.survey_tokens add constraint survey_tokens_survey_id_fkey
  foreign key (survey_id) references public.surveys(id) on delete cascade;
