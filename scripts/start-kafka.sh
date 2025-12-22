#!/bin/bash

# Script to start Kafka and message producer
# Usage: ./scripts/start-kafka.sh

    echo "🐳 Starting Kafka infrastructure (Zookeeper + Kafka)..."

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

    # Start Zookeeper and Kafka
    echo "🐳 Starting Zookeeper..."
    $DOCKER_COMPOSE_CMD up -d zookeeper

    echo "⏳ Waiting for Zookeeper to be ready..."
    sleep 5

    echo "🚀 Starting Kafka..."
    $DOCKER_COMPOSE_CMD up -d kafka

    echo "⏳ Waiting for Kafka to be fully operational..."
    sleep 15

    # Wait for group coordinator to be available
    echo "⏳ Checking group coordinator..."
for i in {1..20}; do
    if $DOCKER_COMPOSE_CMD exec kafka kafka-consumer-groups --bootstrap-server localhost:9092 --list > /dev/null 2>&1; then
        echo "✅ Kafka and group coordinator are operational!"
        break
    fi
    echo "⏳ Attempt $i/20 - Coordinator not yet available..."
    sleep 3
done

# Final verification
if ! $DOCKER_COMPOSE_CMD exec kafka kafka-topics --bootstrap-server localhost:9092 --list > /dev/null 2>&1; then
    echo "❌ Kafka still not accessible after all checks."
    echo ""
    echo "🔍 Troubleshooting:"
    echo "📊 Container status:"
    $DOCKER_COMPOSE_CMD ps
    echo ""
    echo "📊 Zookeeper logs:"
    $DOCKER_COMPOSE_CMD logs zookeeper | tail -5
    echo ""
    echo "📊 Kafka logs:"
    $DOCKER_COMPOSE_CMD logs kafka | tail -10
    echo ""
    echo "🔧 Solutions:"
    echo "   • Wait more: $DOCKER_COMPOSE_CMD logs -f kafka"
    echo "   • Restart: $DOCKER_COMPOSE_CMD restart"
    echo "   • Clean: $DOCKER_COMPOSE_CMD down && npm run kafka:start"
    exit 1
fi

echo "✅ Kafka infrastructure fully operational!"

    # Create topic if necessary
    echo "📝 Creating topic TeslaLogger_V..."
    $DOCKER_COMPOSE_CMD exec kafka kafka-topics \
      --create \
      --topic TeslaLogger_V \
      --bootstrap-server localhost:9092 \
      --partitions 1 \
      --replication-factor 1 \
      --if-not-exists || echo "⚠️ Topic may already exist"

    echo ""
    echo "🎯 Infrastructure ready! Now:"
    echo ""
    echo "1️⃣  Start your API:"
    echo "   npx nx serve api"
    echo ""
    echo "2️⃣  (Optional) Send a test message:"
    echo "   npm run kafka:send:interactive"
    echo ""
    echo "🛑 Stop: npm run kafka:stop"
