FROM node:22-alpine AS build

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/api/package.json packages/api/package.json
COPY packages/web/package.json packages/web/package.json

RUN corepack enable \
    && corepack prepare pnpm@10.22.0 --activate \
    && pnpm install --filter @station/web... --frozen-lockfile

COPY packages/web packages/web

ARG VITE_API_URL=http://localhost:4000
ENV VITE_API_URL=${VITE_API_URL}

RUN pnpm --filter @station/web build

FROM nginx:1.27-alpine

COPY packages/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/packages/web/dist /usr/share/nginx/html

EXPOSE 80
