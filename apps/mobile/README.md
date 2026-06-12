# SentryGuard Mobile

React Native app (Expo SDK 54) for iOS and Android that lets Tesla owners monitor vehicles, receive alerts, and manage their SentryGuard account from a phone.

## Features

- **Tesla OAuth** — login through the mobile browser auth flow with deep-link callback
- **Session persistence** — JWT stored in SecureStore (native) or localStorage (web); automatic refresh via `/auth/refresh-session`; automatic logout on expired session
- **Onboarding** — consent, vehicle detection, virtual key pairing, Sentry activation
- **Dashboard** — vehicle list, monitored/unprotected counters, virtual key banner, vehicle detail
- **Vehicle detail** — enable/disable Sentry alert, enable/disable intrusion alert (beta), horn offensive response (requires `vehicle_cmds` scope), virtual key pairing, telemetry deletion with confirmation
- **Alerts** — paginated alert history with All / Critical / Warning filters
- **Settings** — profile display, theme switcher (light/dark), language switcher (FR/EN synced with `/user/language`), push/Telegram/critical-only notification toggles, in-app Telegram linking, logout
- **Push notifications** — native Expo push with `sentryguard-alerts` Android channel, foreground display, device token registration
- **Hidden advanced settings** — tap "SentryGuard" 5 times on the login screen to reveal custom API URL and virtual key URL fields
- **i18n** — French (default) and English, synced with the API
- **Theming** — persistent light/dark mode stored in SecureStore (native) or localStorage (web)

## Technical Stack

| Layer | Technology |
|-------|-----------|
| Framework | Expo SDK 54, React Native 0.81, React 19 |
| Language | TypeScript (strict) |
| Navigation | React Navigation (native stack) + horizontal ScrollView pager |
| Data fetching | React Query (TanStack) |
| i18n | i18next + react-i18next |
| Persistence | expo-secure-store (native), localStorage (web) |
| Push | expo-notifications, expo-device |
| Auth | expo-web-browser (OAuth session), expo-linking (deep links) |
| Build | EAS, Nx workspace |

## Source Structure

```
apps/mobile/
├── app.json
├── eas.json
├── index.js                         # registerRootComponent(App)
├── metro.config.js                  # Nx + SVG transformer
├── package.json
├── .env.example
├── .env.local                       # gitignored, create from .env.example
├── tsconfig.json
├── tsconfig.app.json
└── src/
    ├── core/
    │   ├── App.tsx                  # QueryClientProvider, ThemeProvider, init flow
    │   ├── MobileShell.tsx          # Auth/onboarding/main routing, tab pager, back handler
    │   ├── navigation.ts           # AppTab enum, RootStackParamList types
    │   ├── theme.tsx               # ThemeProvider, useTheme, ThemeMode, ThemeColors
    │   ├── theme-storage.ts        # SecureStore/localStorage persistence for theme
    │   └── i18n.ts                 # i18next init (fallback: fr)
    ├── screens/
    │   ├── AuthScreen.tsx          # Tesla OAuth + hidden advanced settings
    │   ├── OnboardingScreen.tsx    # Step-by-step onboarding flow
    │   ├── DashboardScreen.tsx     # Vehicle list, virtual key banner, summary tiles
    │   ├── VehicleDetailScreen.tsx # Sentry/intrusion/offensive toggles, key pairing
    │   ├── AlertsScreen.tsx        # Alert history with severity filters
    │   └── SettingsScreen.tsx      # Profile, theme, language, notifications, logout
    ├── services/
    │   ├── api/
    │   │   ├── api-client.ts       # requestApi<T>, ApiError, JWT refresh, URL config
    │   │   ├── api-url-storage.ts  # SecureStore/localStorage for API URL + virtual key URL
    │   │   ├── token-state.ts      # In-memory access token + subscriber pattern
    │   │   ├── auth-api.ts         # getTeslaLoginUrl, getTeslaScopeChangeUrl, getAuthProfile
    │   │   ├── alerts-api.ts       # getAlerts
    │   │   ├── consent-api.ts      # getConsentStatus, getConsentText, acceptConsent
    │   │   ├── notifications-api.ts # getNotificationPreferences, updateNotificationPreferences, registerPushToken
    │   │   ├── onboarding-api.ts  # getOnboardingStatus, completeOnboarding, skipOnboarding
    │   │   ├── telegram-api.ts    # getTelegramStatus, generateTelegramLink, sendTelegramTestMessage
    │   │   ├── user-language-api.ts # getUserLanguage, updateUserLanguage
    │   │   ├── vehicles-api.ts    # getVehicles, configureTelemetry, deleteTelemetryConfig, toggleBreakInMonitoring, updateOffensiveResponse
    │   │   └── virtual-key.ts     # resolveVirtualKeyUrl, getCustomVirtualKeyPairingUrl, initializeVirtualKeyPairingUrl
    │   ├── notifications/
    │   │   └── push-notifications.ts # configurePushNotifications, requestExpoPushToken
    │   └── session/
    │       ├── useSession.ts       # React hook: load/store/clear JWT, isReady state
    │       └── token-storage.ts   # SecureStore/localStorage for JWT
    └── locales/
        ├── en.json
        └── fr.json
```

