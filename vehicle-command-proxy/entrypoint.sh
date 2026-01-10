#!/bin/bash
set -e

echo "🚀 Starting Vehicle Command Proxy entrypoint..."

mkdir -p /config

if [ -z "$VEHICLE_COMMAND_TLS_KEY_B64" ]; then
    echo "❌ VEHICLE_COMMAND_TLS_KEY_B64 is not set"
    exit 1
fi
echo "$VEHICLE_COMMAND_TLS_KEY_B64" | base64 -d > /config/tls-key.pem
echo "✅ TLS key decoded"

if [ -z "$VEHICLE_COMMAND_TLS_CERT_B64" ]; then
    echo "❌ VEHICLE_COMMAND_TLS_CERT_B64 is not set"
    exit 1
fi
echo "$VEHICLE_COMMAND_TLS_CERT_B64" | base64 -d > /config/tls-cert.pem
echo "✅ TLS certificate decoded"

if [ -z "$VEHICLE_COMMAND_PRIVATE_KEY_B64" ]; then
    echo "❌ VEHICLE_COMMAND_PRIVATE_KEY_B64 is not set"
    exit 1
fi
echo "$VEHICLE_COMMAND_PRIVATE_KEY_B64" | base64 -d > /config/private-key.pem
echo "✅ Private key decoded"

HOST="${VEHICLE_COMMAND_HOST:-0.0.0.0}"
PORT="${VEHICLE_COMMAND_PORT:-443}"
VERBOSE="${VEHICLE_COMMAND_VERBOSE:-false}"

ARGS="-tls-key /config/tls-key.pem -cert /config/tls-cert.pem -key-file /config/private-key.pem -host $HOST -port $PORT"

if [ "$VERBOSE" = "true" ] || [ "$VERBOSE" = "1" ]; then
    ARGS="$ARGS -verbose"
fi

echo "🚀 Starting tesla-http-proxy with: $ARGS"
exec /usr/local/bin/tesla-http-proxy $ARGS
