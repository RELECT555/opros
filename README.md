# Askly

React/Vite survey frontend (`survey`) and Fastify HTTP API (`server`). The same
API implementation can run in Node.js or as the `opros-api` Supabase Edge Function.

## Development and checks

Use Node.js 22. Install both applications from the repository root:

```sh
npm run bootstrap
npm run check
```

`check` runs frontend lint, TypeScript, tests and production build; backend
TypeScript, tests and Edge bundle; then the architecture boundary/cycle check.
It does not contact a configured application database.

Configure the ignored `server/.env` and `survey/.env` as described in
[server/MIGRATION.md](server/MIGRATION.md), then run `npm run dev` in each app.

The integration suite is separately opt-in and requires a disposable local
PostgreSQL instance. Set `TEST_DATABASE_URL` to a database named `askly_test` or
`askly_test_*`, then run `npm run test:integration`. It creates and drops its own
random test databases. Managed-schema fixtures additionally require
`TEST_ALLOW_ROLE_SETUP=true` on a disposable cluster. Never point this harness
at an application cluster.

## Ownership

- `survey/src/domain`: frontend domain contracts and pure rules.
- `survey/src/lib/auth`: Supabase OAuth infrastructure; application data uses HTTP.
- `survey/src/features`: feature-specific editors, history/analytics and dialogs.
- `survey/src/pages`: route composition.
- `survey/src/styles/admin` and `styles/public`: ordered feature styles;
  `admin.css`/`survey.css` remain entrypoints preserving the cascade.
- `server/src/routes`: HTTP schemas and access checks.
- `server/src/lib/survey-config-*`: persisted configuration validation and snapshots.
- `server/migrations`, `supabase/migrations`: separate deployment histories.

See [the hardening notes](docs/quality-hardening.md) for revision conflicts,
history guarantees, migration order and validation evidence. The earlier
[architecture review](docs/architecture-review.md) records the original findings
and subsequent progress. Branch protection settings are managed in GitHub;
adding a workflow alone does not enable required status checks.
