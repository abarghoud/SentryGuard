# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SentryGuard is a real-time Tesla vehicle monitoring and security alert system built as an Nx monorepo. It tracks Tesla Sentry Mode status and sends instant Telegram notifications when suspicious activity is detected.

**Architecture**:
- NestJS backend API (TypeORM + PostgreSQL + Kafka)
- Next.js 16 frontend with App Router (SSR for SEO)
- Expo / React Native mobile app (iOS, Android, Expo Web)
- Tesla Fleet API integration for vehicle telemetry
- Telegram Bot API **and mobile push (Expo)** for instant notifications
- Active **offensive response** (honk / boombox) on confirmed break-ins
- Apache Kafka for real-time message processing
- Two shared domain libs + two custom Docker infra images (fleet-telemetry, vehicle-command proxy)

> A condensed version of this file lives in [AGENTS.md](AGENTS.md) (loaded by some tools). Keep the two in sync when commands or architecture change.

### Monorepo Layout

| Path | What it is | Stack | Test env |
|------|-----------|-------|----------|
| `apps/api` | Backend API + Kafka consumer | NestJS 11 + TypeORM + PostgreSQL | Jest (node) |
| `apps/webapp` | Marketing site + dashboard | Next.js 16 App Router (SSR) | Jest (jsdom) |
| `apps/mobile` | iOS / Android / Expo Web client | Expo SDK 54 + React Native 0.81 + React Navigation | Jest (node) |
| `libs/beta/domain` | `@sentryguard/beta-domain` — Tesla scopes + error-code enums | Pure TS | Jest |
| `libs/telegram/domain` | `@sentryguard/telegram-domain` — Telegram-linking use-cases shared by web + mobile | Pure TS | Jest |
| `fleet-telemetry/` | Dockerized Tesla Fleet Telemetry server (TLS ingest → Kafka) | Go + Docker | — |
| `vehicle-command-proxy/` | Dockerized Tesla vehicle-command HTTP proxy (signs commands) | Go + Docker | — |

> **Workspace package resolution is non-obvious**: `tsconfig.base.json` has **no `paths`**. Libs resolve as Nx workspace packages via Yarn workspaces + the TS `customConditions: ["@tesla-guard/source"]` setting, so each lib's `package.json` `exports` points at its `./src/index.ts` (live source, no build step). Note the scope split: root/condition uses `@tesla-guard/*`, published libs use `@sentryguard/*`.

## Common Commands

### Development
```bash
# Start API (development mode with hot-reload)
npx nx serve api

# Start WebApp (development mode)
npx nx dev webapp

# Start Mobile (Expo Metro bundler :8081)
npx nx start mobile
npx nx serve mobile        # Expo Web (:3002)
npx nx run-ios mobile      # build & launch iOS simulator
npx nx run-android mobile  # build & launch Android emulator

# Build for production
npx nx build api
npx nx build webapp
npx nx export mobile       # Metro JS bundle (CI "does it bundle" check)
```

### Testing
```bash
# Run all tests for a project
npx nx test api
npx nx test webapp
npx nx test mobile

# Run tests in watch mode
npx nx test api --watch

# Run tests with coverage
npx nx test api --coverage

# Run a SINGLE test file
npx jest <path/to/file.test.ts> -c apps/<app>/jest.config.js
# e.g. npx jest src/components/VinMask.test.tsx -c apps/webapp/jest.config.js
```

### Linting & Code Quality
```bash
# Lint specific project
npx nx lint api
npx nx lint webapp
npx nx lint mobile

# Lint everything
npx nx run-many -t lint

# Type checking (mobile uses tsconfig.app.json — see Known Gotchas)
npx nx typecheck api
npx nx typecheck mobile
```

### Kafka Development
```bash
# Start local Kafka + Zookeeper (Docker Compose)
npm run kafka:start

# Send interactive test messages to Kafka
npm run kafka:send

# Stop Kafka stack
npm run kafka:stop
```

### i18n Management
```bash
# Extract i18n strings from API
npx nx extract-i18n api

# Extract i18n strings from WebApp
npx nx extract-i18n webapp
```

