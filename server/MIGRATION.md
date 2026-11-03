# Запуск и проверка Askly

Приложение использует HTTP API во всех основных сценариях. Один Fastify API
работает как Node.js сервер или как Supabase Edge Function `opros-api`.
Supabase Auth остаётся OAuth-провайдером Google/Microsoft. Клиентский SDK нужен
для OAuth, поэтому удалять `@supabase/supabase-js` при использовании этого входа
нельзя. Модель прав: [`docs/AUTH_AND_ACCESS.md`](../docs/AUTH_AND_ACCESS.md).

## Локальная разработка

Требуются Node.js 22, npm и PostgreSQL 16. Зависимости фронтенда и сервера
устанавливаются отдельно через `npm ci` в `survey` и `server`.

`server/.env` (игнорируется Git):

```env
DATABASE_URL=postgresql://user:password@localhost:5432/opros
ADMIN_PASSWORD=отдельный-длинный-пароль
JWT_SECRET=случайный-секрет-минимум-32-символа
FRONTEND_URL=http://localhost:5173
PORT=3001
# При OAuth: тот же проект Supabase, что у фронтенда
SUPABASE_URL=https://project.supabase.co
SUPABASE_ANON_KEY=публичный-ключ-проекта
# Альтернатива проверке через Auth API — HS256-секрет проекта
SUPABASE_JWT_SECRET=
GLOBAL_ADMIN_EMAILS=
# Только адреса доверенных reverse proxy; по умолчанию доверие выключено
TRUST_PROXY=
# Необязательно: абсолютный публичный адрес загрузок
PUBLIC_URL=
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
UPLOAD_DIR=./uploads
```

`survey/.env` (игнорируется Git):

```env
VITE_API_URL=http://localhost:3001
VITE_SUPABASE_URL=https://project.supabase.co
VITE_SUPABASE_ANON_KEY=публичный-ключ-проекта
```

В двух терминалах запустите `npm run dev` из `server` и `survey`.
При старте Node API применяет `server/migrations` под advisory lock. История
читается после блокировки; два API не применяют одну миграцию одновременно.
Каждый SQL-файл и запись его имени коммитятся одной транзакцией. Ошибка или
отсутствие каталога миграций останавливают запуск; уже применённые файлы не
редактируются. В `dist` каталог миграций берётся из `server/migrations`, а в
Docker он копируется в финальный образ.

Админка `/admin` поддерживает пароль администратора и OAuth. Для Google/Azure
в Supabase включите провайдеры, разрешите redirect на URL `/admin` и настройте
OAuth-приложения у провайдеров. Тест пароля не подтверждает исправность OAuth.

## Self-hosting через Docker Compose

1. Скопируйте корневой `.env.example` в `.env` и заполните **все три секрета**:
   `POSTGRES_PASSWORD`, `ADMIN_PASSWORD`, `JWT_SECRET`. Для DB password используйте
   случайный hex/base64url, чтобы он безопасно входил в URL подключения.
2. Соберите frontend в `survey/dist`. Для same-origin API за nginx оставьте
   `VITE_API_URL` пустым в окружении production-сборки. Если нужен OAuth, задайте
   `VITE_SUPABASE_URL` и `VITE_SUPABASE_ANON_KEY` при сборке.
3. Проверьте `docker compose config --quiet`, затем запустите
   `docker compose up -d --build`.

PostgreSQL доступен только внутри сети Compose: порт 5432 на хост не
публикуется, резервного пароля нет. API слушает хостовый `127.0.0.1:3001`;
публичные запросы принимает nginx на порту 80. HTTPS на внешнем reverse proxy
настраивается отдельно. Для CORS задайте реальный `FRONTEND_URL`.

nginx имеет адрес `172.30.44.10`, который указан как единственный доверенный
proxy в окружении API. При изменении подсети измените оба значения. nginx
перезаписывает `X-Forwarded-For`, а не доверяет присланному клиентом заголовку.
Загрузки живут в `uploads_data` и доступны по `/uploads/` через nginx.
Существующий `postgres_data` не удаляйте: изменение конфигурации не сбрасывает БД.

## Vercel + Supabase Edge

1. Установите зависимости сервера и выполните `npm run build:edge` в `server`.
   Bundle и import map создаются в `supabase/functions/opros-api` и игнорируются
   Git. Используются версии из серверного lock-файла.
