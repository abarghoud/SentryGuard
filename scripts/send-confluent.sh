#!/bin/bash

# Interactive script to send manual message to Confluent Cloud Kafka
# Prerequisites: confluent CLI installed and authenticated
#   brew install confluentinc/tap/cli
#   confluent login
#   confluent environment use <env-id>
#   confluent kafka cluster use <cluster-id>
# Usage: ./scripts/send-confluent.sh

if ! command -v confluent &> /dev/null; then
    echo "confluent CLI is not installed."
    echo "Install it with: brew install confluentinc/tap/cli"
    exit 1
fi

DEFAULT_TOPIC="${KAFKA_TOPIC:-TOPIC_NAME}"

echo "Interactive Tesla Fleet API message sending (Confluent Cloud)"
echo ""

read -p "Kafka topic (or Enter for $DEFAULT_TOPIC): " TOPIC_INPUT
KAFKA_TOPIC="${TOPIC_INPUT:-$DEFAULT_TOPIC}"

read -p "Vehicle VIN (17 characters, or Enter to generate): " VIN
if [ -z "$VIN" ]; then
    VINS=('5YJ3E1EA8JF000000' '5YJ3E1EB2JF000001' '5YJ3E1EC9JF000002' '5YJ3E1FA0JF000003' '5YJ3E1FB1JF000004')
    VIN=${VINS[$((RANDOM % 5))]}
    echo "Generated VIN: $VIN"
fi

if [ ${#VIN} -ne 17 ]; then
    echo "Warning: VIN should be 17 characters (currently ${#VIN})"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Cancelled"
        exit 1
    fi
fi

echo ""
echo "Available sentry states:"
echo "  1) SentryModeStateAware    - Sentry alert (notification)"
echo "  2) SentryModeStateArmed    - Mode activated"
echo "  3) SentryModeStateOff      - Mode deactivated"
echo "  4) SentryModeStateIdle     - On standby"
echo "  5) SentryModeStatePanic    - Panic mode"
echo "  6) SentryModeStateQuiet    - Silent mode"
echo ""

read -p "Choose state (1-6, or Enter for alert): " CHOICE

case $CHOICE in
    1|"") SENTRY_STATE="SentryModeStateAware" ;;
    2) SENTRY_STATE="SentryModeStateArmed" ;;
    3) SENTRY_STATE="SentryModeStateOff" ;;
    4) SENTRY_STATE="SentryModeStateIdle" ;;
    5) SENTRY_STATE="SentryModeStatePanic" ;;
    6) SENTRY_STATE="SentryModeStateQuiet" ;;
    *) echo "Invalid choice"; exit 1 ;;
esac

TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)
MESSAGE=$(printf '{"vin":"%s","createdAt":"%s","isResend":false,"data":[{"key":"SentryMode","value":{"sentryModeStateValue":"%s"}}]}' \
  "$VIN" "$TIMESTAMP" "$SENTRY_STATE")

echo ""
echo "Sending message..."
echo "  VIN: $VIN"
echo "  State: $SENTRY_STATE"
echo "  Topic: $KAFKA_TOPIC"
echo ""

echo "$MESSAGE" | confluent kafka topic produce "$KAFKA_TOPIC"

echo ""
echo "Fleet API message sent successfully!"

if [ "$SENTRY_STATE" = "SentryModeStateAware" ]; then
    echo "If this VIN is registered in your app, you should receive a Telegram alert!"
fi
