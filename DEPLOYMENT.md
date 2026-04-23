# Tidyboard — Deployment Guide

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Clients                              │
│          Browser / PWA / iPad / Android Tablet              │
└───────────────────────┬─────────────────────────────────────┘
                        │  HTTPS
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              Next.js Web Frontend (port 3000)               │
│         Vercel / Cloudflare Pages / self-hosted Node        │
└───────────────────────┬─────────────────────────────────────┘
                        │  REST + WebSocket  (NEXT_PUBLIC_API_URL)
                        ▼
┌─────────────────────────────────────────────────────────────┐
│           Go Core Server — tidyboard (port 8080)            │
│  chi router · pgx · sqlc · Kong config · JWT auth          │
└──────────┬────────────────────────┬────────────────────────-┘
           │                        │
           ▼                        ▼
┌──────────────────┐   ┌────────────────────────────────────┐
│  PostgreSQL 16   │   │           Redis 7                  │
│  (port 5432)     │   │  WebSocket pub/sub · rate limit    │
│  primary store   │   │  session cache  (port 6379)        │
└──────────────────┘   └────────────────────────────────────┘
           │
    ┌──────┴──────────────────────┐
    │                             │
    ▼                             ▼
┌─────────────────────┐  ┌──────────────────────────────┐
│ Python sync-worker  │  │  Python recipe-scraper       │
│ CalDAV sync         │  │  Recipe import + parsing     │
│ (port 8081)         │  │  (port 8082)                 │
└─────────────────────┘  └──────────────────────────────┘
```

**Component summary**

| Component | Language | Port | Role |
|---|---|---|---|
| Go core server | Go 1.23 | 8080 | Auth, events, lists, routines, gamification, equity, WebSocket |
| Python sync-worker | Python 3.12 | 8081 | CalDAV calendar sync (python-caldav) |
| Python recipe-scraper | Python 3.12 | 8082 | Recipe import and parsing (recipe-scrapers) |
| PostgreSQL | — | 5432 | Primary data store |
| Redis | — | 6379 | Pub/sub, rate limiting, session cache |
| Next.js web | TypeScript | 3000 | Browser/PWA frontend |

---

## Local Development

### Prerequisites

- Docker and Docker Compose v2
- Go 1.23+ (for running Go tools locally)
- Node.js 20+ (for web frontend)
- Python 3.12+ with pip (for Python services)

### Quick start

```bash
# 1. Clone the repo
git clone https://github.com/tidyboard/tidyboard.git
cd tidyboard

# 2. Copy and configure environment
cp .env.example .env
# Edit .env — at minimum set TIDYBOARD_AUTH_JWT_SECRET

# 3. Start all services
make up
# or: docker compose up -d

# 4. Run database migrations
make migrate

# 5. (Optional) Load sample data
make seed

# 6. Start the web frontend dev server
make web-dev   # http://localhost:3000
```

### Service ports (local)

| Service | URL |
|---|---|
| Go API server | http://localhost:8080 |
| API health check | http://localhost:8080/health |
| sync-worker | http://localhost:8081 |
| recipe-scraper | http://localhost:8082 |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |
| Next.js dev | http://localhost:3000 |

### Running migrations manually

```bash
# Via Makefile (runs inside the tidyboard container)
make migrate

# Or with goose directly (requires goose installed locally)
GOOSE_DRIVER=postgres \
GOOSE_DBSTRING="host=localhost port=5432 dbname=tidyboard user=tidyboard password=<pw> sslmode=disable" \
goose -dir migrations up
```

### Viewing logs

```bash
make logs                         # all services
docker compose logs -f tidyboard  # Go server only
docker compose logs -f postgres   # Postgres only
```

### Stopping

```bash
make down          # stop containers, keep volumes
docker compose down -v  # stop and delete volumes (wipes DB)
```

---

## Production Deployments

### Option 1 — Self-hosted on a Single VM

Suitable for home labs, small families, and privacy-first users. A single VM with
2 vCPU / 2 GB RAM handles a typical household.

#### Infrastructure setup

1. Provision a VM (Ubuntu 24.04 LTS recommended) with a public IP.
2. Point your domain DNS A record at the VM IP.
3. Install Docker and Docker Compose v2:

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

4. Install Caddy (reverse proxy + automatic TLS):

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/gpg.key | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install caddy
```

