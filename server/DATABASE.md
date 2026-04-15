# База данных — PostgreSQL

## Быстрый старт

### 1. Установка PostgreSQL

```bash
# macOS
brew install postgresql@16
brew services start postgresql@16

# Ubuntu/Debian
sudo apt install postgresql-16
sudo systemctl start postgresql

# Docker (рекомендуется для разработки)
docker run -d \
  --name opros-db \
  -e POSTGRES_USER=opros \
  -e POSTGRES_PASSWORD=opros \
  -e POSTGRES_DB=opros \
  -p 5432:5432 \
  -v opros-pgdata:/var/lib/postgresql/data \
  postgres:16-alpine
```

### 2. Создание базы

```bash
# Если не Docker:
createdb opros
# или через psql:
psql -c "CREATE DATABASE opros"
```

### 3. Настройка подключения

В `server/.env`:

```env
DATABASE_URL=postgresql://opros:opros@localhost:5432/opros
```

### 4. Миграции применятся автоматически

```bash
cd server
npm run dev   # или npm start
```

При запуске сервер автоматически:
1. Создаст таблицу `_migrations` (если её нет)
2. Прочитает SQL-файлы из `server/migrations/` в алфавитном порядке
3. Применит те, что ещё не были применены (каждый в транзакции)

---

## Схема базы данных

### Диаграмма связей

```
┌─────────────────────┐
│      surveys        │
│─────────────────────│
│ id          bigserial│ ◄─────────┐
│ slug        text     │ unique    │
│ title       text     │           │
│ description text     │           │
│ config      jsonb    │           │
│ is_active   boolean  │           │
│ created_at  tstz     │           │
└─────────────────────┘           │
                                   │ FK: survey_id
┌──────────────────────┐          │
│  survey_responses    │          │
│──────────────────────│          │
│ id           bigserial│          │
│ created_at   tstz    │          │
│ survey_id    bigint ─┼──────────┘
│ answers      jsonb   │          │
│ crm_purpose  text[]  │          │
│ crm_used_before text[]│         │
│ current_crm  text    │          │
│ name         text    │          │
│ phone        text    │          │
│ email        text    │          │
│ comment      text    │          │
│ token        text    │          │
│ status       text    │ CHECK    │
│ manager_note text    │          │
└──────────────────────┘          │
                                   │
┌──────────────────────┐          │
│   survey_tokens      │          │
│──────────────────────│          │
│ token      text (PK) │          │
│ email      text      │          │
│ survey_id  bigint  ──┼──────────┘
│ created_at tstz      │
│ opened_at  tstz      │
│ used_at    tstz      │
└──────────────────────┘

┌──────────────────────┐
│   survey_config      │
│──────────────────────│
│ id     int (PK)      │  id=1: legacy CRM-конфиг
│ config jsonb         │  id=2: глобальная тема админки
└──────────────────────┘

┌──────────────────────┐
│    _migrations       │  (служебная)
│──────────────────────│
│ id         serial    │
│ filename   text      │  unique
│ applied_at tstz      │
└──────────────────────┘
```

### Авторизация и владельцы опросов (план)

В текущих миграциях у `surveys` **нет** поля владельца; админка закрыта отдельным JWT (см. `survey/src/lib/adminSession.ts` и `server`-авторизацию). Целевая модель: OAuth (Google + Microsoft через Azure), изоляция опросов по владельцу, выдача доступа глобальным админом, опционально RLS в Supabase.

**Подробно и чеклист при переносе бэкенда:** [`docs/AUTH_AND_ACCESS.md`](../docs/AUTH_AND_ACCESS.md).

После миграции **`003_auth_profiles.sql`** добавлены `profiles`, `survey_access`, у `surveys` есть **`owner_id`** (uuid, nullable для старых строк).

---

## Таблицы подробно

### `surveys` — опросники

| Колонка | Тип | Ограничения | Описание |
|---------|-----|-------------|----------|
| `id` | `bigserial` | PK | Уникальный ID |
| `slug` | `text` | UNIQUE, NOT NULL | URL-идентификатор (`/survey/crm`) |
| `title` | `text` | NOT NULL | Название для админки |
| `description` | `text` | — | Краткое описание |
| `config` | `jsonb` | NOT NULL, default `'{}'` | Вопросы, дизайн, настройки (см. структуру ниже) |
| `is_active` | `boolean` | NOT NULL, default `true` | Виден ли на публичной странице |
| `owner_id` | `uuid` | FK → `profiles(id)`, nullable | Владелец (OAuth); `NULL` — наследие / создано пароль-админом |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | Дата создания |

