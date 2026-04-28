# Self-Hosting SentryGuard with Docker

Complete guide to deploy SentryGuard on your own server (Synology NAS, VPS, etc.) using Docker Compose.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Prerequisites](#2-prerequisites)
3. [DNS & Reverse Proxy Setup](#3-dns--reverse-proxy-setup)
4. [Tesla Developer Setup](#4-tesla-developer-setup)
5. [Generate Certificates](#5-generate-certificates)
6. [Deploy with Docker Compose](#6-deploy-with-docker-compose)
7. [Post-Deployment Configuration](#7-post-deployment-configuration)
8. [Environment Variables Reference](#8-environment-variables-reference)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Architecture Overview

```
              ┌─────────────┐
              │    Users    │
              └──────┬──────┘
                     │ HTTPS
              ┌──────▼─────────┐
              │ Reverse Proxy  │
              │ (NPM/Caddy/    │
              │  Nginx/Traefik)│
              └──┬──────┬──────┘
                 │      │
        ┌────────▼┐  ┌──▼─────────┐
        │ Webapp  │  │    API     │
        │ :3000   │  │   :3001    │
        │(Next.js)│  │  (NestJS)  │
        └─────────┘  └──────┬─────┘
                            │
                     ┌──────┼──────┐
                     │      │      │
             ┌───────▼─┐ ┌──▼───┐ ┌▼───────┐
             │Postgres │ │Kafka │ │ Zookpr │
             │         │ │      │ │        │
             │  :5432  │ │:29092│ │ :2181  │
             └─────────┘ └──────┘ └────────┘

       ┌──────────────────────────────────┐
       │  fleet-telemetry :443  ◄── Tesla │
       │  vehicle-command :443  ──► Tesla │
       └──────────────────────────────────┘
               (on sentryguard network)
```

**Services:**
- **webapp**: Next.js frontend (internal port 3000)
- **api**: NestJS backend (internal port 3001)
- **postgres**: PostgreSQL database
- **kafka + zookeeper**: Message broker for telemetry data
- **fleet-telemetry**: Tesla Fleet Telemetry server (receives vehicle data, port 443)
- **vehicle-command**: Tesla Vehicle Command proxy (sends commands to vehicles, port 443)

**Docker network**: All services communicate on a `sentryguard` bridge network. Only API and webapp are exposed through the reverse proxy. Fleet-telemetry needs a public port for Tesla to connect.

---

## 2. Prerequisites

- A server with Docker and Docker Compose (Synology NAS, VPS, Raspberry Pi, etc.)
- A domain name (e.g., `yourdomain.com`)
- SSL certificates for your reverse proxy (Let's Encrypt, Cloudflare Origin, or self-signed)
- A Telegram bot token (from [@BotFather](https://t.me/BotFather))
- A Tesla Developer account (from [developer.tesla.com](https://developer.tesla.com))
- Port 11111 open on your firewall/router (for fleet-telemetry)

---

## 3. DNS & Reverse Proxy Setup

### 3.1 DNS Records

Create these DNS records pointing to your server:

| Record | Type | Target |
|--------|------|--------|
| `yourdomain.com` | A | Your server IP |
| `api.yourdomain.com` | A | Your server IP |
| `fleet-telemetry.yourdomain.com` | A | Your server IP |

> **Important**: If you use Cloudflare, set `fleet-telemetry.yourdomain.com` to **DNS only** (grey cloud). Cloudflare's proxy does not handle TLS connections on custom ports.

### 3.2 Reverse Proxy

You need a reverse proxy to terminate SSL for the webapp and API. Any of these will work:
- **Nginx Proxy Manager** (easiest for NAS users)
- **Caddy** (automatic HTTPS with Let's Encrypt)
- **Nginx** (manual configuration)
- **Traefik** (Docker-native)

Configure three proxy hosts:

| Subdomain | Upstream | Port | Notes |
|-----------|-----------|------|-------|
| `yourdomain.com` | `sentryguard-webapp` (or host:3020) | 3000 | Webapp |
| `api.yourdomain.com` | `sentryguard-api` (or host:3021) | 3001 | API |
| `fleet-telemetry.yourdomain.com` | Direct (port 11111) | 443 | No reverse proxy — Tesla connects directly |

> **Fleet telemetry**: Tesla connects to port 11111 with mutual TLS. Do NOT proxy this through your reverse proxy — expose port 11111 directly on your firewall/router and map it to the `sentryguard-fleet-telemetry` container.

### 3.3 SSL Certificates

For the webapp and API:
- Use Let's Encrypt (free, auto-renewing) or any valid SSL certificate
- If behind Cloudflare, use Cloudflare Origin certificates with "Full (strict)" SSL mode

For fleet-telemetry:
- The `generate-certs.sh` script generates self-signed CA + server certificates
- These are used internally between Tesla and your server — no public CA needed

---

## 4. Tesla Developer Setup

### 4.1 Create a Tesla Developer Application

1. Go to [developer.tesla.com](https://developer.tesla.com) and create an application
2. Set the **Redirect URI** to: `https://api.yourdomain.com/callback/auth`
3. Note your **Client ID** and **Client Secret**
4. Set the **Audience** based on your region:
   - Europe: `https://fleet-api.prd.eu.vn.cloud.tesla.com`
   - North America: `https://fleet-api.prd.na.vn.cloud.tesla.com`
   - Asia Pacific: `https://fleet-api.prd.cn.vn.cloud.tesla.com`

### 4.2 Register as a Fleet API Partner

After creating your application, register it as a partner:

```bash
# Get a client_credentials token first
curl -X POST https://auth.tesla.com/oauth2/v3/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials&client_id=YOUR_CLIENT_ID&client_secret=YOUR_CLIENT_SECRET&scope=openid+offline_access+vehicle_device_data+vehicle_cmds+vehicle_location&audience=https://fleet-api.prd.eu.vn.cloud.tesla.com"

# Register as partner
curl -X POST https://fleet-api.prd.eu.vn.cloud.tesla.com/api/1/partner_accounts \
  -H "Authorization: Bearer YOUR_CLIENT_CREDENTIALS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"domain":"yourdomain.com"}'
```

### 4.3 Upload Public Key to Your Domain

The Tesla well-known public key must be accessible at:
```
https://yourdomain.com/.well-known/appspecific/com.tesla.3p.public-key.pem
```

The API serves this key from the `TESLA_PUBLIC_KEY_BASE64` environment variable at the same path. You must configure your reverse proxy to forward requests to `/.well-known/` to the API container.

#### Nginx Proxy Manager (NPM)

Add a **Custom Location** to your webapp proxy host:

| Field | Value |
|-------|-------|
| Location path | `/.well-known/appspecific/` |
| Proxy pass | `http://<API_HOST>:3021` |
| Headers | See below |

Add these headers in the **Advanced** tab:

```nginx
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
```

---

## 5. Generate Certificates

You need `openssl` installed. Create the `fleet-telemetry/certs/` directory and run each step below.

### 5.1 Generate the CA Certificate

```bash
mkdir -p fleet-telemetry/certs
cd fleet-telemetry/certs

openssl ecparam -name prime256v1 -genkey -noout -out ca.key
openssl req -x509 -nodes -new -key ca.key \
  -subj "/CN=SentryGuard Fleet Telemetry CA" \
  -out ca.crt \
  -sha256 -days 3650 \
  -addext "basicConstraints=critical,CA:TRUE" \
  -addext "keyUsage=critical,keyCertSign,cRLSign"
```

### 5.2 Generate the Server Certificate (signed by CA)

Replace `fleet-telemetry.yourdomain.com` with your actual fleet-telemetry hostname:

```bash
FLEET_HOSTNAME=fleet-telemetry.yourdomain.com

openssl ecparam -name prime256v1 -genkey -noout -out tls.key

openssl req -new -key tls.key \
  -subj "/CN=${FLEET_HOSTNAME}" \
  -out tls.csr

openssl x509 -req -in tls.csr \
  -CA ca.crt \
  -CAkey ca.key \
  -CAcreateserial \
  -out tls.crt \
  -sha256 -days 3650 \
  -extfile <(printf "extendedKeyUsage=serverAuth\nkeyUsage=digitalSignature,keyAgreement\nsubjectAltName=DNS:${FLEET_HOSTNAME}")

rm -f tls.csr ca.srl
```

### 5.3 Generate the Tesla Command Key Pair

```bash
openssl ecparam -name prime256v1 -genkey -noout -out private-key.pem
openssl ec -in private-key.pem -pubout -out public-key.pem
```

### 5.4 Get the Environment Variable Values

```bash
echo "LETS_ENCRYPT_CERTIFICATE=$(cat ca.crt | base64 | tr -d '\n')"
echo "TESLA_PUBLIC_KEY_BASE64=$(cat public-key.pem | base64 | tr -d '\n')"
```

Save these two values — you'll need them in your `.env` file.

> **Important**: Register `public-key.pem` at [developer.tesla.com](https://developer.tesla.com) and serve it at `https://yourdomain.com/.well-known/appspecific/com.tesla.3p.public-key.pem` (the webapp proxies this path automatically).

### 5.5 Certificate Files Summary

| File | Purpose |
|------|---------|
| `ca.key` | Fleet Telemetry CA private key (**keep secret**) |
| `ca.crt` | Fleet Telemetry CA certificate (used by API and fleet-telemetry) |
| `tls.key` | Fleet Telemetry server private key |
| `tls.crt` | Fleet Telemetry server certificate (signed by CA) |
| `private-key.pem` | Tesla vehicle command private key (**keep secret**) |
| `public-key.pem` | Tesla vehicle command public key (register at Tesla + well-known URL) |

### 5.6 Copy Certificates to Your Server

```bash
# Example for Synology NAS
scp -r fleet-telemetry/ admin@your-server:/volume1/docker/sentryguard/fleet-telemetry/
```

---

## 6. Deploy with Docker Compose

### 6.1 Create the `.env` File

Copy the example file and fill in your values:

```bash
cp apps/api/.env.selfhost.example /volume1/docker/sentryguard/.env
```

Edit `/volume1/docker/sentryguard/.env` — all variables marked `REQUIRED` must be set, docker-compose will fail if any are missing.

### 6.2 Deploy

```bash
cd /volume1/docker/sentryguard

# Pull the latest images
docker compose -f docker-compose.selfhost.yml pull

# Start all services
docker compose -f docker-compose.selfhost.yml --env-file .env up -d

# Check logs
docker compose -f docker-compose.selfhost.yml logs -f
```

### 6.3 Verify Services

```bash
# Check all containers are running
docker compose -f docker-compose.selfhost.yml ps

# Check API health
curl -s http://localhost:3021/api/auth/status | head -c 100

# Check webapp
curl -s -o /dev/null -w "%{http_code}" http://localhost:3020
```

---

## 7. Post-Deployment Configuration

### 7.1 Virtual Key Pairing

After logging in for the first time:

1. Click "Pair Virtual Key" in the webapp
2. This opens Tesla's website — approve the key in the Tesla app on your phone
3. Return to SentryGuard and refresh vehicles

### 7.2 Verify Fleet Telemetry

From your local machine, test the fleet-telemetry endpoint:

```bash
curl -v --cacert fleet-telemetry/certs/ca.crt \
  --resolve fleet-telemetry.yourdomain.com:11111:YOUR_SERVER_IP \
  https://fleet-telemetry.yourdomain.com:11111/
```

You should get a TLS handshake (the connection may close quickly — that's normal, it's expecting mTLS).

### 7.3 Verify Vehicle Configuration

Check API logs to confirm telemetry configuration works:

```bash
docker logs sentryguard-api --tail 50 | grep -i "telemetry\|configur\|error"
```

When you enable telemetry for a vehicle, you should see:
```
✅ Telemetry configured for VIN: XXXXXXX
```

Common errors:

- **`ca is not a valid PEM`**: `LETS_ENCRYPT_CERTIFICATE` is empty or invalid. Regenerate with `base64 < fleet-telemetry/certs/ca.crt | tr -d '\n'` and set it in `.env`.
- **`invalid domain`**: `TESLA_FLEET_TELEMETRY_SERVER_HOSTNAME` must be just the hostname, no `https://` and no trailing `/`:
  ```
  ✅ fleet-telemetry.yourdomain.com
  ❌ https://fleet-telemetry.yourdomain.com/
  ```

### 7.4 Kafka Topic

The fleet-telemetry server sends vehicle data to the `FleetTelemetry_V` Kafka topic. Ensure it exists:

```bash
docker exec sentryguard-kafka kafka-topics --bootstrap-server localhost:9092 --list
```

If `FleetTelemetry_V` is not listed, create it:

```bash
docker exec sentryguard-kafka kafka-topics --bootstrap-server localhost:9092 \
  --create --topic FleetTelemetry_V --partitions 1 --replication-factor 1
```

> **Note**: `KAFKA_AUTO_CREATE_TOPICS_ENABLE=true` is set in docker-compose, so topics are created automatically.

---

## 8. Environment Variables Reference

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_PASSWORD` | PostgreSQL password (generate with `openssl rand -base64 24`) | Random string |
| `ENCRYPTION_KEY` | Token encryption key (min 32 chars) | Random 32+ char string |
| `JWT_SECRET` | JWT signing secret (min 32 chars) | Random 32+ char string |
| `JWT_OAUTH_STATE_SECRET` | OAuth state signing secret (min 32 chars) | Random 32+ char string |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token from @BotFather | `123456:ABC-DEF...` |
| `TELEGRAM_WEBHOOK_BASE` | API public URL for Telegram webhooks | `https://api.yourdomain.com` |
| `TELEGRAM_WEBHOOK_SECRET_PATH` | Random URL path (min 16 chars) | Random string |
| `TELEGRAM_WEBHOOK_SECRET_TOKEN` | Webhook verification token (min 24 chars) | Random string |
| `TESLA_CLIENT_ID` | Tesla Developer Client ID | From developer.tesla.com |
| `TESLA_CLIENT_SECRET` | Tesla Developer Client Secret | From developer.tesla.com |
| `TESLA_REDIRECT_URI` | OAuth callback URL | `https://api.yourdomain.com/callback/auth` |
| `TESLA_FLEET_TELEMETRY_SERVER_HOSTNAME` | Fleet telemetry hostname (no protocol) | `fleet-telemetry.yourdomain.com` |
| `LETS_ENCRYPT_CERTIFICATE` | Base64 of fleet-telemetry CA cert | Output from `generate-certs.sh` |
| `TESLA_PUBLIC_KEY_BASE64` | Base64 of Tesla public key | Output from `generate-certs.sh` |
| `WEBAPP_URL` | Webapp public URL (for CORS + redirects) | `https://yourdomain.com` |
| `CORS_ALLOWED_ORIGINS` | Additional CORS origins (comma-separated) | `https://yourdomain.com,https://api.yourdomain.com` |
| `NEXT_PUBLIC_API_URL` | API URL for webapp client-side calls (runtime) | `https://api.yourdomain.com` |
| `NEXT_PUBLIC_VIRTUAL_KEY_PAIRING_URL` | Tesla virtual key pairing URL (runtime) | `https://tesla.com/_ak/yourdomain.com` |

### Optional

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_USER` | `sentryguard` | PostgreSQL user |
| `DATABASE_NAME` | `sentryguard` | PostgreSQL database name |
| `DATABASE_SSL` | `false` | Enable SSL for DB connection |
| `DATABASE_RUN_MIGRATIONS` | `true` | Run migrations on startup |
| `TESLA_AUDIENCE` | `https://fleet-api.prd.eu.vn.cloud.tesla.com` | Tesla API audience (region) |
| `TESLA_FLEET_TELEMETRY_SERVER_PORT` | `11111` | Fleet telemetry external port |
| `KAFKA_TOPIC` | `FleetTelemetry_V` | Kafka topic for telemetry |
| `LOG_LEVEL` | `info` | Logging level (`debug`, `info`, `warn`, `error`) |
| `API_PORT` | `3021` | Host port for API |
| `WEBAPP_PORT` | `3020` | Host port for webapp |
| `FLEET_TELEMETRY_PORT` | `11111` | Host port for fleet-telemetry |
| `TESLA_KEY_NAME` | `sentryguard` | Name for the virtual key registration |
| `SENTRY_MODE_INTERVAL_SECONDS` | `30` | Sentry mode telemetry interval |
| `BREAK_IN_MONITORING_INTERVAL_SECONDS` | `30` | Break-in monitoring interval |

---

## 9. Troubleshooting

### API returns "ca is not a valid PEM"

The `LETS_ENCRYPT_CERTIFICATE` env var is empty or invalid. Regenerate:

```bash
base64 < fleet-telemetry/certs/ca.crt | tr -d '\n'
```

Copy the output and set it in your `.env`, then restart the API container.

### API returns "invalid domain"

`TESLA_FLEET_TELEMETRY_SERVER_HOSTNAME` must be just the hostname (no protocol, no trailing slash):

```
✅ fleet-telemetry.yourdomain.com
❌ https://fleet-telemetry.yourdomain.com/
```

### Telegram bot doesn't respond to buttons

Telegram limits `callback_data` to 64 bytes. If you see `BUTTON_DATA_INVALID` in logs, the callback data is too long. This has been fixed in recent versions by shortening prefixes.

### Fleet telemetry TLS errors

Verify the fleet-telemetry certificate is signed by the CA:

```bash
openssl verify -CAfile fleet-telemetry/certs/ca.crt fleet-telemetry/certs/tls.crt
```

### Database migration errors

The API runs migrations on startup. If you see migration errors:

```bash
docker logs sentryguard-api 2>&1 | grep -i "migration\|error"
```

### Vehicle configuration returns "Configuration skipped"

Possible reasons:
- `missing_key`: Virtual key not yet paired — click "Pair Virtual Key" in the webapp
- `unsupported_hardware`: Pre-2018 Model S/X don't support telemetry
- `unsupported_firmware`: Vehicle firmware needs updating
- `max_configs`: Too many telemetry configs already registered with Tesla

### Port conflicts on Synology

Synology NAS often uses port 443. The docker-compose maps:
- `3021:3001` (API)
- `3020:3000` (webapp)
- `11111:443` (fleet-telemetry)

Make sure these ports are available on your host.

### Reset everything

```bash
docker compose -f docker-compose.selfhost.yml down -v  # removes volumes too!
docker compose -f docker-compose.selfhost.yml --env-file .env up -d
```

> **Warning**: `-v` deletes the PostgreSQL data volume. Only use this for a fresh start.