#### Caddy configuration

`/etc/caddy/Caddyfile`:

```caddyfile
tidyboard.example.com {
    # Web frontend (Vercel/Cloudflare) — skip if self-hosting frontend too
    # reverse_proxy localhost:3000

    # API — proxy /api/* to Go server
    handle /api/* {
        reverse_proxy localhost:8080
    }

    # WebSocket
    handle /ws/* {
        reverse_proxy localhost:8080 {
            header_up Connection {http.request.header.Connection}
            header_up Upgrade {http.request.header.Upgrade}
        }
    }
}
```

#### Deployment steps

```bash
# On the VM
git clone https://github.com/tidyboard/tidyboard.git /opt/tidyboard
cd /opt/tidyboard
cp .env.example .env
# Edit .env — set strong TIDYBOARD_AUTH_JWT_SECRET and TIDYBOARD_DB_PASSWORD
cp config.example.yaml config.yaml
# Edit config.yaml — set cors_origins to your domain

docker compose up -d
docker compose exec tidyboard migrate up  # run migrations
```

#### Let's Encrypt / TLS

Caddy handles TLS automatically — no manual certificate management needed.
Ensure port 80 and 443 are open in your firewall/security group.

#### Backup (see also: Backup Strategy section below)

```bash
# Nightly pg_dump via cron (on the host)
0 3 * * * docker compose -f /opt/tidyboard/docker-compose.yml exec -T postgres \
    pg_dump -U tidyboard tidyboard | gzip > /opt/backups/tidyboard-$(date +\%Y\%m\%d).sql.gz
```

---

### Option 2 — AWS ECS Fargate (recommended for cloud hosting)

A full Terraform infrastructure-as-code stack is provided in `deploy/aws/`.
One `terraform apply` provisions:

- **ECS Fargate** — four services: Go server, Next.js web, Python sync-worker,
  Python recipe-scraper
- **Aurora Serverless v2** (PostgreSQL 16) with **RDS Proxy**
- **ElastiCache Redis 7**
- **ALB** with HTTPS (ACM certificate)
- **CloudFront** CDN in front of the ALB
- **S3** — media and backup buckets
- **Secrets Manager** — all secrets (JWT, DB, Redis, Stripe, OAuth)
- **Route 53** — optional, gated by `create_route53_records`

**Full guide**: [`deploy/aws/README.md`](deploy/aws/README.md)
**Quick reference**: [`AWS_DEPLOYMENT.md`](AWS_DEPLOYMENT.md)

Estimated cost for a single-household deployment: ~$150–160/month.
See the cost table in `deploy/aws/README.md` for a line-item breakdown and
cost-reduction tips (Fargate Spot, desired_count = 0 for idle services).

---

## Environment Variables

All variables follow the `TIDYBOARD_*` convention and can be set in `.env` or
as real environment variables. Real env vars take precedence over `.env`.

### Database

| Variable | Default | Description |
|---|---|---|
| `TIDYBOARD_DB_PASSWORD` | — | Master Postgres password (used by docker-compose) |
| `TIDYBOARD_DATABASE_HOST` | `localhost` | Postgres hostname |
| `TIDYBOARD_DATABASE_PORT` | `5432` | Postgres port |
| `TIDYBOARD_DATABASE_NAME` | `tidyboard` | Database name |
| `TIDYBOARD_DATABASE_USER` | `tidyboard` | Database user |
| `TIDYBOARD_DATABASE_PASSWORD` | — | Postgres password for the app user |

### Redis

| Variable | Default | Description |
|---|---|---|
| `TIDYBOARD_REDIS_HOST` | `localhost` | Redis hostname |
| `TIDYBOARD_REDIS_PORT` | `6379` | Redis port |
| `TIDYBOARD_REDIS_PASSWORD` | — | Redis password (leave empty if not set) |

### Auth

