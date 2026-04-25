FROM node:20-alpine AS builder
RUN corepack enable
WORKDIR /app

COPY . .

RUN yarn install --immutable

RUN npx nx build webapp

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/apps/webapp/.next/standalone ./
COPY --from=builder /app/apps/webapp/.next/static ./apps/webapp/.next/static
COPY --from=builder /app/apps/webapp/public ./apps/webapp/public

EXPOSE 3000
CMD ["node", "apps/webapp/server.js"]