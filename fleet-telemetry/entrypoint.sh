#!/bin/bash
set -e

echo "🚀 Starting Fleet Telemetry entrypoint..."

mkdir -p /etc/fleet-telemetry/certs

if [ -z "$FLEET_TELEMETRY_CONFIG_B64" ]; then
    echo "❌ FLEET_TELEMETRY_CONFIG_B64 is not set"
    exit 1
fi
echo "$FLEET_TELEMETRY_CONFIG_B64" | base64 -d > /etc/fleet-telemetry/config.json
echo "✅ fleet-telemetry config decoded"

if [ -z "$FLEET_TELEMETRY_SERVER_CERT_B64" ]; then
    echo "❌ FLEET_TELEMETRY_SERVER_CERT_B64 is not set"
    exit 1
fi
echo "$FLEET_TELEMETRY_SERVER_CERT_B64" | base64 -d > /etc/fleet-telemetry/certs/fullchain.pem
echo "✅ server certificate decoded"

if [ -z "$FLEET_TELEMETRY_SERVER_KEY_B64" ]; then
    echo "❌ FLEET_TELEMETRY_SERVER_KEY_B64 is not set"
    exit 1
fi
echo "$FLEET_TELEMETRY_SERVER_KEY_B64" | base64 -d > /etc/fleet-telemetry/certs/privkey.pem
echo "✅ server key decoded"

if [ -n "$FLEET_TELEMETRY_CA_FILE_B64" ]; then
    echo "$FLEET_TELEMETRY_CA_FILE_B64" | base64 -d > /etc/fleet-telemetry/certs/test-vehicles-ca.crt
    echo "✅ CA file decoded"
fi

echo "🚀 Starting fleet-telemetry..."
exec /fleet-telemetry -config=/etc/fleet-telemetry/config.json
