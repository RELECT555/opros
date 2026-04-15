-- При удалении опросника удаляются связанные ответы и токены (полное удаление).

alter table survey_responses  drop constraint if exists survey_responses_survey_id_fkey;

alter table survey_responses
  add constraint survey_responses_survey_id_fkey
  foreign key (survey_id) references surveys (id) on delete cascade;

alter table survey_tokens
  drop constraint if exists survey_tokens_survey_id_fkey;

alter table survey_tokens
  add constraint survey_tokens_survey_id_fkey
  foreign key (survey_id) references surveys (id) on delete cascade;
