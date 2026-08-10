# syntax=docker/dockerfile:1

# ---------- Base ----------
FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

# ---------- Dependencies (all, incl. dev) for building ----------
# No BuildKit cache mount: hosted builders (Railway) require the mount id to be
# prefixed with their own service id, which would pin this file to one provider.
# The `COPY` above already scopes the layer to the lockfile, so installs are only
# re-run when dependencies actually change.
FROM base AS deps
COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm install --frozen-lockfile

# ---------- Build ----------
FROM base AS build
COPY package.json pnpm-lock.yaml .npmrc ./
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# ---------- Migrator (deps + source; runs migrations + raw SQL) ----------
# Kept separate from the runtime image: needs dev deps (drizzle-kit, ts-node)
# and the source (migrations, drizzle config, scripts). Invoked as a one-shot
# `migrate` service before the API starts (see docker-compose.yml).
FROM base AS migrator
COPY package.json pnpm-lock.yaml .npmrc ./
COPY --from=deps /app/node_modules ./node_modules
COPY . .
CMD ["pnpm", "db:deploy"]

# ---------- Production dependencies only ----------
# `--ignore-scripts` skips the `prepare` hook (husky), which is a devDependency
# and therefore absent from a `--prod` install. No production dependency needs a
# build script: `pnpm.onlyBuiltDependencies` allows esbuild alone, and esbuild is
# only pulled in by dev tooling.
FROM base AS prod-deps
COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

# ---------- Runtime ----------
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# Run as an unprivileged user.
RUN addgroup -S nodejs && adduser -S nestjs -G nodejs
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
USER nestjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT:-3000}/health/live" || exit 1
CMD ["node", "dist/main.js"]