## Nx Commands

All commands run from the monorepo root with `yarn nx <target> mobile`.

| Target | Command | Description |
|--------|---------|-------------|
| `start` | `yarn nx start mobile` | Expo dev server (no web) |
| `serve` | `yarn nx serve mobile` | Expo web dev server (port 3002) |
| `run-ios` | `yarn nx run-ios mobile` | Run on iOS simulator |
| `run-android` | `yarn nx run-android mobile` | Run on Android device/emulator |
| `build` | `yarn nx build mobile` | EAS build |
| `export` | `yarn nx export mobile` | Export all platforms to `apps/mobile/dist` |
| `prebuild` | `yarn nx prebuild mobile` | Prebuild native dirs |
| `typecheck` | `yarn nx typecheck mobile` | TypeScript check (`tsconfig.app.json`, no emit) |

Alternative without Nx:

```bash
cd apps/mobile
yarn expo start          # dev server
yarn expo run:ios        # iOS
yarn expo run:android    # Android
```

## Environment Variables

Create `apps/mobile/.env.local` from `.env.example`:

```bash
EXPO_PUBLIC_API_URL=http://localhost:3001
EXPO_PUBLIC_VIRTUAL_KEY_PAIRING_URL=https://tesla.com/_ak/yourdomain.com
```

Variables prefixed `EXPO_PUBLIC_` are embedded in the client bundle at build time. **Do not store secrets in this file.**

### `EXPO_PUBLIC_API_URL`

SentryGuard API URL.

On physical devices, use the computer's LAN IP instead of `localhost`:

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.36:3001
```

On Expo Web, the browser origin must be allowed by the API CORS configuration.

### `EXPO_PUBLIC_VIRTUAL_KEY_PAIRING_URL`

Tesla virtual key pairing URL (`https://tesla.com/_ak/<your-domain>`).

If undefined and no custom URL is set in the hidden advanced settings, the virtual key button shows a configuration error.

## Architecture

### App Initialization

`App` renders `ThemeProvider` > `ThemedAppContent`. The boot sequence:

1. `configurePushNotifications()` — sets notification handler and Android channel
2. `initializeApiUrl()` — reads stored custom API URL from SecureStore/localStorage
3. `initializeVirtualKeyPairingUrl()` — reads stored custom virtual key URL
4. A loading screen shows until both initializations complete
5. `MobileShell` loads, reads the stored JWT, and routes to Auth / Onboarding / Main

### Navigation

`MobileShell` uses a single `NativeStack` with three possible screens:

- **Auth** — when no JWT is stored
- **Onboarding** — when JWT exists but onboarding is incomplete
- **Main** — horizontal `ScrollView` pager with three tabs: Dashboard, Alerts, Settings

`VehicleDetailScreen` overlays the Main screen when a vehicle is selected.

`BackHandler` intercepts hardware back: closes vehicle detail first, then switches to Dashboard tab, then falls through to system default.

### API Client

`requestApi<T>(endpoint, options)` in `api-client.ts`:

1. Reads the in-memory access token from `token-state.ts`
2. Prepends the configured API URL to the endpoint
3. Attaches `Authorization: Bearer <token>` when present
4. On `401`: attempts `/auth/refresh-session`; on success stores the new JWT and replays the original request; on failure clears the session
5. On network error: throws `ApiError` with a user-friendly i18n message

### Token Lifecycle

```
Startup → useSession() reads JWT from SecureStore/localStorage → sets in-memory token
Auth callback → stores JWT → updates in-memory token → sets React state
Refresh → POST /auth/refresh-session → stores new JWT → updates in-memory token
Logout → removes stored JWT → clears in-memory token → resets React state
```

