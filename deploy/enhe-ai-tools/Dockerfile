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
ENV DATABASE_URL=$DATABASE_URL
ENV APP_URL=$APP_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:24-alpine AS runner
WORKDIR /app
ARG RELEASE_REF=local
LABEL org.opencontainers.image.revision=$RELEASE_REF
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN sed -i 's#dl-cdn.alpinelinux.org#mirrors.aliyun.com#g' /etc/apk/repositories \
    && apk add --no-cache python3

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/src ./src
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/deploy/enhe-ai-tools/scripts ./deploy/enhe-ai-tools/scripts
COPY deploy/enhe-ai-tools/scripts/app-entrypoint.sh ./app-entrypoint.sh
RUN chmod +x ./app-entrypoint.sh

EXPOSE 3000
CMD ["./app-entrypoint.sh"]