**Структура `config` (jsonb):**

```jsonc
{
  "welcome_title": "Заголовок",
  "welcome_sub": "Подзаголовок",
  "sticker": "📋",              // emoji для карточки в админке
  "questions": [
    {
      "id": "q1",
      "type": "checkbox",       // checkbox | radio | text | scale
      "title": "Вопрос?",
      "subtitle": "Подсказка",
      "options": ["Вариант 1", "Вариант 2"],
      "hasOther": false,
      "scaleMin": 1,            // для type=scale
      "scaleMax": 10,
      "optionsLayout": "grid",  // grid | list
      "media": {                // медиа к вопросу
        "kind": "image",        // image | video | embed
        "url": "https://...",
        "alt": "Описание"
      }
    }
  ],
  "design": {
    "accent": "#6366f1",
    "accent2": "#8b5cf6",
    "bg": "#0f172a",
    "orb1": "#6366f1",
    "orb2": "#8b5cf6",
    "text": "#ffffff",
    "text2": "#94a3b8",
    "logo_url": "https://...",
    "btn_label": "Далее",
    "preset": "default",
    "welcome_badge": "Бейдж",
    "welcome_hint_1": "Подсказка 1",
    "welcome_hint_2": "Подсказка 2",
    "type_scale": "normal",     // compact | normal | large
    "cta_style": "gradient",    // gradient | solid | outline
    "radius": "md",             // sm | md | lg
    "orb_intensity": "medium"   // off | low | medium | high
  },
  "legacy_analytics": {         // для CRM-опроса, подписи в графиках
    "purpose_title": "Цели",
    "used_before_title": "Прошлый опыт",
    "current_title": "Текущая ситуация",
    "current_value_labels": { "Да, используем CRM": "Используют CRM" }
  }
}
```

---

### `survey_responses` — ответы на опросы

| Колонка | Тип | Ограничения | Описание |
|---------|-----|-------------|----------|
| `id` | `bigserial` | PK | |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | Когда отправлен |
| `survey_id` | `bigint` | FK → `surveys(id)` | К какому опросу |
| `answers` | `jsonb` | default `'{}'` | Ответы: `{ "q1": "вариант", "q2": ["а", "б"] }` |
| `crm_purpose` | `text[]` | NOT NULL, default `'{}'` | Legacy: цели CRM |
| `crm_used_before` | `text[]` | NOT NULL, default `'{}'` | Legacy: прошлый опыт |
| `current_crm` | `text` | NOT NULL, default `''` | Legacy: текущая CRM |
| `name` | `text` | NOT NULL, default `''` | Имя респондента |
| `phone` | `text` | NOT NULL, default `''` | Телефон |
| `email` | `text` | — | Email (необязательно) |
| `comment` | `text` | — | Комментарий |
| `token` | `text` | — | Токен персонального приглашения |
| `status` | `text` | NOT NULL, default `'new'`, CHECK | `new` / `called` / `in_progress` / `closed` |
| `manager_note` | `text` | — | Заметка менеджера |

**Индексы:**
- `idx_survey_responses_created_at` — `(created_at DESC)` — сортировка в списке
- `idx_survey_responses_token` — `(token) WHERE token IS NOT NULL` — поиск по токену
- `idx_survey_responses_survey_id` — `(survey_id)` — фильтрация по опросу

---

### `survey_tokens` — персональные приглашения

| Колонка | Тип | Ограничения | Описание |
|---------|-----|-------------|----------|
| `token` | `text` | PK | Hex-строка 32 символа |
| `email` | `text` | NOT NULL | Email получателя |
| `survey_id` | `bigint` | FK → `surveys(id)` | К какому опросу привязан |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | Когда создан |
| `opened_at` | `timestamptz` | — | Когда ссылка открыта |
| `used_at` | `timestamptz` | — | Когда отправлен ответ |

