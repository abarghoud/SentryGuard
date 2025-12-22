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

