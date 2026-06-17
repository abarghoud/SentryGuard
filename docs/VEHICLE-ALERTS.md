# Vehicle Alerts

SentryGuard consumes Tesla's **Vehicle Alerts** stream (Fleet Telemetry record type `alerts`) to
detect security events that are **independent of the Sentry Mode screen state** and require **no
location data**:

| Alert type | Tesla alert name(s) | Severity | Meaning |
|------------|---------------------|----------|---------|
| `alarm` | `VCSEC_a133_alarmTriggered`, `BCCEN_w095_AlarmTriggered` | critical | The vehicle alarm is sounding (unauthorized use detected) |
| `intrusion_attempt` | `VCSEC_a211_handlePullWithoutAuth` | critical | A door handle was pulled without an authenticated device |

Unlike the break-in detector (which infers intrusion from `CenterDisplay = Lock` and therefore does
**not** fire while Sentry Mode is active), these alerts come as discrete, named events that work in
both modes.

## How it works

```
Vehicle ──(alert_types: ["service"])──▶ Fleet Telemetry server
   server ──(records: { alerts: ["logger","kafka"] })──▶ topic  FleetTelemetry_alerts
   API KafkaService ──(routes by topic)──▶ VehicleAlertHandlerService
        └─ JSON decode → allowlist filter (active alerts only) → dispatch ──▶ Telegram + push + history
```

- Alerts are **stateful**: each carries `startedAt` / `endedAt`. Only **active** alerts
  (`endedAt == null`) are dispatched.
- Names are matched against a central allowlist; everything else (thousands of diagnostic alerts in
  the `service` audience) is ignored.

## Configuration

### API (env)

| Variable | Purpose | To enable |
|----------|---------|-----------|
| `TELEMETRY_ALERT_TYPES` | Alert audiences requested from vehicles (added to the per-vehicle Fleet Telemetry config) | `service` |
| `KAFKA_ALERTS_TOPIC` | Topic the API consumes alerts from | `FleetTelemetry_alerts` |

Both default to empty → the feature is **off** until set.

### Fleet Telemetry server (`config.json`)

Route the `alerts` record type to Kafka (keep `logger` to also see raw alerts in the server logs):

```jsonc
"records": {
  "alerts": ["logger", "kafka"],
  "V": ["kafka"]
}
```

The topic `FleetTelemetry_alerts` is auto-created if the broker has
`auto.create.topics.enable=true`.

## Activation checklist

1. Set `alerts: ["logger", "kafka"]` in the server config and restart it.
2. Set `TELEMETRY_ALERT_TYPES=service` and `KAFKA_ALERTS_TOPIC=FleetTelemetry_alerts` on the API and restart it.
3. Re-push a vehicle's telemetry config (toggle monitoring off/on) so `alert_types` reaches Tesla.
4. Trigger an event and confirm the alert in Telegram / push and in the server logs.

## Extending / correcting the allowlist

The mapping lives in
[`apps/api/src/app/alerts/vehicle-alert/vehicle-alert.constants.ts`](../apps/api/src/app/alerts/vehicle-alert/vehicle-alert.constants.ts).
Add a `name → { type, severity }` entry to handle a new alert. New `type` values must also be added
to the `AlertEventType` enum (with a migration) and to the i18n / push text maps.

## Caveats

- Tesla alert **names are an internal, non-contractual namespace** — confirm them empirically on a
  real vehicle (the `logger` dispatcher prints decoded alerts) and treat the allowlist as
  "watch and adjust".
- Requesting the `service` audience streams a large volume of mostly-irrelevant diagnostic alerts;
  filtering happens in the consumer via the allowlist.