### Database Migrations (run from `apps/api`)
```bash
cd apps/api
npm run migration:generate -- <Name>   # diff entities → new file in src/migrations/
npm run migration:run                   # apply pending
npm run migration:revert                # roll back last
npm run migration:show                  # list applied/pending
```
Migrations use `tsconfig.typeorm.json` and the DataSource in `apps/api/src/config/database.config.ts` (runs `src/migrations/*.ts` via the CLI, `dist/migrations/*.js` at runtime).

### Mobile EAS Builds (run from `apps/mobile`)
```bash
yarn eas:build:preview            # signed Android app-bundle, profile "preview" (EAS cloud)
yarn eas:build:preview:local      # same, built locally (--local, no EAS credits)
yarn eas:build:preview:apk        # APK output, profile "preview-apk" (EAS cloud)
yarn eas:build:preview:apk:local  # same APK, built locally (--local)
```
These `source ./.env.local` then call `eas-cli`. The `:local` variants build on your machine (no EAS Build credits). Profiles live in `apps/mobile/eas.json`.

### CI Order (mirror locally before pushing)
```bash
yarn nx run-many -t lint
yarn nx typecheck mobile                    # only mobile is typecheck-gated today
yarn nx run-many -t test --skip-nx-cache
yarn nx run-many -t build --projects=!mobile
yarn nx run-many -t export                  # mobile bundle check
```

## Critical Architecture Patterns

### Rate Limiting Architecture
All rate limiting is **centrally configured** in `apps/api/src/config/throttle.config.ts`. Never use magic numbers for rate limits in controllers or guards.

**Usage in controllers:**
```typescript
import { ThrottleOptions } from '../../config/throttle.config';

@Throttle(ThrottleOptions.authenticatedRead())  // For GET endpoints
@Throttle(ThrottleOptions.authenticatedWrite()) // For POST/PATCH/DELETE
@Throttle(ThrottleOptions.publicSensitive())    // For OAuth/sensitive public endpoints
@Throttle(ThrottleOptions.critical())           // For resource-intensive operations
```

The system uses `CloudflareThrottlerGuard` (`apps/api/src/common/guards/`), registered globally, which resolves the real client IP with precedence `CF-Connecting-IP → X-Forwarded-For[0] → X-Real-IP → req.ip` (`main.ts` sets `trust proxy`). Presets (all 60s TTL): `authenticatedRead` 200, `authenticatedWrite` 100, `critical` 50, `publicSensitive` 40, `default` 100.

### Telemetry Message Flow
1. **Tesla Vehicle** → streams telemetry to the **`fleet-telemetry/`** server (TLS :8443), which decodes Tesla's protobuf and publishes **JSON** to Kafka
2. **Kafka** → topic from `KAFKA_TOPIC` (code/local-dev default `TeslaLogger_V`; self-host/fleet-telemetry use `FleetTelemetry_V` — see Known Gotchas)
3. **KafkaService** (`apps/api/src/app/messaging/kafka/kafka.service.ts`) → consumes batches (concurrency-limited); providers are wired in `app.module.ts`, not a dedicated module
4. **TelemetryMessageHandlerService** (`apps/api/src/app/telemetry/handlers/`) → `JSON.parse`s the payload and validates with **class-validator** via `TelemetryValidationService`, then fans out with `Promise.allSettled`
5. **SentryAlertHandlerService** / **BreakInAlertHandlerService** (`apps/api/src/app/alerts/`) → interpret events (break-in defers ~3s and suppresses charge-port false positives via `ChargePortLatchTrackerService`)
6. **VehicleAlertNotifierService** (`apps/api/src/app/alerts/common/`) → central fan-out: persists `AlertEvent`s, notifies each user over **Telegram + mobile push**, and triggers the offensive response

> ⚠️ The payload is **JSON at the API layer, not Protobuf** — protobuf decoding happens upstream in the fleet-telemetry server. (`@types/google-protobuf` is a leftover dependency.)

