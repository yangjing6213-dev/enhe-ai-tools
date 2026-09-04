FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

FROM node:24-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ARG DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build?schema=public
ARG APP_URL=https://www.enhe-tech.com.cn
ARG NEXT_PUBLIC_APP_URL=https://www.enhe-tech.com.cn
ARG AUTH_SECRET=build-only-auth-secret-do-not-use-at-runtime
ENV DATABASE_URL=$DATABASE_URL
ENV APP_URL=$APP_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV AUTH_SECRET=$AUTH_SECRET
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts
COPY deploy/enhe-ai-tools/scripts/app-entrypoint.sh ./app-entrypoint.sh
RUN chmod +x ./app-entrypoint.sh

EXPOSE 3000
CMD ["./app-entrypoint.sh"]
