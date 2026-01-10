#!/bin/bash

# Test script to send SentryModeStateAware messages to VIN-1 (10 messages per second)
# Usage: ./scripts/send-test-aware.sh [seconds]
# If seconds is provided, runs for that many seconds and exits
# Otherwise runs indefinitely until interrupted

# Fixed VIN for testing
VIN="VIN-1"
SENTRY_STATE="SentryModeStateAware"
ICON="🚨"

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

echo "🧪 Test mode: Sending 10 SentryModeStateAware messages per second to $VIN"
echo "   Press Ctrl+C to stop"
echo ""

# Handle interrupt signal
trap 'echo ""; echo "🛑 Test stopped by user"; exit 0' INT

# Counter for messages sent
total_count=0
max_seconds=${1:-0}  # If no argument provided, run indefinitely

second=0
while true; do
    ((second++))
    start_time=$(date +%s)
    batch_count=0
    batch_success=0

    echo "📤 Second [$second] - Sending 10 messages..."

    # Generate all messages and send them in one batch
    messages=""
    for i in {1..200}; do
        ((batch_count++))
        ((total_count++))
        timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)
        message=$(printf '{"vin":"%s","createdAt":"%s","isResend":false,"data":[{"key":"SentryMode","value":{"sentryModeStateValue":"%s"}}]}' \
          "$VIN" "$timestamp" "$SENTRY_STATE")
        messages="${messages}${message}\n"
    done

    # Send all messages in one kafka-console-producer call
    echo -e "$messages" | $DOCKER_COMPOSE_CMD exec -T kafka kafka-console-producer \
      --bootstrap-server localhost:9092 \
      --topic TeslaLogger_V >/dev/null 2>&1

    if [ $? -eq 0 ]; then
        batch_success=10  # Assume all succeeded if command succeeded
    else
        batch_success=0
    fi

    # Calculate timing for this batch
    end_time=$(date +%s)
    duration=$((end_time - start_time))

    echo "   ✅ $batch_success/10 messages sent successfully (took ${duration}s)"

    # Check if we reached the maximum seconds
    if [ $max_seconds -gt 0 ] && [ $second -ge $max_seconds ]; then
        echo ""
        echo "🎯 Sent $total_count messages over $second seconds as requested"
        break
    fi

    # Wait to complete the second
    if [ $duration -lt 1 ]; then
        sleep_time=$((1 - duration))
        sleep $sleep_time
    fi
done

echo ""
echo "🚨 If $VIN is registered in your app, you should receive Telegram alerts!"