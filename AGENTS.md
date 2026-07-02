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

Nx monorepo — Tesla vehicle monitoring with Telegram + mobile-push alerts and an active break-in offensive response.

## Apps & Libs

| Project | Framework | Port | Test runner |
|---------|-----------|------|-------------|
| `apps/api` | NestJS + TypeORM + PostgreSQL | 3001 | Jest (node env) |
| `apps/webapp` | Next.js 16 (App Router, SSR) | 3000 | Jest (jsdom env) |
| `apps/mobile` | Expo SDK 54 / React Native (iOS, Android, Expo Web) | 8081 / 3002 | Jest (node env) |
| `libs/beta/domain` | `@sentryguard/beta-domain` — Tesla scopes + error codes | — | Jest |
| `libs/telegram/domain` | `@sentryguard/telegram-domain` — Telegram-linking use-cases (web + mobile) | — | Jest |

Infra images: `fleet-telemetry/` (Tesla telemetry TLS ingest → Kafka) and `vehicle-command-proxy/` (signs Tesla commands). Lib resolution uses Yarn workspaces + TS `customConditions` (no `paths` in `tsconfig.base.json`).

## Commands

All tasks via `nx`. Use `yarn` (Berry v4) — **not** npm.

```bash
# Dev
npx nx serve api          # NestJS with hot-reload (depends on build)
npx nx dev webapp         # Next.js dev server
npx nx start mobile       # Expo Metro (:8081); also run-ios / run-android / serve (web :3002)

# Build
npx nx build api          # Webpack (not Nest CLI)
npx nx build webapp
npx nx export mobile      # Metro JS bundle (CI bundle check)

# Lint / Typecheck / Test
npx nx lint api
npx nx lint webapp
npx nx typecheck api
npx nx typecheck mobile   # uses tsconfig.app.json (plain tsconfig.json checks nothing)
npx nx run-many -t lint   # all projects
npx nx test api
npx nx test webapp --watch
npx nx test api --coverage
npx jest <file> -c apps/<app>/jest.config.js   # single test file

# CI order: lint → typecheck(mobile) → test → build → export(mobile)
yarn nx run-many -t lint
yarn nx typecheck mobile
yarn nx run-many -t test --skip-nx-cache
yarn nx run-many -t build --projects=!mobile
yarn nx run-many -t export
```

Mobile EAS builds (from `apps/mobile`): `yarn eas:build:preview` / `:preview:apk` (EAS cloud) and the `:local` variants (`yarn eas:build:preview:local`, `yarn eas:build:preview:apk:local`) build on-machine with no EAS credits. Profiles in `apps/mobile/eas.json`.

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

Kafka must be running before `npx nx serve api` for telemetry features to work. Topic via `KAFKA_TOPIC`: code/local-dev default is `TeslaLogger_V`; self-host/fleet-telemetry use `FleetTelemetry_V` — match it to the producer.

## Environment Setup

- Copy `apps/api/.env.example` → `apps/api/.env`
- Requires PostgreSQL running (see `DATABASE_*` vars)
- Key secrets: `ENCRYPTION_KEY` (min 32 chars), `JWT_SECRET`, `TESLA_CLIENT_*`, `TELEGRAM_BOT_TOKEN`
- Webapp: `NEXT_PUBLIC_API_URL` etc. served at **runtime** via `/api/runtime-config`. Mobile: `EXPO_PUBLIC_API_URL` in `apps/mobile/.env.local`. Self-host: `.env.selfhost.example`

## API Source Structure

```
apps/api/src/
├── app/                    # NestJS modules
│   ├── auth/               # Tesla OAuth, JWT sessions, token encryption + refresh cron
│   ├── telemetry/          # Vehicle telemetry processing (+ telemetry-cleanup)
│   ├── telegram/           # Telegram bot integration
│   ├── messaging/kafka/    # Kafka consumer (KafkaService; providers wired in app.module.ts)
│   ├── alerts/             # Alert handlers (sentry / break-in / common fan-out)
│   ├── offensive-response/ # Break-in honk/boombox config & execution
│   ├── notifications/      # Expo mobile push + notification preferences
│   ├── onboarding/         # User onboarding + announcements
│   ├── waitlist/           # Waitlist management
│   ├── consent/            # User consent
│   ├── user/               # User management (+ language)
│   ├── redirect/           # Tesla deep-link bounce page
│   ├── tesla-public-key/   # Serves Tesla Fleet public key
│   └── shared/             # RetryManager
├── entities/               # 11 TypeORM entities (user, vehicle, telegram-config, user-consent,
│                           #   user-session, push-device-token, notification-preferences,
│                           #   alert-event, feature-announcement, user-dismissed-announcement, waitlist)
├── config/                 # Centralized configs (throttle, database, pino, oci-logging, cron, lock-keys)
├── common/                 # Exceptions, guards, interceptors, services (distributed-lock), utils (crypto)
└── migrations/
```

