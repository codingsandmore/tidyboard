# Tidyboard — Quality Assurance Plan

**Version:** 1.0  
**Date:** April 12, 2026  
**Companion to:** tidyboard-spec.md

---

## 1. QA Philosophy

Quality is built in, not bolted on. Every feature is tested before it ships, every bug gets a regression test before it's fixed, and every release goes through a defined gate process. The goal is not zero defects (unrealistic for an open-source project) but **zero surprises** — known issues are documented, regressions are caught in CI, and users never hit a silent data loss scenario.

### Quality Pillars

1. **Correctness** — the system does what the spec says, especially for calendar sync, RRULE expansion, and financial data (star balances, Stripe billing)
2. **Reliability** — the system works when the network drops, the database restarts, or a Lambda cold-starts
3. **Performance** — interactions respond in <100ms on a 5-year-old iPad
4. **Accessibility** — WCAG 2.1 AA compliance verified by automated and manual testing
5. **Security** — auth, authorization, data isolation, and input validation tested adversarially

---

## 2. Test Levels & Coverage Targets

| Level | Count Target | Coverage | Run When | Max Duration |
|---|---|---|---|---|
| **Unit** | 500+ | ≥80% line coverage | Every commit (CI), local dev watch mode | <30 seconds |
| **Integration** | 150+ | All API endpoints + sync adapters | Every PR (CI) | <3 minutes |
| **Smoke** | 30+ | Critical user paths | Every deploy, post-migration | <60 seconds |
| **E2E** | 20+ | Complete user workflows | Pre-release, `run-e2e` label on PR | <10 minutes |
| **Performance** | 10+ | Response time + load | Pre-release, weekly on staging | <5 minutes |
| **Accessibility** | Automated + manual | axe-core + screen reader | Every PR (automated), monthly (manual) | <2 minutes (auto) |
| **Security** | Automated + periodic | SAST + dependency scan | Every PR (auto), quarterly (manual audit) | <5 minutes (auto) |

---

## 3. Test Categories in Detail

### 3.1 Unit Tests

**Scope:** Pure logic with no I/O. Build-tagged `//go:build unit`.

**What to unit test:**
- RRULE expansion (weekly, monthly, yearly, DST transitions, EXDATE, BYSETPOS)
- Sync conflict resolution (last-write-wins, tie-breaking, conflict log generation)
- Ingredient normalization (fuzzy matching, alias lookup, unit conversion)
- Recipe scraper parsing (JSON-LD extraction, microdata fallback, field normalization)
- Serving scaler (proportional ingredient calculation, fractional handling)
- Shopping list aggregation (same ingredient dedup, unit conversion)
- Star balance calculations (earn, spend, cooldown enforcement, cap enforcement)
- Race progress calculation (handicap adjustment, position ranking)
- Achievement badge eligibility (streak detection, volume thresholds)
- JWT creation, validation, expiry, scope enforcement
- PIN hashing and brute-force lockout timing
- Household invite token generation, validation, expiry
- Audit log entry creation and retention calculation
- Config struct validation (required fields, enum values, duration parsing)

**Test data:** factory functions (not fixtures). Each test constructs exactly what it needs.

**Determinism:** all time-dependent tests inject a `clock` interface. No `time.Now()` in production code — always `clock.Now()`.

### 3.2 Integration Tests

**Scope:** Real Postgres (via testcontainers-go), real Redis, real HTTP handlers. Build-tagged `//go:build integration`.

**What to integration test:**

**API endpoints (every handler):**
- Happy path: valid request → expected response + status code
- Validation: missing/invalid fields → 422 with descriptive error
- Auth: no token → 401, expired token → 401, wrong role → 403
- Not found: invalid UUID → 404
- Duplicate: create same resource twice → 409 or idempotent success
- Pagination: list endpoints with limit/offset/cursor
- Search: full-text search returns correct matches, handles special characters
- Cross-household isolation: member from household A cannot access household B's data

**Calendar sync adapters:**
- Fetch events from recorded API responses (VCR cassettes)
- Push event and verify external ID returned
- Update event and verify changes persisted
- Delete event and verify removal
- Handle API errors gracefully (429 rate limit, 500 server error, network timeout)
- Handle malformed responses without crashing

**WebSocket:**
- Connect with valid token → connection established
- Connect without token → rejected
- Subscribe to channel → receive messages for that channel
- Unsubscribe → stop receiving messages
- Data mutation → broadcast to all subscribed clients
- Ping/pong keepalive

**Recipe scraping:**
- Import from URL with JSON-LD schema.org/Recipe → correct fields extracted
- Import from URL with microdata fallback → correct fields extracted
- Import from URL with no structured data → graceful failure with user message
- Import with invalid URL → appropriate error
- Duplicate URL detection → warning returned
- Image download → image stored locally, URL rewritten

