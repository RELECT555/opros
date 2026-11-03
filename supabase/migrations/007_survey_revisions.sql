-- Capture the schema actually used for each submission and reject stale editor writes.
alter table surveys add column if not exists revision integer not null default 1;
alter table surveys drop constraint if exists surveys_revision_positive;
alter table surveys add constraint surveys_revision_positive check (revision > 0);

alter table survey_responses
  add column if not exists survey_revision integer,
  add column if not exists config_snapshot jsonb,
  add column if not exists snapshot_source text;

-- Historical schemas cannot be reconstructed. Label this best-effort baseline
-- explicitly, instead of presenting today's config as the original schema.
update survey_responses r
set survey_revision = s.revision,
    config_snapshot = jsonb_strip_nulls(jsonb_build_object(
      'questions', case when jsonb_typeof(s.config->'questions') = 'array'
        then s.config->'questions' else '[]'::jsonb end,
      'contacts_block', case when jsonb_typeof(s.config->'contacts_block') = 'object'
        then s.config->'contacts_block' else null end,
      'legacy_analytics', case when jsonb_typeof(s.config->'legacy_analytics') = 'object'
        then s.config->'legacy_analytics' else null end
    )),
    snapshot_source = 'legacy_backfill'
from surveys s
where r.survey_id = s.id and r.snapshot_source is null;

update survey_responses set snapshot_source = 'unavailable' where snapshot_source is null;
alter table survey_responses alter column snapshot_source set default 'unavailable';
alter table survey_responses alter column snapshot_source set not null;
alter table survey_responses drop constraint if exists survey_responses_snapshot_source_valid;
alter table survey_responses add constraint survey_responses_snapshot_source_valid
  check (snapshot_source in ('submission', 'legacy_backfill', 'unavailable'));
alter table survey_responses drop constraint if exists survey_responses_snapshot_shape;
alter table survey_responses add constraint survey_responses_snapshot_shape
  check (snapshot_source = 'unavailable' or
    (survey_revision > 0 and survey_revision is not null and
     config_snapshot is not null and jsonb_typeof(config_snapshot) = 'object'));

create or replace function preserve_survey_response_snapshot()
returns trigger language plpgsql as $$
begin
  if new.survey_revision is distinct from old.survey_revision
    or new.config_snapshot is distinct from old.config_snapshot
    or new.snapshot_source is distinct from old.snapshot_source then
    raise exception 'Response schema snapshot is immutable';
  end if;
  return new;
end;
$$;

drop trigger if exists tr_preserve_survey_response_snapshot on survey_responses;
create trigger tr_preserve_survey_response_snapshot
  before update on survey_responses
  for each row execute function preserve_survey_response_snapshot();
