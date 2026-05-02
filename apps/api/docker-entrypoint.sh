#!/bin/sh
set -e

DB_HOST="${DATABASE_HOST:-postgres}"
DB_PORT="${DATABASE_PORT:-5432}"
MAX_ATTEMPTS=30
ATTEMPT_INTERVAL=2

echo "Waiting for PostgreSQL at ${DB_HOST}:${DB_PORT}..."

attempt=1
while [ $attempt -le $MAX_ATTEMPTS ]; do
  if node -e " \
    const net = require('net'); \
    const client = net.createConnection(${DB_PORT}, '${DB_HOST}', () => { \
      client.end(); \
      process.exit(0); \
    }); \
    client.on('error', () => { client.destroy(); process.exit(1); }); \
    client.setTimeout(2000, () => { client.destroy(); process.exit(1); }); \
  " 2>/dev/null; then
    echo "PostgreSQL is ready!"
    exec "$@"
  fi
  echo "PostgreSQL is unavailable - sleeping... (${attempt}/${MAX_ATTEMPTS})"
  sleep $ATTEMPT_INTERVAL
  attempt=$((attempt + 1))
done

echo "PostgreSQL is not ready after ${MAX_ATTEMPTS} attempts. Exiting."
exit 1