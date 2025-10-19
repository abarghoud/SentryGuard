# TeslaGuard API

API server for managing Tesla alerts via ZMQ and Telegram notifications.

## Features

- 🔌 **ZMQ Listening** : Receives telemetry messages via ZMQ on `tcp://10.0.2.12:5284`
- 📱 **Telegram Notifications** : Automatically sends Sentry alerts via Telegram
- 🚗 **Telemetry Configuration** : API to configure Tesla vehicle telemetry
- 🔍 **Monitoring** : Detailed logs of connections and messages

## Architecture

### Services

- **ZmqService** : Listens to ZMQ messages and processes Sentry alerts
- **TelegramService** : Sends formatted Telegram notifications
- **TelemetryConfigService** : Manages Tesla telemetry configuration
- **TelemetryService** : Processes telemetry data

### API Endpoints

- `GET /telemetry-config/vehicles` - List vehicles
- `POST /telemetry-config/configure-all` - Configure all vehicles
- `POST /telemetry-config/configure/:vin` - Configure specific vehicle
- `GET /telemetry-config/check/:vin` - Check configuration

## Configuration

Copy `env.example` to `.env` and configure:

```bash
# Telegram
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id

# Tesla API
ACCESS_TOKEN=your_tesla_access_token
LETS_ENCRYPT_CERTIFICATE=your_base64_certificate

# ZMQ
ZMQ_ENDPOINT=tcp://10.0.2.12:5284
```

## Installation

```bash
npm install
# or
yarn install
```

## Starting

```bash
npm run start
# or
yarn start
```

## ZMQ Message Format

The service expects JSON messages in the following format:

```json
{
  "data": [
    {
      "key": "SentryMode",
      "value": {
        "stringValue": "Aware"
      }
    },
    {
      "key": "CenterDisplay", 
      "value": {
        "displayStateValue": "DisplayStateSentry"
      }
    }
  ],
  "createdAt": "2025-10-21T21:02:20.597791201Z",
  "vin": "YOUR_VEHICLE_VIN",
  "isResend": false
}
```

## Sentry Alerts

When `SentryMode` is set to `"Aware"`, a Telegram notification is automatically sent with:

- Vehicle VIN
- Alert timestamp
- Sentry mode state
- Center display state
- Location information (if available)

## Logs

The service logs all activities:
- ZMQ connections
- Received messages
- Processed alerts
- Sent notifications
- Configuration errors