`token-state.ts` exposes a subscriber pattern (`subscribeAccessToken`) so `useSession` stays in sync with refresh operations from `api-client.ts`.

### Platform-Conditional Storage

All persistent storage uses `Platform.OS`:

| Data | Key | Web | Native |
|------|-----|-----|--------|
| JWT | `sentryguard.jwt` | `localStorage` | `SecureStore` |
| Theme mode | `sentryguard.themeMode` | `localStorage` | `SecureStore` |
| API URL | `sentryguard.apiUrl` | `localStorage` | `SecureStore` |
| Virtual key URL | `sentryguard.virtualKeyPairingUrl` | `localStorage` | `SecureStore` |

### Query Keys

React Query caches are keyed by purpose:

| Key | Used by |
|-----|---------|
| `['vehicles']` | Dashboard, VehicleDetail, Onboarding |
| `['alerts']` | AlertsScreen |
| `['auth-profile']` | MobileShell, Settings, VehicleDetail |
| `['auth', 'vehicle-commands-authorized']` | VehicleDetail |
| `['onboarding-status']` | MobileShell |
| `['consent-status']` | OnboardingScreen |
| `['consent-text', language]` | OnboardingScreen |
| `['telegram-status']` | SettingsScreen |
| `['notification-preferences']` | SettingsScreen |
| `['user-language']` | MobileShell, Settings |

### Theme System

`ThemeProvider` wraps the app and provides `useTheme()` / `useThemeColors()`.

Colors are defined as `darkColors` and `lightColors` objects with named tokens: `accent`, `accentText`, `background`, `border`, `control`, `critical`, `muted`, `panel`, `positive`, `surface`, `text`, `warning`.

The theme mode is stored persistently and read on mount. Default: light.

Navigation theme colors derive from the app theme via `createNavigationTheme()`.

### Internationalization

- Default/fallback language: **French** (`fr`)
- Supported languages: `en`, `fr`
- Change in Settings syncs with `PATCH /user/language`
- On mount, the app reads the stored language from `GET /user/language` and applies it

To add a language:
1. Add the JSON file in `src/locales/`
2. Register it in `src/core/i18n.ts`
3. Ensure the API accepts this language in `/user/language`
4. Translate all keys from `en.json`

### Deep Links

The configured scheme is `sentryguard`.

The mobile OAuth callback is built with `Linking.createURL('callback')`, which produces:

- Native: `sentryguard://callback`
- Expo dev: `exp://..../--/callback`
- Web: local URL

### React Query Pattern

All API modules export typed functions that wrap `requestApi<T>`. Components use `useQuery` for reads and `useMutation` for writes. On mutation success, relevant query caches are invalidated with `queryClient.invalidateQueries`.

## Authentication

### Mobile OAuth Flow

1. App calls `GET /auth/tesla/login?redirect_uri=<mobile-uri>`
2. API returns a Tesla auth URL with a signed `state`
3. `WebBrowser.openAuthSessionAsync` opens the Tesla login in a secure browser session
4. Tesla redirects to the API on `/callback/auth`
5. API exchanges the Tesla code for Tesla tokens
6. API creates/updates the user, then redirects to `mobileRedirectUri` with `#token=<jwt>`
7. App extracts the JWT from the callback URL and stores it

The API accepts these mobile redirect schemes: `sentryguard://`, `exp://`, `http://localhost`, `http://127.0.0.1`, `http://192.168.x.x`

### Token Extraction

`extractTokenFromCallbackUrl` parses the JWT from:
- `?token=<jwt>` query parameter
- `#token=<jwt>` hash fragment (fallback)

### Scope Upgrade

`getTeslaScopeChangeUrl(['vehicle_cmds'], redirectUri)` follows the same OAuth flow to request additional Tesla permissions for the horn offensive response.

## Onboarding

The mobile onboarding follows these sequential steps:

1. **Consent** — fetch consent text via `GET /consent/text?version=v1&locale=<lang>`, accept via `POST /consent/accept`
2. **Vehicle detection** — `GET /telemetry-config/vehicles`, refresh if empty
3. **Virtual key pairing** — opens Tesla URL in system browser, poll until `key_paired` is true
4. **Sentry activation** — `POST /telemetry-config/configure/<vin>`
5. **Completion** — `POST /onboarding/complete` or `POST /onboarding/skip`

