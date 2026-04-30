# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SentryGuard is a real-time Tesla vehicle monitoring and security alert system built as an Nx monorepo. It tracks Tesla Sentry Mode status and sends instant Telegram notifications when suspicious activity is detected.

**Architecture**:
- NestJS backend API (TypeORM + PostgreSQL + Kafka)
- Next.js 16 frontend with App Router (SSR for SEO)
- Tesla Fleet API integration for vehicle telemetry
- Telegram Bot API for instant notifications
- Apache Kafka for real-time message processing

## Common Commands

### Development
```bash
# Start API (development mode with hot-reload)
npx nx serve api

# Start WebApp (development mode)
npx nx dev webapp

# Build for production
npx nx build api
npx nx build webapp
```

### Testing
```bash
# Run all tests for a project
npx nx test api
npx nx test webapp

# Run tests in watch mode
npx nx test api --watch

# Run tests with coverage
npx nx test api --coverage
```

### Linting & Code Quality
```bash
# Lint specific project
npx nx lint api
npx nx lint webapp

# Type checking (via Nx plugin)
npx nx typecheck api
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

The system uses `CloudflareThrottlerGuard` which extracts real client IPs from Cloudflare headers (`CF-Connecting-IP`).

### Telemetry Message Flow
1. **Tesla Vehicle** → sends telemetry data via Fleet API
2. **Kafka** → receives protobuf messages on topic `FleetTelemetry_V`
3. **KafkaService** (`apps/api/src/app/messaging/kafka/kafka.service.ts`) → consumes messages
4. **TelemetryMessageHandlerService** → handles and validates messages
5. **SentryAlertHandlerService** → processes Sentry Mode events
6. **TelegramService** → sends alerts to users via Telegram Bot API

**Retry Mechanism**:
- Kafka connection retries configured via `KAFKA_MAX_RETRIES`, `KAFKA_RETRY_DELAY`, `KAFKA_MAX_RETRY_DELAY`
- Message processing retries via `RetryManager` class with exponential backoff
- Failed messages after max retries are logged for investigation

### Authentication & Token Management
- **OAuth 2.0 flow** with Tesla for user authentication
- **JWT tokens** for API authentication (managed by Passport.js)
- **Tesla access tokens** are stored ENCRYPTED in the database (using `ENCRYPTION_KEY`)
- Token encryption/decryption handled in `apps/api/src/app/auth/services/token-encryption.service.ts`

### Database Entity Relationships
```
User (1) ──< (N) Vehicle
User (1) ──< (1) TelegramConfig
User (1) ──< (1) UserConsent
```

Key entities in `apps/api/src/entities/`:
- `user.entity.ts` - User profile + encrypted Tesla tokens
- `vehicle.entity.ts` - Vehicle details + telemetry config
- `telegram-config.entity.ts` - Telegram chat IDs + link tokens
- `user-consent.entity.ts` - User consent tracking

### Frontend Architecture (Next.js App Router)
- **Server-Side Rendering** for SEO optimization
- All dashboard pages are in `apps/webapp/src/app/dashboard/`
- Protected routes use `useAuth` hook (`apps/webapp/src/lib/useAuth.ts`)
- i18n via `react-i18next` with language switcher component
- Tailwind CSS for styling (no CSS modules except `page.module.css`)

### Mobile Menu Pattern
The dashboard layout uses a **hamburger menu** for mobile (see `apps/webapp/src/app/dashboard/layout.tsx`):
- Hidden by default with `max-h-0 opacity-0`
- Animated slide-down with `transition-all duration-300 ease-in-out`
- Automatically closes when navigating (`setMobileMenuOpen(false)`)
- Toggle button shows hamburger (☰) or close (×) icon

## Environment Configuration

### API (.env)
Critical environment variables:
- **Database**: `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_NAME`
- **Security**: `ENCRYPTION_KEY` (min 32 chars), `JWT_SECRET`
- **Tesla**: `TESLA_CLIENT_ID`, `TESLA_CLIENT_SECRET`, `TESLA_FLEET_TELEMETRY_SERVER_HOSTNAME`
- **Telegram**: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_MODE`, `TELEGRAM_WEBHOOK_BASE`
- **Kafka**: `KAFKA_BROKERS`, `KAFKA_TOPIC` (default: `FleetTelemetry_V`)
- **Rate Limiting**: See `apps/api/.env.example` for all `THROTTLE_*` variables

### WebApp (.env)
- WebApp typically gets API URL from build-time configuration
- Check `apps/webapp/next.config.js` for environment-specific settings

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

Messages use **Protobuf** format (see `@types/google-protobuf`). Key fields:
- `vin` - Vehicle Identification Number
- `data` - Telemetry payload containing Sentry Mode status
- Validation performed by `TelemetryValidationService`

## Nx Configuration

This is an Nx monorepo. Key points:
- Always run tasks through Nx: `npx nx <target> <project>`
- Use `nx affected` for CI optimization
- Project configurations in `apps/*/project.json`
- Use Nx MCP tools when available for workspace analysis

## Additional Documentation

- See [KAFKA-README.md](KAFKA-README.md) for Kafka setup
- See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines
- See [SECURITY.md](SECURITY.md) for security policies
