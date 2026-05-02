# Vehicle Command Proxy Docker Image

Custom Docker image to deploy [Tesla Vehicle Command Proxy](https://github.com/teslamotors/vehicle-command) without persistent volumes, using base64-encoded environment variables. Based on Ubuntu 22.04 for glibc binary compatibility.

## Environment Variables

### Required

| Variable | Description |
|----------|-------------|
| `VEHICLE_COMMAND_TLS_KEY_B64` | TLS key, base64-encoded |
| `VEHICLE_COMMAND_TLS_CERT_B64` | TLS certificate, base64-encoded |
| `VEHICLE_COMMAND_PRIVATE_KEY_B64` | Private key for signing commands, base64-encoded |

### Optional

| Variable | Default | Description |
|----------|---------|-------------|
| `VEHICLE_COMMAND_HOST` | `0.0.0.0` | Listening address |
| `VEHICLE_COMMAND_PORT` | `443` | Listening port |
| `VEHICLE_COMMAND_VERBOSE` | `false` | Enable verbose logging (`true` or `1`) |

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
docker compose up vehicle-command-proxy
```

## Standalone usage

```bash
docker run --rm -it \
  -e VEHICLE_COMMAND_TLS_KEY_B64="<your_tls_key_base64>" \
  -e VEHICLE_COMMAND_TLS_CERT_B64="<your_tls_cert_base64>" \
  -e VEHICLE_COMMAND_PRIVATE_KEY_B64="<your_private_key_base64>" \
  -e VEHICLE_COMMAND_VERBOSE="true" \
  -p 4444:4444 \
  abarghoud/sentryguard-vehicle-command:latest
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
  --tag abarghoud/sentryguard-vehicle-command:latest \
  --push \
  .
```

> **Note:** `--push` is required for multi-arch builds. Docker cannot load a multi-platform image into the local daemon with `--load`.

## Security

- **Non-root user**: Runs as a dedicated `vehicleuser` user
- **Minimal permissions**: Only necessary files have execution permissions
- **Ubuntu 22.04 LTS**: Stable base image with glibc for binary compatibility
- **Built-in health check**: Automatic service health monitoring
- **Multi-stage build**: Reduced image size and build dependency isolation

## Architecture

The image uses a multi-stage, multi-platform build:

1. **Stage 1**: Extracts the `tesla-http-proxy` binary from the official Tesla image for the target platform
2. **Stage 2**: Final Ubuntu 22.04 image with the binary and entrypoint script

This approach produces a native image for each architecture (amd64, arm64) without runtime emulation.

## Troubleshooting

### Container does not start

Check logs for missing environment variables:
```bash
docker logs <container_id>
```

You should see the following messages on startup:
```
✅ TLS key decoded
✅ TLS certificate decoded
✅ Private key decoded
🚀 Starting tesla-http-proxy with: [...]
```

### Base64 decoding errors

Make sure your files are encoded without line breaks:
```bash
# Linux
cat file.pem | base64 -w 0

# macOS
cat file.pem | base64 | tr -d '\n'
```

### Service not responding

Check that:
- The port is correctly mapped in docker-compose or in the `docker run` command
- The firewall allows connections on the configured port
- The TLS certificates are valid
