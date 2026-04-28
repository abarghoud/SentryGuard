FROM node:20-alpine AS builder
RUN corepack enable
WORKDIR /app

COPY . .

RUN yarn install --immutable

RUN npx nx build api
RUN npx nx copy-workspace-modules api
RUN npx nx prune-lockfile api

RUN cd apps/api && \
    npx tsc -p tsconfig.migrations.json && \
    mkdir -p dist/migrations && \
    cp dist-migrations/migrations/*.js dist/migrations/

FROM node:20-alpine AS runner
RUN apk add --no-cache tini
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/node_modules ./dist/node_modules
COPY --from=builder /app/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh && \
    find ./dist/node_modules -type d -name '.cache' -exec rm -rf {} + 2>/dev/null; \
    find ./dist/node_modules -type f -name '*.ts' -delete 2>/dev/null; \
    find ./dist/node_modules -type d -name 'test' -exec rm -rf {} + 2>/dev/null; \
    find ./dist/node_modules -type d -name 'tests' -exec rm -rf {} + 2>/dev/null; \
    find ./dist/node_modules -type d -name '__tests__' -exec rm -rf {} + 2>/dev/null; \
    true

EXPOSE 3001
ENTRYPOINT ["tini", "--", "docker-entrypoint.sh"]
CMD ["node", "dist/main.js"]