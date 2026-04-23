# Tidyboard — Open Source Family Dashboard

## Project Specification v0.1

**Author:** Gert Wohlgemuth  
**Date:** April 12, 2026  
**Status:** Draft

---

## 1. Vision

An open-source, self-hosted family dashboard that runs on recycled iPads, Android tablets, and any modern browser. Acts as a shared household hub for calendars, tasks, lists, and routines — without vendor lock-in, subscription fees, or proprietary hardware.

The project draws inspiration from the Hearth Display concept but rejects the closed ecosystem approach. Instead, it embraces web standards, local-first data, and extensibility through a plugin architecture.

### 1.1 Naming: Why "Tidyboard"

We evaluated numerous name candidates. Here's the shortlist and why each was eliminated or selected:

| Name | Status | Reason |
|---|---|---|
| Tidyboard | ❌ Rejected | "Open Hearth Gaming Community" is an active entity (tidyboardgaming.com). Also too close to "Hearth Display" which could cause trademark confusion in the same product category. |
| KitchenSync | ❌ Rejected | Registered USPTO trademark (Serial #99469601) by KitchenSync Technologies LLC for kitchen inventory software. Active app on iOS App Store. Multiple businesses using the name. Direct conflict. |
| FamBoard | ❌ Rejected | Active Google Play app (FamBoard by Lit Applications). Previous USPTO filing by ArcSoft (abandoned but in the same software class). FamBoards.com is also a live family planner app. |
| FamilyHub | ❌ Rejected | Samsung's "Family Hub" is a registered trademark for their smart fridge platform. Active on both App Store and Google Play. |
| Hearthstone | ❌ Rejected | Blizzard Entertainment registered trademark (video game). |
| FamOS | ❌ Rejected | Too generic; also phonetically clumsy. |
| Herdly | ❌ Rejected | USPTO trademark filing (Serial #99647875) for networking software. Also an active cattle management app. |
| HomeHub | ❌ Rejected | Google used "Home Hub" for their Nest Hub product line. |
| **Tidyboard** | ✅ Selected | No USPTO trademark filings in software classes. No active products or apps using this name. Clean domain availability. The name communicates what it does (tidy + board = organized household dashboard) without being generic. Fun, approachable, easy to spell, works in multiple languages. |

**Identity assets:**
- Project name: **Tidyboard**
- CLI command: `tidyboard`
- Go module: `github.com/tidyboard/tidyboard`
- npm package: `@tidyboard/web`
- Docker image: `tidyboard/tidyboard`
- Protocol handler: `tidyboard://`
- Default server URL path: `/api/`
- GitHub: `github.com/tidyboard/tidyboard` (to be created)
- Domain: `tidyboard.dev` or `tidyboard.org` (to be registered)

---

## 1.2 Recommended Hardware

Tidyboard runs on any device with a modern browser. But for dedicated wall-mounted kiosk use, here are the best options by price tier based on current 2026 market research:

### Budget Kiosk Tablets (Under $150)

| Tablet | Screen | Price | Notes |
|---|---|---|---|
| **Amazon Fire HD 10 (2023)** | 10.1" 1080p | ~$80–140 | Best bang for buck. Frequently drops below $80 on sale. Requires sideloading Chrome for PWA install (Fire OS doesn't include Google Play by default, but Amazon is transitioning to stock Android in 2026). 10.1" is adequate for a kitchen calendar. |
| **Amazon Fire HD 8 (2024)** | 8" 1280×800 | ~$55–100 | Cheapest viable option. Screen is small for a wall calendar but works in a hallway or kids' room as a secondary display. |
| **TCL Tab 10 Gen 4** | 10.1" 1080p | ~$130 | Runs stock Android with Google Play. NXTVISION display tech (same as their TVs). Dual speakers. microSD slot. Solid pick for a dedicated kiosk. |

### Mid-Range Kiosk Tablets ($150–300)

| Tablet | Screen | Price | Notes |
|---|---|---|---|
| **Samsung Galaxy Tab A9+** | 11" 1920×1200 90Hz | ~$150–200 | Our top recommendation for dedicated kiosk use. Full Google Play, Samsung's long update support, metal build, IP-rated. Frequently on sale under $150. Large enough to read from across the room. |
| **Xiaomi Redmi Pad 2** | 11" 2K 90Hz | ~$170 | Excellent display for the price. Premium feel. Great option if you can get it in your region. |
| **Lenovo Tab One** | 8.7" | ~$100 | Compact and ultra-cheap, 15-hour battery. Best as a secondary/bedroom display. |
| **OnePlus Pad Lite** | 11" 2K | ~$200 | Quad speakers, slim design, 9340mAh battery (lasts all day and night). Smooth OxygenOS. Great kiosk candidate. |
| **Lenovo IdeaTab Plus** | 12.1" 2.5K | ~$250–280 | Largest budget option. 12.1" screen makes it very readable from distance. Quad speakers with Dolby Atmos. Excellent for a main kitchen display. |

### Recycled / Refurbished Options

| Device | Where to buy | Price | Notes |
|---|---|---|---|
| **iPad Air 2 (2014) or newer** | eBay, Swappa, Facebook Marketplace | $50–100 | Minimum viable iPad. Safari supports PWA install and Web Push (iOS 16.4+). Use Guided Access for kiosk lock. |
| **iPad 7th–9th gen** | Apple Refurbished, Swappa | $100–180 | Sweet spot for refurbished iPads. 10.2" screen, still receives iPadOS updates, excellent build quality. |
| **Any Android tablet (2020+)** | eBay, local classifieds | $30–80 | Anything running Android 10+ with Chrome 90+ works. Install Fully Kiosk Browser for best kiosk experience. |

### Mounting Recommendations

- **Adhesive wall mounts**: cheap, no drilling. Works for lightweight tablets (Fire HD, Galaxy Tab A). Look for "universal tablet wall mount" on Amazon ($10–25).
- **VESA mounts**: for heavier or larger tablets. Requires a VESA-compatible tablet case or adapter bracket (~$15–30).
- **Magnetic mounts**: best for iPads with MagSafe-compatible cases. Easy on/off for charging.
- **Fridge mounts**: magnetic tablet holders attach directly to the fridge (~$15). Good for kitchens.
- **Right-angle charging cables**: low-profile Lightning or USB-C cables that sit flush against the wall ($5–10). Essential for a clean wall-mounted look.
- **In-wall USB outlets**: the cleanest solution. Replace a standard outlet with a USB-A/USB-C outlet ($15–25) so the cable runs directly into the wall.

---

## 2. Design Principles

1. **No dedicated hardware** — runs on any tablet (old iPad, Android tablet, Fire tablet) or browser
2. **Self-hosted first** — your data stays on your network; optional cloud sync
3. **Progressive Web App (PWA)** — install on any device without app store gatekeeping
4. **Offline-capable** — local-first with sync when connectivity returns
5. **Extensible** — plugin/widget system for community contributions
6. **Privacy by default** — no telemetry, no analytics, no data leaves your network unless you configure it to
7. **Accessible** — WCAG 2.1 AA minimum; usable by kids, grandparents, and everyone in between

---


---

## 3. Architecture Overview

Tidyboard uses a serverless-first architecture on AWS. The backend is a set of Go Lambda functions behind API Gateway, with Aurora PostgreSQL (via RDS Proxy) for persistent storage, Redis for realtime pub/sub, and S3 for media. For self-hosters, the same Go code compiles to a single binary that runs as a standard HTTP server with a local PostgreSQL instance.

```
┌──────────────────────────────────────────────────────────┐
│                      Clients                             │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐ ┌──────────┐ │
│  │  Tablet   │  │  Phone   │  │  Desktop  │ │ Electron │ │
│  │  (kiosk)  │  │  (PWA)   │  │  Browser  │ │ App      │ │
│  └────┬──────┘  └────┬─────┘  └─────┬─────┘ └────┬─────┘ │
│       │              │              │             │       │
│       └──────────────┼──────────────┼─────────────┘       │
│                      │              │                     │
│              WebSocket + REST (same API)                  │
└──────────────────────┬──────────────────────────────────--┘
                       │
┌──────────────────────┴───────────────────────────────────┐
│              AWS (Cloud) / Self-Hosted Server             │
│                                                          │
│  Cloud:                        Self-Hosted:              │
│  ┌──────────────────────┐     ┌────────────────────────┐ │
│  │ API Gateway (HTTP)   │     │ Single Go binary       │ │
│  │ API Gateway (WS)     │     │ (chi router, same      │ │
│  │         │            │     │  handlers as Lambda)   │ │
│  │  ┌──────┴─────────┐  │     └──────────┬─────────────┘ │
│  │  │ Lambda Functions│  │               │               │
│  │  │ (Go binaries)  │  │               │               │
│  │  │                │  │               │               │
│  │  │ events/        │  │               │               │
│  │  │ calendars/     │  │               │               │
│  │  │ lists/         │  │               │               │
│  │  │ routines/      │  │               │               │
│  │  │ auth/          │  │               │               │
│  │  │ sync-worker/   │  │               │               │
│  │  │ ws-handler/    │  │               │               │
│  │  └──────┬─────────┘  │               │               │
│  └─────────┼────────────┘               │               │
│            │                            │               │
│  ┌─────────┴────────────────────────────┴────────────┐  │
│  │                  Data Layer                        │  │
│  │                                                    │  │
│  │  ┌────────────────┐  ┌────────┐  ┌──────────────┐ │  │
│  │  │ Aurora Postgres │  │ S3     │  │ ElastiCache  │ │  │
│  │  │ (via RDS Proxy) │  │ (media,│  │ (Redis)      │ │  │
│  │  │                 │  │ backup)│  │ (WS pub/sub, │ │  │
│  │  │ Self-hosted:    │  │        │  │  rate limit,  │ │  │
│  │  │ local Postgres  │  │ local  │  │  sessions)   │ │  │
│  │  │                 │  │ disk   │  │ local Redis  │ │  │
│  │  └─────────────────┘  └────────┘  └──────────────┘ │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │              Optional Services (BYOK)              │  │
│  │                                                    │  │
│  │  LLM (user's own API key — Tidyboard never pays)  │  │
│  │  OCR (Tesseract — local, no key needed)            │  │
│  │  Push (ntfy / Pushover)                            │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

**Dual-mode design:** The Go codebase compiles to either Lambda handlers or a standalone HTTP server from the same source. A build tag (`//go:build lambda`) switches between modes. Developers run `go run ./cmd/server` locally against Docker Compose (Postgres + Redis); CI deploys the Lambda build to AWS.

### 3.1 Polyglot Lambda Architecture

Lambda's per-function deployment model enables **polyglot services** — each Lambda function can be written in whatever language has the best library ecosystem for its domain. API Gateway doesn't care what language the function behind it uses; it only sees HTTP requests and responses.

**Where Python wins decisively:**

| Domain | Python Library | Go Library | Maturity Gap |
|---|---|---|---|
| CalDAV client | `python-caldav` v3.x — tested against Nextcloud, Radicale, Baikal, DAViCal, Google, iCloud. Compatibility profiles for dozens of servers. Active since 2013. | `emersion/go-webdav` — functional but no server compatibility profiles, no automated cross-server test suite. Single maintainer. | **Massive** |
| iCalendar parsing | `icalendar` + `recurring-ical-events` — battle-tested, handles edge cases (EXDATE, VTIMEZONE, malformed feeds) | `emersion/go-ical` — correct but less edge-case hardened | **Significant** |
| RRULE expansion | `python-dateutil.rrule` — the reference implementation, handles DST transitions, BYSETPOS, complex rules | `teambition/rrule-go` — functional, some edge cases untested | **Moderate** |
| Recipe scraping | `recipe-scrapers` — 631 supported sites, active community, site-specific drivers | `kkyr/go-recipe` — JSON-LD only, few site-specific scrapers | **Massive** |
| LLM integration | `litellm` — 100+ providers, unified API, streaming, retries | `sashabaranov/go-openai` — OpenAI-compatible only | **Moderate** |

**Architecture decision: Go core + Python specialist Lambdas**

```
API Gateway
    │
    ├── Go Lambdas (core API — auth, households, events, lists,
    │               routines, gamification, admin, ws-*, migrate, cron)
    │
    ├── Python Lambda: calendar-sync
    │   Uses: python-caldav, icalendar, recurring-ical-events, dateutil.rrule
    │   Triggered by: EventBridge (polling) or API Gateway (manual sync)
    │   Writes to: same Aurora PostgreSQL via RDS Proxy
    │
    └── Python Lambda: recipe-scraper
        Uses: recipe-scrapers (631 sites), beautifulsoup4, Pillow
        Triggered by: API Gateway POST /api/recipes/import-url
        Writes to: same Aurora PostgreSQL via RDS Proxy
```

**How it works:**
- Go Lambdas handle all real-time API traffic (auth, CRUD, WebSocket, gamification). Go's 50ms cold starts and type safety are ideal for this.
- Python Lambdas handle **calendar sync** and **recipe scraping** — operations where library maturity matters more than raw speed. Calendar sync runs on a 5-minute EventBridge schedule (not user-facing latency). Recipe scraping is a user-initiated async operation that takes seconds regardless of language.
- Both languages connect to the same Aurora PostgreSQL via RDS Proxy. The Go Lambdas use pgx + sqlc. The Python Lambdas use psycopg or asyncpg + raw SQL (no ORM — matching the sqlc philosophy of visible queries).
- Both languages share the same database schema. No inter-service API calls needed — they read and write the same tables.
- For **self-hosted mode**, the Python services run as separate processes alongside the Go server, managed by Docker Compose. The Go server handles all API traffic; a Python sidecar handles sync and recipe scraping, triggered by the Go server via a simple internal HTTP call or shared Redis queue.

**Why not rewrite the Python libraries in Go?**
`python-caldav` has 13+ years of server compatibility quirks baked in, and `recipe-scrapers` has 631 site-specific drivers maintained by a community. Rewriting these in Go would take months and produce an inferior result. The polyglot approach lets us ship a working product now with battle-tested libraries where it matters, while keeping Go for the performance-critical API layer.

**Lambda cold start impact:**
- Go Lambdas: ~50ms cold start (user-facing, imperceptible)
- Python Lambdas: ~300–500ms cold start (calendar sync is background, recipe import is async — neither is latency-sensitive)
- Python Lambda package size: ~50MB (with dependencies). Use Lambda layers for shared dependencies.

**Self-hosted Docker Compose layout:**
```yaml
services:
  server:        # Go binary — serves all API routes
    build: .
    ports: ["8080:8080"]

  sync-worker:   # Python — calendar sync on schedule
    build: ./services/sync-worker
    depends_on: [postgres, redis]

  recipe-scraper: # Python — recipe import service
    build: ./services/recipe-scraper
    depends_on: [postgres]

  postgres:
    image: postgres:16-alpine

  redis:
    image: redis:7-alpine
```

### 3.2 Legal & Compliance Requirements

**COPPA (Children's Online Privacy Protection Act):**
Tidyboard is designed for families with children. When kids under 13 interact with the app (PIN auth, chore completion, feelings check-in, race participation), COPPA applies to Tidyboard Cloud.

- **Self-hosted**: COPPA does not apply — no data is collected by Tidyboard the organization. Parents host and control their own data.
- **Tidyboard Cloud**: COPPA applies. Required measures:
  - Verifiable parental consent before creating child member profiles (parent must have an account first; creating a child member = consent)
  - No behavioral advertising or tracking (already covered — no ads, no telemetry)
  - Data minimization for child accounts: no email, no location data, no third-party sharing
  - Parent can review, delete, and control all child data at any time
  - Privacy policy must specifically address child data collection
  - Annual COPPA compliance review

**Terms of Service / Privacy Policy / DPA:**
Required before Tidyboard Cloud accepts users or payments:
- **Terms of Service**: user obligations, acceptable use, limitation of liability, AGPL compliance for self-hosters
- **Privacy Policy**: what data is collected (account email, calendar events, household data), how it's stored (Aurora PostgreSQL, encrypted at rest), who has access (only the household), how long it's retained, how to delete
- **Cookie Policy**: minimal — JWT in httpOnly cookie, no tracking cookies
- **DPA (Data Processing Agreement)**: required for GDPR compliance for EU users. Standard template available from Stripe (who will also be processing payment data)
- **Budget**: $500–1,000 for lawyer review or use a reputable legal template service (Termly, iubenda)

**AGPL License Boundary:**
The open-source repo (`tidyboard/tidyboard`) is AGPL-3.0. The Cloud billing code lives in a private repo (`tidyboard-cloud`). The boundary must be clean:
- AGPL code never imports or calls private billing code
- Private billing code can import AGPL code (it's a downstream consumer)
- Feature flags in the AGPL code check `config.CloudMode` to conditionally show billing UI, but the flag logic itself contains no proprietary code
- This is the same pattern used by GitLab (MIT core + proprietary EE features)

**Business Entity:**
Before accepting Stripe payments, register an LLC or use Stripe Atlas. Check UC Davis employment agreement for IP assignment clauses — some universities claim ownership of employee side projects built using university resources or during work hours.

**Domain Registration:**
Register tidyboard.dev and tidyboard.cloud immediately. Do not wait for launch.

### 3.3 Onboarding Flow (First-Time User Experience)

The first 60 seconds determine whether someone becomes a user or closes the tab. The spec defines features but not the critical first-time experience.

**Step-by-step onboarding wizard:**

1. **Welcome screen**: "Let's set up your family dashboard" — single "Get Started" button
2. **Create account**: email + password (or Google/Apple OAuth on Cloud). Minimal form — just email and password, nothing else.
3. **Name your household**: "What should we call your family?" — text field, defaults to "The [LastName] Family" if parseable from email domain
4. **Add yourself**: name, display name, avatar (upload or pick from defaults), color (pick from palette). You become the owner.
5. **Add family members**: "+ Add a family member" — repeatable. For each: name, role (adult or child), optional email (adults) or PIN (kids). Skip button available.
6. **Connect a calendar** (optional): "Sync your existing calendar?" — Google Calendar one-click OAuth, or "Skip for now". This is the moment of magic — if they connect Google Calendar, events appear immediately and the dashboard feels alive.
7. **Dashboard**: "You're all set!" — land on the daily view with today's events (or a helpful empty state if no calendar connected: "Your dashboard is ready. Connect a calendar or create your first event to get started.")

Total steps: 7 screens, completable in under 60 seconds. Every step except #2 (account creation) has a "Skip" option.

### 3.4 Parent Analytics Dashboard (v0.2+)

Parents want to know: "Is this working? Are the kids actually doing more since we started?" The spec has audit logs and leaderboard snapshots but no parent-facing analytics view.

**Features:**
- **Completion trends**: line chart showing daily/weekly task completion rate per child over time
- **Streak tracker**: current streak and longest streak per child, with visual calendar heatmap
- **Most/least completed tasks**: bar chart showing which chores get done and which get ignored
- **Week-over-week comparison**: "Jackson completed 15 tasks this week (up 20% from last week)"
- **Time patterns**: when do kids complete tasks? Morning vs evening, weekday vs weekend
- **Race performance**: win/loss record, improvement over time
- **Cooking stats** (when recipes active): most cooked recipes, meals per week trend, recipe rating distribution
- **Equity overview** (when equity engine active): ownership distribution across domains, time balance per adult (cognitive vs physical), personal time goal tracking, load indicator trends, rebalance history

**Access**: owner and admin roles only. Child and member roles cannot see analytics.

**Data source**: aggregated from audit log + leaderboard snapshots. No additional data collection needed.

---

## 4. Tech Stack

### 4.1 Backend (Go)

| Component | Technology | Rationale |
|---|---|---|
| Language | **Go 1.23+** | Static typing, single binary, fast compilation, excellent concurrency, Lambda cold starts ~50ms |
| HTTP router | **chi** v5 | Lightweight, idiomatic, stdlib `net/http` compatible. Same handlers work in Lambda and standalone mode. |
| Lambda adapter | **aws-lambda-go** + **awslabs/aws-lambda-go-api-proxy** (chi adapter) | Wraps chi handlers as Lambda functions. Zero code changes between local dev and Lambda deploy. |
| Database driver | **pgx** v5 | Best Go PostgreSQL driver. Connection pooling, prepared statements, `pgxpool` for standalone mode, single-connection for Lambda (RDS Proxy pools). |
| Query layer | **sqlc** | Write SQL, generate type-safe Go code. No ORM magic. Every query visible and auditable. Compile-time type safety. |
| Migrations | **goose** | SQL-based migrations. Runs as a separate CLI step or dedicated Lambda, never embedded in API handlers. |
| Auth: JWT | **golang-jwt/jwt** v5 | Standard Go JWT library. HMAC + RSA signing. |
| Auth: passwords | **golang.org/x/crypto/bcrypt** | Stdlib-adjacent. Password and PIN hashing. |
| Auth: OAuth/OIDC | **coreos/go-oidc** v3 + **golang.org/x/oauth2** | OpenID Connect discovery + OAuth2 flows for Google/Apple login. |
| CalDAV client | **emersion/go-webdav** | CalDAV/CardDAV client library. Same author as go-ical. Actively maintained. |
| iCalendar parsing | **emersion/go-ical** | Parse/generate iCal streams (VEVENT, VTODO). Used by aerc mail client. |
| RRULE expansion | **teambition/rrule-go** | RFC 5545 RRULE expansion with timezone support. |
| Google Calendar API | **google.golang.org/api/calendar/v3** | Official Go client. Pagination, batching, token refresh. |
| Microsoft Graph API | **microsoftgraph/msgraph-sdk-go** | Official Go client for Outlook/M365 calendar sync. |
| HTTP client | **net/http** (stdlib) | Go's stdlib HTTP client is excellent. No third-party needed. |
| Config + CLI | **alecthomas/kong** + **alecthomas/kong-yaml** | Struct-based CLI parser with YAML config file support. Type-safe, no reflection magic. Config struct tags define CLI flags, YAML keys, env vars, defaults, and help text in one place. Successor to kingpin. |
| Validation | **go-playground/validator** v10 | Struct tag validation for request payloads. |
| AWS SDK | **aws-sdk-go-v2** | S3, SES, Secrets Manager, EventBridge, CloudWatch. |
| Stripe | **stripe/stripe-go** v81+ | Official Stripe SDK for billing (Cloud only). |
| Redis | **redis/go-redis** v9 | WebSocket connection state, pub/sub fan-out, rate limiting, session cache. |
| WebSocket (self-hosted) | **gorilla/websocket** | WebSocket server for standalone mode. API Gateway handles WebSocket in Lambda mode. |
| OCR | **otiai10/gosseract** v2 | Go bindings for Tesseract. For self-hosted; Lambda uses a Tesseract layer. |
| LLM (BYOK) | **sashabaranov/go-openai** | OpenAI-compatible client. Works with Ollama, OpenAI, Anthropic (via proxy), any compatible endpoint. User provides their own key. |
| Recipe scraping | **kkyr/go-recipe** | Go recipe scraper: JSON-LD schema.org/Recipe extraction + custom per-site scrapers. MIT licensed. |
| Structured data | **astappiev/microdata** | Go HTML microdata + JSON-LD extractor. Fallback for sites without clean JSON-LD. |
| HTML parsing | **PuerkitoBio/goquery** | jQuery-like HTML selectors for site-specific recipe scraper overrides. |
| Email | **aws-sdk-go-v2/service/sesv2** (Cloud) / **net/smtp** (self-hosted) | SES for Cloud; stdlib SMTP for self-hosted. |
| Push notifications | **net/http** (stdlib) | ntfy is a simple HTTP POST. No SDK needed. |
| Image processing | **disintegration/imaging** | Pure Go image processing. Avatar resize/crop, thumbnail generation. No CGO dependency. |
| Logging | **log/slog** (stdlib) | Go 1.21+ structured logging. JSON output for CloudWatch. |
| Testing | **testing** (stdlib) + **stretchr/testify** | See Section 10 for full testing strategy. |
| Linting | **golangci-lint** | Meta-linter. Runs staticcheck, govet, errcheck, gosec, etc. |
| API docs | **swaggo/swag** | Generate OpenAPI 3.0 spec from Go annotations. |

### 4.2 Frontend (React/TypeScript)

| Component | Technology | Rationale |
|---|---|---|
| Framework | **React 19** + **TypeScript 5.7+** | Component model fits widget architecture; static typing; massive ecosystem |
| Build | **Vite 6+** | Fast HMR, optimized production builds, code splitting |
| State | **Zustand 5+** | Lightweight global state (active household, member, UI prefs) |
| Server state | **TanStack Query 5+** | API fetch/cache/refetch, optimistic updates, pagination |
| Styling | **Tailwind CSS 4** | Utility-first, CSS custom properties for member colors + themes |
| Components | **shadcn/ui** (copy-paste) on **Radix UI** | Accessible primitives, no version lock-in |
| Icons | **Lucide React** | 1000+ tree-shakeable icons, kid-friendly |
| Drag & drop | **dnd-kit** | Accessible DnD with keyboard + screen reader support |
| Charts | **Recharts 2.x** | Streak charts, leaderboard visualizations |
| Complex animations | **lottie-react** | After Effects → JSON celebration animations |
| Confetti | **canvas-confetti** | 6KB, canvas-based, fast on old tablets |
| RRULE (client) | **rrule** (npm) | Client-side recurrence expansion matching Go server behavior |
| Dates | **date-fns 4+** | Tree-shakeable, 100+ locales |
| i18n | **react-i18next** + **i18next** | Namespaced keys, lazy locale bundles, complex plural rules |
| Forms | **React Hook Form** + **zod** | Zero re-renders, schema validation |
| PWA | **vite-plugin-pwa** (Workbox) | Service worker, precaching, offline fallback, install prompts |
| Offline storage | **Dexie.js 4+** | IndexedDB wrapper for caching + mutation queue |
| WebSocket | Native WebSocket + custom reconnect hook | No lib needed — keeps bundle small |
| QR codes | **qrcode.react** | SVG rendering for invite codes |
| Markdown | **react-markdown** | Render markdown in recipe notes, event descriptions |

### 4.3 Desktop App (Electron)

| Component | Technology | Rationale |
|---|---|---|
| Shell | **Electron 33+** | Native window chrome, system tray, OS notifications, auto-launch |
| Renderer | Same React app as web | Single codebase — Electron loads the Vite-built SPA |
| Build/package | **electron-builder** | Cross-platform: macOS .dmg, Windows .exe, Linux .AppImage/.deb |
| Auto-update | **electron-updater** | GitHub Releases or self-hosted feed |
| Settings | **electron-store** | Encrypted JSON for server URL, window state, preferences |
| Logging | **electron-log** | File-based logging for main process |

The Electron app is a thin native shell wrapping the same React SPA. It adds system tray, native OS notifications, auto-launch at login, global keyboard shortcut (`Cmd/Ctrl+Shift+H`), and `tidyboard://` protocol handler for invite links. It does NOT bundle the server, have its own database, or diverge from the web UI.

### 4.4 Deployment

| Method | Details |
|---|---|
| **AWS Lambda** (Cloud) | Go binaries deployed as Lambda functions behind API Gateway. CDK manages all infrastructure. |
| **Docker Compose** (self-hosted, primary) | Single `docker compose up` — Go server + Postgres + Redis. Single Go binary serves all routes. |
| **Single binary** (self-hosted, alt) | `tidyboard serve` — download a prebuilt binary for your OS/arch. Requires external Postgres + Redis. |
| **Raspberry Pi** | ARM64 binary or ARM Docker image. Tested on Pi 4/5. |
| **NAS** | Synology/QNAP Docker packages. |
| **Desktop app** | macOS (.dmg), Windows (.exe), Linux (.AppImage/.deb) via GitHub Releases. |

### 4.5 Library Strategy: Don't Reinvent the Wheel

Every feature starts with the question: "Is there a battle-tested library that already does this?" We write glue code and product experience, not engines.

#### What We Explicitly Do NOT Build

| Don't build this | Use this instead |
|---|---|
| iCalendar parser/generator | `emersion/go-ical` |
| CalDAV protocol client | `emersion/go-webdav` |
| RRULE expansion engine | `teambition/rrule-go` (server), `rrule` npm (client) |
| OAuth2/OIDC flows | `coreos/go-oidc` + `golang.org/x/oauth2` |
| Password/PIN hashing | `golang.org/x/crypto/bcrypt` |
| Image processing | `disintegration/imaging` |
| SQL query generation | `sqlc` (compile-time codegen from SQL) |
| Database migrations | `goose` |
| HTTP routing | `chi` |
| Lambda adaptation | `aws-lambda-go-api-proxy` |
| Service worker / PWA caching | Workbox |
| Drag-and-drop with accessibility | dnd-kit |
| Complex animation rendering | Lottie |
| Form validation | React Hook Form + Zod |
| LLM provider abstraction | `sashabaranov/go-openai` (OpenAI-compatible) |
| Recipe/schema.org extraction | `kkyr/go-recipe` + `astappiev/microdata` |
| HTML DOM querying | `PuerkitoBio/goquery` |
| Accessible UI primitives | Radix UI (via shadcn/ui) |
| Client-side RRULE | `rrule` npm |

### 4.6 Configuration (Kong + YAML)

All configuration is managed via **`alecthomas/kong`** with the **`kong-yaml`** resolver for YAML file support. Kong unifies CLI flags, YAML config files, and environment variables through a single Go struct — one source of truth, fully type-safe at compile time.

**How it works:**
1. Define a Go struct with Kong tags — each field specifies its CLI flag name, help text, default value, and env var binding
2. Kong parses CLI flags first, then falls back to the YAML config file, then to env vars, then to struct defaults
3. The resulting struct is fully populated and type-checked — no `viper.GetString("database.host")` stringly-typed lookups

**Config file locations** (searched in order via `kong.ConfigFlag`):
1. Path specified via `--config` CLI flag (highest priority)
2. `./config.yaml` (project directory — development)
3. `$HOME/.tidyboard/config.yaml` (user home)
4. `/etc/tidyboard/config.yaml` (system-wide — production/Docker)

**Environment variable override**: every config key can be overridden by a `TIDYBOARD_` prefixed env var. Nested keys use underscores: `database.host` → `TIDYBOARD_DATABASE_HOST`.

**Config struct (source of truth):**

```go
// internal/config/config.go

type Config struct {
    ConfigFile kong.ConfigFlag `help:"Path to config file" short:"c" type:"path" default:"config.yaml"`
    Version    VersionFlag     `help:"Print version and quit" short:"v" name:"version"`

    Server   ServerConfig   `embed:"" prefix:"server." group:"Server:" yaml:"server"`
    Database DatabaseConfig `embed:"" prefix:"database." group:"Database:" yaml:"database"`
    Redis    RedisConfig    `embed:"" prefix:"redis." group:"Redis:" yaml:"redis"`
    Auth     AuthConfig     `embed:"" prefix:"auth." group:"Auth:" yaml:"auth"`
    Sync     SyncConfig     `embed:"" prefix:"sync." group:"Sync:" yaml:"sync"`
    Storage  StorageConfig  `embed:"" prefix:"storage." group:"Storage:" yaml:"storage"`
    Notify   NotifyConfig   `embed:"" prefix:"notify." group:"Notifications:" yaml:"notifications"`
    AI       AIConfig       `embed:"" prefix:"ai." group:"AI:" yaml:"ai"`
    Backup   BackupConfig   `embed:"" prefix:"backup." group:"Backup:" yaml:"backup"`
    Recipe   RecipeConfig   `embed:"" prefix:"recipe." group:"Recipes:" yaml:"recipes"`

    // Subcommands
    Serve      ServeCmd   `cmd:"" help:"Start the Tidyboard server" default:"withargs"`
    Migrate    MigrateCmd `cmd:"" help:"Run database migrations"`
    BackupCmd  BackupCLI  `cmd:"" name:"backup" help:"Create or restore a backup"`
    Maint      MaintCmd   `cmd:"" help:"Toggle maintenance mode"`
}

type ServerConfig struct {
    Host             string        `help:"Listen host" default:"0.0.0.0" env:"TIDYBOARD_SERVER_HOST" yaml:"host"`
    Port             int           `help:"Listen port" default:"8080" env:"TIDYBOARD_SERVER_PORT" yaml:"port"`
    Mode             string        `help:"Run mode: standalone or lambda" default:"standalone" enum:"standalone,lambda" yaml:"mode"`
    CORSOrigins      []string      `help:"Allowed CORS origins" default:"http://localhost:5173" yaml:"cors_origins"`
    ReadTimeout      time.Duration `help:"HTTP read timeout" default:"30s" yaml:"read_timeout"`
    WriteTimeout     time.Duration `help:"HTTP write timeout" default:"30s" yaml:"write_timeout"`
    ShutdownTimeout  time.Duration `help:"Graceful shutdown timeout" default:"10s" yaml:"shutdown_timeout"`
}

type DatabaseConfig struct {
    Host            string        `help:"PostgreSQL host" default:"localhost" env:"TIDYBOARD_DATABASE_HOST" yaml:"host"`
    Port            int           `help:"PostgreSQL port" default:"5432" env:"TIDYBOARD_DATABASE_PORT" yaml:"port"`
    Name            string        `help:"Database name" default:"tidyboard" env:"TIDYBOARD_DATABASE_NAME" yaml:"name"`
    User            string        `help:"Database user" default:"tidyboard" env:"TIDYBOARD_DATABASE_USER" yaml:"user"`
    Password        string        `help:"Database password" env:"TIDYBOARD_DATABASE_PASSWORD" yaml:"password"`
    SSLMode         string        `help:"SSL mode" default:"disable" enum:"disable,require,verify-ca,verify-full" yaml:"sslmode"`
    MaxOpenConns    int           `help:"Max open connections" default:"25" yaml:"max_open_conns"`
    MaxIdleConns    int           `help:"Max idle connections" default:"5" yaml:"max_idle_conns"`
    ConnMaxLifetime time.Duration `help:"Connection max lifetime" default:"15m" yaml:"conn_max_lifetime"`
    MigrationsDir   string        `help:"Migrations directory" default:"./migrations" yaml:"migrations_dir"`
}

type RedisConfig struct {
    Host       string `help:"Redis host" default:"localhost" env:"TIDYBOARD_REDIS_HOST" yaml:"host"`
    Port       int    `help:"Redis port" default:"6379" env:"TIDYBOARD_REDIS_PORT" yaml:"port"`
    Password   string `help:"Redis password" env:"TIDYBOARD_REDIS_PASSWORD" yaml:"password"`
    DB         int    `help:"Redis database number" default:"0" yaml:"db"`
    MaxRetries int    `help:"Max retries" default:"3" yaml:"max_retries"`
}

type AuthConfig struct {
    JWTSecret           string        `help:"JWT signing secret (required)" env:"TIDYBOARD_AUTH_JWT_SECRET" yaml:"jwt_secret" required:""`
    JWTExpiry           time.Duration `help:"JWT token expiry" default:"15m" yaml:"jwt_expiry"`
    RefreshTokenExpiry  time.Duration `help:"Refresh token expiry" default:"168h" yaml:"refresh_token_expiry"`
    PINMaxAttempts      int           `help:"Max PIN attempts before lockout" default:"5" yaml:"pin_max_attempts"`
    PINLockoutDuration  time.Duration `help:"PIN lockout duration" default:"5m" yaml:"pin_lockout_duration"`
    OAuth               OAuthConfig   `embed:"" prefix:"oauth." yaml:"oauth"`
}

type OAuthConfig struct {
    GoogleEnabled      bool   `help:"Enable Google OAuth" default:"false" yaml:"google_enabled"`
    GoogleClientID     string `help:"Google OAuth client ID" env:"TIDYBOARD_AUTH_OAUTH_GOOGLE_CLIENT_ID" yaml:"google_client_id"`
    GoogleClientSecret string `help:"Google OAuth client secret" env:"TIDYBOARD_AUTH_OAUTH_GOOGLE_CLIENT_SECRET" yaml:"google_client_secret"`
    AppleEnabled       bool   `help:"Enable Apple OAuth" default:"false" yaml:"apple_enabled"`
    AppleClientID      string `help:"Apple OAuth client ID" yaml:"apple_client_id"`
    AppleTeamID        string `help:"Apple team ID" yaml:"apple_team_id"`
}

type SyncConfig struct {
    PollInterval time.Duration `help:"Calendar sync poll interval" default:"5m" yaml:"poll_interval"`
    MaxRetries   int           `help:"Max sync retries" default:"3" yaml:"max_retries"`
    RetryBackoff time.Duration `help:"Retry backoff duration" default:"30s" yaml:"retry_backoff"`
}

type StorageConfig struct {
    Type     string `help:"Storage type" default:"local" enum:"local,s3" yaml:"type"`
    LocalPath string `help:"Local storage path" default:"./data/media" yaml:"local_path"`
    S3Bucket string `help:"S3 bucket name" yaml:"s3_bucket"`
    S3Region string `help:"S3 region" default:"us-east-1" yaml:"s3_region"`
    S3Prefix string `help:"S3 key prefix" default:"media/" yaml:"s3_prefix"`
}

type NotifyConfig struct {
    NtfyEnabled   bool   `help:"Enable ntfy push notifications" default:"false" yaml:"ntfy_enabled"`
    NtfyServerURL string `help:"ntfy server URL" default:"https://ntfy.sh" yaml:"ntfy_server_url"`
    NtfyTopicPrefix string `help:"ntfy topic prefix" default:"tidyboard-" yaml:"ntfy_topic_prefix"`
    EmailEnabled  bool   `help:"Enable email notifications" default:"false" yaml:"email_enabled"`
    SMTPHost      string `help:"SMTP host" yaml:"smtp_host"`
    SMTPPort      int    `help:"SMTP port" default:"587" yaml:"smtp_port"`
    SMTPUser      string `help:"SMTP user" env:"TIDYBOARD_NOTIFY_SMTP_USER" yaml:"smtp_user"`
    SMTPPassword  string `help:"SMTP password" env:"TIDYBOARD_NOTIFY_SMTP_PASSWORD" yaml:"smtp_password"`
    SMTPFrom      string `help:"SMTP from address" yaml:"smtp_from"`
}

type AIConfig struct {
    Enabled     bool   `help:"Enable AI features (requires user API keys)" default:"false" yaml:"enabled"`
    OCREnabled  bool   `help:"Enable Tesseract OCR" default:"false" yaml:"ocr_enabled"`
    TesseractPath string `help:"Path to Tesseract binary" default:"tesseract" yaml:"tesseract_path"`
}

type BackupConfig struct {
    Enabled    bool          `help:"Enable automated backups" default:"true" yaml:"enabled"`
    Schedule   string        `help:"Backup cron schedule" default:"0 3 * * *" yaml:"schedule"`
    Retention  int           `help:"Number of daily backups to keep" default:"7" yaml:"retention"`
    LocalPath  string        `help:"Local backup directory" default:"./data/backups" yaml:"local_path"`
    S3Enabled  bool          `help:"Also backup to S3" default:"false" yaml:"s3_enabled"`
    S3Bucket   string        `help:"S3 backup bucket" yaml:"s3_bucket"`
}

type RecipeConfig struct {
    MaxImportSize   int           `help:"Max HTML size for recipe import (bytes)" default:"5242880" yaml:"max_import_size"`
    ImageDownload   bool          `help:"Download recipe images locally" default:"true" yaml:"image_download"`
    ScraperTimeout  time.Duration `help:"HTTP timeout for recipe scraping" default:"15s" yaml:"scraper_timeout"`
}
```

**Reference `config.yaml`** (shipped as `config.example.yaml` in the repo):

```yaml
# Tidyboard Configuration
# Copy to config.yaml and adjust for your environment.
# All values can be overridden by TIDYBOARD_ prefixed environment variables.
# e.g., database.host → TIDYBOARD_DATABASE_HOST

server:
  host: "0.0.0.0"
  port: 8080
  mode: "standalone"
  cors_origins:
    - "http://localhost:5173"
  read_timeout: "30s"
  write_timeout: "30s"

database:
  host: "localhost"
  port: 5432
  name: "tidyboard"
  user: "tidyboard"
  password: ""              # use TIDYBOARD_DATABASE_PASSWORD env var
  sslmode: "disable"
  max_open_conns: 25
  max_idle_conns: 5
  conn_max_lifetime: "15m"

redis:
  host: "localhost"
  port: 6379
  password: ""
  db: 0

auth:
  jwt_secret: ""            # REQUIRED — generate: openssl rand -hex 32
  jwt_expiry: "15m"
  refresh_token_expiry: "168h"
  pin_max_attempts: 5
  pin_lockout_duration: "5m"
  oauth:
    google_enabled: false
    google_client_id: ""
    google_client_secret: ""

sync:
  poll_interval: "5m"
  max_retries: 3
  retry_backoff: "30s"

storage:
  type: "local"
  local_path: "./data/media"
  # s3_bucket: "my-tidyboard-media"
  # s3_region: "us-east-1"

notifications:
  ntfy_enabled: false
  ntfy_server_url: "https://ntfy.sh"
  ntfy_topic_prefix: "tidyboard-"
  email_enabled: false
  smtp_host: ""
  smtp_port: 587
  smtp_from: ""

ai:
  enabled: false
  ocr_enabled: false
  tesseract_path: "tesseract"

backup:
  enabled: true
  schedule: "0 3 * * *"     # 3:00 AM daily
  retention: 7
  local_path: "./data/backups"
  s3_enabled: false

recipes:
  max_import_size: 5242880   # 5MB
  image_download: true
  scraper_timeout: "15s"

rate_limiting:
  enabled: true
  auth_rpm: 5                # auth endpoint: 5 requests per minute per IP
  api_rpm: 120               # general API: 120 requests per minute per user
  gamification_rpm: 30       # gamification: 30 requests per minute (anti-abuse)
```

**Usage in `main.go`:**

```go
func main() {
    var cli config.Config
    ctx := kong.Parse(&cli,
        kong.Name("tidyboard"),
        kong.Description("Open source family dashboard"),
        kong.Configuration(kongyaml.Loader, "config.yaml", "~/.tidyboard/config.yaml", "/etc/tidyboard/config.yaml"),
        kong.UsageOnError(),
        kong.ConfigureHelp(kong.HelpOptions{Compact: true}),
        kong.Vars{"version": version},
    )
    err := ctx.Run(&cli)
    ctx.FatalIfErrorf(err)
}
```

**CLI commands:**
```bash
# Start server (default command)
tidyboard serve
tidyboard serve --server.port=9090
tidyboard serve --config=/path/to/config.yaml

# Run migrations
tidyboard migrate up
tidyboard migrate down
tidyboard migrate status

# Backup operations
tidyboard backup create
tidyboard backup restore ./data/backups/2026-04-12.sql.gz
tidyboard backup list

# Maintenance mode
tidyboard maint on --message="Upgrading to v0.2"
tidyboard maint off
tidyboard maint status

# Show version
tidyboard --version

# Show full help
tidyboard --help
```

**Lambda mode:** when `server.mode` is `"lambda"`, the config is loaded from environment variables only (no YAML file). Lambda env vars are set via CDK/CloudFormation from Secrets Manager. The same `Config` struct works — Kong's env var binding handles it.

---

## 5. Data Model (Core Entities)

```
Account
├── id: UUID
├── email: str (unique)
├── password_hash: str (nullable if OAuth-only)
├── oidc_provider: str (nullable)
├── oidc_subject: str (nullable)
├── is_active: bool
├── created_at: datetime
└── linked_members: → Member[] (via account_id)

Household
├── id: UUID
├── name: str
├── timezone: str
├── settings: JSON
├── created_by: UUID (account_id)
├── invite_code: str (8-char, regenerable)
│
├── Invitations[]
│   ├── id: UUID
│   ├── email: str
│   ├── role: enum (admin | member | guest)
│   ├── token: str (unique, URL-safe)
│   ├── invited_by: UUID (account_id)
│   ├── created_at: datetime
│   ├── expires_at: datetime
│   ├── accepted_at: datetime (nullable)
│   └── status: enum (pending | accepted | expired | revoked)
│
├── JoinRequests[]  (from invite codes)
│   ├── id: UUID
│   ├── account_id: UUID
│   ├── requested_at: datetime
│   ├── reviewed_by: UUID (nullable, account_id of approver)
│   ├── reviewed_at: datetime (nullable)
│   └── status: enum (pending | approved | rejected)
│
├── Members[]
│   ├── id: UUID
│   ├── account_id: UUID (nullable — null for kids without accounts)
│   ├── name: str
│   ├── display_name: str
│   ├── color: str (hex)
│   ├── avatar_url: str
│   ├── role: enum (owner | admin | member | child | guest)
│   ├── age_group: enum (toddler | child | tween | teen | adult)
│   ├── pin: str (hashed, optional, for kiosk auth)
│   ├── emergency_info: JSON (allergies, contacts, etc.)
│   └── notification_preferences: JSON
│
├── Calendars[]
│   ├── id: UUID
│   ├── name: str
│   ├── source: enum (local | google | outlook | ical_url | caldav)
│   ├── sync_config: JSON (url, credentials, poll_interval)
│   ├── sync_direction: enum (one_way_in | one_way_out | two_way)
│   ├── assigned_member_id: UUID (nullable)
│   ├── color_override: str (nullable)
│   └── Events[]
│       ├── id: UUID
│       ├── external_id: str (nullable, for sync dedup)
│       ├── title: str
│       ├── description: str
│       ├── start_time: datetime
│       ├── end_time: datetime
│       ├── all_day: bool
│       ├── location: str
│       ├── recurrence_rule: str (RFC 5545 RRULE)
│       ├── assigned_members: UUID[]
│       └── reminders: JSON[]
│
├── Routines[]
│   ├── id: UUID
│   ├── name: str
│   ├── assigned_member_id: UUID
│   ├── schedule: JSON (days of week, time window)
│   ├── Steps[]
│   │   ├── id: UUID
│   │   ├── order: int
│   │   ├── title: str
│   │   ├── icon: str
│   │   ├── image_url: str (nullable)
│   │   └── estimated_minutes: int
│   └── CompletionLog[]
│       ├── date: date
│       ├── steps_completed: UUID[]
│       └── completed_at: datetime
│
├── Lists[]
│   ├── id: UUID
│   ├── name: str
│   ├── type: enum (todo | grocery | packing | custom)
│   ├── shared: bool
│   ├── assigned_member_id: UUID (nullable)
│   └── Items[]
│       ├── id: UUID
│       ├── text: str
│       ├── completed: bool
│       ├── assigned_member_id: UUID (nullable)
│       ├── due_date: date (nullable)
│       ├── priority: enum (none | low | medium | high)
│       └── sort_order: int
│
├── MealPlans[]
│   ├── id: UUID
│   ├── date: date
│   ├── meal_type: enum (breakfast | lunch | dinner | snack)
│   ├── title: str
│   ├── notes: str
│   ├── recipe_url: str (nullable)
│   └── assigned_member_id: UUID (nullable)
│
├── Rewards[]
│   ├── id: UUID
│   ├── member_id: UUID
│   ├── name: str
│   ├── star_cost: int
│   ├── stars_earned: int
│   └── redeemed_at: datetime (nullable)
│
├── Races[]
│   ├── id: UUID
│   ├── name: str
│   ├── created_by: UUID (parent member)
│   ├── status: enum (pending | active | completed | cancelled)
│   ├── started_at: datetime
│   ├── ended_at: datetime (nullable)
│   ├── bonus_stars: int (winner bonus)
│   ├── source_list_id: UUID (nullable, race from a list)
│   ├── source_routine_id: UUID (nullable, race from a routine)
│   ├── Participants[]
│   │   ├── member_id: UUID
│   │   ├── items_total: int
│   │   ├── items_completed: int
│   │   ├── completed_at: datetime (nullable)
│   │   ├── finish_position: int (nullable)
│   │   └── handicap_items: int (default 0, fewer items for younger kids)
│   └── RaceHistory[]
│       ├── timestamp: datetime
│       ├── member_id: UUID
│       └── item_completed_id: UUID
│
├── Achievements[]
│   ├── id: UUID
│   ├── member_id: UUID
│   ├── badge_type: str (e.g., "streak_7", "century_club", "speed_demon")
│   ├── earned_at: datetime
│   └── metadata: JSON (e.g., { "streak_length": 7, "routine": "morning" })
│
├── LeaderboardSnapshots[]
│   ├── id: UUID
│   ├── period: enum (weekly | monthly)
│   ├── period_start: date
│   ├── period_end: date
│   ├── Entries[]
│   │   ├── member_id: UUID
│   │   ├── stars_earned: int
│   │   ├── tasks_completed: int
│   │   ├── streaks_maintained: int
│   │   ├── races_won: int
│   │   └── rank: int
│   └── champion_member_id: UUID (nullable)
│
└── Widgets[]  (plugin system)
    ├── id: UUID
    ├── type: str (widget identifier)
    ├── position: JSON (grid placement)
    ├── config: JSON (widget-specific settings)
    └── visible_on: enum[] (tablet | phone | desktop)

AuditEntry (not household-scoped — global)
├── id: UUID
├── timestamp: datetime
├── household_id: UUID
├── actor_member_id: UUID (nullable)
├── actor_account_id: UUID (nullable)
├── action: str
├── entity_type: str
├── entity_id: UUID
├── details: JSON
├── device_info: str
└── ip_address: str (nullable)

BackupRecord (not household-scoped — global)
├── id: UUID
├── created_at: datetime
├── type: enum (scheduled | manual | pre_restore)
├── destination: str
├── file_path: str
├── size_bytes: int
├── checksum_sha256: str
├── schema_version: str (goose migration version)
└── status: enum (completed | failed | in_progress)

Recipe (household-scoped)
├── id: UUID
├── household_id: UUID
├── title: str
├── description: str
├── source_url: str
├── source_domain: str
├── image_url: str
├── prep_time: duration
├── cook_time: duration
├── total_time: duration
├── servings: int
├── servings_unit: str
├── categories: str[]
├── cuisine: str
├── tags: str[]
├── difficulty: enum (easy | medium | hard)
├── rating: int (1-5)
├── notes: str
├── is_favorite: bool
├── times_cooked: int
├── last_cooked_at: date
├── created_by: UUID (member_id)
├── Ingredients[]
│   ├── id: UUID
│   ├── order: int
│   ├── group: str (nullable)
│   ├── amount: float
│   ├── unit: str
│   ├── name: str
│   ├── preparation: str (nullable)
│   ├── optional: bool
│   └── substitution_note: str (nullable)
├── Steps[]
│   ├── id: UUID
│   ├── order: int
│   ├── text: str
│   ├── timer_seconds: int (nullable)
│   └── image_url: str (nullable)
└── NutritionInfo (nullable)
    ├── calories: int
    ├── fat_g, protein_g, carbs_g, fiber_g, sodium_mg, sugar_g: float

IngredientCanonical (global, shared across households)
├── id: UUID
├── name: str (canonical, e.g., "garlic")
├── aliases: str[]
├── category: str (e.g., "produce", "dairy")
├── default_unit: str
└── unit_conversions: JSON

Subscription (Cloud only — not present in self-hosted)
├── id: UUID
├── household_id: UUID
├── stripe_customer_id: str
├── stripe_subscription_id: str
├── plan: enum (free | family | family_plus | extended)
├── status: enum (active | past_due | canceled | trialing)
├── current_period_start: datetime
├── current_period_end: datetime
├── cancel_at_period_end: bool
└── entitlements: JSON

TaskDomain (household-scoped)
├── id: UUID
├── household_id: UUID
├── name: str (e.g., "Meals & Groceries", "Children — Health")
├── icon: str
├── description: str
├── is_system: bool
└── sort_order: int

DomainOwnership (household-scoped)
├── id: UUID
├── household_id: UUID
├── domain_id: UUID
├── owner_member_id: UUID
├── assigned_at: datetime
├── assigned_by_member_id: UUID
└── notes: str (nullable)

TimeEntry (household-scoped)
├── id: UUID
├── household_id: UUID
├── member_id: UUID
├── domain_id: UUID
├── task_type: enum (routine_step | list_item | event | meal_plan | ad_hoc)
├── task_id: UUID (nullable)
├── description: str
├── started_at: datetime
├── ended_at: datetime
├── duration_minutes: int
├── is_cognitive: bool
├── created_at: datetime
└── source: enum (timer | manual | auto_estimate)
```

---

## 6. Feature Specification

### 6.1 Calendar

**Core:**
- Create, edit, delete events on a local Tidyboard calendar
- Daily view (column-per-member), weekly view, monthly view, agenda view
- Color-coded per member
- Recurring events (RFC 5545 RRULE compliant)
- Event reminders via push notification, email, or on-screen alert
- Full-text search across all events

**Scheduling Conflict Detection:**
- When creating or updating an event, the system checks all calendars assigned to each affected member for time overlaps
- If a conflict is found, the user sees a warning with options to proceed, adjust, or cancel
- Conflicts are warnings, not blocks — families double-book intentionally sometimes
- Dedicated "Conflicts" view shows all overlapping events across the household
- Recurring event conflicts detected at rule creation, not just first instance
- All-day events excluded from conflict detection

**Sync:**
- Google Calendar: two-way sync via Google Calendar API (OAuth2)
- Outlook/Microsoft 365: two-way sync via Microsoft Graph API (OAuth2)
- Apple iCloud Calendar: CalDAV-based sync
- Any CalDAV server (Nextcloud, Radicale, Baikal, etc.): two-way sync
- Any iCal URL (TeamSnap, school calendars, etc.): one-way import with configurable poll interval
- Sync conflict resolution: last-write-wins with conflict log for manual review

**Advanced:**
- Photo-to-event: upload a photo of a flyer/schedule → OCR extracts text → optional LLM parses into structured events → user approves before adding
- iCal file import (drag-and-drop .ics files)
- Calendar sharing: generate a read-only iCal feed URL for external consumers (babysitters, grandparents)

### 6.2 Routines

- Define ordered steps with icons, photos, and estimated time
- Assign to family members
- Schedule by days-of-week and time windows
- Completion tracking with streak counters
- Multiple display modes: checklist, card-per-step, timeline
- Pre-built routine templates (importable/exportable as JSON)
- Optional timer per step with on-screen countdown

### 6.3 Lists & To-Dos

- Multiple list types: to-do, grocery, packing, custom
- Shared or private per member
- Drag-and-drop reordering
- Board view (kanban columns: To Do / In Progress / Done) and checklist view
- Recurring to-dos (e.g., "take out trash" every Tuesday)
- Due dates with reminder integration
- Grocery list: optional aisle/category grouping

### 6.4 Recipe Database, Meal Planning & Shopping Lists

This is a full-featured recipe management system inspired by Paprika, integrated with the family meal planner and automatic shopping list generation.

#### 6.4.1 Recipe Database

Every household has a personal recipe collection — a private cookbook that grows over time.

**Recipe data model:**
```
Recipe
├── id: UUID
├── household_id: UUID
├── title: str
├── description: str
├── source_url: str (original URL the recipe was scraped from)
├── source_domain: str (e.g., "allrecipes.com")
├── image_url: str (local copy stored in S3/disk, not hotlinked)
├── prep_time: duration (e.g., "PT15M")
├── cook_time: duration
├── total_time: duration
├── servings: int (base serving count)
├── servings_unit: str (e.g., "servings", "cookies", "cups")
├── categories: str[] (e.g., ["dinner", "italian", "quick"])
├── cuisine: str (e.g., "Mexican", "Thai")
├── tags: str[] (user-defined, e.g., ["kid-approved", "Robin's favorite", "weeknight"])
├── difficulty: enum (easy | medium | hard)
├── rating: int (1-5, personal household rating)
├── notes: str (personal notes — "double the garlic", "kids won't eat this")
├── is_favorite: bool
├── times_cooked: int (incremented when used in a meal plan that's marked done)
├── last_cooked_at: date
├── created_at: datetime
├── updated_at: datetime
├── created_by: UUID (member_id)
│
├── Ingredients[]
│   ├── id: UUID
│   ├── order: int
│   ├── group: str (optional, e.g., "For the sauce", "For the dough")
│   ├── amount: float
│   ├── unit: str (e.g., "cup", "tbsp", "g", "oz", "whole")
│   ├── name: str (e.g., "all-purpose flour")
│   ├── preparation: str (optional, e.g., "diced", "melted", "room temperature")
│   ├── optional: bool
│   └── substitution_note: str (optional, e.g., "or use almond flour for GF")
│
├── Steps[]
│   ├── id: UUID
│   ├── order: int
│   ├── text: str
│   ├── timer_seconds: int (optional — "simmer for 20 minutes")
│   └── image_url: str (optional — step photo)
│
└── NutritionInfo (optional)
    ├── calories: int
    ├── fat_g: float
    ├── protein_g: float
    ├── carbs_g: float
    ├── fiber_g: float
    ├── sodium_mg: float
    └── sugar_g: float
```

**Adding recipes — multiple methods:**

**Method 1: Import from URL (Paprika-style)**
The killer feature. Paste a recipe URL → the system scrapes the page, extracts structured recipe data, and creates a recipe in your collection.

How it works:
1. User pastes a URL (e.g., `https://www.allrecipes.com/recipe/24074/alton-browns-guacamole/`)
2. Backend fetches the HTML
3. Recipe scraper pipeline runs:
   - **Step 1: JSON-LD extraction** — look for `<script type="application/ld+json">` containing `schema.org/Recipe`. This is the cleanest path and works on ~80% of recipe sites.
   - **Step 2: Microdata extraction** — if no JSON-LD, look for HTML microdata (`itemtype="http://schema.org/Recipe"`)
   - **Step 3: Site-specific scraper** — for popular sites that don't use schema.org (or use it incorrectly), maintain a registry of custom scraper functions keyed by domain.
   - **Step 4: LLM fallback (BYOK)** — if structured data extraction fails and the user has an LLM configured, send the raw HTML text to the LLM with a prompt to extract recipe fields. User approves before saving.
4. Extracted data is normalized into the Recipe model
5. User sees a preview with all fields editable — title, ingredients, steps, times, servings
6. User confirms → recipe saved to their collection
7. Recipe image is downloaded and stored locally (not hotlinked — survives if the source site goes down)

**Go libraries for recipe scraping:**
- **`kkyr/go-recipe`** — Go recipe scraper that extracts JSON-LD schema.org/Recipe data, with support for custom per-site scrapers. MIT licensed.
- **`astappiev/microdata`** — Go library for extracting both HTML microdata and JSON-LD structured data from web pages.
- **`net/html`** (stdlib) — Go's HTML parser for fallback DOM-based extraction.
- **`PuerkitoBio/goquery`** — jQuery-like HTML selector library for site-specific scrapers.

**Method 2: Manual entry**
Full form for entering recipes by hand. Supports ingredient groups, step timers, and photos.

**Method 3: Photo-to-recipe (BYOK)**
Take a photo of a recipe from a cookbook or magazine → OCR (Tesseract) → LLM parses into structured recipe → user approves.

**Method 4: Import from file**
Import recipes from:
- Paprika export (.paprikarecipes format — ZIP of gzipped JSON)
- Recipe JSON-LD files
- Plain text (best-effort parsing)

**Recipe features:**
- **Serving scaler** — adjust servings from the recipe's base count. All ingredient amounts recalculate proportionally. Scaling factor visible: "4 servings → 6 servings (×1.5)"
- **Cooking mode** — full-screen, step-by-step view optimized for the kitchen. Large text, keep-awake, swipe between steps, per-step timers with sound alerts.
- **Favorites & ratings** — personal 1-5 star rating per household + favorite toggle. Filter and sort by rating.
- **Categories & tags** — predefined categories (breakfast, lunch, dinner, snack, dessert, side, appetizer, drink) plus user-defined tags. Filter by multiple categories/tags.
- **Search** — full-text search across recipe titles, ingredients, notes, categories, and tags. "Show me all recipes that use chicken and take less than 30 minutes."
- **Duplicate detection** — when importing from URL, check if a recipe from the same source URL already exists. Offer to update or skip.
- **Cooking history** — track which recipes were cooked when (via meal plan integration). "We last made this 3 weeks ago."
- **Share recipes** — generate a shareable link or export as a printable card (PDF or HTML). No account required to view shared recipes.
- **Recipe collections** — group recipes into named collections (e.g., "Thanksgiving 2026", "Camping meals", "Robin's diet")

#### 6.4.2 Meal Planning

The weekly meal planner connects recipes from the database to specific days and meal slots.

**Meal plan grid:**
```
             Mon    Tue    Wed    Thu    Fri    Sat    Sun
Breakfast    [ ]    [ ]    [ ]    [ ]    [ ]    [ ]    [ ]
Lunch        [ ]    [ ]    [ ]    [ ]    [ ]    [ ]    [ ]
Dinner       [ ]    [ ]    [ ]    [ ]    [ ]    [ ]    [ ]
Snack        [ ]    [ ]    [ ]    [ ]    [ ]    [ ]    [ ]
```

**Features:**
- Drag recipes from the recipe database into meal slots
- Quick-add: type a meal name without a linked recipe (e.g., "Leftovers", "Eat out")
- Assign meals per member for dietary needs (picky eater gets a different lunch)
- Copy last week's meal plan as a starting point
- Meal plan templates — save a good week as a reusable template ("School week standard")
- Visible on the kiosk dashboard as a "What's for dinner?" widget
- Cooking history integration: highlight recipes not cooked in 30+ days, de-emphasize those cooked recently
- Photo-to-meal-plan: snap a handwritten plan or school lunch calendar → OCR + LLM → structured entries (BYOK)
- LLM meal suggestions (BYOK): "Suggest 5 dinners using chicken, under 30 minutes, that the kids will eat" → generates suggestions from the household's recipe collection first, then from general knowledge

**Meal plan data model:**
```
MealPlan
├── id: UUID
├── household_id: UUID
├── date: date
├── meal_type: enum (breakfast | lunch | dinner | snack)
├── title: str (display name — auto-filled from recipe title if linked)
├── recipe_id: UUID (nullable — null for unlinked meals like "Eat out")
├── servings_override: int (nullable — override the recipe's default)
├── assigned_member_id: UUID (nullable — null means whole family)
├── notes: str (e.g., "Make extra for tomorrow's lunch")
└── completed: bool (did you actually make it?)
```

#### 6.4.3 Shopping List Generation

The shopping list is auto-generated from the meal plan. This is where the recipe database pays off — structured ingredients with amounts and units enable intelligent aggregation.

**How it works:**
1. User selects a date range (typically the upcoming week)
2. System collects all meal plan entries with linked recipes for that range
3. Ingredients are aggregated across recipes:
   - Same ingredient + same unit → amounts summed (2 cups flour + 1 cup flour = 3 cups flour)
   - Same ingredient + different units → kept separate unless convertible (1 lb butter + 4 tbsp butter → 1 lb + 4 tbsp, not combined)
   - Ingredient matching is fuzzy: "garlic clove" and "garlic, minced" are recognized as the same base ingredient
4. Pantry deduction (optional): if the household maintains a pantry inventory, already-available ingredients are marked as "have it" and excluded from the shopping list
5. User reviews the generated list, can add/remove items, adjust quantities
6. List is saved as a regular Tidyboard shared list (type: `grocery`) and appears on all devices

**Shopping list features:**
- **Aisle grouping**: ingredients auto-categorized by grocery department (produce, dairy, meat, bakery, pantry, frozen, etc.). Category mapping maintained in a configurable lookup table.
- **Check-off at the store**: tap to mark items as purchased. Crossed-off items move to the bottom.
- **Manual additions**: add non-recipe items (paper towels, dog food) alongside auto-generated ingredients.
- **Recurring staples**: configure items that always appear on the shopping list regardless of meal plan (milk, bread, eggs). Managed as a separate "pantry staples" list.
- **History**: see past shopping lists. "What did we buy last week?"
- **Cost estimation** (future): optional unit prices per ingredient for budget tracking.

**Ingredient normalization:**
The system maintains a canonical ingredient database for fuzzy matching:
```
IngredientCanonical
├── id: UUID
├── name: str (canonical name, e.g., "garlic")
├── aliases: str[] (e.g., ["garlic clove", "garlic cloves", "fresh garlic", "minced garlic"])
├── category: str (e.g., "produce", "dairy", "meat", "pantry")
├── default_unit: str (e.g., "clove", "cup", "lb")
└── unit_conversions: JSON (e.g., {"tbsp": 3, "tsp": 1} for unit normalization)
```

This table is seeded with ~500 common ingredients and their aliases. Users can add custom ingredients. The fuzzy matching uses a combination of exact match → alias lookup → Levenshtein distance for typo tolerance.

#### 6.4.4 Recipe API Endpoints

```
Recipes
  GET    /api/recipes                      # list recipes (paginated, filterable, searchable)
  POST   /api/recipes                      # create recipe manually
  GET    /api/recipes/{id}                 # get recipe with ingredients + steps
  PUT    /api/recipes/{id}                 # update recipe
  DELETE /api/recipes/{id}                 # delete recipe
  POST   /api/recipes/import-url           # scrape recipe from URL
  POST   /api/recipes/import-photo         # OCR + LLM parse from photo (BYOK)
  POST   /api/recipes/import-file          # import from Paprika/JSON file
  GET    /api/recipes/{id}/scale?servings=8  # get recipe with scaled ingredient amounts
  POST   /api/recipes/{id}/share           # generate shareable link
  GET    /api/recipes/shared/{token}       # view shared recipe (public, no auth)
  GET    /api/recipes/collections          # list recipe collections
  POST   /api/recipes/collections          # create collection
  PUT    /api/recipes/collections/{id}     # update collection
  POST   /api/recipes/collections/{id}/add # add recipe to collection

Meal Plans
  GET    /api/meals?week=2026-W16          # get meal plan for a week
  POST   /api/meals                        # add meal to plan
  PUT    /api/meals/{id}                   # update meal plan entry
  DELETE /api/meals/{id}                   # remove meal from plan
  POST   /api/meals/copy-week             # copy a week's plan to another week
  POST   /api/meals/{id}/complete          # mark meal as actually cooked
  GET    /api/meals/templates              # list saved meal plan templates
  POST   /api/meals/templates              # save current week as template
  POST   /api/meals/apply-template         # apply template to a target week

Shopping Lists
  POST   /api/shopping/generate            # generate shopping list from meal plan date range
  GET    /api/shopping/current             # get current active shopping list
  POST   /api/shopping/staples             # manage recurring pantry staples

Ingredients
  GET    /api/ingredients/search?q=garl    # search canonical ingredient database
  POST   /api/ingredients                  # add custom ingredient
```

### 6.5 Gamification, Scoreboards & Fun

This is a core differentiator. The system must be **genuinely fun for kids** — not just a to-do list with a star sticker. Competitors treat gamification as an afterthought; we treat it as a primary design surface. Every completion, every streak, every race should produce a moment of delight that makes kids *want* to come back.

#### 6.5.1 Stars & Rewards

- Star-based economy: kids earn stars for completing routines, chores, and to-dos
- Custom reward definitions with star costs (parents define rewards like "movie night", "ice cream", "extra screen time")
- Visual progress bar toward next reward — always visible on kid's dashboard
- Reward redemption with celebratory animation (confetti explosion, fireworks, character dance — randomized to stay fresh)
- Reward history log for parents
- Optional: parents can set a star-to-allowance conversion rate (e.g., 10 stars = $1)

#### 6.5.2 Completion Animations & Celebrations

Every task/chore/routine completion triggers a **fun animated response**. This is not optional decoration — it's the dopamine hook that makes the system work for kids.

- **Single task completion**: satisfying checkmark animation + sound effect + small particle burst in the member's color
- **All daily tasks completed**: full-screen celebration — emoji rain, confetti cannon, animated character doing a victory dance (randomized from a pool of 10+ animations)
- **Streak milestones** (3-day, 7-day, 14-day, 30-day): escalating celebrations — bronze/silver/gold/diamond badge animation with fanfare
- **Reward unlocked**: special unlock animation — treasure chest opening, piñata burst, balloon pop
- **Morning routine completed before deadline**: speed bonus animation + bonus star
- Sound effects: toggle on/off per device (critical for wall-mounted tablets vs. phones). Include a library of satisfying sounds: dings, whooshes, level-up chimes, crowd cheers
- All animations must be performant on older tablets (iPad Air 2 era, low-end Android). Use CSS animations + Lottie for complex sequences, not heavy JS animation libraries
- Parents can choose animation intensity: full (young kids), subtle (tweens), minimal (teens/adults)
- **Custom celebration uploads**: parents can upload a short video/GIF as a custom celebration for specific rewards

#### 6.5.3 Races & Competitions

Turn to-do lists and chores into head-to-head or household-wide competitions.

**Race Mode:**
- Any shared list or set of chores can be turned into a "Race" by a parent
- Live race dashboard shows each participant's progress as animated avatars moving along a track
- Real-time updates via WebSocket — when one kid checks off a task, all connected devices show the avatar advance
- First to complete all items gets a "Winner!" animation + bonus stars
- Race timer shows elapsed time for each participant
- Race history: track personal bests ("You finished morning routine 2 minutes faster than yesterday!")
- Optional: configurable handicaps for younger kids (fewer items, more time, head start)

**Leaderboards:**
- Weekly family leaderboard: ranked by stars earned, tasks completed, streaks maintained
- Visible on the tablet dashboard as a scoreboard widget
- Configurable by parents: can show rankings, or just show individual progress (non-competitive mode for families who prefer it)
- Monthly leaderboard reset with "Champion of the Month" badge
- Historical leaderboard archive so kids can see their improvement over time

**Team Challenges:**
- Parents can create household-wide challenges: "If the family completes 100 tasks this week, we go to the zoo"
- Shared progress bar visible on all devices
- Each member's contributions shown proportionally
- Challenge completion triggers a family-wide celebration animation on all connected devices simultaneously

#### 6.5.4 Avatars & Customization (Kid-Focused)

- Each family member gets a customizable avatar (not just a photo — an animated character)
- Avatar accessories unlock with star milestones (hats, capes, pets, backgrounds)
- Avatar appears on the race track, leaderboard, and completion animations
- Pre-designed avatar library + ability to upload custom images
- Avatar "mood" reflects streak status: happy (active streak), neutral (no streak), sleepy (broken streak)

#### 6.5.5 Achievement System

Beyond stars, a badge/achievement system for longer-term motivation:

- **Streak badges**: "Early Bird" (7-day morning routine streak), "Night Owl" (7-day bedtime routine streak), "Iron Will" (30-day streak)
- **Volume badges**: "Century Club" (100 tasks completed), "Thousand Star General" (1000 stars earned)
- **Race badges**: "Speed Demon" (won 5 races), "Comeback Kid" (won a race after being last)
- **Special badges**: "Helper" (completed someone else's task), "Planner" (added events to the calendar 3 weeks in a row)
- Badge showcase visible on profile
- Badges are defined in JSON — parents and community can create custom badge packs

### 6.6 Household Equity Engine — Task Ownership, Time Tracking & Balance

Most family apps track *what* gets done. Tidyboard also tracks *who carries the load* — making the invisible work of planning, organizing, and managing a household visible, measurable, and rebalanceable. This feature is inspired by research on household labor equity and the "mental load" phenomenon, where one partner (often the mother) shoulders a disproportionate share of domestic cognitive labor even in dual-income families.

**Core concept: Full Ownership, not "Helping"**

Every household task has exactly one **owner**. The owner is responsible for the complete lifecycle of that task — noticing it needs doing, planning how/when, executing, and verifying it's done. "Helping" (being told what to do and doing only the physical part) doesn't count as ownership because it leaves the cognitive burden (remembering, planning, delegating) on the other partner.

#### 6.6.1 Task Domains & Ownership

Household responsibilities are organized into **domains** — broad categories of household work:

```
TaskDomain
├── id: UUID
├── household_id: UUID
├── name: str (e.g., "Meals & Cooking", "Children's Health", "Finances")
├── icon: str (emoji or Lucide icon name)
├── description: str
├── is_system: bool (true for default domains, false for user-created)
└── sort_order: int
```

**Default domains** (seeded for every household, customizable):

| Domain | Examples of Tasks Within |
|---|---|
| Meals & Groceries | Meal planning, grocery shopping, cooking, school lunches, pantry inventory |
| Cleaning & Home | Vacuuming, bathrooms, laundry, dishes, tidying shared spaces |
| Children — Daily | Morning routine supervision, homework help, bedtime routine, packing school bags |
| Children — Health | Doctor/dentist appointments, medication tracking, vaccination records, sick days |
| Children — Activities | Sports practice, music lessons, birthday parties, playdates, camp registration |
| Children — School | Parent-teacher conferences, school forms, field trip permissions, tutor coordination |
| Finances | Bills, budgeting, insurance, tax prep, subscriptions, donations |
| Home Maintenance | Repairs, seasonal maintenance, yard work, car maintenance, contractor coordination |
| Social & Family | Holiday planning, gift buying, family event coordination, RSVPs, thank-you notes |
| Pets | Feeding, vet appointments, grooming, walks, boarding arrangements |
| Admin & Life | Mail, filing, decluttering, tech support, password management |
| Personal Time | Each partner's dedicated time for hobbies, exercise, friends, rest |

Households can add, rename, remove, or merge domains. The system never enforces a fixed set — these are starting suggestions based on common household patterns.

#### 6.6.2 Ownership Assignment

Each domain is assigned to exactly one owner (adult member). The owner can be changed at any time via mutual agreement.

```
DomainOwnership
├── id: UUID
├── household_id: UUID
├── domain_id: UUID
├── owner_member_id: UUID
├── assigned_at: datetime
├── assigned_by_member_id: UUID
├── notes: str (optional — "Taking this over for summer while partner travels")
└── history: → DomainOwnershipHistory[] (who owned it previously and when)
```

**Key rules:**
- Each domain has exactly one owner at any given time. No co-ownership (that's the "shared = nobody's responsible" anti-pattern).
- Owners can delegate individual tasks within their domain, but they remain the owner — they're still responsible for noticing, planning, and verifying.
- Ownership is visible to all adult members on the equity dashboard. Transparency prevents invisible load.
- Ownership can be rotated on a schedule (e.g., "switch meal planning every month" — optional, configurable).

#### 6.6.3 Time Tracking

Every task in Tidyboard can optionally track time spent. This makes invisible work measurable.

**Time tracking data:**
```
TimeEntry
├── id: UUID
├── household_id: UUID
├── member_id: UUID
├── domain_id: UUID
├── task_type: enum (routine_step | list_item | event | meal_plan | ad_hoc)
├── task_id: UUID (nullable — references the specific task)
├── description: str (for ad_hoc entries: "Researched summer camps for 45 min")
├── started_at: datetime
├── ended_at: datetime
├── duration_minutes: int (calculated or manually entered)
├── is_cognitive: bool (true = planning/researching/organizing, false = physical execution)
├── created_at: datetime
└── source: enum (timer | manual | auto_estimate)
```

**Three ways to track time:**
1. **Timer** — tap "Start" when beginning a task, "Stop" when done. Simple stopwatch in the task detail view.
2. **Manual entry** — after completing a task, enter "This took about 30 minutes." Quick-add with preset buttons: 5min, 15min, 30min, 1hr, 2hr.
3. **Auto-estimate** — when a task is completed without explicit time tracking, the system uses the task's estimated duration (if set) or the historical average for that task type. Marked as `source: auto_estimate` so it's visually distinct in reports.

**Cognitive vs. Physical distinction:**
The "invisible work" problem is specifically about cognitive labor — the planning, remembering, researching, and coordinating that happens before and after the physical task. Time entries can be tagged as cognitive (researching pediatricians, meal planning, comparing insurance quotes) or physical (cooking dinner, vacuuming, driving to practice). The equity dashboard shows both dimensions separately.

#### 6.6.4 Equity Dashboard (Adults Only)

A dedicated view showing the household labor balance. Visible only to adult members (owner, admin, member roles — not child role).

**Dashboard elements:**

- **Ownership distribution** — pie chart showing how many domains each adult owns. Ideally roughly balanced. Visualization uses member colors.
- **Time balance** — bar chart: hours contributed per adult per week/month. Split by cognitive vs. physical.
- **Trend line** — are things getting more balanced or less balanced over time? Rolling 4-week average per adult.
- **Domain detail** — drill into any domain to see all tasks, completions, time entries, and who's actually doing the work.
- **Load indicator** — simple traffic light for each adult: green (balanced), yellow (carrying 60–70% of total load), red (carrying 70%+ — unbalanced). Thresholds configurable.
- **Rebalance suggestions** — if one partner's load exceeds the configured threshold, the dashboard suggests domains that could be reassigned. "You're carrying 65% of the household load this month. Consider reassigning 'Children — Activities' (currently yours, ~4 hours/week) to [partner]."
- **Personal time tracking** — are both partners getting roughly equal time for their hobbies, friends, and rest? Tracks scheduled vs. actual personal time.

**What the dashboard explicitly does NOT do:**
- No scoring, no "winning," no gamification. This is for adults working together, not competing. The kids' gamification system (stars, races, leaderboards) is a separate feature for a different audience.
- No shaming, blame, or "you're doing less" messaging. The tone is collaborative: "Here's what the data shows. Here are some ideas for rebalancing."
- No automated nagging to the under-contributing partner. The dashboard provides information; the conversation is between the adults.

#### 6.6.5 Personal Time Tracking

Research consistently shows that parents — especially mothers — sacrifice personal time first when household demands increase. Tidyboard tracks personal time as a first-class metric, not an afterthought.

- Each adult member has a **personal time goal** (e.g., 5 hours/week for hobbies, exercise, or seeing friends)
- Calendar events tagged as "personal" count toward the goal
- The equity dashboard shows actual personal time vs. goal for each adult
- If one partner consistently gets less personal time than the other, the dashboard surfaces it: "This month, [Mom] had 3 hours of personal time vs. [Dad]'s 8 hours."

#### 6.6.6 API Endpoints

```
Domains
  GET    /api/domains                    # list all domains for household
  POST   /api/domains                    # create custom domain
  PUT    /api/domains/{id}               # update domain
  DELETE /api/domains/{id}               # delete domain (only custom, not system)
  POST   /api/domains/{id}/assign        # assign owner to domain
  GET    /api/domains/{id}/history       # ownership change history

Time Tracking
  POST   /api/time-entries               # log time entry (manual or timer stop)
  GET    /api/time-entries?member={id}&from=&to=  # list time entries
  PUT    /api/time-entries/{id}          # edit time entry
  DELETE /api/time-entries/{id}          # delete time entry

Equity Dashboard
  GET    /api/equity/summary?period=week|month  # ownership + time balance summary
  GET    /api/equity/trends?months=3     # balance trends over time
  GET    /api/equity/personal-time       # personal time tracking per adult
  GET    /api/equity/rebalance           # rebalance suggestions
```

### 6.7 Competitor Pain Points Addressed

Based on user feedback from Hearth Display, Skylight, and competing products, Tidyboard specifically addresses these reported frustrations:

| Competitor Gap | Tidyboard Solution |
|---|---|
| No sounds, alarms, or audio feedback | Configurable audio alerts, sound effects, TTS daily briefing |
| No calendar search | Full-text search across events, lists, meals, recipes |
| Dead time blocks (midnight–8am) shown | Smart auto-scroll to current time, collapsible empty hours |
| No dark mode | Full dark mode with auto-switching by time of day |
| Basic weather (temp only) | Weather plugin: hourly forecast, UV, humidity, "what to wear" for kids |
| Single physical device | Runs on unlimited tablets + phones + browsers, all synced realtime |
| AI assistant loses ~50% of requests | Deterministic sync engine, no AI in sync path, sync status dashboard |
| Single static wallpaper | Photo slideshow with configurable rotation |
| No toddler mode | Simplified single-task view, giant tap targets, no navigation |
| No routine deadlines | Time windows with countdown timer, green→yellow→red color shift |
| No user identification (siblings tamper) | PIN-per-member on kiosk, biometric unlock on supported tablets |
| Barebones chore charts, duplicate bugs | Rich recurrence rules, difficulty ratings, star values, proper dedup |
| All tasks shown regardless of day | Filtered by current day by default; future tasks in explicit views only |
| No recipe links in meal plans | Full recipe database with URL import, cooking mode, one-tap access |
| Routines break when leaving kitchen | Multi-device — continue routines on phone or second tablet |
| Slow and laggy display | PWA with caching, optimistic UI. Target: <100ms response, <3s initial load |

### 6.8 Profiles, Families & Multi-User Identity

#### 6.7.1 Identity Model

The system separates **accounts** (people who can log in) from **members** (people who appear on the dashboard). This is critical because kids don't have email addresses but still need to be full participants.

```
Account (login identity)
├── id: UUID
├── email: str (unique, required)
├── password_hash: str
├── oidc_provider: str (nullable — Google, Apple, etc.)
├── oidc_subject: str (nullable)
├── created_at: datetime
├── is_active: bool
└── linked_member_ids: UUID[]  ← one account can be a member in multiple households

Member (household participant — may or may not have an account)
├── id: UUID
├── household_id: UUID
├── account_id: UUID (nullable — null for kids without accounts)
├── name: str
├── display_name: str
├── color: str (hex)
├── avatar_url: str
├── role: enum (owner | admin | member | child | guest)
├── pin: str (hashed, for kiosk auth)
├── emergency_info: JSON
├── notification_preferences: JSON
├── age_group: enum (toddler | child | tween | teen | adult)  ← drives UI mode
└── created_at: datetime
```

**Key distinction**: a `child` member with no `account_id` can still use the system fully — they authenticate via PIN on kiosk devices, they appear on dashboards, they complete routines, they earn stars. They just don't have a login email or a phone app. When a kid eventually gets their own device/email, a parent can link an account to their existing member profile — all their history, stars, achievements, and streaks carry over.

#### 6.7.2 Household & Family Management

```
Household
├── id: UUID
├── name: str (e.g., "Wohlgemuth Family")
├── timezone: str
├── settings: JSON
├── created_by: UUID (account_id of the founding parent)
├── invite_code: str (8-char alphanumeric, regenerable)
└── Members[]
```

**Creating a household:**
1. A user creates an account (email + password, or OAuth via Google/Apple)
2. They create a household and become its `owner`
3. They add members — either by inviting other accounts (adults) or by creating accountless child members directly

#### 6.7.3 Adding Family Members

There are three distinct flows:

**Flow 1: Add a child (no email required)**

The parent creates the child member directly from the dashboard or companion app. No email, no account creation, no invitation. The parent sets:
- Name, display name, color, avatar
- Role: `child`
- Age group (toddler / child / tween / teen) — this drives the UI mode they see
- Optional PIN for kiosk authentication
- Emergency info (allergies, contacts)

The child immediately appears on the household dashboard and can use the kiosk display. Zero friction.

**Flow 2: Invite an adult by email**

The household owner or admin sends an invitation:
1. Enter the invitee's email address
2. System sends an email with an invite link (`https://your-server/invite/{token}` or `tidyboard://invite/{token}` for Electron users)
3. If the invitee already has an Tidyboard account, they click the link, see "Join the Wohlgemuth Family?", and accept. A new member record is created in the household linked to their existing account.
4. If the invitee does NOT have an account, the link takes them to a signup page pre-filled with the invite context. After account creation, they're automatically joined to the household.
5. The inviter chooses the new member's role: `admin` (can manage household, invite others, manage kids) or `member` (can manage own items + shared items, cannot manage other members)

Invitations expire after 7 days and can be resent or revoked.

**Flow 3: Invite by code (for households where email feels heavy)**

Every household has a short invite code (e.g., `WOHL-7K3X`). Any person with an account can join by entering the code. The owner gets a notification and must approve the join request before the person becomes a member. This is useful for babysitters, grandparents, or co-parents who just need to be walked through "download the app and enter this code."

#### 6.7.4 Roles & Permissions

| Role | Can do | Cannot do |
|---|---|---|
| **owner** | Everything. Transfer ownership. Delete household. | N/A (highest role) |
| **admin** | Manage all members, create/edit children, invite people, manage calendars, configure settings, manage rewards | Delete household, transfer ownership |
| **member** | Manage own events/tasks/lists, view shared content, complete routines, participate in races | Manage other members' data, invite people, change settings, manage children's profiles |
| **child** | View own dashboard, complete own routines/tasks, participate in races, earn stars, redeem rewards (with parent approval), check in feelings | Edit calendar, manage lists, change settings, view admin areas |
| **guest** | View-only access to shared calendars and dashboard | Create, edit, or delete anything |

#### 6.7.5 Multi-Household Support

A single account can be a member in multiple households. Use cases:
- Separated/divorced parents: kids appear in both households, with independent routines and calendars per household, but the same child identity
- Grandparents: guest or member role in their children's households
- Nanny/babysitter: guest role in employer's household

The app shows a household switcher. On the Electron app and phone PWA, the active household is selectable from the system tray or a top-level dropdown. The kiosk tablet locks to a single household (configured during setup).

#### 6.7.6 Upgrading a Child to an Account

When a kid gets their first phone or email:
1. Parent goes to the child's member profile → "Link Account"
2. Enters the kid's new email address
3. System sends a setup link to that email
4. Kid creates a password (or uses OAuth)
5. Their account is linked to the existing member — all stars, achievements, streaks, race history preserved
6. Kid can now log into the phone PWA or Electron app with their own credentials
7. The parent retains admin control — can adjust role, set screen time limits on the app, approve reward redemptions

#### 6.7.7 Authentication Methods

| Context | Method | Details |
|---|---|---|
| **Web browser** | Email + password, or OAuth (Google/Apple) | Standard login form, JWT issued |
| **Electron app** | Same as web, plus "Remember me" via secure OS keychain | Token stored in system credential store, not localStorage |
| **Phone PWA** | Same as web | Biometric unlock via WebAuthn on supported devices |
| **Kiosk tablet** | PIN per member | Tap avatar → enter 4-6 digit PIN → scoped JWT. No email needed. |
| **Kiosk tablet (toddler)** | No auth | Toddler mode shows a single child's view with no PIN required. Parent-configured. |
| **Invite link** | Token-based | One-time use, expires in 7 days |
| **Invite code** | Code + account | 8-char code → join request → owner approval |

### 6.9 Notifications

- Pluggable notification backends:
  - **Web Push** (PWA native — reliable on Android, best-effort on iOS)
  - **ntfy.sh** (self-hosted push — recommended for reliable iPhone notifications)
  - **Pushover**
  - **Email** (SMTP)
  - **Webhook** (for custom integrations)
  - **Native OS** (Electron desktop app only)
- Per-member notification preferences: channel selection, category filtering, quiet hours, urgency levels
- Event reminders, routine nudges, to-do due dates, reward milestones, race updates
- Kiosk tablets: on-screen alerts + optional audio chimes
- Critical notifications (server down, security) bypass quiet hours

### 6.10 Display / Kiosk Mode

- Fullscreen tablet mode with simplified navigation
- Auto-lock after idle timeout → shows wallpaper/photo slideshow
- Configurable wake hours (dim/sleep schedule)
- Photo slideshow from local folder or configured URL
- Swipe-based navigation between dashboard views
- Orientation lock (portrait for wall mount, landscape for counter)
- Optional "who's here" screen with member avatars for quick context switching

### 6.11 AI / Smart Features (Optional, BYOK)

All AI features are **opt-in** and **bring-your-own-key (BYOK)**. Tidyboard does not pay for, subsidize, or proxy AI usage. Users who want AI features configure their own API keys or run their own local models. Users without API keys simply don't see AI features — the product is fully functional without them.

**Configuration:** Users enter their API key in Settings → AI Configuration. Keys are stored encrypted at rest. The system validates the key on save and shows a clear status: "Connected to Ollama at localhost:11434" or "Connected to OpenAI (gpt-4o)".

**Features available when an AI backend is configured:**

- **Photo-to-event OCR**: Tesseract handles text extraction locally (no API key needed for OCR alone). If an LLM key is configured, the extracted text is parsed into structured events for user approval. Without an LLM key, the raw OCR text is displayed for manual event creation.
- **Meal suggestions**: given dietary preferences and recent meals, suggest plans
- **Natural language event creation**: type "Soccer practice Tuesday 4pm" → structured event
- **Daily briefing**: auto-generated summary of the day's events, tasks, and meals

**Supported backends via sashabaranov/go-openai (user provides credentials):**
- Ollama (fully local, no API key needed, no data leaves the network)
- OpenAI API (user's own key)
- Anthropic API (user's own key)
- Google Gemini API (user's own key)
- Any OpenAI-compatible endpoint (user's own URL + key)

**What Tidyboard never does:**
- Never proxies AI requests through our servers (even on Tidyboard Cloud)
- Never stores API keys anywhere except the user's own database (self-hosted) or their encrypted household record (Cloud)
- Never charges for AI usage or bundles AI costs into subscription pricing
- Never requires an AI backend — the product is complete without it

### 6.12 Widget / Plugin System

- Dashboard is a configurable grid of widgets
- Built-in widgets: calendar-day, calendar-week, weather, clock, photo frame, routine tracker, to-do summary, meal plan, family agenda
- Plugin API: Go backend + React frontend component
- Widgets declare their data requirements, update frequency, and supported display sizes
- Per-device widget layout (tablet shows a dense dashboard; phone shows a focused single-widget view)

```python
# Example plugin structure
tidyboard-plugin-weather/
├── manifest.json          # metadata, permissions, config schema
├── backend/
│   ├── __init__.py
│   └── weather_service.py # data fetching logic
├── frontend/
│   └── WeatherWidget.tsx  # React component
└── README.md
```

### 6.13 Accessibility

WCAG 2.1 AA compliance is not a checkbox — it's a design constraint that shapes every component. The audience spans toddlers through grandparents, including family members with visual, motor, cognitive, or sensory differences.

**Visual accessibility:**
- Minimum 4.5:1 contrast ratio for all text (7:1 for small text)
- High contrast mode toggle: switches to a stark black/white/yellow palette for visually impaired users
- All color-coded information (member colors, calendar events, streak status) must have a redundant non-color indicator (icon, pattern, label). A colorblind grandparent must be able to distinguish whose event is whose without relying on color alone
- Minimum touch target size: 44×44px (WCAG), bumped to 64×64px in toddler mode and kiosk mode
- Scalable text: user-configurable font size multiplier (0.8x–2.0x) stored per device
- Focus indicators: visible focus ring on all interactive elements, styled to match the theme (not the default browser outline)

**Motion & sensory:**
- `prefers-reduced-motion` media query respected globally. When active: all celebration animations replaced with static badges/icons, no confetti/emoji rain, race track shows progress bars instead of animated avatars, streak milestones show a simple "7-day streak!" toast instead of fanfare
- Animation intensity setting (full / subtle / minimal / off) independent of OS preference — a parent can set "full" for one kid and "minimal" for another with sensory sensitivities
- Sound effects toggle per device with global mute. All sounds must have visual equivalents — a chime for task completion is always paired with a visual checkmark animation
- No auto-playing video or flashing content (photosensitive epilepsy risk)

**Motor accessibility:**
- Full keyboard navigation on desktop and Electron: Tab/Shift-Tab traversal, Enter/Space activation, arrow keys for list/calendar navigation, Escape to close modals
- Voice control compatibility: semantic HTML, proper ARIA roles, labeled inputs
- Switch access support: large hit areas, sequential focus order, dwell-click friendly

**Cognitive accessibility:**
- Toddler mode: single-task view, one action per screen, no navigation complexity
- Pre-reader support: icons and images on every routine step, task, and meal — text is supplementary, not required
- Consistent layout: navigation elements don't move between views. The "done" button is always in the same place.
- Clear state feedback: completed tasks are visually distinct (struck through + faded + checkmark), not just a subtle color change
- Error messages in plain language, never codes or jargon

**Screen reader support:**
- All interactive elements have ARIA labels
- Live regions (`aria-live`) for realtime updates: new events, race progress, notification badges
- Calendar grid is a proper `role="grid"` with navigable cells
- Celebration animations announce their content to screen readers ("Congratulations! You completed your morning routine. 7-day streak!")
- Skip-to-content links on every page

**Testing accessibility:**
- axe-core automated checks in CI (zero violations gate)
- Manual screen reader testing (VoiceOver, TalkBack, NVDA) documented in the test plan for each major component
- Reduced-motion E2E test project in Playwright that runs with `prefers-reduced-motion: reduce` forced

### 6.14 Internationalization & Localization (i18n/l10n)

The system supports multiple languages from day one. Given that this is an open-source project targeting families worldwide, i18n is a structural requirement, not a post-launch addon.

**Architecture:**
- All user-facing strings extracted into translation files (JSON format, one file per locale)
- Translation key format: `namespace.component.context` (e.g., `calendar.event.create_button`, `routine.streak.milestone_7`)
- Frontend: **react-i18next** with lazy-loaded locale bundles per language
- Backend: error messages and notification templates use locale-aware rendering via Go's `golang.org/x/text` and JSON translation files
- Date/time formatting: **Intl.DateTimeFormat** (browser native) and Go's `golang.org/x/text` package, driven by the household timezone + user locale
- Number formatting: `Intl.NumberFormat` for star counts, leaderboard rankings (1,000 vs 1.000)
- Pluralization rules: handled by i18next's built-in plural resolver (critical for languages with complex plural forms like Arabic, Polish)

**Locale configuration:**
- Household-level default locale (e.g., "en-US")
- Per-member locale override (grandma speaks German, kids speak English)
- The UI renders in the active member's locale on kiosk mode, or the logged-in user's locale on personal devices
- Right-to-left (RTL) layout support for Arabic, Hebrew, etc. — CSS logical properties (`margin-inline-start` instead of `margin-left`), RTL-aware component library

**Translation workflow:**
- Source language: English (en-US)
- Community translations via **Weblate** (self-hosted) or **Crowdin** (hosted) — linked from the contributing docs
- Translation completeness threshold: a locale must be >80% translated to be listed as available. Below that, it falls back to English for missing keys.
- Bundled languages at launch: English (en-US), German (de-DE), Spanish (es), French (fr)
- Badge/achievement names, routine templates, and error messages all go through the translation pipeline

**What is NOT translated:**
- User-created content (event titles, task names, meal plan entries) — these stay in whatever language the user typed them in
- Plugin content — plugins manage their own translations via the manifest

### 6.15 Data Portability & Export

Your data is yours. Getting it out should be as easy as getting it in.

**Full household export:**
- One-click export from admin settings → downloads a ZIP archive containing:
  - `household.json` — household metadata, member profiles (minus passwords/PINs), settings
  - `calendars/` — each calendar as a standard `.ics` file (RFC 5545 compliant)
  - `lists.json` — all lists with items, completion status, assignment
  - `routines.json` — routine definitions, steps, completion logs, streak data
  - `meals.json` — meal plans with dates and recipe URLs
  - `rewards.json` — reward definitions, star balances, redemption history
  - `races.json` — race history, results, leaderboard snapshots
  - `achievements.json` — all badges earned per member
  - `audit_log.json` — full audit trail (see Audit Log section)
  - `media/` — avatar images, routine step photos
- Export format is documented in `docs/export-format.md` so other tools can import it
- API endpoint: `GET /api/household/export` → streamed ZIP download

**Selective export:**
- Export a single calendar as `.ics`
- Export a single list as `.csv` or `.json`
- Export meal plans as `.csv` (date, meal type, title, recipe URL — easy to open in a spreadsheet)

**Import:**
- Import from Tidyboard export ZIP (household migration between servers)
- Import `.ics` files (drag and drop or file picker)
- Import lists from `.csv`

**Scheduled backups (see also 6.19):**
- Automatic nightly export to a configured local directory or remote target
- Configurable retention (keep last N backups)

### 6.16 Audit Log & Activity Feed

Every mutation in the system is logged. This serves two purposes: parental oversight (did my kid actually do their chore or did their sibling mark it done?) and system debugging (what changed and when?).

**What is logged:**
- Event created / updated / deleted — who, when, what changed
- Task / list item completed / uncompleted — who, when, which device
- Routine step completed — who, when, how long it took
- Star awarded / reward redeemed — who, when, how many
- Race started / item completed / race finished — who, when, result
- Member added / invited / removed / role changed
- Calendar sync started / completed / failed
- Settings changed — who, what setting, old value → new value
- Login attempts (success + failure) — account, device, IP

**Data model:**
```
AuditEntry
├── id: UUID
├── timestamp: datetime
├── household_id: UUID
├── actor_member_id: UUID (nullable — null for system actions like sync)
├── actor_account_id: UUID (nullable)
├── action: str (e.g., "task.completed", "event.created", "member.invited")
├── entity_type: str (e.g., "Event", "ListItem", "Routine")
├── entity_id: UUID
├── details: JSON (old/new values, context)
├── device_info: str (e.g., "kiosk-kitchen", "phone-app", "electron-desktop")
└── ip_address: str (nullable)
```

**Visibility:**
- Admin/owner: full audit log with filters by member, action type, date range, and entity
- Member: can see their own activity feed ("You completed 5 tasks today, earned 8 stars")
- Child: sees a simplified "My Activity" view — recent completions, stars earned, badges unlocked
- Guest: no audit log access

**Retention:**
- Configurable retention period (default: 90 days)
- Audit log included in household export
- Old entries purged by a scheduled background task

**API:**
```
GET /api/audit                             # full log (admin only, paginated)
    ?member_id=...
    &action=task.completed
    &since=2026-04-01
    &until=2026-04-12
GET /api/audit/feed/{member_id}            # simplified activity feed for a member
```

### 6.17 Gamification Anti-Abuse & Fair Play

Kids will find exploits. The spec anticipates and prevents the most obvious ones:

**Star farming prevention:**
- **Completion cooldown**: once a task is marked complete, it cannot be uncompleted and re-completed within 1 hour (configurable). Prevents complete → uncomplete → complete loops to farm stars.
- **Rapid completion throttle**: if a member completes more than 10 tasks within 5 minutes, the system flags it and withholds stars pending parent review. Notification sent to all admin/owner accounts.
- **Self-created task limit**: child role members cannot create their own tasks (only admin/member roles can). This prevents kids from creating trivial tasks to earn stars.
- **Task value caps**: parents set a max star value per task (default: 5 stars). Prevents accidentally awarding 1000 stars for "make bed."
- **Duplicate task detection**: warn admins when creating a task that closely matches an existing one (fuzzy text match) — prevents kids from asking different parents to create the same task twice.

**Race integrity:**
- Only admin/owner roles can create races
- Race items must reference existing tasks or routine steps — no ad-hoc item creation during a race
- Completing a race item also completes the underlying task/routine step — no double-dipping
- If a race participant disconnects, their progress is preserved and they can resume

**Leaderboard fairness:**
- Parents can enable "personal best" mode instead of competitive rankings — each kid competes against their own history, not siblings
- Age-weighted scoring option: younger kids' stars are multiplied by a configurable factor (e.g., 1.5x for toddlers) to keep competition fair
- Parents can manually adjust star balances with an audit log entry ("Mom added 5 stars: makeup for missed system-down day")

**Parental controls:**
- Reward redemption requires parent approval (configurable: always, over N stars, or never)
- Parents receive notifications when any star/reward manipulation is flagged
- "Star audit" view: complete history of stars earned and spent per member, with source (which task, which race, manual adjustment)

### 6.18 Maintenance Mode

Server-side maintenance mode for when the admin needs to run migrations, perform upgrades, restore backups, or troubleshoot without users seeing errors.

**Server-side behavior:**
- Activated via CLI (`tidyboard maintenance on`), API endpoint (`POST /api/admin/maintenance`), or environment variable (`TIDYBOARD_MAINTENANCE=true`)
- When active:
  - All REST API endpoints return `503 Service Unavailable` with a JSON body: `{ "maintenance": true, "message": "...", "estimated_return": "..." }`
  - WebSocket connections receive a `{ "type": "maintenance", "message": "..." }` message and are gracefully closed
  - The health endpoint (`GET /api/health`) continues to work but returns `{ "status": "maintenance", "database": "..." }`
  - Admin-scoped JWT tokens can still access a limited set of endpoints: health, maintenance toggle, backup/restore, migration status
- An optional estimated return time can be set — this is communicated to all clients
- Deactivated via the same CLI/API/env var mechanisms
- An audit log entry records who activated/deactivated maintenance mode and when

**Client-side behavior:**
- When the client receives a `503` response or `maintenance` WebSocket message, all views switch to a full-screen **maintenance overlay**:
  - Friendly illustration (wrench + gears, not an error screen)
  - Message: "Tidyboard is being updated! We'll be back shortly." (customizable by admin)
  - Estimated return time if set, with a live countdown
  - Auto-retry: the client polls the health endpoint every 30 seconds. When the server returns `{ "status": "ok" }`, the overlay dismisses and the UI refreshes automatically — no manual reload needed
- On the Electron app: the system tray icon changes to a maintenance indicator (orange dot)
- On kiosk tablets: the maintenance screen replaces the wallpaper/calendar and auto-recovers
- Offline cached data remains viewable in read-only mode during maintenance if the client has IndexedDB data. New mutations are queued and synced when the server returns.

**Scheduled maintenance windows:**
- Admins can schedule a future maintenance window via the settings UI
- A countdown banner appears on all devices N minutes before the window starts (configurable, default: 15 minutes): "Tidyboard will be briefly unavailable in 12 minutes for an update"
- The system auto-enters maintenance mode at the scheduled time and auto-exits when the admin explicitly deactivates it (no auto-exit to avoid incomplete migrations)

### 6.19 Backup & Restore

The system must survive disasters — accidental deletion, corrupted data, failed migrations, or hardware failure.

**Automated backups:**
- Scheduled via EventBridge Scheduler (Cloud) or background goroutine with cron (self-hosted)
- Default: nightly at 3:00 AM server time (configurable)
- Backup includes:
  - Full database dump (`pg_dump` for PostgreSQL)
  - Media files (avatars, photos, attachments)
  - Configuration (server settings, sync credentials — encrypted)
  - goose migration version (to know which schema the backup expects)
- Backup destinations (configurable, multiple can be active simultaneously):
  - Local directory (default: `./backups/`)
  - S3-compatible object storage (AWS S3, MinIO, Backblaze B2)
  - SFTP/SCP to a remote server
  - rclone integration (covers Google Drive, Dropbox, OneDrive, etc.)
- Retention policy: keep last N daily backups (default: 7), last N weekly snapshots (default: 4), last N monthly snapshots (default: 3)
- Backup integrity check: SHA-256 hash stored with each backup, verified before restore

**Manual backup:**
- Admin UI: "Backup Now" button → triggers immediate backup to configured destinations
- CLI: `tidyboard backup create [--destination local|s3|sftp]`
- API: `POST /api/admin/backup` (admin only)

**Restore:**
- CLI: `tidyboard backup restore <backup-file-or-url>`
- API: `POST /api/admin/restore` with backup file upload (admin only)
- Restore process:
  1. System enters maintenance mode automatically
  2. Current database backed up as a safety net (`pre-restore-{timestamp}`)
  3. Database replaced with backup data
  4. goose migrations run forward if the backup is from an older schema version
  5. Media files restored
  6. System exits maintenance mode
  7. All connected clients auto-refresh
- Restore can target a specific backup by timestamp or filename
- Dry-run mode: `tidyboard backup restore --dry-run <file>` validates the backup without applying it

**Monitoring:**
- Backup status visible in admin settings: last successful backup time, size, destination, any errors
- Notification sent to admin if backup fails (via configured notification backend)
- API: `GET /api/admin/backups` returns list of available backups with timestamps, sizes, and integrity status

### 6.20 Tablet & Kiosk Operations Guide

While the app can't control tablet hardware, the docs and settings need to address the operational realities of running a device 24/7 on a wall.

**iPad deployment:**
- Guided Access: step-by-step guide for enabling Guided Access (Settings → Accessibility → Guided Access) to lock the iPad to the Tidyboard PWA — prevents kids from exiting to other apps
- Disable notifications from other apps so only Tidyboard alerts show
- Auto-brightness: recommend enabling to prevent screen burn-in and save power
- Keep iPad plugged in permanently — document recommended charging cables and mounts
- Automatic Software Updates: recommend disabling to prevent iOS updates from interrupting the kiosk
- Configure Do Not Disturb schedule to suppress non-Tidyboard notifications during quiet hours

**Android tablet deployment:**
- Android kiosk mode: guide for using Screen Pinning (Settings → Security → Screen Pinning) or third-party kiosk launchers (e.g., Fully Kiosk Browser — free for personal use)
- Fully Kiosk Browser integration: document recommended settings (auto-start URL, screen on/off schedule, motion detection wake, remote admin)
- Disable navigation bar and status bar in kiosk launcher
- Disable automatic OS updates

**Screen burn-in prevention:**
- Photo slideshow mode with configurable rotation interval (prevents static calendar layout from burning in)
- Sleep mode: configurable off-hours (e.g., 10 PM–6 AM) where the screen dims to minimum or goes black
- Pixel shift: subtle 1-2px position drift every few minutes (imperceptible to users, prevents burn-in on OLED/AMOLED tablets)
- Screensaver with clock/animation during idle periods

**Hardware recommendations (in docs):**
- Recommended mounts: adhesive wall mounts, VESA mounts for tablets, magnetic mounts for iPads
- Recommended tablets: "any iPad from iPad Air 2 onward, any Android tablet with Chrome 90+, Amazon Fire tablets with sideloaded Chrome"
- Power management: in-wall USB outlets, cable management channels, low-profile right-angle Lightning/USB-C cables

### 6.21 Offline Resilience & Server-Down Behavior

What happens when the server is unreachable — planned (maintenance) or unplanned (crash, network outage)?

**Client behavior when server is down:**

- **Connection status indicator**: persistent badge in the UI corner — green (connected), yellow (reconnecting), red (offline). Subtle, not alarming — kids shouldn't see a scary error screen.
- **Cached data remains viewable**: the last-synced state of calendars, lists, routines, and events is displayed from IndexedDB. Data age shown: "Last synced 2 hours ago"
- **Mutations queue locally**: if a user completes a task, adds an event, or marks a routine step done while offline, the action is stored in a sync queue in IndexedDB. A small badge shows "3 changes pending sync."
- **Automatic reconnection**: WebSocket reconnects with exponential backoff (1s → 2s → 4s → 8s → max 60s). REST requests retry 3 times with 2s intervals before giving up.
- **Sync on reconnection**: when the server comes back, queued mutations are replayed in order. Conflicts are resolved per the standard last-write-wins policy with conflict logging.
- **Stale data warning**: if data is more than 24 hours old, a banner appears: "Some information may be outdated. Check your server connection." Not shown for <24h because that's normal overnight sleep.

**Kiosk tablet specifically:**
- Never shows a blank screen. Even with no server, the cached calendar and routines display.
- Celebrations and animations continue to work for locally-completed tasks (stars are awarded locally and synced later)
- If the server has been unreachable for >1 hour, the kiosk shows a subtle admin-only notification (tap admin avatar + PIN to see): "Server connection lost at 3:42 PM. Last sync: 3:41 PM."

**Electron app specifically:**
- System tray icon changes from green to yellow/red based on connection status
- Native OS notification on disconnect (if persistent, after 5 minutes): "Tidyboard server is unreachable. Changes will sync when connection is restored."
- Queued changes badge on tray icon

**Server-side resilience:**
- Health endpoint (`GET /api/health`) returns database status, migration status, active WebSocket connections, last backup time, sync engine status
- If the database is corrupted or inaccessible, the server returns 503 on all endpoints and logs the error — it does not silently serve partial data
- Graceful shutdown: on SIGTERM, the server sends a WebSocket `{ "type": "server_shutdown" }` message to all clients before closing connections

---

## 7. API Design

RESTful API served by Go Lambda functions behind API Gateway (Cloud) or chi router (self-hosted). OpenAPI 3.0 spec generated by swaggo/swag. WebSocket via API Gateway WebSocket API (Cloud) or gorilla/websocket (self-hosted).

All endpoint groups are documented in their respective feature sections. Recipe, Meal Plan, Shopping List, and Ingredient endpoints are defined in Section 6.4.4.

### 7.1 Lambda Function Layout

Each Lambda function handles a domain of routes. This keeps binaries small (fast cold starts) while avoiding the overhead of one-function-per-route.

| Lambda Function | Routes | Binary Name |
|---|---|---|
| `auth` | `/api/auth/*` | `cmd/lambda/auth/main.go` |
| `households` | `/api/households/*`, `/api/household/*`, `/api/invite/*`, `/api/join` | `cmd/lambda/households/main.go` |
| `calendars` | `/api/calendars/*`, `/api/events/*`, `/api/feed/*` | `cmd/lambda/calendars/main.go` |
| `lists` | `/api/lists/*` | `cmd/lambda/lists/main.go` |
| `routines` | `/api/routines/*` | `cmd/lambda/routines/main.go` |
| `meals` | `/api/meals/*` | `cmd/lambda/meals/main.go` |
| `recipes` | `/api/recipes/*`, `/api/shopping/*`, `/api/ingredients/*` | `cmd/lambda/recipes/main.go` |
| `gamification` | `/api/rewards/*`, `/api/races/*`, `/api/leaderboard/*`, `/api/achievements/*` | `cmd/lambda/gamification/main.go` |
| `admin` | `/api/admin/*`, `/api/health/*`, `/api/audit/*`, `/api/billing/*` | `cmd/lambda/admin/main.go` |
| `equity` | `/api/domains/*`, `/api/time-entries/*`, `/api/equity/*` | `cmd/lambda/equity/main.go` |
| `ai` | `/api/ai/*` | `cmd/lambda/ai/main.go` |
| `ws-connect` | `$connect` (WebSocket API) | `cmd/lambda/ws/connect/main.go` |
| `ws-disconnect` | `$disconnect` (WebSocket API) | `cmd/lambda/ws/disconnect/main.go` |
| `ws-message` | `$default` (WebSocket API) | `cmd/lambda/ws/message/main.go` |
| `sync-worker` | EventBridge scheduled → calendar sync polling | `cmd/lambda/sync/main.go` |
| `cron` | EventBridge scheduled → backups, leaderboard snapshots, audit cleanup | `cmd/lambda/cron/main.go` |
| `migrate` | Run on deploy → goose migrations | `cmd/lambda/migrate/main.go` |

**Standalone mode** (`cmd/server/main.go`): Registers all the same route handlers on a single chi router. Runs as a normal HTTP server. Used for local development and self-hosted deployments.

```go
// cmd/server/main.go — self-hosted standalone server

func main() {
    var cli config.Config
    ctx := kong.Parse(&cli,
        kong.Name("tidyboard"),
        kong.Description("Open source family dashboard"),
        kong.Configuration(kongyaml.Loader, "config.yaml", "~/.tidyboard/config.yaml", "/etc/tidyboard/config.yaml"),
    )

    db := database.Connect(cli.Database)
    redis := cache.Connect(cli.Redis)

    r := chi.NewRouter()
    r.Use(middleware.Logger)
    r.Use(middleware.Recoverer)
    r.Use(cors.Handler(cors.Options{AllowedOrigins: cli.Server.CORSOrigins}))

    // Mount the same handlers used by Lambda functions
    r.Mount("/api/auth", auth.Routes(db))
    r.Mount("/api/households", households.Routes(db))
    r.Mount("/api/calendars", calendars.Routes(db))
    r.Mount("/api/events", events.Routes(db))
    r.Mount("/api/lists", lists.Routes(db))
    r.Mount("/api/routines", routines.Routes(db))
    r.Mount("/api/meals", meals.Routes(db))
    r.Mount("/api/recipes", recipes.Routes(db))
    r.Mount("/api/shopping", shopping.Routes(db))
    r.Mount("/api/ingredients", ingredients.Routes(db))
    r.Mount("/api/rewards", gamification.RewardRoutes(db))
    r.Mount("/api/races", gamification.RaceRoutes(db))
    r.Mount("/api/domains", equity.DomainRoutes(db))
    r.Mount("/api/time-entries", equity.TimeEntryRoutes(db))
    r.Mount("/api/equity", equity.DashboardRoutes(db))
    r.Mount("/api/admin", admin.Routes(db))
    r.Mount("/api/ai", ai.Routes(db, cfg))

    // WebSocket (gorilla/websocket for standalone, API Gateway for Lambda)
    r.Get("/api/ws", ws.HandleWebSocket(db, redis))

    // Serve frontend static files
    r.Handle("/*", http.FileServer(http.Dir("./web/dist")))

    log.Info("Tidyboard server starting", "addr", cli.Server.Host+":"+strconv.Itoa(cli.Server.Port))
    http.ListenAndServe(cli.Server.Host+":"+strconv.Itoa(cli.Server.Port), r)
}
```

```go
// cmd/lambda/calendars/main.go — Lambda handler for calendar routes

func main() {
    cfg := config.LoadFromEnv()  // Lambda mode: env vars only, no YAML file
    db := database.Connect(cfg.Database)  // connects via RDS Proxy

    r := chi.NewRouter()
    r.Use(authmw.JWTMiddleware(cfg.Auth.JWTSecret))
    r.Mount("/api/calendars", calendars.Routes(db))
    r.Mount("/api/events", events.Routes(db))
    r.Mount("/api/feed", feed.Routes(db))

    adapter := chiadapter.New(r)
    lambda.Start(adapter.ProxyWithContext)
}
```

### 7.2 REST Endpoints (Summary)

All endpoints require JWT auth unless noted. Household scoping enforced by middleware.

```
Auth:          POST /api/auth/register, /login, /refresh, /pin, DELETE /me
Households:    CRUD /api/households, /invite, /join, /join-requests
Members:       CRUD /api/households/{id}/members
Calendars:     CRUD /api/calendars, /api/events, GET /api/feed/{id}.ics
Lists:         CRUD /api/lists, /api/lists/{id}/items
Routines:      CRUD /api/routines, /api/routines/{id}/steps
Recipes:       CRUD /api/recipes, POST /import-url, /import-photo, /import-file
               GET /scale, POST /share, CRUD /collections
Meals:         CRUD /api/meals, POST /copy-week, /templates, /apply-template
Shopping:      POST /api/shopping/generate, GET /current, POST /staples
Ingredients:   GET /api/ingredients/search, POST /api/ingredients
Gamification:  CRUD /api/rewards, /races, /leaderboard, /achievements
Domains:       CRUD /api/domains, POST /assign, GET /history
Time Entries:  CRUD /api/time-entries
Equity:        GET /api/equity/summary, /trends, /personal-time, /rebalance
Widgets:       CRUD /api/widgets
AI:            POST /api/ai/parse-event, /suggest-meals, /parse-recipe
Admin:         GET /api/health, /api/admin/*, /api/audit/*
Billing:       POST /api/billing/checkout, GET /portal, /subscription (Cloud only)
Export:        GET /api/export (ZIP download)
Conflicts:     GET /api/events/conflicts, POST /check-conflicts
```

### 7.3 WebSocket Architecture

**Cloud (API Gateway WebSocket API):**
```
Client ←→ API Gateway WebSocket API
                    │
         ┌──────────┴──────────┐
         │ $connect     → Lambda stores connection_id in Redis
         │ $disconnect  → Lambda removes connection_id from Redis
         │ $default     → Lambda handles subscribe/unsubscribe/ping
         └─────────────────────┘

When data changes (e.g., event created via REST Lambda):
  REST Lambda → publishes message to Redis channel
  → separate "broadcaster" Lambda (triggered by Redis or polling)
  → reads connection_ids from Redis
  → calls API Gateway Management API to post message to each connection
```

**Self-hosted (gorilla/websocket):**
```
Client ←→ Go server (gorilla/websocket)
              │
              └→ In-process hub (goroutine) manages connections
              └→ Redis pub/sub for multi-instance fan-out
```

**WebSocket protocol** (unchanged):
```
Server → Client:
  { "type": "event.created",     "data": { ... } }
  { "type": "event.updated",     "data": { ... } }
  { "type": "race.updated",      "data": { ... } }
  { "type": "achievement.earned", "data": { ... } }
  { "type": "celebration",       "data": { ... } }
  { "type": "maintenance",       "data": { ... } }
  { "type": "server_shutdown",   "data": { ... } }

Client → Server:
  { "type": "subscribe",   "channels": ["calendar", "routines"] }
  { "type": "unsubscribe", "channels": ["routines"] }
  { "type": "ping" }
```

---

## 8. Sync Architecture

### 8.1 Calendar Sync Engine

The sync worker runs as a scheduled Lambda (triggered by EventBridge every 5 minutes) or as a background goroutine in standalone mode. It polls each configured calendar source and reconciles changes.

Each calendar source gets a sync adapter implementing a common Go interface:

```go
// internal/sync/adapter.go

type SyncAdapter interface {
    // FetchEvents returns events modified since the given timestamp.
    FetchEvents(ctx context.Context, since *time.Time) ([]ExternalEvent, error)

    // PushEvent creates an event on the external calendar. Returns external ID.
    PushEvent(ctx context.Context, event Event) (string, error)

    // UpdateEvent updates an existing event on the external calendar.
    UpdateEvent(ctx context.Context, externalID string, event Event) error

    // DeleteEvent removes an event from the external calendar.
    DeleteEvent(ctx context.Context, externalID string) error

    // SupportsPush returns true if the adapter supports webhooks/push (vs polling).
    SupportsPush() bool
}
```

Adapters: `GoogleAdapter`, `OutlookAdapter`, `CalDAVAdapter`, `ICalURLAdapter`.

Conflict resolution: last-write-wins with conflict log for manual review. Every conflict produces an audit log entry.

### 8.2 Offline-First Client Sync

- All data cached in IndexedDB via Dexie.js
- Mutations applied locally first, then synced to server
- Conflict resolution: server timestamp wins; client notified of conflicts
- Sync queue persists across page reloads
- Connection status indicator on all views

---


---

## 9. Security Considerations

### 9.1 Transport & Encryption
- All traffic over HTTPS (enforced in production; self-signed cert guide provided for local networks)
- JWT tokens with short expiry (15 min) + refresh tokens (7 days, rotated on use)
- PIN auth for kiosk mode generates a scoped JWT (limited permissions, 24-hour expiry)
- OAuth2 tokens for calendar sync stored encrypted at rest (AES-256-GCM encryption via Go crypto stdlib, key from server secret)
- Database encryption at rest optional (PostgreSQL's pgcrypto for column-level encryption)

### 9.2 Access Control
- CORS restricted to configured origins (default: same-origin only)
- CSP headers on all responses (strict policy: no inline scripts, no eval, font/image sources whitelisted)
- Rate limiting on auth endpoints (5 attempts per minute per IP, then 15-minute lockout)
- Rate limiting on gamification endpoints (see Gamification Anti-Abuse section)
- PIN brute-force protection: 5 incorrect attempts → 5-minute lockout per member, with notification to admin
- Admin endpoints (`/api/admin/*`) require owner or admin role JWT — never accessible via PIN auth

### 9.3 Data Privacy
- No telemetry, no analytics, no external requests unless user configures integrations
- Audit log records all data access by admin accounts (who viewed what, when)
- Account deletion: `DELETE /api/auth/me` triggers GDPR-style data removal — account record deleted, member records anonymized, all personal data purged within 30 days (configurable)
- Backup files inherit the same encryption policy as the live database
- Invite tokens are single-use and time-limited (7 days)
- Invite codes can be regenerated at any time (invalidates the old code)

### 9.4 Operational Security
- Server secret key: generated on first boot, stored in `config/secret.key`. Docs warn users to back this up — losing it invalidates all JWTs and encrypted credentials
- Environment variable overrides for all secrets (never hardcoded, never in source control)
- Docker image runs as non-root user
- Dependency vulnerability scanning in CI (govulncheck for Go, npm audit for Node)
- Signed Docker images for release builds (cosign)

---

## 10. Testing Strategy

### 10.1 Philosophy: Test-Driven Development

Every feature follows Red → Green → Refactor. No code gets merged without tests. The test suite is the living specification.

**Core rules:**
1. **Tests run sequentially** — no parallel execution (`go test -p 1 -count=1`). Side effects between tests are real and must be eliminated by isolation, not masked by parallelism.
2. **No mocking what you own** — mock external services (Google API, Outlook API, Stripe, SMTP), never mock your own service layer or repositories. If your own code is hard to test, refactor it.
3. **Tests are deterministic** — no reliance on wall clock time, random data, or network availability. Use clock injection for time, factories for data, recorded HTTP responses for external APIs.
4. **Every bug gets a regression test** — before fixing a bug, write a test that reproduces it.
5. **Coverage is a floor, not a target** — 80% line coverage minimum enforced in CI.

### 10.2 Test Pyramid

```
         ┌─────────┐
         │  E2E    │   ~20 tests    — Playwright, full stack
         │ (slow)  │   Run: CI only, pre-release
         ├─────────┤
         │  Smoke  │   ~30 tests    — fast critical-path validation
         │         │   Run: every deploy, post-migration
         ├─────────┤
         │ Integr. │   ~150 tests   — API + DB + sync
         │         │   Run: every PR, CI
         ├─────────┤
         │  Unit   │   ~500+ tests  — pure logic, no I/O
         │ (fast)  │   Run: every save, CI
         └─────────┘
```

### 10.3 Test Infrastructure

#### Backend (Go)

| Tool | Purpose |
|---|---|
| **testing** (stdlib) | Test runner. `-p 1 -count=1 -v -race` (sequential, verbose, race detection) |
| **testify** (`assert`, `require`, `suite`) | Fluent assertions, test suites with setup/teardown |
| **testcontainers-go** | Spin up real Postgres + Redis in Docker for integration tests. No mocking the database. |
| **go-sqlmock** | Only for unit-testing query construction — never for integration tests (use real Postgres). |
| **httpmock** (`jarcoal/httpmock`) | Mock external HTTP calls (Google API, Outlook API, ntfy, Stripe webhooks) |
| **go-vcr** (`dnaeon/go-vcr`) | Record/replay external API interactions for sync adapter tests |
| **testclock** (custom) | Injected `clock.Clock` interface for deterministic time in tests |
| **golangci-lint** | Static analysis in CI. Zero lint errors gate. |

**Test configuration** (Makefile):
```makefile
.PHONY: test test-unit test-integration test-smoke test-e2e

test-unit:
	go test -p 1 -count=1 -v -race -tags=unit ./internal/...

test-integration:
	go test -p 1 -count=1 -v -race -tags=integration ./internal/... ./cmd/...

test-smoke:
	go test -p 1 -count=1 -v -tags=smoke ./tests/smoke/...

test: test-unit test-integration

lint:
	golangci-lint run ./...
```

#### Frontend (TypeScript/React)

Unchanged — Vitest (sequential, `singleFork: true`), React Testing Library, MSW, Playwright, happy-dom.

### 10.4 Test Database Management

Integration tests use **testcontainers-go** to spin up a real PostgreSQL container. Each test suite gets a fresh database with migrations applied.

```go
// internal/testutil/database.go

func SetupTestDB(t *testing.T) *pgxpool.Pool {
    t.Helper()

    ctx := context.Background()
    container, err := postgres.Run(ctx,
        "postgres:16-alpine",
        postgres.WithDatabase("tidyboard_test"),
        postgres.WithUsername("test"),
        postgres.WithPassword("test"),
        testcontainers.WithWaitStrategy(
            wait.ForLog("database system is ready to accept connections").
                WithOccurrence(2).WithStartupTimeout(30*time.Second),
        ),
    )
    require.NoError(t, err)

    t.Cleanup(func() { container.Terminate(ctx) })

    connStr, err := container.ConnectionString(ctx, "sslmode=disable")
    require.NoError(t, err)

    // Run migrations
    goose.SetDialect("postgres")
    db, _ := sql.Open("pgx", connStr)
    err = goose.Up(db, "migrations")
    require.NoError(t, err)
    db.Close()

    pool, err := pgxpool.New(ctx, connStr)
    require.NoError(t, err)
    t.Cleanup(func() { pool.Close() })

    return pool
}
```

Each test function gets a transaction that rolls back:

```go
// internal/testutil/tx.go

func WithTestTx(t *testing.T, pool *pgxpool.Pool, fn func(tx pgx.Tx)) {
    t.Helper()
    ctx := context.Background()
    tx, err := pool.Begin(ctx)
    require.NoError(t, err)
    defer tx.Rollback(ctx) //nolint:errcheck

    fn(tx)
    // transaction rolls back automatically — no state leaks between tests
}
```

### 10.5 Test Factories

```go
// internal/testutil/factories.go

func MakeHousehold(overrides ...func(*model.Household)) model.Household {
    h := model.Household{
        ID:       uuid.New(),
        Name:     "Test Family",
        Timezone: "America/Los_Angeles",
    }
    for _, o := range overrides {
        o(&h)
    }
    return h
}

func MakeMember(householdID uuid.UUID, overrides ...func(*model.Member)) model.Member {
    m := model.Member{
        ID:          uuid.New(),
        HouseholdID: householdID,
        Name:        "Test Member",
        DisplayName: "Test",
        Color:       "#3498db",
        Role:        model.RoleMember,
    }
    for _, o := range overrides {
        o(&m)
    }
    return m
}

func MakeEvent(calendarID uuid.UUID, overrides ...func(*model.Event)) model.Event {
    e := model.Event{
        ID:        uuid.New(),
        CalendarID: calendarID,
        Title:     "Test Event",
        StartTime: time.Date(2026, 4, 15, 10, 0, 0, 0, time.UTC),
        EndTime:   time.Date(2026, 4, 15, 11, 0, 0, 0, time.UTC),
        AllDay:    false,
    }
    for _, o := range overrides {
        o(&e)
    }
    return e
}
```

### 10.6 Unit Tests

Pure logic with no I/O. Build-tagged `//go:build unit`.

```go
//go:build unit

package calendar_test

func TestExpandRRULE_Weekly(t *testing.T) {
    rule := "FREQ=WEEKLY;BYDAY=TU,TH;COUNT=4"
    start := time.Date(2026, 4, 14, 16, 0, 0, 0, time.UTC) // Tuesday

    dates, err := calendar.ExpandRRULE(rule, start)
    require.NoError(t, err)

    assert.Len(t, dates, 4)
    assert.Equal(t, time.Tuesday, dates[0].Weekday())
    assert.Equal(t, time.Thursday, dates[1].Weekday())
}

func TestConflictResolution_ServerWinsWhenNewer(t *testing.T) {
    local := testutil.MakeEvent(uuid.Nil, func(e *model.Event) {
        e.Title = "Old title"
        e.UpdatedAt = time.Date(2026, 4, 10, 0, 0, 0, 0, time.UTC)
    })
    remote := testutil.MakeEvent(uuid.Nil, func(e *model.Event) {
        e.Title = "New title"
        e.UpdatedAt = time.Date(2026, 4, 12, 0, 0, 0, 0, time.UTC)
    })

    resolved, conflict := sync.ResolveConflict(local, remote)

    assert.Equal(t, "New title", resolved.Title)
    assert.NotNil(t, conflict)
}
```

### 10.7 Integration Tests

Build-tagged `//go:build integration`. Hit real Postgres via testcontainers.

```go
//go:build integration

package events_test

func TestEventsAPI(t *testing.T) {
    pool := testutil.SetupTestDB(t)
    router := testutil.SetupRouter(pool)

    t.Run("create event returns 201", func(t *testing.T) {
        testutil.WithTestTx(t, pool, func(tx pgx.Tx) {
            household := testutil.SeedHousehold(t, tx)
            cal := testutil.SeedCalendar(t, tx, household.ID)
            token := testutil.MakeJWT(t, household.ID, model.RoleAdmin)

            body := `{"title":"Soccer Practice","start_time":"2026-04-15T16:00:00Z","end_time":"2026-04-15T17:30:00Z"}`
            req := httptest.NewRequest("POST", "/api/calendars/"+cal.ID.String()+"/events", strings.NewReader(body))
            req.Header.Set("Authorization", "Bearer "+token)
            req.Header.Set("Content-Type", "application/json")

            rr := httptest.NewRecorder()
            router.ServeHTTP(rr, req)

            assert.Equal(t, 201, rr.Code)
            var resp map[string]any
            json.Unmarshal(rr.Body.Bytes(), &resp)
            assert.Equal(t, "Soccer Practice", resp["title"])
        })
    })

    t.Run("create event without auth returns 401", func(t *testing.T) {
        body := `{"title":"Sneaky Event","start_time":"2026-04-15T16:00:00Z"}`
        req := httptest.NewRequest("POST", "/api/calendars/"+uuid.New().String()+"/events", strings.NewReader(body))
        rr := httptest.NewRecorder()
        router.ServeHTTP(rr, req)

        assert.Equal(t, 401, rr.Code)
    })

    t.Run("child cannot delete others events", func(t *testing.T) {
        testutil.WithTestTx(t, pool, func(tx pgx.Tx) {
            household := testutil.SeedHousehold(t, tx)
            parent := testutil.SeedMember(t, tx, household.ID, model.RoleAdmin)
            child := testutil.SeedMember(t, tx, household.ID, model.RoleChild)
            cal := testutil.SeedCalendar(t, tx, household.ID)
            event := testutil.SeedEvent(t, tx, cal.ID, parent.ID)

            token := testutil.MakeJWTForMember(t, household.ID, child)
            req := httptest.NewRequest("DELETE", "/api/events/"+event.ID.String(), nil)
            req.Header.Set("Authorization", "Bearer "+token)

            rr := httptest.NewRecorder()
            router.ServeHTTP(rr, req)

            assert.Equal(t, 403, rr.Code)
        })
    })
}
```

### 10.8 Smoke Tests

Build-tagged `//go:build smoke`. Run against a deployed instance.

```go
//go:build smoke

package smoke_test

var baseURL = envOr("SMOKE_TEST_URL", "http://localhost:8080")

func TestHealth(t *testing.T) {
    resp, err := http.Get(baseURL + "/api/health")
    require.NoError(t, err)
    defer resp.Body.Close()

    assert.Equal(t, 200, resp.StatusCode)

    var body map[string]any
    json.NewDecoder(resp.Body).Decode(&body)
    assert.Equal(t, "ok", body["status"])
}

func TestCreateAndRetrieveEvent(t *testing.T) {
    token := smokeLogin(t)

    // Create
    createResp := smokePost(t, "/api/calendars/"+smokeCalID+"/events", token, map[string]any{
        "title":      "Smoke Test Event",
        "start_time": "2026-04-15T10:00:00Z",
        "end_time":   "2026-04-15T11:00:00Z",
    })
    assert.Equal(t, 201, createResp.StatusCode)

    var created map[string]any
    json.NewDecoder(createResp.Body).Decode(&created)
    eventID := created["id"].(string)

    // Retrieve
    getResp := smokeGet(t, "/api/events/"+eventID, token)
    assert.Equal(t, 200, getResp.StatusCode)

    // Cleanup
    delResp := smokeDelete(t, "/api/events/"+eventID, token)
    assert.Equal(t, 204, delResp.StatusCode)
}
```

### 10.9 End-to-End Tests (Playwright)

Playwright E2E tests run against the full stack with three viewport projects: tablet (768×1024), phone (390×844), desktop (1440×900). Sequential execution (`workers: 1`). Covers: first-time onboarding wizard, calendar event CRUD, cross-device sync via WebSocket, kiosk PIN auth, child role restrictions, list workflow, routine completion with celebration animation, recipe import from URL, meal plan + shopping list generation, race progression, idle timeout → wallpaper, dark mode switching.

### 10.10 Frontend Component Tests

Unchanged — Vitest + React Testing Library + MSW.

### 10.11 CI Pipeline

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with: { go-version: '1.23' }
      - run: |
          go install github.com/golangci-lint/golangci-lint/cmd/golangci-lint@latest
          golangci-lint run ./...
      - run: go vet ./...

  backend-unit:
    needs: lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with: { go-version: '1.23' }
      - run: go test -p 1 -count=1 -v -race -tags=unit -coverprofile=coverage.out ./internal/...
      - run: |
          COVERAGE=$(go tool cover -func=coverage.out | grep total | awk '{print $3}' | tr -d '%')
          if (( $(echo "$COVERAGE < 80" | bc -l) )); then
            echo "Coverage $COVERAGE% is below 80% threshold"
            exit 1
          fi

  backend-integration:
    needs: backend-unit
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_DB: tidyboard_test
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        ports: ['5432:5432']
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7-alpine
        ports: ['6379:6379']
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with: { go-version: '1.23' }
      - run: |
          go install github.com/pressly/goose/v3/cmd/goose@latest
          goose -dir migrations postgres "postgres://test:test@localhost:5432/tidyboard_test?sslmode=disable" up
      - run: go test -p 1 -count=1 -v -race -tags=integration ./internal/... ./cmd/...
        env:
          DATABASE_URL: postgres://test:test@localhost:5432/tidyboard_test?sslmode=disable
          REDIS_URL: redis://localhost:6379

  frontend-unit:
    needs: lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22' }
      - working-directory: web
        run: |
          npm ci
          npx vitest run

  smoke:
    needs: [backend-integration, frontend-unit]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with: { go-version: '1.23' }
      - run: docker compose up -d --wait
      - run: go test -p 1 -count=1 -v -tags=smoke ./tests/smoke/...
        env:
          SMOKE_TEST_URL: http://localhost:8080
      - if: always()
        run: docker compose logs > docker-logs.txt
      - uses: actions/upload-artifact@v4
        if: failure()
        with: { name: docker-logs, path: docker-logs.txt }

  e2e:
    needs: smoke
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: docker compose up -d --wait
      - uses: actions/setup-node@v4
        with: { node-version: '22' }
      - working-directory: web
        run: |
          npm ci
          npx playwright install --with-deps chromium
          npx playwright test
      - uses: actions/upload-artifact@v4
        if: failure()
        with: { name: playwright-report, path: web/playwright-report/ }
      - if: always()
        run: docker compose down -v
```

### 10.12 CI Gate Policy

1. **golangci-lint** — zero lint errors
2. **go vet** — zero issues
3. **Backend unit tests** — all pass, ≥80% coverage, `-race` clean
4. **Backend integration tests** — all pass against real Postgres + Redis
5. **Frontend unit tests** — all pass, ≥80% line / ≥75% branch coverage
6. **Smoke tests** — all pass against Docker Compose build
7. **E2E tests** — all pass on chromium (tablet + phone + desktop viewports)

### 10.13 Testing Cheat Sheet for Contributors

| I'm changing... | Run locally | CI runs |
|---|---|---|
| Business logic (no I/O) | `make test-unit` | unit → integration |
| API handler | `make test-unit test-integration` | unit → integration → smoke |
| Database schema | `make test-integration` + verify migration | all |
| React component | `cd web && npx vitest run` | frontend-unit |
| Calendar sync adapter | `make test-integration` (with VCR cassettes) | unit → integration |
| WebSocket handling | `make test-integration` | unit → integration → e2e |
| Docker/deployment | `make test-smoke` | smoke → e2e |

---

## 11. Project Structure

```
tidyboard/
├── go.mod
├── go.sum
├── Makefile                        # build, test, lint, migrate commands
├── Dockerfile                      # multi-stage: build Go binary, copy into alpine
├── docker-compose.yml              # Postgres + Redis + Go server (self-hosted dev)
├── config.example.yaml             # reference config — copy to config.yaml
├── migrations/                     # goose SQL migrations
│   ├── 001_create_accounts.sql
│   ├── 002_create_households.sql
│   ├── 003_create_members.sql
│   ├── 004_create_calendars.sql
│   ├── 005_create_events.sql
│   ├── 006_create_lists.sql
│   ├── 007_create_routines.sql
│   ├── 008_create_meals.sql
│   ├── 009_create_recipes.sql
│   ├── 010_create_recipe_ingredients.sql
│   ├── 011_create_ingredient_canonicals.sql
│   ├── 012_create_rewards.sql
│   ├── 013_create_races.sql
│   ├── 014_create_achievements.sql
│   ├── 015_create_audit_log.sql
│   ├── 016_create_subscriptions.sql
│   ├── 017_create_task_domains.sql
│   ├── 018_create_domain_ownership.sql
│   └── 019_create_time_entries.sql
├── cmd/
│   ├── server/                     # standalone HTTP server (self-hosted)
│   │   └── main.go
│   └── lambda/                     # Lambda entry points (one per function)
│       ├── auth/main.go
│       ├── calendars/main.go
│       ├── lists/main.go
│       ├── routines/main.go
│       ├── meals/main.go
│       ├── recipes/main.go
│       ├── gamification/main.go
│       ├── households/main.go
│       ├── admin/main.go
│       ├── equity/main.go
│       ├── ai/main.go
│       ├── sync/main.go
│       ├── cron/main.go
│       ├── migrate/main.go
│       └── ws/
│           ├── connect/main.go
│           ├── disconnect/main.go
│           └── message/main.go
├── internal/                       # private application code
│   ├── config/                     # Kong struct-based config (YAML + env + CLI)
│   ├── database/                   # pgx connection, pool setup
│   ├── model/                      # Go structs matching DB schema
│   ├── query/                      # sqlc-generated query functions
│   ├── handler/                    # HTTP handlers (chi), grouped by domain
│   │   ├── auth/
│   │   ├── calendars/
│   │   ├── events/
│   │   ├── lists/
│   │   ├── routines/
│   │   ├── meals/
│   │   ├── recipes/
│   │   ├── shopping/
│   │   ├── gamification/
│   │   ├── households/
│   │   ├── equity/
│   │   ├── admin/
│   │   ├── ai/
│   │   └── ws/
│   ├── service/                    # business logic layer
│   │   ├── calendar_service.go
│   │   ├── event_service.go
│   │   ├── list_service.go
│   │   ├── routine_service.go
│   │   ├── race_service.go
│   │   ├── reward_service.go
│   │   ├── recipe_service.go
│   │   ├── recipe_scraper.go
│   │   ├── shopping_service.go
│   │   ├── ingredient_matcher.go
│   │   ├── equity_service.go
│   │   ├── time_entry_service.go
│   │   ├── auth_service.go
│   │   ├── invite_service.go
│   │   ├── audit_service.go
│   │   ├── backup_service.go
│   │   └── notification_service.go
│   ├── sync/                       # calendar sync adapters
│   │   ├── adapter.go              # SyncAdapter interface
│   │   ├── google.go
│   │   ├── outlook.go
│   │   ├── caldav.go
│   │   ├── ical_url.go
│   │   └── conflict.go
│   ├── middleware/                  # JWT auth, rate limiting, household scoping
│   ├── broadcast/                  # WebSocket/Redis pub/sub fan-out
│   └── testutil/                   # test helpers, factories, setup
│       ├── database.go
│       ├── factories.go
│       ├── jwt.go
│       └── seeds.go
├── sql/                            # sqlc SQL source files
│   ├── queries/
│   │   ├── accounts.sql
│   │   ├── households.sql
│   │   ├── members.sql
│   │   ├── calendars.sql
│   │   ├── events.sql
│   │   ├── lists.sql
│   │   ├── routines.sql
│   │   ├── meals.sql
│   │   ├── recipes.sql
│   │   ├── recipe_ingredients.sql
│   │   ├── ingredient_canonicals.sql
│   │   ├── shopping.sql
│   │   ├── domains.sql
│   │   ├── time_entries.sql
│   │   ├── rewards.sql
│   │   ├── races.sql
│   │   ├── achievements.sql
│   │   └── audit.sql
│   └── sqlc.yaml                   # sqlc configuration
├── tests/
│   └── smoke/                      # smoke tests against deployed instance
│       ├── smoke_test.go
│       └── helpers.go
├── web/                            # React frontend (unchanged)
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── src/
│   │   └── ...                     # same React app structure as before
│   └── tests/
│       └── e2e/
│           ├── playwright.config.ts
│           └── *.spec.ts
├── desktop/                        # Electron app (unchanged)
│   ├── package.json
│   ├── electron-builder.yml
│   └── src/
│       └── ...
├── plugins/                        # bundled first-party plugins
│   ├── weather/
│   ├── clock/
│   └── photo-frame/
├── services/                       # polyglot microservices (Python)
│   ├── sync-worker/                # Python calendar sync service
│   │   ├── Dockerfile
│   │   ├── pyproject.toml
│   │   ├── src/
│   │   │   ├── adapters/           # CalDAV, Google, Outlook, iCal URL
│   │   │   ├── conflict.py
│   │   │   ├── sync_engine.py
│   │   │   └── db.py              # psycopg3, raw SQL (matches sqlc patterns)
│   │   └── tests/
│   └── recipe-scraper/             # Python recipe import service
│       ├── Dockerfile
│       ├── pyproject.toml
│       ├── src/
│       │   ├── scraper.py          # recipe-scrapers (631 sites)
│       │   ├── normalizer.py       # ingredient normalization
│       │   ├── image_downloader.py
│       │   └── db.py
│       └── tests/
└── docs/
    ├── setup.md
    ├── api.md
    ├── self-hosting.md
    ├── plugin-development.md
    └── contributing.md
```

---

## 12. Business Model & Monetization

### 12.1 Philosophy: Open Core with Managed Cloud

The core Tidyboard software is and will always be free and open source (AGPL-3.0). Self-hosters pay nothing. The business follows the Plausible Analytics / GitLab / n8n model: offer a hosted managed service that removes all operational friction, and charge for convenience, not for the software itself.

**What is free forever (open source):**
- The entire Tidyboard application (server, web client, Electron app)
- All features described in this spec — calendar, routines, gamification, races, plugins, everything
- AI/OCR features (user provides their own API keys or runs local models)
- Self-hosting on your own hardware or cloud
- Community support via GitHub Discussions
- All future features

**What we charge for:**
- **Tidyboard Cloud** — a fully managed hosted version at `tidyboard.cloud`
- Priority support
- Optional premium add-ons (premium animation packs)

### 12.2 Revenue Streams

#### Stream 1: Tidyboard Cloud (Primary — Managed Hosting)

Zero-setup hosted version. Families sign up, create a household, and start using it within 60 seconds. No Docker, no servers, no technical knowledge.

**Pricing tiers:**

| Tier | Price | Includes | Target |
|---|---|---|---|
| **Free** | $0/month | 1 household, 4 members max, 2 calendar syncs, 500MB storage, community support, Tidyboard branding on kiosk wallpaper | Small families trying it out |
| **Family** | $4.99/month ($49/year) | 1 household, unlimited members, unlimited calendar syncs, 5GB storage, email notifications, all gamification features, no branding | Most families |
| **Family+** | $8.99/month ($89/year) | Everything in Family + ntfy push notifications, priority email support, 25GB storage, early access to new features | Families who want premium support |
| **Extended** | $14.99/month ($149/year) | Everything in Family+ + up to 3 households, 100GB storage, 24h support SLA | Separated families, multi-household setups |

**Why these prices?** Hearth Display charges $699 hardware + $86.40/year subscription. Skylight charges $599 + $79/year. Tidyboard offers more features at $49/year with no hardware purchase. The value proposition is obvious.

#### Stream 2: Stripe Integration

All billing handled by **Stripe**:

- **Stripe Checkout** — hosted payment page for subscription signup (no PCI compliance burden)
- **Stripe Billing** — subscription management, plan changes, proration, invoicing
- **Stripe Customer Portal** — self-service for customers to update payment, view invoices, change plans, cancel
- **Stripe Webhooks** — `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted` drive the entitlement engine
- **Stripe Tax** — automatic tax calculation and collection for international customers

**Entitlement flow:**
```
User signs up → Creates Stripe Customer → Selects plan →
Stripe Checkout → Payment → Webhook: invoice.paid →
Backend updates household entitlements (member limit, storage quota) →
User is live
```

**Data model:**
```
Subscription
├── id: UUID
├── household_id: UUID
├── stripe_customer_id: str
├── stripe_subscription_id: str
├── plan: enum (free | family | family_plus | extended)
├── status: enum (active | past_due | canceled | trialing)
├── current_period_start: datetime
├── current_period_end: datetime
├── cancel_at_period_end: bool
└── entitlements: JSON
```

**API endpoints (Cloud only — not present in self-hosted):**
```
POST   /api/billing/checkout           # create Stripe Checkout session
GET    /api/billing/portal             # redirect to Stripe Customer Portal
GET    /api/billing/subscription       # current plan + usage
POST   /api/billing/webhook            # Stripe webhook receiver
```

#### Stream 3: Premium Add-Ons (Future, v0.3+)

- **Premium Animation Packs**: $1.99 one-time — themed celebration Lottie animations (holiday, sports, space, dinosaur packs). Community can create free ones; premium ones are professionally animated.
- **Custom Domain**: $2.99/month — `family.yourdomain.com` instead of `tidyboard.cloud/household/xyz`

#### Stream 4: Sponsorships & Donations (Supplementary)

- GitHub Sponsors, Open Collective for individuals
- Corporate sponsor logos on README/docs for companies that depend on Tidyboard
- Supplementary, not primary revenue


### 12.3 AWS Cloud Architecture (Tidyboard Cloud)

```
┌───────────────────────────────────────────────────────────────┐
│                     Tidyboard Cloud                           │
│                                                               │
│  Route 53 → CloudFront (CDN + WAF) → API Gateway HTTP API    │
│                                        API Gateway WS API     │
│                                              │                │
│  ┌───────────────────────────────────────────┴─────────────┐  │
│  │              Lambda Functions (Go binaries)             │  │
│  │                                                         │  │
│  │  auth       calendars    lists      routines            │  │
│  │  households gamification meals      admin               │  │
│  │  ai         ws-connect   ws-disconnect  ws-message      │  │
│  │  sync-worker  cron       migrate                        │  │
│  │                                                         │  │
│  │  Cold start: ~50ms  |  Warm: ~5ms  |  Binary: ~15MB    │  │
│  └───────────────────────────┬─────────────────────────────┘  │
│                              │                                │
│  ┌───────────────────────────┴─────────────────────────────┐  │
│  │                    Data Layer                           │  │
│  │                                                         │  │
│  │  ┌─────────────────┐ ┌────────┐ ┌───────────────────┐  │  │
│  │  │ Aurora Postgres  │ │ S3     │ │ ElastiCache Redis │  │  │
│  │  │ Serverless v2    │ │ (media,│ │ (WS connection    │  │  │
│  │  │ (via RDS Proxy)  │ │ backup)│ │  state, pub/sub,  │  │  │
│  │  │                  │ │        │ │  rate limiting)   │  │  │
│  │  │ Shared DB,       │ │        │ │                   │  │  │
│  │  │ tenant-scoped    │ │        │ │                   │  │  │
│  │  │ via household_id │ │        │ │                   │  │  │
│  │  └─────────────────┘ └────────┘ └───────────────────┘  │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │              Supporting Services                        │  │
│  │                                                         │  │
│  │  RDS Proxy (connection pooling for Lambda → Aurora)     │  │
│  │  Cognito (auth) · SES (email) · EventBridge (cron)     │  │
│  │  Secrets Manager (DB creds, JWT secret, Stripe keys)   │  │
│  │  CloudWatch (logs/metrics/alarms) · CDK (IaC)          │  │
│  └─────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────┘
```

**Why Lambda + Go is ideal for this product:**

Family dashboards have extremely bursty usage patterns. Morning rush (7–8 AM): kids checking off routines, parents reviewing the day. School hours: near zero. After school (3–5 PM): chore completions, race updates. Evening: meal planning, next-day prep. Night: zero. Lambda charges only for actual invocations, not idle time. A family of 5 might generate 50–200 API calls per day — at Lambda pricing that's effectively free per household.

Go cold starts at ~50ms are imperceptible. A kid taps "done" on a chore and sees the celebration animation before the Lambda has even finished writing to the database. The frontend applies the change optimistically.

**RDS Proxy is mandatory.** Lambda functions are stateless and ephemeral. Without RDS Proxy, each invocation would open a new Postgres connection, and at scale (1000 concurrent invocations) you'd exhaust Aurora's connection limit instantly. RDS Proxy maintains a persistent connection pool to Aurora and multiplexes Lambda connections through it. Each Lambda function connects to the proxy endpoint, not directly to Aurora.

**AWS service rationale:**

| Service | Purpose |
|---|---|
| **API Gateway HTTP API** | REST routing to Lambda. $1/million requests. JWT authorizer built in. |
| **API Gateway WebSocket API** | Persistent WebSocket connections. Connection management via $connect/$disconnect. |
| **Lambda (Go, arm64)** | Go binaries on Graviton. ~50ms cold start, ~5ms warm. $0.20/million invocations. |
| **Aurora Serverless v2** | PostgreSQL 16. Scales 0.5–128 ACU. Automated backups/failover. |
| **RDS Proxy** | Connection pooling. Eliminates Lambda → Postgres connection storms. ~$15–20/month. |
| **ElastiCache Redis** | WebSocket connection state, pub/sub for broadcasting, rate limiting. |
| **S3** | Media storage + backup archives. Lifecycle policies for retention. |
| **EventBridge Scheduler** | Cron triggers for sync-worker (every 5 min), backup (nightly), leaderboard snapshots (weekly). |
| **Secrets Manager** | Database credentials, JWT secret, Stripe API keys. Lambda reads at cold start, caches. |
| **CloudFront + WAF** | CDN for static frontend. WAF blocks abuse. |
| **SES** | Transactional email. $0.10/1000. |
| **Cognito** | Google/Apple social login without building OAuth ourselves. |
| **CloudWatch** | Structured JSON logs from Go's slog. Dashboards + alarms. |
| **CDK (Go)** | Infrastructure as Code in Go — same language as the app. |

**Estimated AWS cost at scale:**

| Households | Daily API calls | Monthly Lambda cost | Aurora + RDS Proxy | Redis | S3 + SES + Other | Total/month | Per household |
|---|---|---|---|---|---|---|---|
| 100 | ~15K | ~$0.50 | ~$50 | ~$15 | ~$10 | ~$76 | $0.76 |
| 1,000 | ~150K | ~$5 | ~$65 | ~$15 | ~$15 | ~$100 | $0.10 |
| 10,000 | ~1.5M | ~$50 | ~$120 | ~$30 | ~$30 | ~$230 | $0.023 |
| 100,000 | ~15M | ~$500 | ~$400 | ~$100 | ~$100 | ~$1,100 | $0.011 |

Lambda + Aurora Serverless is dramatically cheaper than ECS Fargate for bursty consumer workloads. At 10,000 households, the total AWS bill is ~$230/month vs ~$1,500/month with always-on Fargate containers. At the Family plan ($4.99/month), margins are 99%+ at scale.

**Infrastructure as Code structure:**
```
tidyboard-cloud/              # private repo, NOT open source
├── cdk/                       # CDK in Go (same language as app)
│   ├── main.go
│   ├── stacks/
│   │   ├── network.go         # VPC, subnets, security groups
│   │   ├── database.go        # Aurora Serverless v2 + RDS Proxy
│   │   ├── cache.go           # ElastiCache Redis
│   │   ├── storage.go         # S3 buckets + lifecycle policies
│   │   ├── api.go             # API Gateway HTTP + WebSocket APIs
│   │   ├── functions.go       # Lambda function definitions
│   │   ├── cdn.go             # CloudFront + WAF + ACM
│   │   ├── scheduling.go      # EventBridge rules for sync/cron
│   │   ├── email.go           # SES
│   │   ├── secrets.go         # Secrets Manager
│   │   ├── monitoring.go      # CloudWatch dashboards + alarms
│   │   └── auth.go            # Cognito user pool
│   └── config/
│       ├── dev.go
│       ├── staging.go
│       └── production.go
├── scripts/
│   ├── deploy.sh              # CDK deploy + run migration Lambda
│   ├── rollback.sh
│   └── build-lambdas.sh       # GOOS=linux GOARCH=arm64 go build for each function
└── server-cloud/              # cloud-only extensions
    └── billing/
        ├── stripe_service.go
        ├── entitlements.go
        └── webhooks.go
```

**Deployment flow:**
```
git push main →
  CI builds all Lambda binaries (GOOS=linux GOARCH=arm64) →
  CI uploads to S3 artifacts bucket →
  CDK deploy updates Lambda function code →
  Migration Lambda runs goose migrations →
  API Gateway routes updated →
  CloudFront cache invalidated →
  Zero-downtime deploy complete (~2 minutes total)
```

### 12.4 Self-Hosted vs Cloud Feature Parity

| Aspect | Self-Hosted | Tidyboard Cloud |
|---|---|---|
| Features | All features, unlimited | All features, plan-based limits on members/storage |
| AI/OCR | You provide your own API keys (Ollama, OpenAI, etc.) | Same — you provide your own API keys |
| Email | You configure SMTP | SES included |
| Push | You configure ntfy | ntfy managed |
| OAuth | You create your own OAuth app | Pre-configured Google/Apple login |
| Backups | You configure destination | Automated, included |
| SSL | You manage certs | Automated via ACM |
| Updates | You pull new images | Zero-downtime rolling deploys |
| Support | Community (GitHub) | Email support (paid tiers) |
| Billing code | Not in codebase | Cloud-only private repo |

The billing/Stripe integration lives in a **separate private repository** (`tidyboard-cloud`). The open-source `tidyboard` repo has no Stripe code, no entitlement checks, no plan limits. Self-hosters get the full product, unlimited, forever.

---

---

## 13. Comparison: Tidyboard vs Hearth Display

| Aspect | Hearth Display | Tidyboard |
|---|---|---|
| Hardware | Proprietary $699 device | Any tablet, any browser, Electron desktop app |
| Subscription | $9/month required | Free forever |
| Data ownership | Their cloud | Your server |
| Calendar sync | Google/Outlook/iCal | + CalDAV, any CalDAV server, two-way iCloud |
| API | None | Full REST + WebSocket, OpenAPI spec |
| Plugins | None | Community plugin system |
| AI features | Closed, proprietary | BYOK — bring your own API key (Ollama local, OpenAI, Anthropic, etc.) |
| Offline support | Requires WiFi | Offline-first with sync |
| Notifications | In-app only | Native OS (Electron), push, email, ntfy, webhooks |
| Smart home | Alexa/Google limited | Webhooks + Home Assistant plugin potential |
| Calendar search | Not available | Full-text search |
| Audio/alarms | None | Configurable audio + native OS notifications |
| Multi-household | No | Yes |
| Desktop app | No | Electron (macOS, Windows, Linux) |
| Family invites | N/A (single device) | Email invites, invite codes, accountless children |
| Gamification | Basic stars + streaks | Races, leaderboards, achievements, team challenges, animations |
| Recipe database | None | Full recipe manager with URL import, scaling, cooking mode, collections |
| Meal planning | Basic meal slot display | Weekly grid + recipe integration + auto shopping list generation |
| Shopping lists | Basic grocery list | Auto-generated from meal plan with ingredient aggregation + aisle grouping |
| Household equity | None | Full ownership tracking, time tracking, cognitive vs physical labor, equity dashboard, rebalance suggestions |
| Dark mode | No | Yes, with auto-switching |
| Source code | Closed | MIT License |

---

## 14. MVP Scope (v0.1)

The first release focuses on the core loop: install → create family → add members → sync calendars → use dashboard.

**In scope:**
- Docker Compose single-command self-hosted deployment (Go server + Postgres + Redis)
- Lambda + API Gateway deployment for Tidyboard Cloud (CDK)
- Single Go codebase compiling to both standalone server and Lambda handlers
- PostgreSQL schema with goose migrations
- sqlc-generated type-safe query layer
- Account registration (email + password)
- Household creation + member management (owner, admin, member, child roles)
- Add children without email (accountless child members with PIN)
- Email-based invitations for adults
- Invite code flow with owner approval
- Local calendar with event CRUD
- Google Calendar two-way sync
- iCal URL one-way import
- Daily / weekly / monthly calendar views with full-text search
- Scheduling conflict detection (warnings on overlapping events)
- Basic to-do lists (shared + personal)
- Basic star rewards for task completion with completion animation
- Tablet kiosk mode with per-member PIN auth
- Phone-optimized responsive layout
- Desktop browser layout
- PWA install support
- WebSocket realtime updates across devices (gorilla/websocket self-hosted, API Gateway WS cloud)
- Photo wallpaper / sleep mode
- Dark mode with auto-switching
- Audit log (all mutations logged)
- Household data export (ZIP)
- Automated nightly backups (local directory for self-hosted, S3 for cloud)
- Maintenance mode (CLI + API + scheduled windows)
- Offline resilience (cached data + local mutation queue)
- Accessibility: WCAG 2.1 AA, prefers-reduced-motion, keyboard navigation
- i18n framework (English + German at launch)
- Stripe integration for Tidyboard Cloud billing (Free + Family tiers)

**Deferred to v0.2:**
- Electron desktop app (macOS, Windows, Linux)
- Outlook sync, CalDAV sync, iCloud sync
- Routines engine + streak tracking
- Full gamification (races, leaderboards, achievements, team challenges)
- Celebration animation library (confetti, emoji rain, badge unlocks)
- Gamification anti-abuse system
- Meal planning
- Recipe database (URL import, manual entry, collections, cooking mode)
- Shopping list auto-generation from meal plans
- Paprika recipe import
- Household equity engine (task domains, ownership, time tracking, equity dashboard)
- AI/OCR features (BYOK — user provides own API keys)
- Plugin system
- ntfy.sh / Pushover notification backends
- Feelings check-in
- Multi-household support
- Toddler mode
- Child-to-account upgrade flow
- OAuth (Google/Apple) login
- S3/SFTP/rclone backup destinations (self-hosted)
- Import from Tidyboard export ZIP
- Additional translations (Spanish, French)
- High contrast mode
- RTL layout support
- Family+ and Extended pricing tiers

---

## 15. Open Questions

**Resolved (documented for context):**
- ✅ **Naming**: Tidyboard. No USPTO conflicts. Domain to be registered.
- ✅ **Language**: Go — static typing, Lambda cold starts, single binary.
- ✅ **Database**: PostgreSQL only — no DynamoDB, no SQLite.
- ✅ **ORM**: sqlc (write SQL, generate Go) — contributors need SQL knowledge. Document patterns.
- ✅ **Config**: Kong + YAML — struct-based, type-safe, CLI + file + env unified.
- ✅ **AI model**: BYOK only — Tidyboard never pays for or proxies AI usage.

**Decided, needs implementation detail:**
1. **License**: Leaning AGPL. Prevents wrapping in proprietary cloud service while keeping self-hosted fully open.
2. **Tablet kiosk**: Recommend Fully Kiosk Browser on Android. Guided Access on iPad. Document both.
3. **iOS push**: ntfy.sh as recommended workaround. Investigate APNs via lightweight companion app in v0.3+.
4. **Tesseract on Lambda**: Use container-based Lambda (~2-3s cold start). OCR is infrequent, acceptable.
5. **RDS Proxy latency**: 100–200ms on cold connection. Acceptable. Document it.

**Genuinely open — needs research or testing:**
6. **iCloud CalDAV**: Apple's legacy CalDAV endpoint needs testing with `emersion/go-webdav` + app-specific passwords. May not work for consumer iCloud accounts.
7. **Go CalDAV edge cases**: `emersion/go-webdav` needs testing against Nextcloud, Radicale, Baikal. Budget time for upstream contributions.
8. **RRULE conformance**: `teambition/rrule-go` needs a comprehensive test suite for DST transitions, EXDATE with timezone, BYSETPOS. Build this before any feature depends on it.
9. **Ingredient normalization**: Fuzzy matching accuracy. Canonical DB + Levenshtein handles ~80%. Remaining 20% may need LLM pass (BYOK) or manual correction. Budget for iteration.
10. **`kkyr/go-recipe` coverage**: Supports fewer sites than Python's recipe-scrapers (631 sites). May need site-specific scrapers contributed upstream or maintained in a Tidyboard registry.
11. **Recipe scraping legality**: Recipes (ingredients + instructions) are generally not copyrightable, but expressive text around them may be. Extract functional data only, store source URL for attribution, never cache full HTML.
12. **GDPR**: Does self-hosting satisfy requirements, or do we need explicit consent flows? Add compliance doc.
13. **Animation performance**: Lottie + CSS on iPad Air 2 — establish concrete budget (max duration, max concurrent, frame rate floor).
14. **Multi-household isolation**: Every sqlc query must enforce `household_id` scoping. Needs systematic review.
15. **WebSocket cost at scale**: API Gateway charges ~$108/month at 10K persistent tablet connections. Acceptable but monitor.

---

## 16. Contributing

The project welcomes contributions in these areas:
- Calendar sync adapters (new providers — implement the `SyncAdapter` interface in Go)
- Widgets / plugins (Go backend + React frontend)
- Translations / i18n (see Weblate instance)
- Accessibility improvements and audits
- Celebration animations and sound effects (Lottie JSON files)
- Badge pack designs (JSON + SVG)
- Tablet deployment guides (specific models and kiosk launchers)
- sqlc query patterns and PostgreSQL schema improvements
- Documentation
- Testing (especially integration tests against real CalDAV servers, E2E across devices, screen reader testing)
- Security audits

**Development setup:**
1. Install Go 1.23+, Node 22+, Docker
2. `git clone` + `cp config.example.yaml config.yaml` (edit DB credentials, generate JWT secret)
3. `docker compose up -d` (starts Postgres + Redis)
4. `make migrate` (runs goose migrations)
5. `make run` (starts the Go server on :8080)
6. `cd web && npm ci && npm run dev` (starts Vite dev server on :5173)

See `docs/contributing.md` for code style, PR guidelines, Kong config conventions, and sqlc query patterns.