**Database migrations:**
- Goose up → all migrations applied, schema matches expected state
- Goose down → clean rollback
- Round-trip: up → down → up produces identical schema

### 3.3 Smoke Tests

**Scope:** Run against a deployed instance (Docker Compose or staging). Build-tagged `//go:build smoke`.

**Critical path tests (if any fail, the deployment is broken):**

1. `GET /api/health` returns 200 with `status: ok`
2. Login with valid credentials → JWT returned
3. PIN auth → scoped JWT returned
4. Create event → 201, retrieve → matches, delete → 204
5. Create list → add item → complete item → verify
6. WebSocket connects and responds to ping
7. Frontend index.html loads (200, text/html)
8. PWA manifest loads (200, valid JSON with name + start_url)
9. Database migrations are current (no pending)
10. iCal feed returns valid BEGIN:VCALENDAR
11. Recipe import from URL with known good test URL → recipe created
12. Shopping list generation from meal plan → list with items

### 3.4 End-to-End Tests (Playwright)

**Scope:** Real browser against full stack. Three viewport projects: tablet (768×1024), phone (390×844), desktop (1440×900).

**Scenarios:**

| Scenario | What it validates |
|---|---|
| First-time setup | Account creation → household → first member → lands on dashboard |
| Add child member | Parent creates child (no email) → child appears on dashboard |
| Email invitation | Send invite → accept → new member appears |
| Create calendar event | New event from daily view → visible on calendar |
| Cross-device sync | Event created on desktop appears on tablet (WebSocket) |
| Calendar search | Create events → search by keyword → correct results |
| Kiosk PIN auth | Select avatar → enter PIN → dashboard shown |
| Child role restrictions | Child sees own routines, cannot access settings |
| List workflow | Create grocery list → add items → check off → completion state |
| Race (when implemented) | Create race → participants progress → winner animation |
| Idle timeout | Kiosk → idle → wallpaper screen → tap → returns to dashboard |
| Realtime sync | Two tabs → create event in tab 1 → appears in tab 2 without reload |
| Recipe import | Paste URL → preview shown → confirm → recipe in collection |
| Meal plan + shopping | Assign recipes to days → generate shopping list → verify items |

### 3.5 Performance Tests

**Scope:** Verify response time and throughput targets.

**Targets:**
- API response time: p50 <50ms, p95 <200ms, p99 <500ms (excluding cold starts)
- Lambda cold start: <100ms (Go arm64)
- Frontend initial load: <3 seconds on 4G connection
- Frontend interaction response: <100ms (optimistic UI)
- WebSocket message delivery: <200ms end-to-end
- Recipe scrape + import: <10 seconds including image download
- Shopping list generation from 7-day meal plan (14 recipes): <2 seconds

**Tools:**
- **k6** for API load testing
- **Lighthouse CI** for frontend performance (score ≥90)
- **Playwright with `page.metrics()`** for interaction timing
- Custom Go benchmarks (`go test -bench`) for hot-path functions (RRULE expansion, ingredient matching)

**Load test scenarios:**
- 100 concurrent households, each with 5 members making 10 requests/minute → sustained for 5 minutes
- Burst: 1000 event creations in 10 seconds → no 5xx errors
- WebSocket: 500 concurrent connections receiving broadcasts every 5 seconds

### 3.6 Accessibility Tests

**Automated (every PR):**
- **axe-core** via `@axe-core/playwright` — zero violations on all pages
- **Lighthouse accessibility** score ≥90
- Color contrast ratio verification
- Focus order verification
- ARIA attribute validation

**Manual (monthly, before major releases):**
- **VoiceOver** (macOS/iOS): navigate calendar, complete a routine, view race leaderboard
- **TalkBack** (Android): same flows
- **NVDA** (Windows): same flows via Electron app
- **Keyboard-only**: complete all major flows without a mouse
- **Reduced motion**: verify all animations respect `prefers-reduced-motion`
- **High contrast mode**: verify all content readable

**Documented in:** `docs/accessibility-test-plan.md`

### 3.7 Security Tests

**Automated (every PR):**
- **govulncheck** — known vulnerabilities in Go dependencies
- **npm audit** — known vulnerabilities in frontend dependencies
- **golangci-lint** with `gosec` — static security analysis
- **sqlc query review** — verify all queries include `household_id` filter (custom lint rule)