Telegram is no longer part of onboarding — it is linked on demand from **Settings** (shown only when not yet linked).

Each step blocks until the previous one is satisfied. The flow can be skipped entirely.

## Push Notifications

### App Side

- `configurePushNotifications` sets the notification handler (sound, badge, alert)
- `requestExpoPushToken` requests iOS/Android permission then registers with Expo
- Token sent to `POST /notifications/push-token` with `{ token, platform }`
- Android channel: `sentryguard-alerts` (high importance, vibration pattern)

Push notifications cannot be fully validated on Expo Web. On Android, Expo Go is insufficient for final testing — use a development build.

### API Side

- Preferences stored in `notification_preferences`
- Tokens stored in `push_device_tokens`
- Push sent via `https://exp.host/--/api/v2/push/send`
- Includes `channelId`, `priority`, `sound`, `severity`
- Device tokens disabled when Expo returns `DeviceNotRegistered`

## Local Builds

### Prerequisites

- **Android**: Android SDK, NDK (see `android/app/build.gradle` for `ndkVersion`), Java 17+
- **iOS**: Xcode 16+, CocoaPods (`bundle exec pod install` in `apps/mobile/ios`)

### Android Debug APK (Gradle)

From `apps/mobile/android`:

```bash
./gradlew assembleDebug
```

Output: `apps/mobile/android/app/build/outputs/apk/debug/SentryGuard-debug.apk`

### Android Release APK (Gradle)

From `apps/mobile/android`:

```bash
./gradlew assembleRelease
```

Output: `apps/mobile/android/app/build/outputs/apk/release/SentryGuard-release.apk`

> The release build uses the debug keystore by default. For production, generate a signing keystore and update `android/app/build.gradle` `signingConfigs.release`.

### Android Install

```bash
adb install apps/mobile/android/app/build/outputs/apk/debug/SentryGuard-debug.apk
```

### iOS (Xcode)

Open `apps/mobile/ios/SentryGuard.xcworkspace` in Xcode, select a team and target, then Build & Run.

Alternatively from the command line:

```bash
cd apps/mobile && npx expo run:ios
```

### Clean

```bash
# Android
cd apps/mobile/android && ./gradlew clean

# iOS
cd apps/mobile/ios && pod deintegrate && bundle exec pod install
```

## EAS Configuration

### Expo Login

```bash
yarn expo login
```

### Initialize EAS

```bash
cd apps/mobile && yarn eas init
```

This links the app to an Expo project and provides a `projectId` required for reliable `ExpoPushToken` generation.

### Credentials

```bash
yarn eas credentials
```

- **Android**: EAS manages credentials. Push goes through FCM via Expo.
- **iOS**: Requires an Apple Developer account. Push goes through APNs via Expo.

### Export Compliance & Encryption (iOS)

When submitting to the App Store Connect, Apple asks about the encryption algorithms used in the app. SentryGuard only uses:
- Standard HTTPS/TLS for network requests (managed by iOS).
- Native Keychain storage via `expo-secure-store` (managed by iOS).

Because it only relies on the standard encryption built into Apple's OS, it qualifies for the **"Aucun des algorithmes mentionnés ci-dessus"** (None of the above) option, and does not require export compliance documentation.

