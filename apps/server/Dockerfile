FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@12.6.0 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/server/package.json ./apps/server/
COPY packages/env/package.json ./packages/env/
COPY packages/config/package.json ./packages/config/
RUN pnpm install --frozen-lockfile --filter server...

FROM base AS builder
COPY --from=deps /app /app
COPY packages ./packages
COPY apps/server ./apps/server
RUN pnpm --filter server build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable && corepack prepare pnpm@12.6.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/server/package.json ./apps/server/
COPY packages/env/package.json ./packages/env/
COPY packages/config/package.json ./packages/config/
RUN pnpm install --frozen-lockfile --filter server... --prod

COPY --from=builder /app/apps/server/dist ./apps/server/dist
COPY --from=builder /app/apps/server/drizzle ./apps/server/drizzle
COPY apps/server/drizzle.config.ts ./apps/server/drizzle.config.ts

WORKDIR /app/apps/server
EXPOSE 3000
CMD ["node", "dist/main.js"]
