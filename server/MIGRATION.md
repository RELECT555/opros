# Миграция фронтенда с Supabase на собственный бэкенд

Мультипользовательская авторизация (Google / Microsoft, владельцы опросов, глобальный админ) описана отдельно: [`docs/AUTH_AND_ACCESS.md`](../docs/AUTH_AND_ACCESS.md) — используйте при расширении API, чтобы не расходиться со схемой прав.

## Текущее состояние

Фронтенд использует HTTP API; клиентский пароль и переход на прямые записи в
Supabase при ошибке API удалены. Серверный код используется и локально, и в
Supabase Edge Function `opros-api`. Собственный WebSocket работает только в
локальном/self-hosted режиме и требует администраторскую авторизацию для всех каналов.

## Развёртывание Vercel + Supabase

- `npm run build:edge` в `server` создаёт bundle и import map в
  `supabase/functions/opros-api`. Файлы генерируются из серверного кода и lock-файла.
- Edge entrypoint вызывает `buildApp({ hosted: true })`; HTTP-запросы обрабатывает
  тот же Fastify API. PostgreSQL подключается через встроенный `SUPABASE_DB_URL`.
- Внешняя JWT-проверка gateway для этой функции выключена: собственный middleware
  проверяет admin JWT и Supabase OAuth на каждом административном запросе.
  Публичными остаются только существующие публичные маршруты опросов.
- `supabase/migrations/005_hosted_api_security.sql` закрывает Data API для
  `anon`/`authenticated`. Серверный signing secret и bcrypt-хеш пароля хранятся
  в закрытой схеме `opros_private`, отсутствующей в публичном API.
- Начальный пароль администратора создан при развёртывании и сохранён локально
  в игнорируемом `server/.env.local`. Этот файл не загружается на Vercel и не
  читается браузером. Смена пароля требует обновления bcrypt-хеша сервером.
- Загруженные изображения в hosted-режиме хранятся в Supabase Storage,
  bucket `survey-logos`. SVG не принимается. Локальный режим сохраняет файлы на диск.
- Vercel устанавливает зависимости через `npm ci` в `survey`, собирает frontend
  и проксирует `/api/*` в Edge Function. `VITE_SUPABASE_URL` и
  `VITE_SUPABASE_ANON_KEY` задаются в окружении Vercel для OAuth-клиента.
  В production-сборке `VITE_API_URL` оставляют пустым для same-origin API.
- OAuth Google/Microsoft использует существующие настройки провайдеров Supabase;
  redirect URL нового сайта нужно разрешить отдельно. Проверка входа по паролю
  не доказывает готовность OAuth.

Проверки: `npm test`, `npm run build`, `npm run build:edge` в `server`;
`npx tsc -b`, `npm run build`, `npm run lint` в `survey`.
Полный frontend lint содержит существующие нарушения React hooks и должен
проверяться отдельно от успешной сборки.

---

## Шаг 1. Настройка окружения

### Бэкенд (server/.env)

```env
DATABASE_URL=postgresql://user:pass@host:5432/opros
ADMIN_PASSWORD=надёжный-пароль-минимум-16-символов
JWT_SECRET=случайная-строка-минимум-32-символа
ADMIN_API_KEY=статичный-ключ-для-обратной-совместимости
PORT=3001
FRONTEND_URL=https://your-domain.com
PUBLIC_URL=https://api.your-domain.com

# Опционально
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...
UPLOAD_DIR=./uploads
```

### Фронтенд (survey/.env)

```env
VITE_API_URL=https://api.your-domain.com
VITE_WS_URL=wss://api.your-domain.com/ws
```

---

## Шаг 2. Запуск бэкенда

```bash
cd server
npm install
npm run build
npm start
```

При первом запуске автоматически применятся SQL-миграции из `server/migrations/`.

---

## Шаг 3. Переключение фронтенда (основная работа)

### HTTP API — замена импортов

Во **всех** компонентах сменить импорт с `./supabase` на `./api-client`:

| Файл | Что заменить |
|------|-------------|
| `pages/AdminPage.tsx` | `import { getSurveys, getSurveyById } from '../lib/supabase'` → `from '../lib/api-client'` |
| `pages/SurveyPage.tsx` | `import { getSurveyBySlug, saveSurveyResponseGeneric, markTokenOpened, updateSurveyConfig } from '../lib/supabase'` → `from '../lib/api-client'` |
| `components/admin/AnalyticsTab.tsx` | `import { getResponses, getTokens } from '../lib/supabase'` → `from '../lib/api-client'` |
| `components/admin/SurveysListTab.tsx` | `import { getSurveys, createSurvey, updateSurveyConfig } from '../lib/supabase'` → `from '../lib/api-client'` |
| `components/admin/DesignTab.tsx` | `import { getSurveyById, updateSurveyConfig, uploadSurveyLogo } from '../lib/supabase'` → `from '../lib/api-client'` |
| `components/admin/QuestionsTab.tsx` | `import { getSurveyById, updateSurveyConfig } from '../lib/supabase'` → `from '../lib/api-client'` |
| `components/admin/ResponsesTab.tsx` | `import { getResponsesPaged, getResponses, getTokens, updateResponseStatus, updateManagerNote, PAGE_SIZE } from '../lib/supabase'` → `from '../lib/api-client'` |
| `components/admin/TokensTab.tsx` | `import { getTokens, createTokens, deleteToken, regenerateToken } from '../lib/supabase'` → `from '../lib/api-client'` |
| `components/admin/SettingsTab.tsx` | `import { setGlobalTheme, getGlobalTheme } from '../lib/supabase'` → `from '../lib/api-client'` |
| `lib/surveyConfig.ts` | `import { getConfig, setConfig } from './supabase'` → `from './api-client'` |

