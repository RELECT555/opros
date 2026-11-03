# Askly — frontend

React 19 + TypeScript + Vite. Основные сценарии: публичный опрос `/s/:slug`,
редакторы и аналитика `/admin`, лендинг `/`, журнал изменений `/updates`.
Маршрут `/crm` направляет в тот же поток, что `/s/crm`.

## Запуск

Требуются Node.js 22 и npm. Выполните в `survey`:

```sh
npm ci
npm run dev
```

Без `VITE_API_URL` в development API находится на `http://localhost:3001`.
Сервер запускается отдельно. Настройка БД, секретов, Docker и hosted API —
в [`server/MIGRATION.md`](../server/MIGRATION.md).

Локальный `survey/.env` игнорируется Git:

```env
VITE_API_URL=http://localhost:3001
VITE_SUPABASE_URL=https://project.supabase.co
VITE_SUPABASE_ANON_KEY=публичный-ключ-проекта
```

Переменные `VITE_*` входят в сборку и должны содержать только публичные значения.
Пароль администратора, signing secret, service-role key и строка подключения к
БД задаются серверу. Supabase SDK используется для OAuth Google/Microsoft;
разрешите redirect `http://localhost:5173/admin` и production URL в настройках
Supabase Auth. `docs/AUTH_AND_ACCESS.md` описывает модель владельцев и доступа.

## Проверки

```sh
npm run check
```

Команда включает ESLint, TypeScript, тесты и production build. Отдельно доступны
`npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.
Из корня `node scripts/check-architecture.mjs` проверяет локальные зависимости.
GitHub Actions запускает эти проверки и серверную интеграцию с PostgreSQL.
Регрессионные тесты чистых функций не заменяют браузерную проверку и настоящий OAuth.

React Compiler **включён** через `@rolldown/plugin-babel` в `vite.config.ts`,
фильтр ограничен исходниками приложения. Не включайте преобразование зависимостей
без проверки совместимости. Компоненты используют существующие CSS и MUI;
дизайн и архитектурный план описаны в [`DESIGN.md`](../DESIGN.md) и
[`docs/architecture-review.md`](../docs/architecture-review.md).

## Production

Для Docker/nginx или корневого Vercel rewrite оставьте `VITE_API_URL` пустым,
чтобы запросы шли на `/api/*` того же origin. Для отдельного Node API задайте
полный публичный HTTPS URL без суффикса `/api`; на API разрешите URL фронтенда
через `FRONTEND_URL`. Изменение `VITE_*` требует новой сборки.

Корневой `vercel.json` содержит конфигурацию Vercel + Supabase Edge. Файл
`survey/vercel.json` содержит только SPA fallback: при выборе `survey` как
отдельного корня деплоя нужен явный `VITE_API_URL` на ваш API. Не смешивайте
эти два режима. Подробная последовательность — в инструкции сервера выше.

Dev-fixture доступна только при `DEV`, `VITE_ENABLE_UI_FIXTURES=true`, loopback
hostname и специальном slug `__preview_crm`. Она не сохраняет ответы.
