# Tidyboard Python Services

Two Python microservices that handle workloads where library maturity beats raw speed:

| Service | Port | Purpose |
|---|---|---|
| `sync-worker` | 8001 | CalDAV calendar sync (python-caldav v3, dateutil.rrule) |
| `recipe-scraper` | 8002 | Recipe URL scraping (recipe-scrapers, beautifulsoup4) |

Both services are FastAPI apps run with uvicorn. In production they deploy as separate Lambda containers (triggered by EventBridge / API Gateway). In self-hosted mode they run as Docker Compose sidecars alongside the Go server.

---

## Prerequisites

- Python 3.11+ (3.13 recommended; matches Docker image)
- [uv](https://github.com/astral-sh/uv) (recommended) **or** pip + venv

---

## Local development — sync-worker

```bash
cd services/sync-worker

# 1. Create and activate a virtual environment
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt
pip install -e ".[dev]"            # includes pytest, vcrpy

# 3. Configure environment
cp .env.example .env
# Edit .env if needed (defaults work for local dev)

# 4. Run the service
PYTHONPATH=src uvicorn sync_worker.main:app --reload --port 8001

# Service is now available at http://localhost:8001
# Docs at http://localhost:8001/docs
```

### Running tests (sync-worker)

```bash
cd services/sync-worker

# Unit tests only (no network, no containers)
PYTHONPATH=src python -m pytest tests/ -m "not integration" -p no:parallel -x -v

# All tests including integration (requires VCR cassettes or real CalDAV server)
PYTHONPATH=src python -m pytest tests/ -p no:parallel -x -v
```

### Manual API test

```bash
curl -X POST http://localhost:8001/sync \
  -H "Content-Type: application/json" \
  -d '{
    "household_id": "00000000-0000-0000-0000-000000000001",
    "calendar_url": "https://your-caldav-server.example.com/dav/user/calendar/",
    "username": "user",
    "password": "secret",
    "range_start": "2025-06-01T00:00:00+00:00",
    "range_end": "2025-07-01T00:00:00+00:00"
  }'
```

---

## Local development — recipe-scraper

```bash
cd services/recipe-scraper

python -m venv .venv
source .venv/bin/activate

pip install -r requirements.txt
pip install -e ".[dev]"

cp .env.example .env

PYTHONPATH=src uvicorn recipe_scraper.main:app --reload --port 8002

# Docs at http://localhost:8002/docs
```

### Running tests (recipe-scraper)

```bash
cd services/recipe-scraper

PYTHONPATH=src python -m pytest tests/ -m "not integration" -p no:parallel -x -v
```

### Manual API test

```bash
curl -X POST http://localhost:8002/scrape \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.allrecipes.com/recipe/24074/alton-browns-guacamole/"}'
```

---

## Docker

Build and run each service independently:

```bash
# sync-worker
docker build -t tidyboard-sync-worker services/sync-worker/
docker run --rm -p 8001:8001 \
  -e TIDYBOARD_SYNC_LOG_LEVEL=DEBUG \
  tidyboard-sync-worker

# recipe-scraper
docker build -t tidyboard-recipe-scraper services/recipe-scraper/
docker run --rm -p 8002:8002 \
  -e TIDYBOARD_SCRAPER_LOG_LEVEL=DEBUG \
  tidyboard-recipe-scraper
```

Or via Docker Compose from the repo root (see `docker-compose.yml`):

```bash
docker compose up sync-worker recipe-scraper
```

---

## Using uv (faster dependency resolution)

```bash
# Install uv
curl -LsSf https://astral.sh/uv/install.sh | sh

# sync-worker
cd services/sync-worker
uv venv && source .venv/bin/activate
uv pip install -r requirements.txt
uv pip install -e ".[dev]"

# recipe-scraper
cd services/recipe-scraper
uv venv && source .venv/bin/activate
uv pip install -r requirements.txt
uv pip install -e ".[dev]"
```

---

## Freezing dependencies

After updating `pyproject.toml`, regenerate `requirements.txt`:

```bash
# With uv
uv pip compile pyproject.toml -o requirements.txt

# With pip-tools
pip-compile pyproject.toml -o requirements.txt
```

Commit both `pyproject.toml` and `requirements.txt`.

---

## Architecture notes

- **Clock interface**: all production code accepts a `Clock` dependency (`clock.py`). Tests inject `FrozenClock` for deterministic behaviour. Never call `datetime.now()` directly.
- **VCR cassettes**: integration tests use [vcrpy](https://vcrpy.readthedocs.io/) to record/replay HTTP interactions. Cassettes live in `tests/cassettes/`. No real network needed for replays.
- **Config**: pydantic-settings reads `TIDYBOARD_SYNC_*` / `TIDYBOARD_SCRAPER_*` environment variables. See `.env.example` in each service directory.
- **Logging**: structured JSON logs via structlog (falls back to stdlib JSON format if structlog is not installed).
- **Ports**: sync-worker on 8001, recipe-scraper on 8002. The Go backend calls these services via internal HTTP (Docker network or localhost).