**Manual (quarterly):**
- OWASP Top 10 review against API endpoints
- JWT tampering: modify payload, expired tokens, tokens from other households
- PIN brute-force: verify lockout engages after 5 attempts
- CORS: verify cross-origin requests blocked from unlisted origins
- IDOR: verify user A cannot access user B's data by guessing UUIDs
- Rate limiting: verify auth endpoints throttle after configured limit
- SQL injection: verify sqlc parameterized queries resist injection
- XSS: verify all user-generated content sanitized in frontend
- CSRF: verify state-changing endpoints require valid JWT (no cookie-based auth)

---

## 4. Release Process

### 4.1 Release Types

| Type | Cadence | QA Gate |
|---|---|---|
| **Patch** (x.y.Z) | As needed (bugfixes) | Unit + integration + smoke |
| **Minor** (x.Y.0) | Every 2-4 weeks (features) | Full gate: all test levels + manual accessibility + performance |
| **Major** (X.0.0) | When breaking changes required | Full gate + migration testing + security audit |

### 4.2 Release Gate Checklist

Every release must pass all of the following before tagging:

- [ ] All CI checks green (lint, typecheck, unit, integration, smoke, E2E)
- [ ] Coverage ≥80% (backend) and ≥80% line / ≥75% branch (frontend)
- [ ] No known P0 (critical) or P1 (high) bugs in the milestone
- [ ] Performance benchmarks within targets (no regressions >10%)
- [ ] Lighthouse score ≥90 on all three viewports
- [ ] axe-core: zero accessibility violations
- [ ] Database migration tested: fresh install + upgrade from previous version
- [ ] Docker image builds and runs cleanly on amd64 and arm64
- [ ] Lambda deployment tested on staging environment
- [ ] CHANGELOG.md updated
- [ ] Documentation updated for new features

### 4.3 Bug Severity Levels

| Level | Definition | Response Time | Example |
|---|---|---|---|
| **P0 Critical** | Data loss, security breach, or complete service outage | Fix within 24h, hotfix release | Star balances reset, events deleted, auth bypass |
| **P1 High** | Major feature broken, no workaround | Fix within 1 week | Calendar sync silently failing, races not updating |
| **P2 Medium** | Feature partially broken, workaround exists | Fix in next minor release | Celebration animation not playing on one browser |
| **P3 Low** | Cosmetic, minor UX issue | Fix when convenient | Alignment off on one viewport, typo in UI |

### 4.4 Regression Prevention

- Every bug fix PR must include a test that reproduces the bug (red) before the fix (green)
- Integration tests for any bug involving data corruption, sync issues, or auth failures
- E2E test for any bug reported by a user involving a complete workflow

---

## 5. Environment Strategy

| Environment | Purpose | Data | Deploy Trigger |
|---|---|---|---|
| **Local** | Developer workstation | Seed data, factories | `make run` |
| **CI** | Automated testing | Testcontainers, ephemeral | Every push/PR |
| **Staging** | Pre-release validation | Copy of sanitized production data | Merge to `main` |
| **Production** | Live Tidyboard Cloud | Real user data | Manual release tag |

### Staging Environment

- Mirrors production AWS architecture (Lambda + Aurora + Redis)
- Automatically deployed on merge to `main`
- Smoke tests run automatically post-deploy
- Performance tests run nightly
- Accessible to maintainers for manual testing
- Data refreshed weekly from anonymized production snapshot

---

## 6. Monitoring & Alerting (Production)

| Metric | Threshold | Alert |
|---|---|---|
| API error rate (5xx) | >1% over 5 minutes | PagerDuty + Slack |
| API latency p95 | >500ms over 5 minutes | Slack |
| Lambda cold start p95 | >200ms | Slack (weekly report) |
| Database connections | >80% of RDS Proxy max | Slack |
| Failed sync operations | >3 consecutive failures per calendar | Email to household admin |
| Backup failure | Any | Email to ops + Slack |
| Certificate expiry | <14 days | Email to ops |
| Disk/storage usage | >80% | Slack |

**Dashboard:** CloudWatch dashboard with real-time metrics for all of the above.

**Error tracking:** Structured JSON logs from Go's `slog` → CloudWatch Logs → CloudWatch Logs Insights for querying. No third-party error tracking service (keeps data private).

---

## 7. Data Integrity Checks

Automated checks that run daily (EventBridge → Lambda):

1. **Star balance consistency**: sum of earned - sum of spent = current balance for every member
2. **Orphaned records**: events without calendars, members without households, items without lists
3. **Sync state**: every calendar with external sync has been polled within 2× its poll interval
4. **Audit log completeness**: every record created/updated in the last 24h has a corresponding audit entry
5. **Backup recency**: most recent successful backup is <26 hours old
6. **Migration version**: database schema matches expected goose version

Any failure sends an alert to ops and creates an audit log entry.

