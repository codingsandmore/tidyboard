# Tidyboard Web — Deployment Guide

The `web/` directory is a Next.js application. It talks to the Go API server via
`NEXT_PUBLIC_API_URL`. This guide covers three hosting options.

---

## Environment Variables

| Variable | Description | Example |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Public URL of the Go API server | `https://api.tidyboard.example.com` |

Set these in your host's secret/env UI — never commit real values to the repo.

---

## Option 1 — Vercel (recommended for cloud)

1. Push `web/` (or the whole monorepo) to GitHub / GitLab.
2. Import the project in [vercel.com](https://vercel.com) — select the `web/` directory as root.
3. Vercel auto-detects Next.js and uses `npm run build`.
4. Add environment variables in **Project → Settings → Environment Variables**:
   - `NEXT_PUBLIC_API_URL` → your API server URL
5. Every push to `main` triggers a deployment automatically.

A `vercel.json` is pre-configured at `web/vercel.json` with security headers and
the correct build settings.

**Custom domain**: In Vercel dashboard → Domains → add your domain → follow DNS
instructions (usually a CNAME or A record).

---

## Option 2 — Cloudflare Pages

1. Install the Wrangler CLI: `npm install -g wrangler`
2. Log in: `wrangler login`
3. From the `web/` directory:

```bash
npm run build
wrangler pages deploy .next --project-name tidyboard-web
```

4. Set environment variables in the Cloudflare dashboard under
   **Pages → tidyboard-web → Settings → Environment variables**.
5. For a Next.js app with server components / API routes, enable
   **Cloudflare Pages Functions** (Workers-based SSR).

> Note: Cloudflare Pages has partial Next.js App Router support. Check the
> [compatibility matrix](https://developers.cloudflare.com/pages/framework-guides/nextjs/)
> for the version in use before deploying.

---

## Option 3 — Self-hosted behind Caddy

### Build and start

```bash
cd web
npm install
npm run build
npm run start   # listens on port 3000 by default
```

### Caddy reverse proxy (example `Caddyfile`)

```caddyfile
tidyboard.example.com {
    reverse_proxy localhost:3000
}
```

Caddy automatically obtains a Let's Encrypt TLS certificate.

### Running as a systemd service

```ini
[Unit]
Description=Tidyboard Web
After=network.target

[Service]
Type=simple
User=tidyboard
WorkingDirectory=/opt/tidyboard/web
Environment=NODE_ENV=production
Environment=NEXT_PUBLIC_API_URL=https://api.tidyboard.example.com
ExecStart=/usr/bin/node .next/standalone/server.js
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable with `systemctl enable --now tidyboard-web`.

> Tip: build with `output: 'standalone'` in `next.config.ts` so the production
> server is a self-contained Node.js bundle — no `node_modules` required at
> runtime.

---

## Local development

```bash
cd web
npm install
NEXT_PUBLIC_API_URL=http://localhost:8080 npm run dev
```

The dev server starts on [http://localhost:3000](http://localhost:3000).
