#!/bin/bash

# Interactive script to send manual message to Kafka
# Usage: ./scripts/send-interactive.sh

# Detect available docker compose command
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker-compose"
elif docker compose version &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker compose"
else
    echo "❌ Docker Compose is not installed."
    echo "💡 Install Docker Desktop from: https://www.docker.com/products/docker-desktop"
    exit 1
fi

# Check if Kafka is accessible
if ! $DOCKER_COMPOSE_CMD exec kafka kafka-topics --bootstrap-server localhost:9092 --list > /dev/null 2>&1; then
    echo "❌ Kafka is not accessible. Start first:"
    echo "  ./scripts/start-kafka.sh"
    exit 1
fi

echo "🚗 Interactive Tesla Fleet API message sending"
echo ""

# Ask for VIN
read -p "Vehicle VIN (17 characters, or Enter to generate): " VIN
if [ -z "$VIN" ]; then
    # Use a known valid Tesla VIN
    VINS=('5YJ3E1EA8JF000000' '5YJ3E1EB2JF000001' '5YJ3E1EC9JF000002' '5YJ3E1FA0JF000003' '5YJ3E1FB1JF000004')
    VIN=${VINS[$((RANDOM % 5))]}
    echo "🔧 Generated VIN: $VIN"
fi

# VIN validation
if [ ${#VIN} -ne 17 ]; then
    echo "⚠️ Warning: VIN should be 17 characters (currently ${#VIN})"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Cancelled"
        exit 1
    fi
fi

echo ""
echo "Available sentry states:"
echo "  1) SentryModeStateAware    # 🚨 Sentry alert (notification)"
echo "  2) SentryModeStateArmed    # ✅ Mode activated"
echo "  3) SentryModeStateOff      # ❌ Mode deactivated"
echo "  4) SentryModeStateIdle     # ⏸️ On standby"
echo "  5) SentryModeStatePanic    # 🚨 Panic mode"
echo "  6) SentryModeStateQuiet    # 🔇 Silent mode"
echo ""

# Ask for state
read -p "Choose state (1-6, or Enter for alert): " CHOICE

case $CHOICE in
    1|"") SENTRY_STATE="SentryModeStateAware"; ICON="🚨" ;;
    2) SENTRY_STATE="SentryModeStateArmed"; ICON="✅" ;;
    3) SENTRY_STATE="SentryModeStateOff"; ICON="❌" ;;
    4) SENTRY_STATE="SentryModeStateIdle"; ICON="⏸️" ;;
    5) SENTRY_STATE="SentryModeStatePanic"; ICON="🚨" ;;
    6) SENTRY_STATE="SentryModeStateQuiet"; ICON="🔇" ;;
    *) echo "❌ Invalid choice"; exit 1 ;;
esac

echo ""
echo "📤 Sending message..."
echo "   VIN: $VIN"
echo "   State: $ICON $SENTRY_STATE"

# Display message before sending
echo ""
echo "📝 Fleet API message:"
printf '{"vin":"%s","createdAt":"%s","isResend":false,"data":[{"key":"SentryMode","value":{"sentryModeStateValue":"%s"}}]}' \
  "$VIN" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$SENTRY_STATE" | \
jq . 2>/dev/null || \
printf '{"vin":"%s","createdAt":"%s","isResend":false,"data":[{"key":"SentryMode","value":{"sentryModeStateValue":"%s"}}]}' \
  "$VIN" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$SENTRY_STATE"

# Send message directly
printf '{"vin":"%s","createdAt":"%s","isResend":false,"data":[{"key":"SentryMode","value":{"sentryModeStateValue":"%s"}}]}' \
  "$VIN" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$SENTRY_STATE" | \
$DOCKER_COMPOSE_CMD exec -T kafka kafka-console-producer \
  --bootstrap-server localhost:9092 \
  --topic TeslaLogger_V

echo ""
echo "✅ Fleet API message sent successfully!"

if [ "$SENTRY_STATE" = "SentryModeStateAware" ]; then
    echo "🚨 If this VIN is registered in your app, you should receive a Telegram alert!"
fi
