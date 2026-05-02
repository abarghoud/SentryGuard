FROM node:22-alpine AS base

RUN corepack enable && corepack prepare yarn@4.9.2 --activate
WORKDIR /app

FROM base AS dependencies

COPY package.json yarn.lock .yarnrc.yml ./
COPY apps/api/package.json ./apps/api/
COPY apps/webapp/package.json ./apps/webapp/
COPY libs/beta/domain/package.json ./libs/beta/domain/

RUN yarn install --immutable

FROM dependencies AS builder

COPY . .

RUN npx nx build api
RUN npx nx copy-workspace-modules api
RUN npx nx prune-lockfile api

RUN cd apps/api && npx tsc -p tsconfig.migrations.json && \
    mkdir -p dist/migrations && \
    cp dist-migrations/migrations/*.js dist/migrations/

FROM base AS production

RUN apk add --no-cache tini
WORKDIR /app
ENV NODE_ENV=production
ENV WAITLIST_ENABLED=false

COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/node_modules ./dist/node_modules
COPY --from=builder /app/apps/api/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

RUN chmod +x /usr/local/bin/docker-entrypoint.sh && \
    find ./dist/node_modules -type d -name '.cache' -exec rm -rf {} + 2>/dev/null; \
    find ./dist/node_modules -type f -name '*.ts' -delete 2>/dev/null; \
    find ./dist/node_modules -type d -name 'test' -exec rm -rf {} + 2>/dev/null; \
    find ./dist/node_modules -type d -name 'tests' -exec rm -rf {} + 2>/dev/null; \
    find ./dist/node_modules -type d -name '__tests__' -exec rm -rf {} + 2>/dev/null; \
    true

RUN addgroup -g 1001 -S appgroup && adduser -u 1001 -S appuser -G appgroup
USER appuser

EXPOSE 3001
ENTRYPOINT ["tini", "--", "docker-entrypoint.sh"]
CMD ["node", "dist/main.js"]