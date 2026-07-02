# Store privacy declarations — checklist (ops)

This checklist must stay **consistent** with the in-app iOS privacy manifest — declared in
`apps/mobile/app.json` under `expo.ios.privacyManifests` (Expo generates
`ios/SentryGuard/PrivacyInfo.xcprivacy` from it at prebuild; the `ios/` folder is gitignored) —
and the published Privacy Policy (`/[locale]/legal/privacy`).

Data the app actually collects (source of truth for both stores):

| Data | Why | Linked to user | Used for tracking |
|------|-----|----------------|-------------------|
| Email address | Account identity (from Tesla OAuth) | Yes | No |
| Name (display name) | Account identity (from Tesla OAuth) | Yes | No |
| Device ID (Expo push token) | Deliver push alerts to this device | Yes | No |
| Vehicle identifier (VIN) + Sentry events | Core monitoring feature | Yes | No |
| Diagnostics / crash data (if error monitoring is enabled) | Reliability & security | Yes | No |

No data is used for tracking (no cross-app/advertising tracking). No advertising identifiers.

---

## Apple — App Store Connect › App Privacy

1. **Privacy Policy URL**: `https://sentryguard.org/en/legal/privacy`
2. **Data collection**: "Yes, we collect data from this app."
3. Declare these data types, each **Linked to the user**, purpose **App Functionality**, **not** used for tracking:
   - Contact Info → Email Address
   - Contact Info → Name
   - Identifiers → Device ID
   - (If error monitoring is on) Diagnostics → Crash Data / Performance Data
4. **Tracking**: "No, we do not track."
5. Verify the answers match the privacy manifest in `app.json` (`expo.ios.privacyManifests`) exactly (same data types, `Linked=true`, `Tracking=false`, purpose `AppFunctionality`).
6. **Account deletion**: confirm the in-app "Delete my account" path (Settings → Delete my account) — required by Guideline 5.1.1(v).

## Google — Play Console › Data safety

1. **Privacy Policy URL**: same as above.
2. "Does your app collect or share any of the required user data types?" → **Yes**.
3. For each type below: collected = Yes, shared = No (providers act as processors), purpose = **App functionality**, **not** for tracking, and mark whether it is processed ephemerally or stored:
   - Personal info → Email address (stored)
   - Personal info → Name (stored)
   - Device or other IDs → Device ID / push token (stored)
   - App activity / app info & performance → diagnostics (if error monitoring is on)
4. **Data is encrypted in transit**: Yes.
5. **Users can request data deletion**: Yes → link the in-app deletion + `hello@sentryguard.org`.
6. Account deletion: declare the in-app account-deletion path and/or the web deletion URL.

## Sub-processors (current — keep this list updated, it can change)

Named in the Privacy Policy (stable, user-facing):
- **Expo** — push notification delivery
- **Telegram** — optional alert channel

Operational (described by function in the policy, named here for the DPA / store forms — may change):
- **Zeptomail (Zoho)** — transactional email
- **Oracle Cloud Infrastructure (OCI)** — logging
- **Rollbar** — error monitoring
- **Backblaze B2** — asset/object storage
- Hosting provider — _to confirm_

## After any change

Re-check this table, the iOS privacy manifest in `app.json` (`expo.ios.privacyManifests`), the Privacy Policy, and both store questionnaires
together — a mismatch between them is the most common cause of App Store rejection.