**Типы** реэкспортируются из `api-client.ts` — компонентам, которые импортируют только типы (`SurveyQuestion`, `SurveyDesign`, `QuestionMedia` и т.д.), менять ничего не нужно.

### Аутентификация админки

Сейчас админка не имеет экрана логина (Supabase anon key).
При переходе на бэкенд нужно добавить экран ввода пароля:

```tsx
import { login, checkAuth, logout } from '../lib/api-client'

// При загрузке:
const isAuth = await checkAuth()
if (!isAuth) {
  // показать форму логина
}

// При отправке формы:
await login(password)  // сохраняет JWT в localStorage

// Выход:
logout()
```

### WebSocket — real-time обновления

```tsx
import { wsClient } from '../lib/ws-client'

// В корне AdminPage (useEffect):
useEffect(() => {
  wsClient.connect()
  // Аутентификация происходит автоматически через localStorage

  const off1 = wsClient.on('response:new', (data) => {
    // новая заявка — обновить список
    console.log('Новая заявка:', data.name, data.phone)
  })

  const off2 = wsClient.on('survey:updated', (data) => {
    // опрос обновлён — обновить UI
  })

  return () => { off1(); off2(); wsClient.disconnect() }
}, [])
```

---

## Шаг 4. Удаление Supabase

После проверки работоспособности:

```bash
cd survey
npm uninstall @supabase/supabase-js
```

Удалить:
- `survey/src/lib/supabase.ts` (после переноса типов в отдельный файл или проверки что все типы реэкспортированы)
- Переменные `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SUPABASE_LOGO_BUCKET` из `.env`

---

## Соответствие API

| Supabase-функция | Бэкенд-эндпоинт | Метод |
|-----------------|-----------------|-------|
| `getSurveys()` | `/api/admin/surveys` | GET |
| `getSurveyBySlug(slug)` | `/api/surveys/:slug` | GET |
| `getSurveyById(id)` | `/api/admin/surveys/:id` | GET |
| `createSurvey(input)` | `/api/admin/surveys` | POST |
| `updateSurveyConfig(id, config)` | `/api/admin/surveys/:id/config` | PUT |
| `updateSurveyMeta(id, meta)` | `/api/admin/surveys/:id` | PUT |
| `deleteSurvey(id)` | `/api/admin/surveys/:id` | DELETE |
| `uploadSurveyLogo(id, file)` | `/api/admin/uploads/logo?survey_id=:id` | POST multipart |
| `getResponsesPaged(page, size, surveyId, status)` | `/api/admin/responses?page=&survey_id=&status=` | GET |
| `getResponses(surveyId)` | `/api/admin/responses/export?survey_id=` | GET |
| `updateResponseStatus(id, status)` | `/api/admin/responses/:id/status` | PATCH |
| `updateManagerNote(id, note)` | `/api/admin/responses/:id/note` | PATCH |
| `saveSurveyResponse(data)` | `/api/responses` | POST |
| `saveSurveyResponseGeneric(data)` | `/api/responses` | POST |
| `getTokens(surveyId)` | `/api/admin/tokens?survey_id=` | GET |
| `createTokens(emails, surveyId)` | `/api/admin/tokens` | POST |
| `deleteToken(token)` | `/api/admin/tokens/:token` | DELETE |
| `regenerateToken(old, email, surveyId)` | `/api/admin/tokens/:token/regenerate` | POST |
| `resolveToken(token)` | `/api/tokens/:token` | GET |
| `markTokenOpened(token)` | `/api/tokens/:token/opened` | PATCH |
| `getConfig()` | `/api/config/1` | GET |
| `setConfig(config)` | `/api/admin/config/1` | PUT |
| `getGlobalTheme()` | `/api/admin/theme` | GET |
| `setGlobalTheme(theme)` | `/api/admin/theme` | PUT |

## WebSocket-события

| Событие | Канал | Данные | Когда |
|---------|-------|--------|-------|
| `response:new` | `admin`, `survey:<id>` | `{ id, survey_id, name, phone, created_at }` | Новая заявка |
| `response:status` | `admin` | `{ id, status }` | Смена статуса |
| `survey:updated` | `admin` | `{ id, slug, title }` | Обновление опроса |
| `survey:created` | `admin` | `{ id, slug, title }` | Создание опроса |

## Безопасность бэкенда

- Helmet — security headers
- Rate limiting — глобальный (100/min) + per-route (login 5/min, responses 10/min)
- JSON Schema — валидация на всех роутах
- JWT + timingSafeEqual — аутентификация
- HMAC-SHA256 — верификация JWT в WebSocket
- Path traversal защита — uploads
- Markdown injection защита — Telegram
- Graceful shutdown — SIGTERM/SIGINT
- Error handler — стектрейсы не утекают клиенту