## Webapp Source Structure

```
apps/webapp/src/
├── app/           # App Router: public [locale]/ pages (SSR) + flat client flow (callback, consent, onboarding, dashboard)
├── features/      # Clean architecture per domain: domain / data / presentation / di.ts
├── core/          # api client (runtime URL via /api/runtime-config), i18n, query provider
├── components/    # React components (Tailwind CSS)
├── locales/       # en/fr common.json
└── proxy.ts       # locale redirect middleware
```

## Mobile Source Structure

```
apps/mobile/src/
├── core/          # App.tsx, MobileShell, navigation, api client, theme, design system, i18n
├── features/      # Same clean-architecture layout as webapp (domain/data/presentation/di.ts)
└── screens/       # Presentational screens; logic in use-*.ts hooks
```
Not Expo Router — uses `@react-navigation` (bottom tabs: Dashboard / Alerts / Settings). Tesla OAuth via `expo-web-browser` + deep link `sentryguard://callback`; JWT in `expo-secure-store`. Push via `expo-notifications`. API URL = build-time `EXPO_PUBLIC_API_URL`.

## Key Architecture Patterns

- **Telemetry flow**: fleet-telemetry server → Kafka (**JSON**, not protobuf at the API) → `TelemetryMessageHandlerService` (class-validator) → sentry/break-in handlers → `VehicleAlertNotifierService` fan-out.
- **Dual-channel notifications**: Telegram (`TelegramService`, mute enforced) **and** Expo mobile push (`NotificationsService` → exp.host). Devices via `NotificationsController`.
- **Offensive response**: on a confirmed break-in, `AlertsOffensiveResponseService` → `TeslaVehicleCommandService` sends `honk_horn`/`remote_boombox` through the vehicle-command proxy (`TESLA_API_BASE_URL`), gated on the `vehicle_cmds` scope.
- **Rate limiting**: All throttle values centralized in `apps/api/src/config/throttle.config.ts`. Use named `ThrottleOptions` methods — never hardcode numbers.
- **Token storage**: Tesla OAuth tokens stored **encrypted** in `apps/api/src/common/utils/crypto.util.ts` (AES-256-CBC). *(There is no `token-encryption.service.ts`.)*
- **Auth sessions**: server-side JWT sessions (`UserSessionService`, SHA-256 hash, max 5/user); token refresh on a cron with a Postgres advisory `DistributedLockService`.
- **Clean architecture (frontends)**: web + mobile both use `features/<domain>/{domain,data,presentation,di.ts}` + TanStack Query + a hand-rolled `ApiClient`. `@sentryguard/telegram-domain` is shared between them.
- **Cloudflare**: `CloudflareThrottlerGuard` extracts real IPs from `CF-Connecting-IP` header.
- **i18n**: web + API use i18next, mobile uses react-i18next. Extract with `npx nx extract-i18n api` / `npx nx extract-i18n webapp`.

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

## Gotchas

- Kafka topic differs: local-dev `TeslaLogger_V` vs self-host `FleetTelemetry_V` — set via `KAFKA_TOPIC`.
- Mobile typecheck targets `tsconfig.app.json`; only mobile is typecheck-gated in CI.
- Vehicle-command host default (`tesla-vehicle-command:8443`) differs from the compose service name (`vehicle-command`); `TESLA_API_BASE_URL` is set explicitly in self-host.
- Vitest is installed but unused — everything runs Jest.
- Self-host via `docker-compose.selfhost.yml` (see SELF_HOSTING.md); `docker-compose.yml` is local Kafka only.