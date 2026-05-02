# Self-Hosting SentryGuard with Docker

Complete guide to deploy SentryGuard on your own server (Synology NAS, VPS, etc.) using Docker Compose.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Custom Docker Images](#2-custom-docker-images)
3. [Prerequisites](#3-prerequisites)
4. [DNS & Reverse Proxy Setup](#4-dns--reverse-proxy-setup)
5. [Kafka KRaft Mode](#5-kafka-kraft-mode)
6. [Tesla Developer Setup](#6-tesla-developer-setup)
7. [Generate Certificates](#7-generate-certificates)
8. [Deploy with Docker Compose](#8-deploy-with-docker-compose)
9. [Post-Deployment Configuration](#9-post-deployment-configuration)
10. [Environment Variables Reference](#10-environment-variables-reference)
11. [Troubleshooting](#11-troubleshooting)

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
                     ┌──────┴─────┐
                     │            │
             ┌───────▼─┐   ┌──────▼──────┐
             │Postgres │   │    Kafka    │
             │         │   │  (KRaft)    │
             │  :5432  │   │   :29092    │
             └─────────┘   └─────────────┘

       ┌───────────────────────────────────┐
       │  fleet-telemetry :8443  ◄── Tesla │
       │  vehicle-command :8443  ──► Tesla │
       └───────────────────────────────────┘
               (on sentryguard network)
```

**Services:**

- **webapp**: Next.js frontend (internal port 3000)
- **api**: NestJS backend (internal port 3001)
- **postgres**: PostgreSQL database
- **kafka**: Message broker for telemetry data (KRaft mode, no Zookeeper required)
- **fleet-telemetry**: Tesla Fleet Telemetry server (receives vehicle data, port 8443)
- **vehicle-command**: Tesla Vehicle Command service (sends commands to vehicles, port 8443)

**Docker network**: All services communicate on a `sentryguard` bridge network. Only API and webapp are exposed through the reverse proxy. Fleet-telemetry needs a public port for Tesla to connect.

---

## 2. Custom Docker Images

SentryGuard uses custom Docker images instead of the official Tesla images to simplify self-hosted deployment.

### Why custom images?

The official Tesla images (`tesla/vehicle-command`, `tesla/fleet-telemetry`) present several challenges for self-hosted deployment:

- **No base64 support**: No built-in mechanism to decode base64 environment variables into certificate files
- **Privileged port binding**: Cannot bind to port 443 without running as root — internal ports use 8443 instead
- **Complex configuration**: Require mounting volumes for certificates and config files

### Images used

| Image                                          | Description                                                               |
| ---------------------------------------------- | ------------------------------------------------------------------------- |
| `abarghoud/sentryguard-fleet-telemetry:latest` | Fleet Telemetry with base64 decoding and automatic certificate generation |
| `abarghoud/sentryguard-vehicle-command:latest` | Vehicle Command Proxy with base64 decoding and simplified configuration   |
| `ghcr.io/abarghoud/sentryguard-api:latest`     | NestJS API (pre-built)                                                    |
| `ghcr.io/abarghoud/sentryguard-webapp:latest`  | Next.js Webapp (pre-built)                                                |

### How they work

The custom images include an `entrypoint.sh` that:

1. **Decodes** `*_B64` environment variables (config, certificates, keys) into files
2. **Generates** configuration files in `/config/` or `/etc/fleet-telemetry/certs/`
3. **Launches** the service with the correct parameters

This approach allows passing all configuration via environment variables without mounting complex volumes.

---

## 3. Prerequisites

- A server with Docker and Docker Compose (Synology NAS, VPS, Raspberry Pi, etc.)
- A domain name (e.g., `yourdomain.com`)
- SSL certificates for your reverse proxy (Let's Encrypt, Cloudflare Origin, or self-signed)
- A Telegram bot token (from [@BotFather](https://t.me/BotFather))
- A Tesla Developer account (from [developer.tesla.com](https://developer.tesla.com))
- Port 11111 open on your firewall/router (for fleet-telemetry)

### 3.1 Alternatives (Managed Services)

If you prefer not to manage PostgreSQL and Kafka yourself, you can use free cloud services instead of the Docker containers:

| Service    | Alternative                                                   | Free tier     |
| ---------- | ------------------------------------------------------------- | ------------- |
| PostgreSQL | [Neon](https://neon.tech) or [Supabase](https://supabase.com) | 500 MB        |
| Kafka      | [Confluent Cloud](https://confluent.cloud)                    | 30 partitions |

**PostgreSQL (Neon example):**

Remove the `postgres` service from `docker-compose.selfhost.yml` and set these environment variables in the `api` service:

```env
DATABASE_HOST=your-project.neon.tech
DATABASE_PORT=5432
DATABASE_USER=your-user
DATABASE_PASSWORD=your-password
DATABASE_SSL=true
```

**Kafka (Confluent Cloud example):**

Remove the `kafka` service from `docker-compose.selfhost.yml` and update the `api` and `fleet-telemetry` configuration:

```env
# In .env
KAFKA_BROKERS=pkc-xxxxx.region.aws.confluent.cloud:9092
```

In `config.json`, replace the `kafka` section with SASL authentication:

```json
{
  "kafka": {
    "bootstrap.servers": "pkc-xxxxx.region.aws.confluent.cloud:9092",
    "security.protocol": "SASL_SSL",
    "sasl.mechanism": "PLAIN",
    "sasl.username": "your-api-key",
    "sasl.password": "your-api-secret"
  }
}
```

> **Note:** Using managed services means your data transits through third-party infrastructure. This is not full self-hosting, but simplifies operations for personal use.

---

## 4. DNS & Reverse Proxy Setup

### 4.1 DNS Records

Create these DNS records pointing to your server:

| Record                           | Type | Target         |
| -------------------------------- | ---- | -------------- |
| `yourdomain.com`                 | A    | Your server IP |
| `api.yourdomain.com`             | A    | Your server IP |
| `fleet-telemetry.yourdomain.com` | A    | Your server IP |

> **Important**: If you use Cloudflare, set `fleet-telemetry.yourdomain.com` to **DNS only** (grey cloud). Cloudflare's proxy does not handle TLS connections on custom ports.

### 4.2 Reverse Proxy

You need a reverse proxy to terminate SSL for the webapp and API. Any of these will work:

- **Nginx Proxy Manager** (easiest for NAS users)
- **Caddy** (automatic HTTPS with Let's Encrypt)
- **Nginx** (manual configuration)
- **Traefik** (Docker-native)

Configure three proxy hosts:

| Subdomain                        | Upstream                            | Port | Notes                                      |
| -------------------------------- | ----------------------------------- | ---- | ------------------------------------------ |
| `yourdomain.com`                 | `sentryguard-webapp` (or host:3020) | 3000 | Webapp                                     |
| `api.yourdomain.com`             | `sentryguard-api` (or host:3021)    | 3001 | API                                        |
| `fleet-telemetry.yourdomain.com` | Direct (port 11111)                 | 8443 | No reverse proxy — Tesla connects directly |

> **Fleet telemetry**: Tesla connects to port 11111 with mutual TLS. Do NOT proxy this through your reverse proxy — expose port 11111 directly on your firewall/router and map it to the `sentryguard-fleet-telemetry` container.

### 4.3 SSL Certificates

For the webapp and API:

- Use Let's Encrypt (free, auto-renewing) or any valid SSL certificate
- If behind Cloudflare, use Cloudflare Origin certificates with "Full (strict)" SSL mode

For fleet-telemetry:

- Self-signed CA + server certificates are generated manually — see [Section 7](#7-generate-certificates) for the step-by-step commands
- These are used internally between Tesla and your server — no public CA needed

---

## 5. Kafka KRaft Mode

### What is KRaft?

KRaft (Kafka Raft) is Kafka's built-in quorum mode that eliminates the need for Zookeeper. Since Kafka 3.4+, KRaft is stable and recommended for simple deployments.

### Why KRaft?

| Aspect                 | Zookeeper             | KRaft           |
| ---------------------- | --------------------- | --------------- |
| Components             | 2 (Kafka + Zookeeper) | 1 (Kafka only)  |
| Configuration          | Complex               | Simplified      |
| Resources              | More RAM/CPU          | Fewer resources |
| Single-node deployment | Not supported         | Supported       |
| Operational overhead   | Higher                | Lower           |

### Configuration in SentryGuard

The docker-compose uses these key KRaft variables:

```yaml
kafka:
  environment:
    KAFKA_NODE_ID: 1
    KAFKA_PROCESS_ROLES: broker,controller
    KAFKA_CONTROLLER_QUORUM_VOTERS: 1@kafka:29093
    KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: PLAINTEXT:PLAINTEXT,PLAINTEXT_HOST:PLAINTEXT,CONTROLLER:PLAINTEXT
    KAFKA_LISTENERS: PLAINTEXT://kafka:29092,CONTROLLER://kafka:29093,PLAINTEXT_HOST://0.0.0.0:9092
    KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:29092,PLAINTEXT_HOST://localhost:9092
    KAFKA_CONTROLLER_LISTENER_NAMES: CONTROLLER
    KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
    KAFKA_AUTO_CREATE_TOPICS_ENABLE: 'true'
    CLUSTER_ID: MkU3OEVBNTcwNTJENDM2Qk
```

### Critical variables

- **`KAFKA_PROCESS_ROLES: broker,controller`** — The node acts as both broker and controller
- **`KAFKA_CONTROLLER_LISTENER_NAMES: CONTROLLER`** — Required for KRaft mode; must match the controller listener name in `KAFKA_LISTENERS`
- **`CLUSTER_ID`** — Unique cluster ID (generate once with `uuidgen` or `openssl rand -hex 16`, do not change after first start)
- **`KAFKA_AUTO_CREATE_TOPICS_ENABLE: 'true'`** — Topics are created automatically when data arrives

### Verify Kafka is running

```bash
docker exec sentryguard-kafka kafka-broker-api-versions --bootstrap-server localhost:9092
```

If this command returns a list of API versions, Kafka is running correctly.

---

## 6. Tesla Developer Setup

### 6.1 Create a Tesla Developer Application

1. Go to [developer.tesla.com](https://developer.tesla.com) and create an application
2. Set the **Redirect URI** to: `https://api.yourdomain.com/callback/auth`
3. Note your **Client ID** and **Client Secret**
4. Set the **Audience** based on your region:
   - Europe: `https://fleet-api.prd.eu.vn.cloud.tesla.com`
   - North America: `https://fleet-api.prd.na.vn.cloud.tesla.com`
   - Asia Pacific: `https://fleet-api.prd.cn.vn.cloud.tesla.com`

### 6.2 Make the Public Key Accessible

> **⚠️ Do this before registering as a Fleet API partner.** When Tesla processes the partner registration request, it immediately fetches your public key to verify your domain. The API must be deployed and running first.

The Tesla well-known public key must be accessible at:

```
https://api.yourdomain.com/.well-known/appspecific/com.tesla.3p.public-key.pem
```

This endpoint serves the **public part** of the EC key pair you will generate in [Section 7.2](#72-generate-the-tesla-command-key-pair). The API serves it automatically from the `TESLA_PUBLIC_KEY_BASE64` environment variable. 

Since `api.yourdomain.com` already points to the API container via your reverse proxy, no additional configuration is needed — the endpoint is available out of the box once the API is deployed (see [Section 8](#8-deploy-with-docker-compose)).

You can verify it's working before proceeding:

```bash
curl https://api.yourdomain.com/.well-known/appspecific/com.tesla.3p.public-key.pem
```

It should return your PEM-encoded public key. Only then proceed to the next step.

### 6.3 Register as a Fleet API Partner

After your API is deployed and the public key is accessible, register your application as a partner. Tesla requires registering your domain in each region where your users have vehicles.

```bash
# Get a client_credentials token first (use your region-specific audience)
curl -X POST https://auth.tesla.com/oauth2/v3/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials&client_id=YOUR_CLIENT_ID&client_secret=YOUR_CLIENT_SECRET&scope=openid+offline_access+vehicle_device_data+vehicle_cmds+vehicle_location&audience=https://fleet-api.prd.eu.vn.cloud.tesla.com"

# Register in EACH region where your users have vehicles:

# North America, Asia-Pacific (excluding China)
curl -X POST "https://fleet-api.prd.na.vn.cloud.tesla.com/api/1/partner_accounts" \
  -H "Authorization: Bearer YOUR_CLIENT_CREDENTIALS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"domain":"api.yourdomain.com"}'

# Europe, Middle East, Africa
curl -X POST "https://fleet-api.prd.eu.vn.cloud.tesla.com/api/1/partner_accounts" \
  -H "Authorization: Bearer YOUR_CLIENT_CREDENTIALS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"domain":"api.yourdomain.com"}'

# China (requires a separate account on tesla.cn)
curl -X POST "https://fleet-api.prd.cn.vn.cloud.tesla.cn/api/1/partner_accounts" \
  -H "Authorization: Bearer YOUR_CLIENT_CREDENTIALS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"domain":"api.yourdomain.com"}'
```

> **Note:** Register only in the regions where your users have vehicles. If all your users are in one region, you only need to register with that region's endpoint.


---

## 7. Generate Certificates

You need three types of certificates:

1. **Public TLS certificate** (Let's Encrypt) — for `fleet-telemetry`. Tesla vehicles connect to this service from the internet and validate the certificate chain. **Self-signed certificates will not work for telemetry.**
2. **Internal TLS certificate** (Self-signed or reused) — for `vehicle-command`. This service is used internally by the API. While it requires TLS to start, it can use a self-signed certificate since the API is configured to skip verification for internal calls.
3. **EC key pair** — for vehicle command authentication (this one is always self-generated).

---

### 7.1 Get a TLS Certificate (Let's Encrypt)

Use [Certbot](https://certbot.eff.org/) to get free certificates for your `fleet-telemetry.yourdomain.com` domain. This is required for telemetry to work.

```bash
# Get a certificate (standalone mode)
sudo certbot certonly --standalone -d fleet-telemetry.yourdomain.com

# Certificates are saved to:
# /etc/letsencrypt/live/fleet-telemetry.yourdomain.com/fullchain.pem
# /etc/letsencrypt/live/fleet-telemetry.yourdomain.com/privkey.pem
```

> **Note:** You can reuse these same files for `vehicle-command` by encoding them into the `VEHICLE_COMMAND_TLS_*` variables. Even if the domain doesn't match, the API will accept them for internal communication.


Set up auto-renewal (Let's Encrypt certificates expire every 90 days):

```bash
sudo certbot renew --dry-run
```

> **Note:** If `fleet-telemetry` and `vehicle-command` share the same subdomain, you can reuse the same certificate for both.

---

### 7.2 Generate the Tesla Command Key Pair

This EC key pair is used to authenticate commands sent to Tesla vehicles. Unlike the TLS certificate, it does not need to come from a public CA — it is your application's identity key.

```bash
mkdir -p fleet-telemetry/certs
cd fleet-telemetry/certs

# Generate the private key (used by vehicle-command to sign commands)
openssl ecparam -name prime256v1 -genkey -noout -out private-key.pem

# Extract the public key (served at /.well-known/ and registered on developer.tesla.com)
openssl ec -in private-key.pem -pubout -out public-key.pem
```

---

### 7.3 Generate the Fleet Telemetry Config

Create the `config.json` file for fleet-telemetry. The cert paths reference the files decoded by the container's entrypoint from your base64 env vars:

```bash
cat > fleet-telemetry/config.json << 'EOF'
{
  "port": 8443,
  "kafka": {
    "brokers": ["kafka:29092"],
    "topic": "FleetTelemetry_V"
  },
  "logger": {
    "level": "info"
  },
  "server": {
    "server_cert": "/etc/fleet-telemetry/certs/fullchain.pem",
    "server_key": "/etc/fleet-telemetry/certs/privkey.pem"
  },
  "metrics": {
    "port": 9090
  }
}
EOF
```

---

### 7.4 Encode Everything to Base64

**Linux:**
```bash
# Fleet Telemetry
echo "FLEET_TELEMETRY_CONFIG_B64=$(base64 -w 0 fleet-telemetry/config.json)"
echo "FLEET_TELEMETRY_SERVER_CERT_B64=$(base64 -w 0 /etc/letsencrypt/live/fleet-telemetry.yourdomain.com/fullchain.pem)"
echo "FLEET_TELEMETRY_SERVER_KEY_B64=$(base64 -w 0 /etc/letsencrypt/live/fleet-telemetry.yourdomain.com/privkey.pem)"

# Vehicle Command Proxy (reuses the same TLS cert)
echo "VEHICLE_COMMAND_TLS_CERT_B64=$(base64 -w 0 /etc/letsencrypt/live/fleet-telemetry.yourdomain.com/fullchain.pem)"
echo "VEHICLE_COMMAND_TLS_KEY_B64=$(base64 -w 0 /etc/letsencrypt/live/fleet-telemetry.yourdomain.com/privkey.pem)"
echo "VEHICLE_COMMAND_PRIVATE_KEY_B64=$(base64 -w 0 fleet-telemetry/certs/private-key.pem)"

# API
echo "LETS_ENCRYPT_CERTIFICATE=$(base64 -w 0 /etc/letsencrypt/live/fleet-telemetry.yourdomain.com/fullchain.pem)"
echo "TESLA_PUBLIC_KEY_BASE64=$(base64 -w 0 fleet-telemetry/certs/public-key.pem)"
```

**macOS** (replace `-w 0` with `| tr -d '\n'`):
```bash
echo "FLEET_TELEMETRY_CONFIG_B64=$(base64 fleet-telemetry/config.json | tr -d '\n')"
# etc.
```

Save these values in your `.env` file.

---

### 7.5 Certificate Files Summary

| File | Purpose | Environment Variable |
| ---- | ------- | -------------------- |
| `fullchain.pem` (Let's Encrypt) | TLS certificate for fleet-telemetry + vehicle-command | `FLEET_TELEMETRY_SERVER_CERT_B64`, `VEHICLE_COMMAND_TLS_CERT_B64`, `LETS_ENCRYPT_CERTIFICATE` |
| `privkey.pem` (Let's Encrypt) | TLS private key | `FLEET_TELEMETRY_SERVER_KEY_B64`, `VEHICLE_COMMAND_TLS_KEY_B64` |
| `private-key.pem` | Tesla vehicle command private key (**keep secret**) | `VEHICLE_COMMAND_PRIVATE_KEY_B64` |
| `public-key.pem` | Tesla vehicle command public key | `TESLA_PUBLIC_KEY_BASE64` |
| `config.json` | Fleet Telemetry configuration | `FLEET_TELEMETRY_CONFIG_B64` |


---

## 8. Deploy with Docker Compose

### 8.1 Create the `.env` File

Copy the example file and fill in your values:

```bash
cp apps/api/.env.selfhost.example /volume1/docker/sentryguard/.env
```

Edit `/volume1/docker/sentryguard/.env` — all variables marked `REQUIRED` must be set, docker-compose will fail if any are missing.

### 8.2 Deploy

```bash
cd /volume1/docker/sentryguard

# Pull the latest images
docker compose -f docker-compose.selfhost.yml pull

# Start all services
docker compose -f docker-compose.selfhost.yml --env-file .env up -d

# Check logs
docker compose -f docker-compose.selfhost.yml logs -f
```

### 8.3 Verify Services

```bash
# Check all containers are running
docker compose -f docker-compose.selfhost.yml ps

# Check API health
curl -s http://localhost:3021/api/auth/status | head -c 100

# Check webapp
curl -s -o /dev/null -w "%{http_code}" http://localhost:3020
```

---

## 9. Post-Deployment Configuration

### 9.1 Virtual Key Pairing

After logging in for the first time:

1. Click "Pair Virtual Key" in the webapp
2. This opens Tesla's website — approve the key in the Tesla app on your phone
3. Return to SentryGuard and refresh vehicles

### 9.2 Verify Fleet Telemetry

From your local machine, test the fleet-telemetry endpoint:

```bash
curl -v --cacert fleet-telemetry/certs/ca.crt \
  --resolve fleet-telemetry.yourdomain.com:11111:YOUR_SERVER_IP \
  https://fleet-telemetry.yourdomain.com:11111/
```

You should get a TLS handshake (the connection may close quickly — that's normal, it's expecting mTLS).

### 9.3 Verify Vehicle Configuration

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

### 9.4 Kafka Topic

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

## 10. Environment Variables Reference

### Required

| Variable                                | Description                                                   | Example                                             |
| --------------------------------------- | ------------------------------------------------------------- | --------------------------------------------------- |
| `DATABASE_PASSWORD`                     | PostgreSQL password (generate with `openssl rand -base64 24`) | Random string                                       |
| `ENCRYPTION_KEY`                        | Token encryption key (min 32 chars)                           | Random 32+ char string                              |
| `JWT_SECRET`                            | JWT signing secret (min 32 chars)                             | Random 32+ char string                              |
| `JWT_OAUTH_STATE_SECRET`                | OAuth state signing secret (min 32 chars)                     | Random 32+ char string                              |
| `TELEGRAM_BOT_TOKEN`                    | Telegram bot token from @BotFather                            | `123456:ABC-DEF...`                                 |
| `TELEGRAM_WEBHOOK_BASE`                 | API public URL for Telegram webhooks                          | `https://api.yourdomain.com`                        |
| `TELEGRAM_WEBHOOK_SECRET_PATH`          | Random URL path (min 16 chars)                                | Random string                                       |
| `TELEGRAM_WEBHOOK_SECRET_TOKEN`         | Webhook verification token (min 24 chars)                     | Random string                                       |
| `TESLA_CLIENT_ID`                       | Tesla Developer Client ID                                     | From developer.tesla.com                            |
| `TESLA_CLIENT_SECRET`                   | Tesla Developer Client Secret                                 | From developer.tesla.com                            |
| `TESLA_REDIRECT_URI`                    | OAuth callback URL                                            | `https://api.yourdomain.com/callback/auth`          |
| `TESLA_FLEET_TELEMETRY_SERVER_HOSTNAME` | Fleet telemetry hostname (no protocol)                        | `fleet-telemetry.yourdomain.com`                    |
| `LETS_ENCRYPT_CERTIFICATE`              | Base64 of fleet-telemetry CA cert                             | Output from `generate-certs.sh`                     |
| `TESLA_PUBLIC_KEY_BASE64`               | Base64 of Tesla public key                                    | Output from `generate-certs.sh`                     |
| `WEBAPP_URL`                            | Webapp public URL (for CORS + redirects)                      | `https://yourdomain.com`                            |
| `CORS_ALLOWED_ORIGINS`                  | Additional CORS origins (comma-separated)                     | `https://yourdomain.com,https://api.yourdomain.com` |
| `NEXT_PUBLIC_API_URL`                   | API URL for webapp client-side calls (runtime)                | `https://api.yourdomain.com`                        |
| `NEXT_PUBLIC_VIRTUAL_KEY_PAIRING_URL`   | Tesla virtual key pairing URL (runtime)                       | `https://tesla.com/_ak/yourdomain.com`              |
| `NEXT_PUBLIC_ROLLBAR_CLIENT_TOKEN`      | Rollbar client-side error tracking token (runtime)            | —                                                   |
| `NEXT_PUBLIC_DISCORD_URL`               | Discord invite URL (runtime)                                  | `https://discord.gg/your-invite`                    |

### Optional

| Variable                               | Default                                       | Description                                      |
| -------------------------------------- | --------------------------------------------- | ------------------------------------------------ |
| `DATABASE_USER`                        | `sentryguard`                                 | PostgreSQL user                                  |
| `DATABASE_NAME`                        | `sentryguard`                                 | PostgreSQL database name                         |
| `DATABASE_SSL`                         | `false`                                       | Enable SSL for DB connection                     |
| `DATABASE_RUN_MIGRATIONS`              | `true`                                        | Run migrations on startup                        |
| `TESLA_AUDIENCE`                       | `https://fleet-api.prd.eu.vn.cloud.tesla.com` | Tesla API audience (region)                      |
| `TESLA_FLEET_TELEMETRY_SERVER_PORT`    | `11111`                                       | Fleet telemetry external port                    |
| `KAFKA_TOPIC`                          | `FleetTelemetry_V`                            | Kafka topic for telemetry                        |
| `LOG_LEVEL`                            | `info`                                        | Logging level (`debug`, `info`, `warn`, `error`) |
| `API_PORT`                             | `3021`                                        | Host port for API                                |
| `WEBAPP_PORT`                          | `3020`                                        | Host port for webapp                             |
| `FLEET_TELEMETRY_PORT`                 | `11111`                                       | Host port for fleet-telemetry                    |
| `TESLA_KEY_NAME`                       | `sentryguard`                                 | Name for the virtual key registration            |
| `SENTRY_MODE_INTERVAL_SECONDS`         | `30`                                          | Sentry mode telemetry interval                   |
| `BREAK_IN_MONITORING_INTERVAL_SECONDS` | `30`                                          | Break-in monitoring interval                     |

---

## 11. Troubleshooting

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
- `11111:8443` (fleet-telemetry)

Make sure these ports are available on your host.

### Reset everything

```bash
docker compose -f docker-compose.selfhost.yml down -v  # removes volumes too!
docker compose -f docker-compose.selfhost.yml --env-file .env up -d
```

> **Warning**: `-v` deletes the PostgreSQL data volume. Only use this for a fresh start.
