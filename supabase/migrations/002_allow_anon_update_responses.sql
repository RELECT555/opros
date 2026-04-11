-- ============================================================
-- 002_allow_anon_update_responses.sql
-- Разрешаем анонимному ключу обновлять статус и заметку менеджера
-- (AdminPage использует anon key, не service_role)
-- ============================================================

create policy "anon update response fields"
  on survey_responses
  for update
  to anon
  using (true)
  with check (true);
