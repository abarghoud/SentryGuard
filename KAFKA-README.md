# 🚀 Kafka for TeslaGuard

Simple Docker configuration to simulate production environment.

## 🐳 Prerequisites

**Docker Desktop** installed (automatically includes Docker Compose).

Verify with:
```bash
docker --version
docker compose version
```

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  Message        │    │                  │    │                  │    │                 │
│  Producer       │───▶│   Apache Kafka    │───▶│   Zookeeper      │───▶│   NestJS API    │
│  (Docker)       │    │   (Confluent)     │    │   (Coordination) │    │   (Consumer)    │
└─────────────────┘    └──────────────────┘    └──────────────────┘    └─────────────────┘
```

### Topics

The Fleet Telemetry server publishes two record types, each on its own topic (`<namespace>_<recordType>`):

| Topic | Record type | Consumed by | Purpose |
|-------|-------------|-------------|---------|
| `FleetTelemetry_V` | telemetry signals | `KafkaService` (default) | Sentry Mode + break-in detection |
| `FleetTelemetry_alerts` | named vehicle alerts | `VehicleAlertHandlerService` | Alarm + intrusion-attempt alerts (opt-in via `KAFKA_ALERTS_TOPIC`) |

The alerts topic is only consumed when `KAFKA_ALERTS_TOPIC` is set. See [docs/VEHICLE-ALERTS.md](docs/VEHICLE-ALERTS.md).

## 🚀 Quick Start

### 1. Start Kafka
```bash
npm run kafka:start
```

### 2. Start the API
```bash
npx nx serve api
```

### 3. Send a message
```bash
npm run kafka:send
```
Interactive interface to choose VIN and sentry mode state.

## 📋 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run kafka:start` | Starts Zookeeper + Kafka |
| `npm run kafka:send` | Interactive message sending |
| `npm run kafka:stop` | Stops everything |

## 🛑 Shutdown

```bash
npm run kafka:stop
```

