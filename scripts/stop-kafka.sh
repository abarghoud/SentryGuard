#!/bin/bash

# Script to stop Kafka and associated services
# Usage: ./scripts/stop-kafka.sh

# Detect available docker compose command
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker-compose"
elif docker compose version &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker compose"
else
    echo "❌ Docker Compose is not installed."
    exit 1
fi

echo "🛑 Stopping all Kafka services..."
$DOCKER_COMPOSE_CMD down

echo "✅ Services stopped successfully!"