**Retry Mechanism**:
- Kafka **connection** retries: `KafkaService.connectWithRetry` via `KAFKA_MAX_RETRIES`, `KAFKA_RETRY_DELAY`, `KAFKA_MAX_RETRY_DELAY`
- **Message processing** retries: `RetryManager` (`apps/api/src/app/shared/retry-manager.service.ts`) with exponential backoff (`KAFKA_MESSAGE_*`); also reused by Telegram for retryable sends
- Failed messages after max retries are logged for investigation

### Notification Channels (Telegram + Mobile Push)
Notifications are **dual-channel**, fanned out in `VehicleAlertNotifierService.notifyUser()`:
- **Telegram** — `TelegramService` (Telegraf). Mute is enforced here via `TelegramMuteService.checkIsNotificationMuted`.
- **Mobile push** — `NotificationsService.sendPushAlert()` → Expo push API (`https://exp.host/--/api/v2/push/send`). Stale tokens (`DeviceNotRegistered`) are deleted automatically; Android routes critical vs normal via channels `sentryguard-critical-alerts-v5` / `sentryguard-alerts`.

Devices register through `NotificationsController` (`POST/DELETE /notifications/push-token`, `GET/POST /notifications/preferences`). Entities: `PushDeviceToken` (per-device flags), `NotificationPreferences` (global `telegram_enabled`).

### Offensive Response (break-in counter-measures)
- Enum `OffensiveResponse { DISABLED, HONK, FART }` (`apps/api/src/app/alerts/enums/offensive-response.enum.ts`), stored per-vehicle in `Vehicle.break_in_offensive_response`.
- Configured via `PATCH /offensive-response/:vin` (requires Tesla `vehicle_cmds` scope) or a Telegram button.
- On a confirmed break-in within a latency threshold, `AlertsOffensiveResponseService` → `TeslaVehicleCommandService` (`apps/api/src/app/telemetry/services/tesla-vehicle-command.service.ts`) POSTs `honk_horn` / `remote_boombox` to `TESLA_API_BASE_URL` (the **vehicle-command proxy**) using the user's decrypted access token.

### Authentication & Token Management
- **OAuth 2.0 flow** with Tesla for user authentication (scopes `openid vehicle_device_data vehicle_cmds offline_access user_data`; CSRF via a signed `state` JWT)
- **JWT tokens** for API authentication (managed by Passport.js), but **sessions are tracked server-side**: `UserSessionService` stores a SHA-256 hash of each JWT (`UserSession` entity), enforces **max 5 sessions/user**, and supports revocation
- **Tesla access tokens** are stored ENCRYPTED in the database (using `ENCRYPTION_KEY`)
- Token encryption/decryption is handled in **`apps/api/src/common/utils/crypto.util.ts`** (AES-256-CBC, key derived via `scryptSync`, random IV, `iv:cipher` hex) — *not* in an `auth/services/token-encryption.service.ts` (that file does not exist)
- **Refresh on a cron**: `TeslaTokenRefreshSchedulerService` (`@Cron`, default 02:00 daily) → `TeslaTokenRefreshService` (row-locked)
- **Distributed lock**: cron jobs are guarded by `DistributedLockService` (Postgres `pg_try_advisory_xact_lock`) so only one instance runs each job (keys in `config/scheduler-lock-key.config.ts`)

### Database Entity Relationships

There are **11 entities** in `apps/api/src/entities/`, centered on `User`:
```
User (1) ──< (N) Vehicle, UserConsent, UserSession, PushDeviceToken, AlertEvent
User (1) ──< (1) TelegramConfig, NotificationPreferences
FeatureAnnouncement (N) >──< (N) User   (via UserDismissedAnnouncement)
Waitlist (standalone)
```

Key entities:
- `user.entity.ts` - User profile + encrypted Tesla tokens
- `vehicle.entity.ts` - Vehicle details + telemetry config + `break_in_offensive_response`
- `telegram-config.entity.ts` - Telegram chat IDs + link tokens + mute status
- `user-consent.entity.ts` - User consent tracking
- `user-session.entity.ts` - Hashed JWT sessions (max 5/user)
- `push-device-token.entity.ts` - Expo push tokens + per-device flags
- `notification-preferences.entity.ts` - Global `telegram_enabled` per user
- `alert-event.entity.ts` - Persisted alert history (type/severity enums)
- `feature-announcement.entity.ts` / `user-dismissed-announcement.entity.ts` - In-app announcements
- `waitlist.entity.ts` - Pre-launch waitlist

