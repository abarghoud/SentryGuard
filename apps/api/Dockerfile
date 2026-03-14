FROM node:22-alpine AS base

RUN corepack enable && corepack prepare yarn@4.9.2 --activate
WORKDIR /app

FROM base AS dependencies

COPY package.json yarn.lock .yarnrc.yml ./
COPY apps/api/package.json ./apps/api/
COPY apps/webapp/package.json ./apps/webapp/
RUN yarn install --immutable

FROM dependencies AS build

COPY nx.json tsconfig.base.json ./
COPY apps/api ./apps/api
RUN npx nx build api
RUN npx nx prune api

FROM base AS production

COPY --from=build /app/apps/api/dist ./dist
WORKDIR /app/dist
RUN yarn install --immutable

RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup
USER appuser

ENV WAITLIST_ENABLED=false

EXPOSE 3001

CMD ["node", "main.js"]