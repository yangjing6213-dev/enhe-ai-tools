FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY vendor/braces-3.0.4-enhe.0.tgz ./vendor/
RUN NODE_OPTIONS=--network-family-autoselection-attempt-timeout=5000 npm ci

FROM deps AS production-deps
RUN npm prune --omit=dev --ignore-scripts

FROM node:24-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ARG APP_URL=https://www.enhe-tech.com.cn
ARG NEXT_PUBLIC_APP_URL=https://www.enhe-tech.com.cn
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

COPY --from=production-deps /app/node_modules ./node_modules
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
# COPY preserves checkout permissions, including a restrictive release umask.
# Only code/build artifacts are present here; private uploads arrive as mounts.
RUN chmod -R a+rX /app \
    && chmod +x ./app-entrypoint.sh \
    && mkdir -p /app/.next/cache /app/runtime /app/logs /app/public/uploads /app/private-uploads/forum-media \
    && chown -R node:node /app/.next /app/runtime /app/logs /app/public/uploads /app/private-uploads

EXPOSE 3000
USER node
CMD ["./app-entrypoint.sh"]