2. Примените цепочку `supabase/migrations` к нужному Supabase-проекту, проверив
   целевой проект и план миграций. Эта цепочка самостоятельна: предварительно
   применять `server/migrations` к hosted БД не требуется.
3. Разверните `opros-api`. Gateway-проверка JWT должна быть выключена только
   для этой функции: административные маршруты проверяют парольный JWT или
   Supabase OAuth собственным middleware; публичные маршруты опроса доступны
   без Bearer. Node API на hosted БД отдельно не запускается.
4. Edge получает `SUPABASE_DB_URL`; signing secret хранится в
   `opros_private.settings`. Административный пароль задаётся сервером как bcrypt
   hash `admin_password_hash` в той же закрытой таблице. Секреты и пароль не
   передаются в Vercel и не пишутся в tracked-файлы. Провайдеры OAuth используют
   существующие настройки Supabase Auth.
5. Корневой `vercel.json` проксирует `/api/*` в Edge Function. Для этого режима
   `VITE_API_URL` оставляют пустым. Задайте публичные OAuth-переменные `VITE_*`
   при сборке и разрешите redirect нового сайта в Supabase.

### Совместимость старой истории hosted-миграций

Существующие SQL `001`–`005` сохранены. Новый
`0041_hosted_prerequisites.sql` добавлен перед `005`: он создаёт недостающие
`profiles`, `survey_access`, `lead_projects`, `_migrations`, на которые ссылается
security-миграция. Версия `0041` расположена после `003` и до `005`; prerequisite
не зависит от порядка относительно `004`. `006` добавляет связь ручных
заявок с проектами и синхронизирует FK. Новые таблицы сразу закрыты от Data API,
в том числе если `005` уже применялась раньше.

Для существующего проекта с историей до `005` сначала проверьте
`supabase migration list` и `supabase db push --include-all --dry-run`.
После просмотра плана `supabase db push --include-all` разрешает вставленный
более ранний prerequisite. Не отмечайте старые миграции как неприменённые и не
сбрасывайте БД: новые SQL используют `if not exists` и сохраняют строки.
На новых проектах выполняется вся локальная цепочка.
Подробнее о [миграциях Supabase](https://supabase.com/docs/guides/deployment/database-migrations).

## Проверки и CI

```sh
# В survey
npm run check
# В server
npm run check
# Из корня (после npm ci в survey)
node scripts/check-architecture.mjs
```

`.github/workflows/checks.yml` запускает frontend/backend checks, архитектуру
и интеграцию с PostgreSQL 16 на pull request и push в `main`. Для запрета merge
с красными проверками включите required status checks `frontend` и `backend`
в правилах защищённой ветки GitHub; локальный workflow сам не меняет эти настройки.

### Интеграция с настоящим PostgreSQL

Из `server` задайте `TEST_DATABASE_URL` на **отдельный локальный тестовый кластер**
с базой `askly_test` или `askly_test_*`, затем выполните `npm run test:integration`.
Например, CI использует `postgresql://postgres:ci-test-only@127.0.0.1:5432/askly_test`.

Скрипт никогда не подставляет обычный `DATABASE_URL` и не читает `.env` для выбора
тестового адреса. Принимаются только loopback и тестовое имя БД без URL-параметров.
Он создаёт случайные БД, запускает реальные миграции, проверяет параллельный старт,
rollback, одновременное погашение приглашения, конфликт ревизий, неизменность истории
и SQL-правила владельца/выданного доступа. Затем удаляет **только созданные им БД**.
Пользователь тестовой БД должен иметь `CREATEDB`.

Для SQL-проверки hosted-цепочки нужны роли `anon`, `authenticated`, `service_role`.
На одноразовом тестовом кластере разрешите их создание через
`TEST_ALLOW_ROLE_SETUP=true` (в CI уже включено). Эти роли кластерные и намеренно
не удаляются скриптом; не используйте такой режим на рабочем кластере.
Fixture создаёт минимальные managed-схемы и pgcrypto: это проверка нашего SQL,
а не тест настоящего Supabase gateway, Storage, провайдеров OAuth или Edge lifecycle.

## Обновления интерфейса

Ответы и аналитика перечитываются по HTTP каждые 15 секунд в видимой вкладке и
при возвращении фокуса; это работает с OAuth и Edge. Реализация WebSocket есть
для Node/self-hosted, но текущая админка не зависит от неё.