### Frontend Architecture (Next.js App Router)
- **Server-Side Rendering** for SEO optimization. Two routing zones: public localized SSR pages under `src/app/[locale]/` (landing, faq, legal), and flat client pages for the auth/dashboard flow (`callback`, `consent`, `onboarding`, `dashboard/*`)
- Locale redirect middleware is **`apps/webapp/src/proxy.ts`** (Next's `proxy` filename convention), keyed on a `locale` cookie / `accept-language`
- Dashboard pages are in `apps/webapp/src/app/dashboard/`; client-side guards live in `dashboard/layout.tsx` (no auth → `/`, no consent → `/consent`, onboarding incomplete → `/onboarding`)
- The auth hook is **`useAuthQuery`** in `apps/webapp/src/features/auth/` (there is **no** `src/lib/useAuth.ts`)
- **API URL is resolved at runtime** via `/api/runtime-config` (a `force-dynamic` route reading `NEXT_PUBLIC_*` server env), so one Docker image is configured at deploy time. JWT is stored in `localStorage` (`jwt_token`)
- State is **TanStack React Query v5** only (no Redux/Zustand). Error tracking is **Rollbar**
- i18n via `react-i18next` (locales `en`/`fr` in `src/locales/<lng>/common.json`); SSR dictionary lookup in `src/core/i18n/server-i18n.tsx`
- Tailwind CSS for styling (no CSS modules except `page.module.css`)

### Mobile Menu Pattern
The dashboard layout uses a **hamburger menu** for mobile (see `apps/webapp/src/app/dashboard/layout.tsx`):
- Toggles between `max-h-0 opacity-0` (closed) and `max-h-screen opacity-100` (open)
- Animated slide-down with `transition-all duration-300 ease-in-out`
- Automatically closes when navigating (`setMobileMenuOpen(false)`)
- Toggle button shows hamburger (☰) or close (×) icon

### Clean Architecture on the Frontends (web + mobile share this)
Both `apps/webapp` and `apps/mobile` organize feature code identically — read one and you understand the other:
```
features/<domain>/
├── domain/          # entities, use-cases, *.requirements.ts interfaces
├── data/            # *.api-repository.ts (real) + *.mock-repository.ts (demo/offline)
├── presentation/    # React Query hooks (queries/), containers/views, screen hooks
└── di.ts            # manual DI: instantiate repository → use-cases → create hook
```
- **Data layer**: a single hand-rolled `ApiClient` (`core/api/api-client.ts`) wraps `fetch`, attaches `Authorization: Bearer`, parses `ApiError`/`ScopeError`, and auto-refreshes once on `401` (`POST /auth/refresh-session`)
- **State**: TanStack React Query v5 is the only server-state layer; query keys are per-feature; mutations invalidate their own key
- **Demo mode**: a `'demo-token'` swaps real repositories for mock ones (`Dynamic*Repository` in each `di.ts`)
- `libs/telegram/domain` (`@sentryguard/telegram-domain`) is the **shared** Telegram-linking contract consumed by both frontends

### Mobile App Architecture (Expo / React Native)
- **Not Expo Router.** Entry `index.js` → `src/core/App.tsx`. Nav tree: `MobileShell.tsx` (gates on session/consent/onboarding) → `MainScreen.tsx` (bottom tabs: Dashboard / Alerts / Settings)
- Source layout mirrors the web Clean Architecture (`core/`, `features/<domain>/`, `screens/`); screens are presentational, logic lives in `use-*.ts` hooks
- **Login**: backend Tesla OAuth opened via `expo-web-browser` (iOS) / `Linking` (Android); callback caught by deep link `sentryguard://callback`; token → **expo-secure-store** (`sentryguard.jwt`)
- **API URL** is **build-time** `EXPO_PUBLIC_API_URL` (inlined by Metro) with an optional user override saved in SecureStore
- **Push**: `expo-notifications`; token registered to `POST /notifications/push-token`, cleared on logout. Android critical alerts use a custom native module (`apps/mobile/modules/dnd-access/`, Kotlin) for Do-Not-Disturb bypass
- **UI**: Apple-style design system in `core/design/` + "liquid glass" components (`expo-glass-effect` with `expo-blur` fallback); theming via `core/theme.tsx`. Config split: static `app.json` + dynamic `app.config.js`

## Environment Configuration

### API (.env)
Critical environment variables:
- **Database**: `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_NAME`
- **Security**: `ENCRYPTION_KEY` (min 32 chars), `JWT_SECRET`, `JWT_OAUTH_STATE_SECRET`
- **Tesla**: `TESLA_CLIENT_ID`, `TESLA_CLIENT_SECRET`, `TESLA_FLEET_TELEMETRY_SERVER_HOSTNAME`, `TESLA_API_BASE_URL` (vehicle-command proxy)
- **Telegram**: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_MODE`, `TELEGRAM_WEBHOOK_BASE`
- **Kafka**: `KAFKA_BROKERS`, `KAFKA_TOPIC` (code default `TeslaLogger_V`; self-host uses `FleetTelemetry_V`)
- **Rate Limiting**: See `apps/api/.env.example` for all `THROTTLE_*` variables

### WebApp (.env)
- API URL is read **at runtime** through `/api/runtime-config`, not inlined at build time
- Vars: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_VIRTUAL_KEY_PAIRING_URL`, `NEXT_PUBLIC_ROLLBAR_CLIENT_TOKEN`, `ROLLBAR_SERVER_TOKEN`, `NEXT_PUBLIC_DISCORD_URL`
- `next.config.js` uses `output: 'standalone'` (Docker) and disables ESLint during build

### Mobile (.env.local)
- `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_VIRTUAL_KEY_PAIRING_URL`, optional `EXPO_PUBLIC_DEMO_*` (all inlined by Metro — never put real secrets here)

### Self-Hosting
- `docker-compose.selfhost.yml` + `.env.selfhost.example` (fail-fast `${VAR:?}` syntax). Full guide in [SELF_HOSTING.md](SELF_HOSTING.md)
- `docker-compose.yml` is **local-dev Kafka only** (Zookeeper + Kafka + message simulator), no app containers

## Testing Practices

### Test Structure & Style
- **Structure**: Follow AAA pattern (Arrange-Act-Assert) with nested `describe` blocks
  - Top-level: `describe('The ClassName class')` or `describe('The functionName() function')`
  - Method level: `describe('The methodName() method')`
  - Scenarios: `describe('When <scenario>', ...)` (capital W)
  - Assertions: `it('should <expected behavior>', ...)` (lowercase s)
- **No comments inside tests** - tests should be self-explanatory
- **Use arrow functions** instead of function declarations
- **One expectation per test** (allow a few tightly related expectations)
- **Never test private/protected methods directly** - always use public methods

### Test Organization
```typescript
describe('The UserService class', () => {
  // Shared fake data at suite scope
  const fakeUserId = 'user-123';

  describe('The createUser() method', () => {
    describe('When user data is valid', () => {
      let result: User;
      let mockRepository: MockProxy<UserRepository>;

      beforeEach(async () => {
        mockRepository = mock<UserRepository>();
        mockRepository.save.mockResolvedValue(expectedUser);
        const service = new UserService(mockRepository);

        result = await service.createUser(validUserData);
      });

      it('should return the created user', () => {
        expect(result).toEqual(expectedUser);
      });
    });

    describe('When user data is invalid', () => {
      const expectedError = 'Invalid user data';
      let act: () => Promise<void>;

      beforeEach(() => {
        act = async () => await service.createUser(invalidData);
      });

      it('should throw validation error', async () => {
        await expect(act()).rejects.toThrow(expectedError);
      });
    });
  });
});
```

### Mocking Patterns
```typescript
// Interface/class mocks (preferred)
import { mock } from 'jest-mock-extended';
const mockService = mock<ServiceInterface>();
mockService.method.mockReturnValue(value);
mockService.method.mockResolvedValue(asyncValue);
mockService.method.mockRejectedValue(new Error('error'));

// Error messages as variables for consistency
const expectedError = 'Operation failed';
mockService.method.mockRejectedValue(new Error(expectedError));
// Later in test:
await expect(act()).rejects.toThrow(expectedError);
```

### Backend Testing
- **Mock external dependencies**: Database (TypeORM), Tesla API, Telegram Bot, Kafka
- Use `jest-mock-extended` for interfaces/classes
- Use `toStrictEqual` for complex object comparisons
- Always run tests after creating/editing: `npx jest '{test-file}' -c '{package-root}/jest.config.js'`

### Frontend Testing
- Use `@testing-library/react` and `@testing-library/react-hooks`
- Use semantic queries (`getByRole`) or `data-testid` when precise
- Create render factories to avoid prop duplication
- Test i18next strings as authored (keep variables in i18next format)

## Security Considerations

- **NEVER commit** `.env` files or secrets to git
- All Tesla tokens must be encrypted before database storage
- Rate limiting is mandatory on all public endpoints
- Use `CloudflareThrottlerGuard` to respect Cloudflare proxy headers
- Follow OWASP guidelines (SQL injection, XSS, etc.)

## Code Style & Best Practices

### File Naming
- **Lowercase with hyphens** for non-React files: `user-service.ts`, `auth-guard.ts`
- **PascalCase for React components**: `UserProfile.tsx`, `LanguageSwitcher.tsx`
- **File type suffixes** (before extension): `.controller.ts`, `.service.ts`, `.enum.ts`, `.requirements.ts`, `.test.ts`
- Files must be sufficiently explicit to understand their role without looking at folder structure

### Naming Conventions
- **Variables/Constants**: `camelCase` with explicit names (no abbreviations)
  - Booleans: prefix with `has`, `is`, or `should` (e.g., `isAuthenticated`, `hasPermission`)
  - Full words preferred: `exception` not `exc`, `keyboardEvent` not `evt`
- **Functions**: `camelCase` starting with a verb (e.g., `getUserData()`, `updateProfile()`)
  - `useMemo` named as variables, not functions
- **Classes**: `PascalCase` with specific responsibility (avoid generic terms like Service, Handler, Manager)
- **Interfaces**: Alphabetically sorted attributes
  - Service contracts suffixed with `Requirements`
- **Enums**: `PascalCase` for both name and keys (e.g., `enum UserType { Individual, Professional }`)
- **Callbacks**: Prefix with `on` (e.g., `onCountDownEnd`, not `setCountDownHasEnded`)
- **Acronyms**: Only first letter capitalized (e.g., `parseUrl()` not `parseURL()`, `getAwsClient()` not `getAWSClient()`)
- **Environments**: Use full names (`development` not `dev`, `production` not `prod`)

### TypeScript & Typing
- **Strict mode enabled** - always specify types when not inferrable
- **Avoid `any`** - prefer `unknown` if type is truly unknown
- **Exhaustive types** - if method returns `X | null`, type must indicate `X | null`
- **Prefer enums over union types**: `enum Status { Success, Error }` over `type Status = 'success' | 'error'`
- **Use interfaces** for object structures
- **Generics** for abstract type-independent code
- **Explicit access modifiers** on all class members (`public`, `private`, `protected`)

### Code Organization
- **No comments in code** - code should be self-explanatory through good naming
  - Exception: complex decisions requiring context (use trigram prefix if needed)
- **Import order**:
  1. External packages (node_modules)
  2. Internal libraries
  3. Local project files
- **Named exports preferred** over default exports (except Next.js pages)
- **Async/await** over direct Promise manipulation
- **Ternary for React conditionals**: `{condition ? <Component /> : null}` not `{condition && <Component />}`

### Clean Code Principles
- **Methods max 10 lines** - extract logic into private methods
- **One level of abstraction** per method - don't mix high-level and low-level operations
- **No side effects** - methods do exactly what their name says
- **No parameter mutation** - return new values explicitly
- **Context-specific classes** - pass context to constructor, not to every method
- **Composition over inheritance** - use dependency injection instead of extending classes
- **Law of Demeter** - avoid chaining like `this.user.workspace.getSomething()`; use `this.user.getWorkspaceSomething()`
- **Value Object Pattern** - use `readonly` properties, return new objects instead of mutating

### React Best Practices
- **Components are dumb** - no business logic, only presentation
- Use `useMemo` for computed values (not functions)
- Use `useCallback` for callbacks passed to child components
- **Avoid optional chaining** in components - use default values/factories instead
- Each variable/function should be a hook (`useEffect`, `useMemo`, `useState`, etc.)

### Commit Messages
Follow [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` for new features
- `fix:` for bug fixes
- `docs:` for documentation
- `refactor:` for refactoring
- `test:` for tests
- `chore:` for maintenance

## Cloudflare Integration

The project is designed to work behind Cloudflare:
- SSL/TLS in "Full (strict)" mode
- DDoS protection enabled
- Real client IPs extracted from `CF-Connecting-IP` header
- Static assets cached at edge

## Kafka Message Schema

By the time messages reach the API consumer they are **JSON** (the fleet-telemetry server decodes Tesla's protobuf upstream). `TelemetryMessageHandlerService.parseMessage` does `JSON.parse`, then `TelemetryValidationService` validates with **class-validator**. Key fields:
- `vin` - Vehicle Identification Number
- `data` - Telemetry payload containing Sentry Mode / break-in state
- The legacy `@types/google-protobuf` dependency is **not** used at this layer

## Nx Configuration

This is an Nx monorepo. Key points:
- Always run tasks through Nx: `npx nx <target> <project>` (and `nx run-many`, `nx affected`)
- Use `nx affected` for CI optimization
- Project configurations in `apps/*/project.json` (the webapp uses inferred Next.js targets — no `project.json`)
- Use Nx MCP tools when available for workspace analysis (`nx_workspace`, `nx_project_details`, `nx_docs`)
- Module boundaries are enforced via `@nx/enforce-module-boundaries` in `eslint.config.mjs` (currently one permissive `*` constraint — no scope/type partitioning yet)
- **Vitest tooling is installed but unused** — every project actually runs Jest (`@swc/jest`)

## CI/CD (`.github/workflows/`)

- **`ci.yml`** (push to `main` + PRs): lint → `typecheck mobile` → test (`--skip-nx-cache`) → build (all but mobile) → `export` mobile bundle
- **`docker.yml`** (push to `main` + manual): multi-arch (amd64/arm64) build & push of `api`, `webapp`, `fleet-telemetry`, `vehicle-command` images to GHCR
- **`mobile-build.yml`**: PR builds run `eas build --local` (no EAS credits) — Android `assembleDebug` + iOS simulator build, secret-free for fork PRs; manual signed builds submit to Play Internal Sharing / TestFlight when `EXPO_TOKEN` is present

## Known Gotchas

- **Mobile typecheck** must target `tsconfig.app.json` (`npx nx typecheck mobile` does this); the plain `tsconfig.json` checks nothing
- **Kafka topic name is inconsistent**: API code default + local scripts use `TeslaLogger_V`, while fleet-telemetry + self-host default to `FleetTelemetry_V`. Always configurable via `KAFKA_TOPIC` — match it to the producer
- **Vehicle-command host default** in code is `https://tesla-vehicle-command:8443`, but the compose service is named `vehicle-command` and sets `TESLA_API_BASE_URL` explicitly
- Only **mobile** is currently typecheck-gated in CI; api/webapp typecheck is not yet enforced

## Additional Documentation

- See [KAFKA-README.md](KAFKA-README.md) for Kafka setup
- See [SELF_HOSTING.md](SELF_HOSTING.md) for the full Docker self-host guide
- See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines
- See [SECURITY.md](SECURITY.md) for security policies
- See [apps/mobile/README.md](apps/mobile/README.md) for mobile-specific docs
