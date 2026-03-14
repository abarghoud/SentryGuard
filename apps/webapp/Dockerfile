FROM node:22-alpine AS base

RUN corepack enable && corepack prepare yarn@4.9.2 --activate
WORKDIR /app

FROM base AS dependencies

COPY package.json yarn.lock .yarnrc.yml ./
COPY apps/api/package.json ./apps/api/
COPY apps/webapp/package.json ./apps/webapp/
RUN yarn install --immutable

FROM dependencies AS build

ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_ROLLBAR_CLIENT_TOKEN
ARG NEXT_PUBLIC_VIRTUAL_KEY_PAIRING_URL
ARG NEXT_PUBLIC_DISCORD_URL

COPY nx.json tsconfig.base.json ./
COPY apps/webapp ./apps/webapp
RUN npx nx build webapp

FROM base AS production

RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup

COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/package.json ./package.json
COPY --from=build /app/apps/webapp/.next ./apps/webapp/.next
COPY --from=build /app/apps/webapp/public ./apps/webapp/public
COPY --from=build /app/apps/webapp/next.config.js ./apps/webapp/next.config.js
COPY --from=build /app/apps/webapp/package.json ./apps/webapp/package.json

USER appuser

EXPOSE 3000

CMD ["node_modules/.bin/next", "start", "apps/webapp"]