---

## 8. User Feedback Integration

- **GitHub Issues**: bug reports and feature requests, triaged weekly
- **In-app feedback**: "Report a problem" button on every page → creates a GitHub issue with device info, browser version, and screenshot (user-consented)
- **Crash reporting**: frontend `window.onerror` handler captures stack traces → sent to server → stored in audit log (no third-party service)
- **Beta channel**: opt-in early access to upcoming features on Tidyboard Cloud staging environment

---

## 9. Polyglot Service Testing

The Python services (calendar sync, recipe scraper) require their own test suites alongside the Go backend tests.

### 9.1 Python Test Infrastructure

| Tool | Purpose |
|---|---|
| **pytest** | Test runner. Sequential execution (`-p no:parallel -x`). |
| **testcontainers-python** | Real Postgres for integration tests (same pattern as Go) |
| **vcrpy** | Record/replay CalDAV server interactions and recipe site responses |
| **factory_boy** | Test data factories matching Go test patterns |
| **freezegun** | Deterministic time for sync timing tests |
| **respx** or **responses** | Mock HTTP responses for recipe scraping unit tests |

### 9.2 Calendar Sync Test Matrix

The sync worker must be tested against real CalDAV servers. This is the highest-risk area of the entire product.

**Automated (CI, weekly against live servers):**

| Server | Test Type | What We Verify |
|---|---|---|
| Nextcloud (Docker) | Integration | Full CRUD, recurring events, VTIMEZONE, search, sync-token |
| Radicale (Docker) | Integration | Full CRUD, collections, auth |
| Baikal (Docker) | Integration | Full CRUD, shared calendars |
| Google Calendar | VCR recorded | OAuth flow, two-way sync, pagination, rate limiting |
| Outlook/M365 | VCR recorded | Graph API sync, token refresh, delta queries |
| iCloud | VCR recorded | App-specific password, legacy CalDAV endpoint, known limitations |

**Manual (before each minor release):**
- Live sync against a real Google Calendar with 500+ events
- Live sync against Nextcloud with 3 calendars and recurring events
- Verify DST transition handling (create event crossing DST boundary, sync, verify times)

### 9.3 Recipe Scraper Test Matrix

**Automated (CI, every PR):**
- 20 "golden" recipe URLs from popular sites (Allrecipes, Food Network, Serious Eats, NYT Cooking, etc.) with VCR-recorded responses
- Test each scraping stage independently: JSON-LD extraction, microdata fallback, site-specific driver, LLM fallback
- Ingredient parsing: verify amount/unit/name extraction for 100+ ingredient strings
- Serving scaler: verify proportional calculation for edge cases (fractions, "a pinch of", "to taste")

**Weekly (against live sites):**
- Re-scrape the 20 golden URLs against live sites to detect markup changes
- Alert if any previously working URL fails (site changed their markup)

---

## 10. Compliance Testing

### 10.1 COPPA Compliance Tests

| Test | Verification |
|---|---|
| Child account creation requires parent (owner/admin) | Cannot create child member without authenticated parent session |
| Child cannot self-register | No registration flow accessible without existing adult account |
| Child data deletable by parent | Parent can delete child member → all child data removed within 30 days |
| No child email collection | Child member creation form has no email field |
| No third-party data sharing | Audit: no external API calls contain child member data |
| Privacy policy link accessible | Link visible on signup page, account settings, and kiosk PIN screen |

### 10.2 GDPR / Data Privacy Tests

| Test | Verification |
|---|---|
| Data export works | `GET /api/export` returns complete household data ZIP |
| Account deletion works | `DELETE /api/auth/me` triggers cascade deletion within 30 days |
| Audit log records access | Admin viewing data creates audit entry |
| No telemetry | Verify zero external network calls from self-hosted instance (tcpdump check) |
| Consent flow (Cloud) | First login shows privacy policy acceptance checkbox |

---

## 11. Onboarding QA

The onboarding wizard is the most critical UX flow. Test on all three viewports.

| Step | Test |
|---|---|
| Welcome → Get Started | Button visible, tappable on all viewports |
| Account creation | Email validation, password strength indicator, error messages |
| Household naming | Default name suggestion works, empty name rejected |
| Add yourself | Avatar upload (JPEG, PNG, HEIC), color picker works on touch |
| Add members | Add 5 members in sequence, skip works, child PIN entry works |
| Connect calendar | Google OAuth opens, callback works, events appear on dashboard |
| Skip calendar | Dashboard shows helpful empty state, not broken/blank |
| Complete flow | Entire wizard completable in <60 seconds on tablet |
| Resume interrupted | If user closes mid-wizard and returns, resume where they left off |
