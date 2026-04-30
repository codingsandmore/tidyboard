# Local Production Mode Design

Source issue: [#71 local mode](https://github.com/codingsandmore/tidyboard/issues/71)

## Summary

Tidyboard needs a production-ready local mode that runs completely inside a household network with Docker Compose and no required external services. The target installation is a small mini PC or Mac mini connected to a 1080p, 10-point touch display. The system must use local-only account authentication, local media/backups by default, and a local Ollama-based LLM path that can run on CPU, use GPU when available, or point at an Ollama server on another machine.

Local mode is not a development shortcut. It is a supported production profile with clear setup, upgrade, backup, restore, and kiosk verification docs.

## Goals

- Provide `docker compose` production assets for a single-household local deployment.
- Remove required cloud dependencies from the local profile: no Cognito, no Google auth, no S3, no Stripe, no hosted AI, and no production AWS requirement.
- Keep local authentication account-backed and real, not demo mode or seeded placeholder users.
- Support local Ollama for AI features, including CPU-only startup, optional GPU compose override, and a remote Ollama endpoint option.
- Serve the web app and API from the local machine with a stable kiosk URL.
- Optimize the kiosk profile for a 1920x1080 touch display and full-screen browser use.
- Provide local backup and restore guidance that does not require external object storage.

## Non-Goals

- Do not replace the EC2/cloud deployment path.
- Do not add Google, Apple, or Cognito auth to local mode.
- Do not require a public DNS name or public TLS certificate for a household LAN deployment.
- Do not make local mode depend on sample data, demo family records, or preview routes.
- Do not require a GPU or a dedicated AI server.

## Target Hardware

The first target is a 1080p landscape touchscreen attached to a mini PC or Mac mini. The user referenced a 10-point touch display; Cozyla's public hardware specs also show 1920x1080 displays and 10-point capacitive touch on similar family display hardware. The local Tidyboard kiosk should therefore treat 1920x1080 landscape as the primary validation viewport, while still supporting portrait and smaller tablets.

## Local Stack

The local production stack should run:

- `postgres` for household data.
- `redis` for pub/sub and volatile coordination.
- `tidyboard-api` for the Go API.
- `tidyboard-web` for the Next.js production app.
- `sync-worker` for CalDAV/calendar sync, only when local calendar sync is enabled.
- `recipe-scraper` for recipe extraction.
- `ollama` for local LLM features, enabled by profile or documented opt-in.
- Optional reverse proxy for a clean LAN URL such as `http://tidyboard.local` or `http://<mini-pc-ip>`.

Local media and backups should use bind mounts or named volumes under a documented `data/` layout. The default local profile must not mount `~/.aws`, require AWS profiles, or write to cloud storage.

## Configuration Model

Add an explicit deployment profile, for example `TIDYBOARD_DEPLOYMENT_MODE=local`, that drives safe defaults:

- Auth provider: local.
- Storage provider: local filesystem.
- Backup target: local filesystem.
- Billing: disabled.
- External OAuth: disabled.
- AI provider: Ollama when configured; otherwise AI features show disabled states.
- Calendar sync: local credentials only; no hosted callback requirement.

The config should fail fast when local mode is combined with cloud-only settings that would break offline operation.

## Local Authentication

Local mode requires local account authentication:

1. First-run owner account creation.
2. Household creation through onboarding.
3. Adult and child member profiles, including PINs where needed.
4. Session refresh using local signed tokens and refresh tokens.
5. No Google login, Cognito redirect, hosted callback, or cloud identity requirement.

Security expectations:

- Passwords are hashed with a modern password hashing algorithm.
- First-run owner creation is disabled after the first owner exists.
- Kiosk PINs remain member-scoped and do not replace adult account auth.
- CSRF/session settings are documented for same-device and LAN use.

## Local AI And Ollama

Local mode should expose one AI configuration surface:

- Embedded compose Ollama: `http://ollama:11434`.
- Remote LAN Ollama: configurable URL such as `http://192.168.1.50:11434`.
- Model selection per feature, starting with recipe categorization and future smart import.
- Capability checks that show whether the configured model is reachable.
- CPU-only defaults and a GPU override file for supported Linux hosts.

AI-backed features must degrade cleanly. Core family flows, onboarding, calendar, routines, tasks, meals, shopping, pantry, and kiosk display must work with AI disabled.

## Kiosk Production Profile

Local mode should include a documented kiosk launch path:

- Recommended browser URL.
- Full-screen flags for Chromium-based kiosk mode.
- Startup-on-boot guidance for Linux and macOS.
- Health check route and local readiness route.
- 1920x1080 smoke test for kiosk, onboarding, calendar details, shopping generation, and member/PIN flows.
- Guidance for display sleep/wake that does not corrupt server state.

The app should not show phone-frame simulations or preview chrome on production kiosk routes.

## Backup, Restore, And Upgrade

Local production must provide:

- Named volumes or host paths for database, media, and backups.
- `backup create`, `backup list`, and `backup restore` commands that work without S3.
- Upgrade instructions: pull image or build locally, run migrations, restart, verify.
- A restore drill in documentation and tests where practical.

## Testing And Verification

Automated coverage should include:

- Local-mode config rejects Cognito/Google-only auth requirements.
- Local auth first-run owner creation and login.
- Local mode API smoke with Postgres and Redis.
- Docker Compose config validation for base, local, and Ollama profiles.
- AI disabled states and Ollama reachable states.
- Kiosk viewport tests at 1920x1080.
- Backup command smoke using local filesystem storage.

Manual verification should include:

- Fresh install on Docker Compose.
- First owner account and household onboarding.
- Create adults, children, and pets.
- Launch kiosk route full-screen on a 1080p display.
- Generate a shopping list without AI.
- Configure local Ollama and verify a supported AI feature.
- Restart the mini PC and confirm the stack recovers.

## Documentation

Implementation PRs must update:

- User manual: local install, first-run setup, kiosk display, backups, Ollama settings, and troubleshooting.
- Agent manual: only if the issue/PR/deploy process changes.
- README/docs index: local production quickstart and links.

