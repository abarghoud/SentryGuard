<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- You have access to the Nx MCP server and its tools, use them to help the user
- When answering questions about the repository, use the `nx_workspace` tool first to gain an understanding of the workspace architecture where applicable.
- When working in individual projects, use the `nx_project_details` mcp tool to analyze and understand the specific project structure and dependencies
- For questions around nx configuration, best practices or if you're unsure, use the `nx_docs` tool to get relevant, up-to-date docs. Always use this instead of assuming things about nx configuration
- If the user needs help with an Nx configuration or project graph error, use the `nx_workspace` tool to get any errors

# CI Error Guidelines

If the user wants help with fixing an error in their CI pipeline, use the following flow:
- Retrieve the list of current CI Pipeline Executions (CIPEs) using the `nx_cloud_cipe_details` tool
- If there are any errors, use the `nx_cloud_fix_cipe_failure` tool to retrieve the logs for a specific task
- Use the task logs to see what's wrong and help the user fix the problem. Use the appropriate tools if necessary
- Make sure that the problem is fixed by running the task that you passed into the `nx_cloud_fix_cipe_failure` tool

<!-- nx configuration end-->

# SentryGuard

Nx monorepo — Tesla vehicle monitoring with Telegram alerts.

## Apps & Libs

| Project | Framework | Port | Test runner |
|---------|-----------|------|-------------|
| `apps/api` | NestJS + TypeORM + PostgreSQL | 3001 | Jest (node env) |
| `apps/webapp` | Next.js 16 (App Router, SSR) | 3000 | Jest (jsdom env) |
| `libs/beta/domain` | Shared domain lib | — | Jest |

## Commands

All tasks via `nx`. Use `yarn` (Berry v4) — **not** npm.

```bash
# Dev
npx nx serve api          # NestJS with hot-reload (depends on build)
npx nx dev webapp         # Next.js dev server

# Build
npx nx build api          # Webpack (not Nest CLI)
npx nx build webapp

# Lint / Typecheck / Test
npx nx lint api
npx nx lint webapp
npx nx typecheck api
npx nx run-many -t lint   # all projects
npx nx test api
npx nx test webapp --watch
npx nx test api --coverage

# CI order: lint → test → build
yarn nx run-many -t lint
yarn nx run-many -t test --skip-nx-cache
yarn nx run-many -t build
```

## Database Migrations

```bash
cd apps/api
npm run migration:generate -- <migration-name>   # generate from entity changes
npm run migration:run                             # apply pending migrations
npm run migration:revert                          # rollback last migration
npm run migration:show                            # list pending/applied
```

Migrations use `tsconfig.typeorm.json` (not the default tsconfig). Migration files live in `apps/api/src/migrations/`.

## Kafka (Local Dev)

```bash
npm run kafka:start   # docker-compose: Zookeeper + Kafka + message producer
npm run kafka:send    # interactive test message sender
npm run kafka:stop
```

Kafka must be running before `npx nx serve api` for telemetry features to work. Default topic: `FleetTelemetry_V`.

## Environment Setup

- Copy `apps/api/.env.example` → `apps/api/.env`
- Requires PostgreSQL running (see `DATABASE_*` vars)
- Key secrets: `ENCRYPTION_KEY` (min 32 chars), `JWT_SECRET`, `TESLA_CLIENT_*`, `TELEGRAM_BOT_TOKEN`

## API Source Structure

```
apps/api/src/
├── app/                    # NestJS modules
│   ├── auth/               # Tesla OAuth
│   ├── telemetry/          # Vehicle telemetry processing
│   ├── telegram/           # Telegram bot integration
│   ├── messaging/kafka/    # Kafka consumer (KafkaService)
│   ├── alerts/             # Sentry alert handlers
│   ├── onboarding/         # User onboarding
│   ├── waitlist/           # Waitlist management
│   ├── consent/            # User consent
│   ├── user/               # User management
│   └── shared/             # Shared module
├── entities/               # TypeORM entities (user, vehicle, telegram-config, user-consent, waitlist)
├── config/                 # Centralized configs (throttle, database, pino, oci-logging, cron)
├── common/                 # Exceptions, guards, interceptors, services, utils
└── migrations/
```

## Webapp Source Structure

```
apps/webapp/src/
├── app/           # Next.js App Router pages (dashboard, callback)
├── components/    # React components (Tailwind CSS)
└── lib/           # Utilities & hooks (useAuth, i18n)
```

## Key Architecture Patterns

- **Rate limiting**: All throttle values centralized in `apps/api/src/config/throttle.config.ts`. Use named `ThrottleOptions` methods — never hardcode numbers.
- **Token storage**: Tesla OAuth tokens stored **encrypted** via `TokenEncryptionService` (`apps/api/src/app/auth/services/token-encryption.service.ts`).
- **Cloudflare**: `CloudflareThrottlerGuard` extracts real IPs from `CF-Connecting-IP` header.
- **i18n**: Both apps use i18next. Extract strings with `npx nx extract-i18n api` / `npx nx extract-i18n webapp`.

## Test Patterns

- AAA pattern (Arrange-Act-Assert) with nested `describe` blocks
- Top-level: `describe('The ClassName class')` / `describe('The functionName() function')`
- Method level: `describe('The methodName() method')`
- Scenarios: `describe('When <scenario>', ...)` (capital W)
- Assertions: `it('should <expected behavior>', ...)` (lowercase)
- Mock with `jest-mock-extended`: `mock<ServiceInterface>()`
- Use `toStrictEqual` for complex objects
- No comments inside tests
- Arrow functions for test callbacks
- One expectation per test (a few tightly related OK)
- Never test private/protected methods directly

## Code Style

- **No comments** in code — names should be self-explanatory
- **File naming**: kebab-case with suffix (`.service.ts`, `.controller.ts`, `.entity.ts`, `.enum.ts`, `.requirements.ts`, `.test.ts`); PascalCase for React components
- **Named exports preferred** (except Next.js pages)
- **Explicit access modifiers** on all class members
- **Strict TypeScript**: no `any`, prefer `unknown`; prefer enums over union types; interfaces over type aliases for objects
- **Boolean prefixes**: `is`, `has`, `should`
- **Callback prefixes**: `on` (e.g., `onClick`, not `setClickHasHappened`)
- **Acronyms**: only first letter capitalized (`parseUrl` not `parseURL`)
- **Environments**: full names (`development` not `dev`)
- **Async/await** over raw Promises
- **Composition over inheritance** — use DI, not extends
- **Methods max 10 lines** — extract into private methods
- **React**: ternary `{cond ? <X/> : null}` not `&&`; components are presentational only

## Commit Convention

Conventional Commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`