To automate this and bypass the questionnaire on every submission, the property `"ITSAppUsesNonExemptEncryption": false` has been added to `ios.infoPlist` in [app.json](file:///Users/abarghoud-merci/WebstormProjects/TeslaGuard/apps/mobile/app.json).

### Builds

```bash
yarn eas build --profile development --platform android
yarn eas build --profile development --platform ios
yarn eas build --profile preview --platform android
yarn eas build --profile preview --platform ios
yarn eas build --profile production --platform android
yarn eas build --profile production --platform ios
```

### Submitting to Stores (TestFlight & Google Play Console)

To compile and automatically submit your build to the stores, you can use either the `--auto-submit` flag (which uses the submit profile of the same name as the build profile) or `--auto-submit-with-profile <profile>`:

#### For Testing / QA (iOS TestFlight & Android Internal Testing Track)
```bash
# Build and automatically submit to TestFlight (iOS)
yarn eas build --platform ios --profile production --auto-submit

# Build and automatically submit to Android Internal Testing (using preview submit profile)
yarn eas build --platform android --profile production --auto-submit-with-profile preview
```

#### For Public Release (App Store & Google Play Store Production)
```bash
# Submit to App Store (requires App Store Connect validation)
yarn eas build --platform ios --profile production --auto-submit

# Build and automatically submit to Android Production Track
yarn eas build --platform android --profile production --auto-submit
```

Alternatively, to submit a previously compiled build:

```bash
# Submit an existing build to TestFlight (iOS)
yarn eas submit --platform ios --profile production

# Submit an existing build to Android Internal Testing
yarn eas submit --platform android --profile preview

# Submit an existing build to Android Production
yarn eas submit --platform android --profile production
```

The submission destination (e.g. TestFlight for iOS, Internal vs Production track for Android) is configured in the `"submit"` section of your `eas.json`.

## Hidden Advanced Settings

Tap "SentryGuard" 5 times on the login screen to reveal:

- **Custom API address** — overrides `EXPO_PUBLIC_API_URL`
- **Custom virtual key URL** — overrides `EXPO_PUBLIC_VIRTUAL_KEY_PAIRING_URL`

Both are validated to start with `http://` or `https://`. The "Default" button clears custom values and falls back to the Expo environment variables.

Storage: SecureStore (native) or localStorage (web).

## API Endpoints

| Endpoint | Method | Used in |
|----------|--------|---------|
| `/auth/tesla/login` | GET | AuthScreen |
| `/auth/tesla/scope-change` | GET | VehicleDetailScreen |
| `/auth/refresh-session` | POST | api-client (automatic on 401) |
| `/auth/profile` | GET | MobileShell, Settings, VehicleDetail |
| `/auth/vehicle-commands-authorized` | GET | VehicleDetail |
| `/user/language` | GET | MobileShell, Settings |
| `/user/language` | PATCH | Settings |
| `/consent/current` | GET | OnboardingScreen |
| `/consent/text` | GET | OnboardingScreen |
| `/consent/accept` | POST | OnboardingScreen |
| `/onboarding/status` | GET | MobileShell, OnboardingScreen |
| `/onboarding/complete` | POST | OnboardingScreen |
| `/onboarding/skip` | POST | OnboardingScreen |
| `/telegram/status` | GET | SettingsScreen |
| `/telegram/generate-link` | POST | SettingsScreen |
| `/telegram/test-message` | POST | — (available in repo, no caller) |
| `/telemetry-config/vehicles` | GET | Dashboard, VehicleDetail, Onboarding |
| `/telemetry-config/configure/:vin` | POST | VehicleDetail, Onboarding |
| `/telemetry-config/:vin` | DELETE | VehicleDetail |
| `/telemetry-config/break-in-monitoring/:vin/:action` | POST | VehicleDetail |
| `/offensive-response/:vin` | PATCH | VehicleDetail |
| `/alerts` | GET | AlertsScreen |
| `/notifications/preferences` | GET | Settings |
| `/notifications/preferences` | POST | Settings |
| `/notifications/push-token` | POST | Settings |

## CORS in Development

On Expo Web or when using a LAN IP on a physical device, the API must allow the exact browser origin.

```bash
CORS_ALLOWED_ORIGINS=http://192.168.1.36:8081,http://192.168.1.36:19006,http://localhost:8081,http://localhost:19006
```

- The origin is the one shown by the browser.
- `localhost` on a phone is not the same as `localhost` on the computer.
- Restart the API after changing environment variables.

## Troubleshooting

### CORS blocks `/auth/tesla/login`

Check:
- The exact origin in the browser console
- `CORS_ALLOWED_ORIGINS` includes that origin
- The API was restarted
- The request targets the expected API URL

### Push does not work in Expo Go

Use a development build:

```bash
yarn eas build --profile development --platform android
```

### Incorrect virtual key URL

Check:
- `EXPO_PUBLIC_VIRTUAL_KEY_PAIRING_URL` in `.env.local`
- The hidden advanced settings value
- The Tesla domain format: `https://tesla.com/_ak/<your-domain>`

### Custom API URL is ignored

Check:
- The URL is saved in the hidden advanced settings
- The app was reloaded after saving
- The URL starts with `http://` or `https://`

### Session expired after token refresh

The API validates that the received bearer token matches the current `jwt_token` stored in the database. An old JWT replaced by a refresh is no longer accepted. Clear the app data and re-login.
