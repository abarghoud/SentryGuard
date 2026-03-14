# Self-Hosting Guide

This guide walks you through deploying SentryGuard on your own infrastructure.

## Architecture Overview

SentryGuard requires the following services:

| Service | Role |
|---------|------|
| **PostgreSQL** | Database |
| **Apache Kafka** | Message broker for telemetry |
| **Fleet Telemetry** | Receives telemetry from Tesla vehicles |
| **Vehicle Command Proxy** | Sends commands to Tesla vehicles |
| **API** (NestJS) | Backend application |
| **WebApp** (Next.js) | Frontend application |

You can self-host everything via Docker Compose, or use managed services for PostgreSQL and Kafka — see the recommended providers below.

For hosting the API, WebApp and Vehicle Command Proxy, [Railway](https://railway.com?referralCode=75Ow5b) is a great option — it supports Docker and Node.js natively, handles TLS termination, and has a generous free tier. Coolify, Render, or any VPS with Docker work too.

## Prerequisites

- Docker and Docker Compose (for Fleet Telemetry and Vehicle Command Proxy at minimum)
- Node.js >= 20 (if running API/WebApp outside Docker)
- A [Tesla Developer Account](https://developer.tesla.com/) with Fleet API access
- A [Telegram Bot](https://core.telegram.org/bots#how-do-i-create-a-bot) token
- TLS certificates for Fleet Telemetry and Vehicle Command Proxy
- **Firewall/network**: Fleet Telemetry must be reachable from the internet (Tesla vehicles connect to it directly). Make sure the port you configure (`FLEET_TELEMETRY_PORT`) is open on your firewall and forwarded to the container

### TLS Certificates

Fleet Telemetry and Vehicle Command Proxy both require TLS certificates. Tesla vehicles connect directly to your Fleet Telemetry server over TLS, so a valid certificate is mandatory.

**Option A: Let's Encrypt (recommended)**

Use [Certbot](https://certbot.eff.org/) to get free certificates from Let's Encrypt. You need a domain name pointing to your server:

```bash
# Install Certbot
sudo apt install certbot  # Debian/Ubuntu

# Get a certificate (standalone mode — stops any service on port 80)
sudo certbot certonly --standalone -d telemetry.yourdomain.com

# Certificates are saved to:
# /etc/letsencrypt/live/telemetry.yourdomain.com/fullchain.pem  (server cert)
# /etc/letsencrypt/live/telemetry.yourdomain.com/privkey.pem    (private key)
```

Let's Encrypt certificates expire every 90 days. Set up auto-renewal:

```bash
sudo certbot renew --dry-run
```

If both services share the same domain, you can reuse the same certificate — just set the same base64 values for both:

| Fleet Telemetry | Vehicle Command Proxy |
|-----------------|----------------------|
| `FLEET_TELEMETRY_SERVER_CERT_B64` | `VEHICLE_COMMAND_TLS_CERT_B64` |
| `FLEET_TELEMETRY_SERVER_KEY_B64` | `VEHICLE_COMMAND_TLS_KEY_B64` |

If they use different subdomains, generate a separate certificate for each.

**Option B: Your hosting provider**

If you use a platform like Railway or Coolify, TLS termination is handled automatically for HTTP services (API, WebApp). However, Fleet Telemetry uses raw TLS (not HTTP), so you still need certificates for it.

> **Important:** Fleet Telemetry requires a certificate whose domain matches the hostname you register with Tesla's Fleet API. Self-signed certificates will **not** work — Tesla vehicles validate the certificate chain.

### Tesla Developer Account

1. Go to [developer.tesla.com](https://developer.tesla.com/) and sign in with your Tesla account
2. Create a new application with:
   - A **callback/redirect URI** — this must point to your **API** domain (e.g. `https://api.yourdomain.com/callback/auth`). This becomes your `TESLA_REDIRECT_URI`
   - **Allowed Origin(s)** — your WebApp domain (e.g. `https://app.yourdomain.com`)
3. Once approved, you'll receive your `TESLA_CLIENT_ID` and `TESLA_CLIENT_SECRET`

The Fleet Telemetry hostname is configured separately — it's defined in the API environment variables (`TESLA_FLEET_TELEMETRY_SERVER_HOSTNAME` and `TESLA_FLEET_TELEMETRY_SERVER_PORT`). When a user enables telemetry in the app, SentryGuard registers the telemetry configuration with Tesla automatically.

> **Note:** Tesla Developer Account approval can take a few days. Apply early in your setup process.

**Generating a command authentication key pair:**

```bash
# Generate a private key (used by Vehicle Command Proxy → VEHICLE_COMMAND_PRIVATE_KEY_B64)
openssl ecparam -name prime256v1 -genkey -noout -out private_key.pem

# Extract the public key
openssl ec -in private_key.pem -pubout -out public_key.pem
```

The public key must be served at `/.well-known/appspecific/com.tesla.3p.public-key.pem` — the API handles this automatically. Base64-encode the public key and set it as `TESLA_PUBLIC_KEY_BASE64`:

```bash
# Linux
cat public_key.pem | base64 -w 0

# macOS
cat public_key.pem | base64 | tr -d '\n'
```

Then register your domain with Tesla.

> **Important:** Your API must be deployed and publicly accessible before this step — come back here after completing [step 5 (API)](#5-api-nestjs). Tesla will fetch the public key from `https://yourdomain.com/.well-known/appspecific/com.tesla.3p.public-key.pem` during registration. If the endpoint is not reachable, registration will fail.

First, obtain a partner authentication token. Set `AUDIENCE` to the Fleet API URL of your region (see the [regions table](#environment-variables) in the API section):

```bash
CLIENT_ID="your_tesla_client_id"
CLIENT_SECRET="your_tesla_client_secret"
# Change this to match your region (see regions table below)
AUDIENCE="https://fleet-api.prd.na.vn.cloud.tesla.com"

curl --request POST \
  --header 'Content-Type: application/x-www-form-urlencoded' \
  --data-urlencode 'grant_type=client_credentials' \
  --data-urlencode "client_id=$CLIENT_ID" \
  --data-urlencode "client_secret=$CLIENT_SECRET" \
  --data-urlencode 'scope=openid vehicle_device_data vehicle_cmds vehicle_charging_cmds' \
  --data-urlencode "audience=$AUDIENCE" \
  'https://fleet-auth.prd.vn.cloud.tesla.com/oauth2/v3/token'
```

Use the `access_token` from the response to register your domain. **You must register in each region where your users have vehicles:**

```bash
TOKEN="your_access_token_from_above"

# North America, Asia-Pacific (excluding China)
curl -X POST "https://fleet-api.prd.na.vn.cloud.tesla.com/api/1/partner_accounts" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"domain": "yourdomain.com"}'

# Europe, Middle East, Africa
curl -X POST "https://fleet-api.prd.eu.vn.cloud.tesla.com/api/1/partner_accounts" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"domain": "yourdomain.com"}'

# China (requires a separate account on tesla.cn and a +86 phone number)
curl -X POST "https://fleet-api.prd.cn.vn.cloud.tesla.cn/api/1/partner_accounts" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"domain": "yourdomain.com"}'
```

Tesla will fetch the public key from your API's `.well-known` endpoint and register it.

> **Note:** You need a separate partner token for each region — change the `AUDIENCE` variable to match the region's Fleet API URL before requesting the token.

### Telegram Bot

1. Open Telegram and search for [@BotFather](https://t.me/BotFather)
2. Send `/newbot` and follow the prompts to create your bot
3. BotFather will give you a **bot token** — this is your `TELEGRAM_BOT_TOKEN`

SentryGuard uses this bot to send Sentry Mode alerts. Users link their Telegram account through the WebApp dashboard.

## 1. PostgreSQL

### Option A: Managed service (recommended)

For a personal vehicle or a small company fleet, a managed PostgreSQL service is the easiest path. The free tiers are more than enough:

- [Neon](https://neon.tech/) — 500 MB database, free tier
- [Supabase](https://supabase.com/) — 500 MB database, free tier

Both provide a connection string you can use directly in `DATABASE_HOST`, `DATABASE_USER`, etc. Enable SSL with `DATABASE_SSL=true`.

### Option B: Docker Compose

The included `docker-compose.yml` provides a PostgreSQL 16 instance with persistent storage:

```bash
cp .env.example .env
# Set POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB
docker compose up -d postgres
```

## 2. Apache Kafka

### Option A: Managed service (recommended)

A managed Kafka service avoids running your own broker. The free tiers handle personal and small fleet usage easily:

- [Confluent Cloud](https://www.confluent.io/confluent-cloud/) — 30 partitions, free tier

When using Confluent Cloud, configure the API with SASL authentication:

```env
KAFKA_BROKERS=pkc-xxxxx.region.provider.confluent.cloud:9092
KAFKA_SASL_MECHANISM=plain
KAFKA_SASL_USERNAME=your_api_key
KAFKA_SASL_PASSWORD=your_api_secret
```

Make sure the Fleet Telemetry `config.json` also points to your Confluent Cloud broker. Update the `kafka` section:

```json
"kafka": {
  "bootstrap.servers": "pkc-xxxxx.region.provider.confluent.cloud:9092",
  "security.protocol": "SASL_SSL",
  "sasl.mechanisms": "PLAIN",
  "sasl.username": "your_api_key",
  "sasl.password": "your_api_secret"
}
```

### Option B: Docker Compose

The included `docker-compose.yml` provides Kafka in KRaft mode (no Zookeeper required):

```bash
docker compose up -d kafka
```

The API connects to `kafka:29092` on the internal Docker network.

## 3. Fleet Telemetry

Fleet Telemetry receives vehicle telemetry data from Tesla and publishes it to Kafka.

An example configuration is provided in [`fleet-telemetry/config.example.json`](fleet-telemetry/config.example.json). Adapt it to your setup (Kafka broker address, port, TLS), then encode it.

> **Note:** The example config points to `kafka:29092` (Docker network). If you use Confluent Cloud, update the `kafka` section with your SASL credentials — see the [Kafka section](#2-apache-kafka) above for the correct format.

```bash
# Linux
cat fleet-telemetry/config.example.json | base64 -w 0

# macOS
cat fleet-telemetry/config.example.json | base64 | tr -d '\n'
```

Set the result as `FLEET_TELEMETRY_CONFIG_B64` in your `.env`, along with the TLS certificates:

| Variable | Description |
|----------|-------------|
| `FLEET_TELEMETRY_PORT` | Must match the `port` in your config JSON |
| `FLEET_TELEMETRY_CONFIG_B64` | Config JSON, base64-encoded |
| `FLEET_TELEMETRY_SERVER_CERT_B64` | Server certificate (fullchain.pem), base64-encoded |
| `FLEET_TELEMETRY_SERVER_KEY_B64` | Server private key, base64-encoded |

```bash
docker compose up -d fleet-telemetry
```

To verify Fleet Telemetry is running, check the logs:

```bash
docker compose logs fleet-telemetry
```

You should see a message indicating the server is listening on the configured port. You can also test the TLS connection from another machine:

```bash
openssl s_client -connect telemetry.yourdomain.com:4443
```

See [fleet-telemetry/README.md](./fleet-telemetry/README.md) for full documentation.

## 4. Vehicle Command Proxy

Vehicle Command Proxy allows SentryGuard to send commands to Tesla vehicles.

| Variable | Description |
|----------|-------------|
| `VEHICLE_COMMAND_TLS_KEY_B64` | TLS key, base64-encoded |
| `VEHICLE_COMMAND_TLS_CERT_B64` | TLS certificate, base64-encoded |
| `VEHICLE_COMMAND_PRIVATE_KEY_B64` | Private key for signing commands, base64-encoded (see [key generation](#tesla-developer-account)) |
| `VEHICLE_COMMAND_PORT` | Listening port (default: `4444`) |

```bash
docker compose up -d vehicle-command-proxy
```

To verify Vehicle Command Proxy is running:

```bash
docker compose logs vehicle-command-proxy
```

See [vehicle-command-proxy/README.md](./vehicle-command-proxy/README.md) for full documentation.

## 5. API (NestJS)

The API can be deployed using a pre-built Docker image, built from source, or on any platform that supports Node.js. The API is not included in `docker-compose.yml` because it is typically deployed on a hosting platform (Railway, Render, etc.) rather than on the same server as the infrastructure services.

### Option A: Pre-built Docker image (recommended)

A ready-to-use image is published to GitHub Container Registry on every push to `main` and on every release:

```bash
docker pull abarghoud/sentryguard-api:latest
```

Create your environment file and run:

```bash
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env with your values

docker run -d --env-file apps/api/.env -p 3001:3001 abarghoud/sentryguard-api:latest
```

To pin a specific version, use a release tag (e.g. `abarghoud/sentryguard-api:1.0.0`) or a commit SHA (e.g. `abarghoud/sentryguard-api:a1b2c3d`).

### Option B: Build from source (Docker)

If you prefer to build the image yourself:

```bash
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env with your values

docker build -f apps/api/Dockerfile -t sentryguard-api .
docker run -d --env-file apps/api/.env -p 3001:3001 sentryguard-api
```

### Option C: Node.js platform

Point your platform's build settings to the monorepo root and use these commands:

```bash
# Build
yarn install --immutable && npx nx build api

# Start
node apps/api/dist/main.js
```

### Environment variables

All API environment variables are read at **runtime**. Pass them via `--env-file`, `-e`, or your platform's environment settings.

See `apps/api/.env.example` for the full list. Required variables:

| Variable | Description |
|----------|-------------|
| `DATABASE_HOST` | PostgreSQL host (use `postgres` if in the same Docker network) |
| `DATABASE_USER` | PostgreSQL username |
| `DATABASE_PASSWORD` | PostgreSQL password |
| `DATABASE_NAME` | PostgreSQL database name |
| `DATABASE_SSL` | Enable SSL for database connection (set to `true` for managed services like Neon/Supabase) |
| `ENCRYPTION_KEY` | Encryption key for Tesla tokens (min 32 characters) |
| `JWT_SECRET` | Secret for JWT token signing (min 32 characters) |
| `JWT_OAUTH_STATE_SECRET` | Secret for OAuth state validation |
| `TESLA_CLIENT_ID` | Tesla OAuth client ID |
| `TESLA_CLIENT_SECRET` | Tesla OAuth client secret |
| `TESLA_REDIRECT_URI` | OAuth callback URL on the **API** (e.g. `https://api.yourdomain.com/callback/auth`) |
| `TESLA_AUDIENCE` | Tesla Fleet API endpoint for your region (see below) |
| `TESLA_PUBLIC_KEY_BASE64` | Public key for vehicle command authentication, base64-encoded (see [Tesla Developer Account](#tesla-developer-account)) |
| `TESLA_FLEET_TELEMETRY_SERVER_HOSTNAME` | Fleet Telemetry server hostname, without protocol (e.g. `telemetry.yourdomain.com`) |
| `TESLA_FLEET_TELEMETRY_SERVER_PORT` | Fleet Telemetry server port (default: `443`) |
| `KAFKA_BROKERS` | Kafka broker address (use `kafka:29092` for Docker, or your Confluent Cloud URL) |
| `KAFKA_SASL_MECHANISM` | SASL mechanism (set to `plain` for Confluent Cloud) |
| `KAFKA_SASL_USERNAME` | SASL username / API key (Confluent Cloud only) |
| `KAFKA_SASL_PASSWORD` | SASL password / API secret (Confluent Cloud only) |
| `LETS_ENCRYPT_CERTIFICATE` | CA certificate for Fleet Telemetry server, base64-encoded. Sent to Tesla so vehicles can verify TLS when connecting to your Fleet Telemetry server |
| `TELEGRAM_BOT_TOKEN` | Telegram Bot API token |
| `TESLA_API_BASE_URL` | URL of **your** Vehicle Command Proxy (not the Tesla API). Default: `https://tesla-vehicle-command:443` for Docker network |
| `WEBAPP_URL` | Your WebApp URL, used for CORS (e.g. `https://yourdomain.com`) |

**Tesla Fleet API regions:**

| Region | `TESLA_AUDIENCE` value |
|--------|------------------------|
| North America, Asia-Pacific (excluding China) | `https://fleet-api.prd.na.vn.cloud.tesla.com` |
| Europe, Middle East, Africa | `https://fleet-api.prd.eu.vn.cloud.tesla.com` |
| China | `https://fleet-api.prd.cn.vn.cloud.tesla.cn` |

All other variables (rate limiting, retry config, schedulers, etc.) have sensible defaults. See `apps/api/.env.example` for the full list.

> **Note:** The waitlist feature is disabled by default (`WAITLIST_ENABLED=false`). All users can sign up directly without approval. Set `WAITLIST_ENABLED=true` if you want to gate access (requires ZeptoMail configuration for welcome emails).

### Database migrations

> **Warning:** This step is mandatory. The API will not work without running migrations first.

Run migrations before starting the API for the first time, and after each update:

```bash
cd apps/api && npm run migration:run
```

### Verification

Once the API is running, check the health endpoint:

```bash
curl https://api.yourdomain.com/api/health
```

## 6. WebApp (Next.js)

The WebApp can be deployed using the provided Dockerfile or on any platform that supports Next.js (Vercel, Railway, Coolify, etc.).

### Option A: Docker

The `NEXT_PUBLIC_*` variables are baked into the JavaScript bundle at **build time**. Pass them as build arguments:

```bash
docker build -f apps/webapp/Dockerfile \
  --build-arg NEXT_PUBLIC_API_URL=https://api.yourdomain.com \
  -t sentryguard-webapp .

docker run -d -p 3000:3000 sentryguard-webapp
```

### Option B: Vercel / Node.js platform

Point your platform's build settings to the monorepo root and use these commands:

```bash
# Build
yarn install --immutable && npx nx build webapp

# Start
npx next start apps/webapp
```

### Environment variables

See `apps/webapp/.env.example` for the full list.

| Variable | Build/Runtime | Description |
|----------|---------------|-------------|
| `NEXT_PUBLIC_API_URL` | **Build** | API backend URL |
| `NEXT_PUBLIC_ROLLBAR_CLIENT_TOKEN` | **Build** | Rollbar client token (optional) |
| `NEXT_PUBLIC_VIRTUAL_KEY_PAIRING_URL` | **Build** | Virtual key pairing URL (optional) |
| `NEXT_PUBLIC_DISCORD_URL` | **Build** | Discord invite URL (optional) |
| `ROLLBAR_SERVER_TOKEN` | Runtime | Rollbar server token (optional) |

> **Important:** `NEXT_PUBLIC_*` variables must be available at build time. When using Docker, pass them with `--build-arg`. When using a platform like Vercel, set them in the project's environment settings before deploying.

## 7. Development Mode

To spin up the full infrastructure locally for development:

```bash
# Start infrastructure + mock message producer
docker compose --profile dev up -d

# Start the API (with hot-reload)
npx nx serve api

# Start the WebApp (with hot-reload)
npx nx serve webapp
```

The `dev` profile starts PostgreSQL, Kafka, and a **mock message producer** that simulates Tesla vehicles sending Sentry Mode telemetry events to Kafka every 20-40 seconds (with a 30% chance of generating a sentry alert). This lets you test the full alert pipeline without a real Tesla vehicle.

You can watch the mock events in real time:

```bash
docker compose logs -f message-producer
```
