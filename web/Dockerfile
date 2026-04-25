# syntax=docker/dockerfile:1
# Tidyboard Next.js web — multi-stage standalone build
# Produces a minimal runtime image using Next.js output: 'standalone'

# ── Stage 1: deps ─────────────────────────────────────────────────────────────
FROM node:22-alpine AS deps

RUN apk add --no-cache libc6-compat

WORKDIR /app

COPY package.json package-lock.json* ./
# --legacy-peer-deps: @storybook/nextjs@9.1.14+ supports next@16 in its peer
# range, but the v9 migration removed @storybook/addon-essentials and
# @storybook/addon-interactions as separate packages (folded into core
# storybook). Bumping to v9 requires updating .storybook/main.ts config, which
# is out of scope for this change. Re-evaluate when that migration is done.
# Storybook is dev-only; the flag has no effect on the production runtime image.
RUN npm ci --ignore-scripts --legacy-peer-deps

# ── Stage 2: builder ──────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build environment — these are build-time values only.
# Runtime values (NEXT_PUBLIC_API_URL etc.) are injected via ECS task env vars.
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build

# ── Stage 3: runner ───────────────────────────────────────────────────────────
FROM node:22-alpine AS runner

RUN apk add --no-cache wget && \
    addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nextjs

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Copy the standalone output (includes the node server + minimal node_modules)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
# Copy static assets (CSS, JS chunks, fonts)
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Copy public/ assets (icons, manifest.json, etc.)
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD wget -qO- http://localhost:3000/ || exit 1

CMD ["node", "server.js"]
