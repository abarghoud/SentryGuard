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

RUN npx nx build webapp

FROM node:22-alpine AS runner

RUN addgroup -g 1001 -S appgroup && adduser -u 1001 -S appuser -G appgroup

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/apps/webapp/.next/standalone ./
COPY --from=builder /app/apps/webapp/.next/static ./apps/webapp/.next/static
COPY --from=builder /app/apps/webapp/public ./apps/webapp/public

RUN chown -R appuser:appgroup /app
USER appuser

EXPOSE 3000

CMD ["node", "apps/webapp/server.js"]