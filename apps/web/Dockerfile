# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS dependencies

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable && corepack prepare pnpm@11.22.0 --activate

WORKDIR /workspace

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/admin/package.json apps/admin/package.json
COPY apps/backend/package.json apps/backend/package.json
COPY apps/web/package.json apps/web/package.json
COPY automation/package.json automation/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/ui/package.json packages/ui/package.json

RUN pnpm install --filter web... --frozen-lockfile

FROM dependencies AS build

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

COPY packages/config packages/config
COPY apps/web apps/web

RUN test -n "$VITE_API_URL" && pnpm --filter web build

FROM nginxinc/nginx-unprivileged:1.29-alpine AS runtime

COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/apps/web/dist /usr/share/nginx/html

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