**Жизненный цикл токена:**
1. Админ создаёт токен → `created_at` заполняется
2. Получатель переходит по ссылке `?t=<token>` → `opened_at` заполняется (один раз)
3. Получатель отправляет ответ → `used_at` заполняется

**Индексы:**
- `idx_survey_tokens_email` — `(email)` — поиск по email
- `idx_survey_tokens_survey_id` — `(survey_id)` — фильтрация по опросу

---

### `survey_config` — key-value конфиг

| Колонка | Тип | Ограничения | Описание |
|---------|-----|-------------|----------|
| `id` | `int` | PK | Фиксированный ID |
| `config` | `jsonb` | NOT NULL, default `'{}'` | Произвольный JSON |

**Зарезервированные ID:**
- `1` — Legacy CRM-конфиг (вопросы старого опроса)
- `2` — Глобальная тема админки

---

### `_migrations` — служебная таблица

| Колонка | Тип | Ограничения | Описание |
|---------|-----|-------------|----------|
| `id` | `serial` | PK | Порядковый номер |
| `filename` | `text` | UNIQUE, NOT NULL | Имя SQL-файла |
| `applied_at` | `timestamptz` | NOT NULL, default `now()` | Когда применена |

---

## Все SQL-запросы бэкенда

### surveys

| Операция | SQL | Где |
|----------|-----|-----|
| Список активных | `SELECT ... FROM surveys WHERE is_active = true ORDER BY created_at ASC` | `GET /api/surveys` |
| Все для админки | `SELECT ... FROM surveys ORDER BY created_at ASC` | `GET /api/admin/surveys` |
| Один по ID | `SELECT ... FROM surveys WHERE id = $1` | `GET /api/admin/surveys/:id` |
| Один по slug | `SELECT ... FROM surveys WHERE slug = $1 AND is_active = true` | `GET /api/surveys/:slug` |
| Создать | `INSERT INTO surveys (slug, title, description, config) VALUES (...) RETURNING *` | `POST /api/admin/surveys` |
| Обновить config | `UPDATE surveys SET config = $1 WHERE id = $2 RETURNING *` | `PUT /api/admin/surveys/:id/config` |
| Обновить мета | `UPDATE surveys SET title = COALESCE($1, title), ... WHERE id = $4 RETURNING *` | `PUT /api/admin/surveys/:id` |
| Удалить | `DELETE FROM surveys WHERE id = $1` | `DELETE /api/admin/surveys/:id` |

### survey_responses

| Операция | SQL | Где |
|----------|-----|-----|
| Создать ответ | `INSERT INTO survey_responses (...) VALUES (...) RETURNING *` | `POST /api/responses` |
| Список с пагинацией | `SELECT *, count(*) ... ORDER BY created_at DESC LIMIT $n OFFSET $m` | `GET /api/admin/responses` |
| Экспорт всех | `SELECT * FROM survey_responses [WHERE survey_id=$1] ORDER BY created_at DESC` | `GET /api/admin/responses/export` |
| Сменить статус | `UPDATE survey_responses SET status = $1 WHERE id = $2 RETURNING *` | `PATCH /api/admin/responses/:id/status` |
| Заметка менеджера | `UPDATE survey_responses SET manager_note = $1 WHERE id = $2 RETURNING *` | `PATCH /api/admin/responses/:id/note` |

### survey_tokens

| Операция | SQL | Где |
|----------|-----|-----|
| Список | `SELECT * FROM survey_tokens [WHERE survey_id=$1] ORDER BY created_at DESC` | `GET /api/admin/tokens` |
| Массовое создание | `INSERT INTO survey_tokens (token, email, survey_id) VALUES ... RETURNING *` | `POST /api/admin/tokens` |
| Получить по токену | `SELECT email, survey_id FROM survey_tokens WHERE token = $1` | `GET /api/tokens/:token` |
| Пометить открытым | `UPDATE survey_tokens SET opened_at = now() WHERE token = $1 AND opened_at IS NULL` | `PATCH /api/tokens/:token/opened` |
| Пометить использованным | `UPDATE survey_tokens SET used_at = now() WHERE token = $1` | `POST /api/responses` (внутри) |
| Удалить | `DELETE FROM survey_tokens WHERE token = $1` | `DELETE /api/admin/tokens/:token` |
| Перегенерировать | `BEGIN → SELECT → DELETE → INSERT → COMMIT` (транзакция) | `POST /api/admin/tokens/:token/regenerate` |

