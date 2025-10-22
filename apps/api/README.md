# TeslaGuard API

API server for managing Tesla alerts via ZMQ and Telegram notifications.

## Features

- 🔌 **ZMQ Listening** : Receives telemetry messages via ZMQ on `tcp://10.0.2.12:5284`
- 📱 **Telegram Notifications** : Automatically sends Sentry alerts via Telegram
- 🚗 **Telemetry Configuration** : API to configure Tesla vehicle telemetry
- 🔐 **Tesla OAuth Authentication** : Multi-user authentication with Tesla Fleet API
- 🔍 **Monitoring** : Detailed logs of connections and messages

## Architecture

### Services

- **ZmqService** : Listens to ZMQ messages and processes Sentry alerts
- **TelegramService** : Sends formatted Telegram notifications
- **TelemetryConfigService** : Manages Tesla telemetry configuration
- **AuthService** : Handles Tesla OAuth 2.0 authentication and token management
- **TelemetryService** : Processes telemetry data

### API Endpoints

#### Authentication
- `GET /auth/tesla/login` - Generate Tesla OAuth login URL
- `GET /callback/auth` - OAuth callback endpoint (handled automatically)
- `GET /auth/user/:userId/status` - Check user authentication status
- `GET /auth/user/:userId/profile` - Get user Tesla profile information
- `GET /auth/stats` - Get authentication service statistics

#### Telemetry Configuration
- `GET /telemetry-config/vehicles` - List vehicles (supports `X-User-Id` header)
- `POST /telemetry-config/configure-all` - Configure all vehicles (supports `X-User-Id` header)
- `POST /telemetry-config/configure/:vin` - Configure specific vehicle (supports `X-User-Id` header)
- `GET /telemetry-config/check/:vin` - Check configuration (supports `X-User-Id` header)

## Configuration

Copy `env.example` to `.env` and configure:

```bash
# Telegram
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id

# Tesla API (Legacy - for backward compatibility)
ACCESS_TOKEN=your_tesla_access_token
LETS_ENCRYPT_CERTIFICATE=your_base64_certificate

# Tesla OAuth (Recommended for multi-user)
TESLA_CLIENT_ID=your_tesla_client_id
TESLA_CLIENT_SECRET=your_tesla_client_secret
TESLA_AUDIENCE=https://fleet-api.prd.na.vn.cloud.tesla.com
TESLA_REDIRECT_URI=https://sentryguard.org/callback/auth

# ZMQ
ZMQ_ENDPOINT=tcp://10.0.2.12:5284

# Rate Limiting (requests per minute per IP)
THROTTLE_TTL=60000
THROTTLE_LIMIT=20
```

## Security

### Rate Limiting

The API includes rate limiting protection to prevent abuse. By default:
- **20 requests per minute** per IP address
- Configurable via `THROTTLE_LIMIT` and `THROTTLE_TTL` environment variables

When rate limit is exceeded, the API returns:
- HTTP Status: `429 Too Many Requests`
- Header: `Retry-After: <seconds>`

**Adjusting rate limits:**
```bash
# Allow 50 requests per minute
THROTTLE_LIMIT=50
THROTTLE_TTL=60000

# Allow 100 requests per 5 minutes
THROTTLE_LIMIT=100
THROTTLE_TTL=300000
```

### SSL Configuration

The API communicates with `tesla-vehicle-command` over HTTPS with `rejectUnauthorized: false`. This is acceptable because:
- The service runs on a local Docker network
- Uses self-signed certificates
- ⚠️ **Never use this configuration for public Internet calls**

## Tesla OAuth Authentication

### Setting up OAuth

1. **Get OAuth credentials** from Tesla Developer Portal
2. **Configure environment variables** as shown above
3. **Start the API server**

### Authentication Flow

1. **Generate login URL:**
```bash
curl http://localhost:3000/auth/tesla/login
```

This returns a JSON response with:
- `url`: The Tesla OAuth authorization URL
- `state`: A security token (managed automatically)
- `message`: Instructions

2. **User authenticates:**
- Open the provided URL in a browser
- Log in with Tesla credentials
- Authorize the application

3. **Callback handling:**
- User is automatically redirected to `/callback/auth`
- The API exchanges the authorization code for access tokens
- The API automatically fetches the user's Tesla profile
- A success page displays the user's unique `userId`
- **Save this `userId` for API requests**

4. **Using authenticated endpoints:**

Include the `X-User-Id` header in your requests:

```bash
# List vehicles for authenticated user
curl -H "X-User-Id: YOUR_USER_ID" http://localhost:3000/telemetry-config/vehicles

# Configure telemetry
curl -X POST -H "X-User-Id: YOUR_USER_ID" http://localhost:3000/telemetry-config/configure-all
```

### Checking Authentication Status

```bash
curl http://localhost:3000/auth/user/YOUR_USER_ID/status
```

Returns:
- `authenticated`: boolean
- `expires_at`: token expiration date
- `has_profile`: boolean indicating if profile was fetched
- `message`: status description

### Getting User Profile

```bash
curl http://localhost:3000/auth/user/YOUR_USER_ID/profile
```

Returns the Tesla user profile information (email, name, etc.) that was automatically fetched during authentication.

### Notes

- Tokens are stored **in memory** and lost on server restart
- No automatic token refresh - users must re-authenticate when tokens expire
- Legacy `ACCESS_TOKEN` method still works if `X-User-Id` header is not provided
- Multiple users can authenticate simultaneously with different `userId`s

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
