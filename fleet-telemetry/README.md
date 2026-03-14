# Fleet Telemetry Docker Image

Custom Docker image to deploy [Tesla Fleet Telemetry](https://github.com/teslamotors/fleet-telemetry) without persistent volumes, using base64-encoded environment variables. Based on Ubuntu 22.04 for glibc binary compatibility.

## Configuration

Fleet Telemetry requires a JSON config file that defines the listening port, Kafka connection, TLS paths, and which record types to dispatch.

An example config is provided in [`config.example.json`](config.example.json). Key points:

- **`port`** must match `FLEET_TELEMETRY_PORT` in your `.env`
- **`namespace`** is the Kafka topic prefix — with `"FleetTelemetry"`, vehicle telemetry is published to `FleetTelemetry_V`
- **`kafka.bootstrap.servers`** should be `kafka:29092` when using docker-compose (internal Docker network)
- **`tls.server_cert`** and **`tls.server_key`** must stay as-is — the entrypoint writes the decoded certificates to these paths
- **`records.V`** must include `"kafka"` for telemetry data to reach SentryGuard

To use it:

```bash
# Adapt config.example.json to your needs, then encode it
cat config.example.json | base64 -w 0    # Linux
cat config.example.json | base64 | tr -d '\n'  # macOS

# Set the result as FLEET_TELEMETRY_CONFIG_B64 in your .env
```

For the full list of configuration options, see the [Tesla Fleet Telemetry documentation](https://github.com/teslamotors/fleet-telemetry).

## Environment Variables

### Required

| Variable | Description |
|----------|-------------|
| `FLEET_TELEMETRY_CONFIG_B64` | Fleet Telemetry JSON config, base64-encoded |
| `FLEET_TELEMETRY_SERVER_CERT_B64` | Server certificate (fullchain.pem), base64-encoded |
| `FLEET_TELEMETRY_SERVER_KEY_B64` | Server private key (privkey.pem), base64-encoded |

### Optional

| Variable | Description |
|----------|-------------|
| `FLEET_TELEMETRY_CA_FILE_B64` | CA file for test vehicles, base64-encoded |

### Encoding files to base64

```bash
# Linux
cat <file> | base64 -w 0

# macOS
cat <file> | base64 | tr -d '\n'
```

## Usage with docker-compose

This image is included in the root `docker-compose.yml`. Configure your `.env` file and run:

```bash
docker compose up fleet-telemetry
```

The listening port is defined inside your Fleet Telemetry JSON config. Make sure `FLEET_TELEMETRY_PORT` in your `.env` matches the port in your config.

## Standalone usage

```bash
docker run --rm -it \
  -e FLEET_TELEMETRY_CONFIG_B64="<your_config_base64>" \
  -e FLEET_TELEMETRY_SERVER_CERT_B64="<your_cert_base64>" \
  -e FLEET_TELEMETRY_SERVER_KEY_B64="<your_key_base64>" \
  -p 4443:4443 \
  abarghoud/sentryguard-fleet-telemetry:latest
```

## Building the image

The image supports **amd64** and **arm64** architectures via Docker Buildx.

### Prerequisites

- Docker Desktop >= 2.2.0 (Buildx included) or Docker Engine with Buildx plugin
- Logged in to Docker Hub: `docker login`

### Using the build script

```bash
# Build and push with latest tag
./build.sh

# Build and push with a specific version
./build.sh v1.0.0
```

### Manual Docker commands

```bash
# Create a multi-platform builder (once)
docker buildx create --name sentryguard-builder --driver docker-container --bootstrap

# Build and push for amd64 and arm64
docker buildx build \
  --builder sentryguard-builder \
  --platform linux/amd64,linux/arm64 \
  --tag abarghoud/sentryguard-fleet-telemetry:latest \
  --push \
  .
```

> **Note:** `--push` is required for multi-arch builds. Docker cannot load a multi-platform image into the local daemon with `--load`.

## Security

- **Non-root user**: Runs as a dedicated `fleetuser` user
- **Minimal permissions**: Only necessary files have execution permissions
- **Ubuntu 22.04 LTS**: Stable base image with glibc for binary compatibility
- **Built-in health check**: Automatic service health monitoring
- **Multi-stage build**: Reduced image size and build dependency isolation

## Troubleshooting

### Container does not start

Check logs for missing environment variables:
```bash
docker logs <container_id>
```

You should see the following messages on startup:
```
✅ fleet-telemetry config decoded
✅ server certificate decoded
✅ server key decoded
🚀 Starting fleet-telemetry...
```

### Base64 decoding errors

Make sure your files are encoded without line breaks:
```bash
# Linux
cat file.pem | base64 -w 0

# macOS
cat file.pem | base64 | tr -d '\n'
```