### survey_config

| Операция | SQL | Где |
|----------|-----|-----|
| Получить | `SELECT config FROM survey_config WHERE id = $1` | `GET /api/config/:id` |
| Upsert | `INSERT ... ON CONFLICT (id) DO UPDATE SET config = excluded.config RETURNING *` | `PUT /api/admin/config/:id` |
| Тема (get) | `SELECT config FROM survey_config WHERE id = 2` | `GET /api/admin/theme` |
| Тема (set) | `INSERT ... ON CONFLICT ... RETURNING *` | `PUT /api/admin/theme` |

---

## Подключение к БД

### Connection pool (server/src/db/client.ts)

```
Драйвер:     pg (node-postgres)
Пул:         max 10 соединений
Idle timeout: 30 секунд
```

### DATABASE_URL форматы

```
# Локальная без пароля:
postgresql://localhost:5432/opros

# С пользователем:
postgresql://opros:password@localhost:5432/opros

# Удалённый сервер:
postgresql://opros:password@db.example.com:5432/opros?sslmode=require

# Supabase (если нужно подключить к существующей):
postgresql://postgres.xxx:password@aws-0-eu-central-1.pooler.supabase.com:6543/postgres

# Docker Compose:
postgresql://opros:opros@db:5432/opros
```

---

## Миграции

### Структура файлов

```
server/migrations/
├── 001_initial_schema.sql    — базовые таблицы
├── 002_multi_survey.sql      — таблица surveys + связи
└── 003_*.sql                 — следующая миграция (создавать вручную)
```

### Как добавить новую миграцию

1. Создать файл `server/migrations/003_описание.sql`
2. Перезапустить сервер — миграция применится автоматически

### Правила

- Имя файла определяет порядок (алфавитная сортировка)
- Каждый файл выполняется в транзакции
- Если миграция упала — откат, сервер не стартует
- Применённые миграции записываются в `_migrations` и не выполняются повторно
- Используйте `IF NOT EXISTS` / `IF EXISTS` для идемпотентности

### Пример новой миграции

```sql
-- 003_add_response_source.sql

ALTER TABLE survey_responses
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'web';

CREATE INDEX IF NOT EXISTS idx_survey_responses_source
  ON survey_responses (source);
```

---

## Бэкап и восстановление

```bash
# Бэкап
pg_dump -Fc opros > opros_backup.dump

# Восстановление
pg_restore -d opros opros_backup.dump

# Только данные (без схемы)
pg_dump --data-only opros > data.sql

# Docker
docker exec opros-db pg_dump -U opros opros > backup.sql
docker exec -i opros-db psql -U opros opros < backup.sql
```

---

## Docker Compose (пример для продакшена)

```yaml
version: '3.8'

services:
  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: opros
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: opros
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U opros"]
      interval: 10s
      timeout: 5s
      retries: 5

  api:
    build: ./server
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy
    environment:
      DATABASE_URL: postgresql://opros:${DB_PASSWORD}@db:5432/opros
      ADMIN_PASSWORD: ${ADMIN_PASSWORD}
      JWT_SECRET: ${JWT_SECRET}
      PORT: 3001
      FRONTEND_URL: ${FRONTEND_URL}
      PUBLIC_URL: ${PUBLIC_URL}
    ports:
      - "3001:3001"
    volumes:
      - uploads:/app/uploads

volumes:
  pgdata:
  uploads:
```

---

## Полезные psql-команды

```sql
-- Подключение
psql -d opros

-- Посмотреть таблицы
\dt

-- Схема конкретной таблицы
\d+ surveys

-- Сколько ответов
SELECT count(*) FROM survey_responses;

-- Ответы по опросам
SELECT s.title, count(r.id)
FROM surveys s
LEFT JOIN survey_responses r ON r.survey_id = s.id
GROUP BY s.id ORDER BY s.id;

-- Статистика по статусам
SELECT status, count(*) FROM survey_responses GROUP BY status;

-- Токены без ответов (не использованные)
SELECT token, email FROM survey_tokens WHERE used_at IS NULL;

-- Проверить миграции
SELECT * FROM _migrations ORDER BY id;
```
