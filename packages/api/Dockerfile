FROM node:22-bookworm-slim

ENV NODE_ENV=production \
    PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

RUN apt-get update \
    && apt-get install -y --no-install-recommends chromium ca-certificates fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/api/package.json packages/api/package.json
COPY packages/web/package.json packages/web/package.json

RUN corepack enable \
    && corepack prepare pnpm@10.22.0 --activate \
    && pnpm install --filter @station/api... --frozen-lockfile --prod=false

COPY packages/api packages/api

RUN pnpm --filter @station/api build \
    && chown -R node:node /app

USER node

EXPOSE 4000

CMD ["pnpm", "--filter", "@station/api", "start"]