| Variable | Default | Description |
|---|---|---|
| `TIDYBOARD_AUTH_JWT_SECRET` | — | **Required.** JWT signing secret. Generate: `openssl rand -base64 64` |
| `TIDYBOARD_AUTH_OAUTH_GOOGLE_CLIENT_ID` | — | Google OAuth client ID (optional) |
| `TIDYBOARD_AUTH_OAUTH_GOOGLE_CLIENT_SECRET` | — | Google OAuth client secret (optional) |

### Server

| Variable | Default | Description |
|---|---|---|
| `TIDYBOARD_SERVER_HOST` | `0.0.0.0` | HTTP listen interface |
| `TIDYBOARD_SERVER_PORT` | `8080` | HTTP listen port |
| `TIDYBOARD_SERVER_CORS_ORIGINS` | `http://localhost:3000` | Allowed CORS origins |

### Notifications (optional)

| Variable | Description |
|---|---|
| `TIDYBOARD_NOTIFY_SMTP_USER` | SMTP username |
| `TIDYBOARD_NOTIFY_SMTP_PASSWORD` | SMTP password |

### Web Frontend

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Public URL of the Go API, e.g. `https://api.tidyboard.example.com` |

---

## DNS and Domain Setup

1. Register your domain (e.g., `tidyboard.example.com`).
2. For self-hosted: add an A record pointing at your VM's public IP.
3. For Vercel frontend: add the domain in Vercel → Domains; Vercel provides
   the CNAME target.
4. For the API subdomain (`api.tidyboard.example.com`): A record → VM IP,
   then Caddy handles TLS.

Example DNS records:

```
tidyboard.example.com.      A     203.0.113.10
api.tidyboard.example.com.  A     203.0.113.10
```

---

## Secrets Management

- **Never commit `.env` or `config.yaml` with real secrets.**
- Local: use `.env` (git-ignored). Copy from `.env.example`.
- Vercel: use **Project → Settings → Environment Variables** (encrypted at rest).
- Self-hosted: store secrets in a secrets manager or inject via systemd
  `EnvironmentFile=` directive pointing to a root-owned file (`chmod 600`).
- AWS: use **AWS Secrets Manager** or **Parameter Store (SSM)**. Lambda
  functions read secrets at cold-start via the AWS SDK.
- Generate strong secrets:
  ```bash
  openssl rand -base64 64   # JWT secret
  openssl rand -base64 32   # DB password
  ```

---

## Backup Strategy

### Postgres (primary data)

```bash
# Manual backup
docker compose exec -T postgres \
    pg_dump -U tidyboard tidyboard | gzip > backup-$(date +%Y%m%d).sql.gz

# Restore
gunzip -c backup-20260101.sql.gz | \
    docker compose exec -T postgres psql -U tidyboard tidyboard
```

**Automated nightly backup** (cron on the host):

```cron
0 3 * * * /opt/tidyboard/scripts/backup.sh >> /var/log/tidyboard-backup.log 2>&1
```

Recommended retention: 7 daily + 4 weekly + 12 monthly (Grandfather-Father-Son).

### Redis

Redis data is append-only-log persisted to the `redis-data` Docker volume.
For critical data, enable RDB snapshots in addition to AOF:

```
# In docker-compose.yml redis command:
redis-server --appendonly yes --save 60 1
```

---

## Monitoring

### Health endpoints

| Endpoint | Description |
|---|---|
| `GET /health` | Returns `{"status":"ok"}` when the Go server is up |
| `GET /health/db` | Checks Postgres connectivity |
| `GET /health/redis` | Checks Redis connectivity |

### Structured logs

The Go server emits JSON-structured logs to stdout. Collect with any log
aggregator (Loki, CloudWatch Logs, Papertrail, etc.):

```bash
docker compose logs -f tidyboard | jq .
```

### Uptime monitoring

Use an external uptime monitor (UptimeRobot free tier, Freshping, Better Uptime)
pointed at `https://api.tidyboard.example.com/health`.

### Metrics (future)

Prometheus metrics endpoint is planned at `/metrics`. Use Grafana for dashboards.
