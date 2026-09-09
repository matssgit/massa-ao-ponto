# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS workspace

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable && corepack prepare pnpm@11.22.0 --activate

WORKDIR /workspace

FROM workspace AS dependencies

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/admin/package.json apps/admin/package.json
COPY apps/backend/package.json apps/backend/package.json
COPY apps/web/package.json apps/web/package.json
COPY automation/package.json automation/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/ui/package.json packages/ui/package.json

RUN pnpm install --filter backend... --frozen-lockfile

FROM dependencies AS build

COPY packages/config packages/config
COPY apps/backend apps/backend

RUN pnpm --filter backend build

FROM build AS migration

WORKDIR /workspace/apps/backend
CMD ["pnpm", "db:migrate"]

FROM build AS production-dependencies

RUN pnpm --filter backend deploy --prod --legacy /opt/backend

FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production

WORKDIR /app

COPY --from=production-dependencies --chown=node:node /opt/backend/package.json ./package.json
COPY --from=production-dependencies --chown=node:node /opt/backend/node_modules ./node_modules
COPY --from=build --chown=node:node /workspace/apps/backend/dist ./dist

USER node

EXPOSE 3333

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:'+(process.env.PORT||'3333')+'/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]

CMD ["node", "dist/server.js"]
