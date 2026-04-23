# Tidyboard — Implementation Plan & LLM Tool Strategy

**Version:** 1.0  
**Date:** April 12, 2026  
**Prerequisites:** tidyboard-spec.md, tidyboard-qa-plan.md, tidyboard-design-system.md, CLAUDE.md

---

## 1. LLM Tool Assignment

Three tools, each with a sweet spot:

### Claude Code — Primary Development Agent

**What it's best at:** Multi-file Go development, architecture implementation, test writing, database schema design, complex refactoring. Reads the entire project tree, runs tests, and iterates until they pass. Has your CLAUDE.md for project context.

**Use for:**
- All Go backend code (handlers, services, middleware, config)
- sqlc SQL files + migrations
- Go test suites (unit + integration)
- Docker Compose configuration
- CDK infrastructure code
- CI/CD pipeline (GitHub Actions YAML)
- Python service scaffolding (sync-worker, recipe-scraper)
- Code review of Codex-generated code

**Session workflow:**
1. Start Claude Code in project root (reads CLAUDE.md automatically)
2. Give it a focused task: "Implement the auth service: JWT creation, validation, refresh tokens, PIN auth. Include integration tests."
3. Let it plan → code → test → iterate
4. Review the diff, commit

### Codex CLI — Parallel / Delegated Work

**What it's best at:** Well-scoped, independent tasks that can run in parallel via worktrees. Built-in code review. Good at frontend components, test generation, documentation, and repetitive tasks across multiple files.

**Use for:**
- React component implementation (from design system spec)
- Frontend test writing (Vitest + React Testing Library)
- Storybook story generation for each component
- Documentation writing (setup guides, API docs, contributing guide)
- Repetitive refactoring (rename across files, add new field to 10 handlers)
- Code review before pushing (run `codex review` on every PR)
- CI/CD debugging and pipeline fixes
- Parallel tasks: while Claude Code builds the auth system, Codex can generate the database migration files for recipes

**Session workflow:**
1. Start Codex in project root (reads AGENTS.md — symlink CLAUDE.md → AGENTS.md)
2. Use `--full-auto` for well-scoped tasks: `codex --full-auto "Create Storybook stories for all components in web/src/components/ui/"`
3. Use Cloud tasks for longer async work: assign via ChatGPT and review when done
4. Always run `codex review` before committing

### Claude Design — UI Prototyping & Design System

**What it's best at:** Generating interactive UI prototypes from text prompts, applying brand design systems consistently, producing handoff bundles for Claude Code. Launched April 17, 2026. Powered by Opus 4.7.

**Use for:**
- All screen designs (onboarding, dashboard, calendar, routine, recipe, equity, settings)
- Interactive prototype flows (morning routine, recipe import, onboarding, equity check-in)
- Dark mode variants
- Design exploration (try 3 visual directions for a component, pick the best)
- Marketing site prototype (tidyboard.dev landing page)
- Exporting handoff bundles to Claude Code for React implementation
- PDF exports for docs/design/ contributor reference

**Workflow:**
1. Open Claude Design (claude.ai/design)
2. Onboard with Tidyboard design system (paste tokens from tidyboard-claude-design-brief.md section 1)
3. Use the ready-made prompts from section 6 of the brief
4. Iterate through conversation, inline comments, and sliders
5. Export handoff bundle → pass to Claude Code for implementation
6. Export PDF/HTML for documentation and user testing

**Brief document:** `docs/tidyboard-claude-design-brief.md` — contains all screen specifications, 16 screen designs, 4 interactive flows, and ready-to-paste prompts.

### Ollama — Local AI Features & Testing

**What it's best at:** Running LLM inference locally for development and testing of the BYOK AI features. Zero cost, zero latency to external API, keeps all data local.

**Use for:**
- Testing the AI features during development (recipe parsing LLM fallback, meal suggestions, natural language event creation)
- Developing and iterating on LLM prompts without burning API credits
- Integration test suite for AI features (Ollama as the test LLM backend)
- Local demo environment (show AI features working without requiring user API keys)
- Evaluating different models for recipe extraction quality

**Recommended models:**
- **llama3.2:3b** — fast, good enough for recipe parsing and natural language event creation during development
- **mistral:7b** or **gemma2:9b** — better quality for meal suggestions and complex extraction, still fast on a Mac
- **llama3.1:70b** (if you have the VRAM) — near-commercial quality for evaluating prompt effectiveness

**Setup:**
```bash
# Install Ollama
brew install ollama  # or curl -fsSL https://ollama.com/install.sh | sh

# Pull models for development
ollama pull llama3.2:3b    # fast dev model
ollama pull mistral:7b     # quality dev model

# Tidyboard config for local AI testing
# config.yaml:
ai:
  enabled: true
  provider: "ollama"
  ollama_url: "http://localhost:11434"
  model: "llama3.2:3b"
```

### Tool Coordination Pattern

```
Day 1 (design day):
  Claude Design → generate onboarding wizard (7 screens) + kiosk dashboard
  Claude Design → generate phone layout + calendar views
  Export handoff bundles for Claude Code

Day 2-3 (backend sprint):
  Claude Code → build auth handler + service + tests (2-3 hours)
  Meanwhile: Codex Cloud task → generate all migration SQL files
  Meanwhile: Codex Cloud task → write Storybook stories from Design exports

Day 4-5 (frontend sprint):
  Claude Code → implement React components from Design handoff bundles
  Meanwhile: Codex --full-auto → implement remaining components
  Review: codex review on all changes from both agents

Evening:
  Test AI features locally with Ollama
  Push, let CI run
```

---

## 2. Implementation Sprints

### Sprint 0: Foundation (Week 1)

**Goal:** Project skeleton, build system, CI, database, config. Nothing user-facing yet.

| Task | Tool | Hours |
|---|---|---|
| Initialize Go module, project layout, Makefile | Claude Code | 1 |
| Kong config struct + config.example.yaml | Claude Code | 1 |
| Docker Compose (Postgres + Redis + Go server) | Claude Code | 1 |
| Database schema: accounts, households, members, invitations | Claude Code | 2 |
| Goose migrations for initial tables | Claude Code | 1 |
| sqlc setup + first queries (accounts, households, members) | Claude Code | 2 |
| JWT auth middleware + PIN auth | Claude Code | 3 |
| Health endpoint + basic chi router | Claude Code | 1 |
| GitHub Actions CI: lint + unit + integration | Claude Code | 2 |
| React project init (Vite + Tailwind + shadcn/ui) | Codex | 1 |
| Storybook setup | Codex | 1 |
| CLAUDE.md / AGENTS.md in repo | Manual | 0.5 |

**Sprint 0 deliverable:** `docker compose up` → Go server + Postgres + Redis running. Auth endpoints work. CI green. React shell loads.

### Sprint 0.5: Design (Week 1-2, parallel with Sprint 0)

**Goal:** All core UI screens designed in Claude Design, handoff bundles ready for frontend implementation.

| Task | Tool | Hours |
|---|---|---|
| Onboard Claude Design with Tidyboard design system | Claude Design | 0.5 |
| Onboarding wizard — 7 screens (phone + tablet) | Claude Design | 2 |
| Dashboard — kiosk tablet layout | Claude Design | 1.5 |
| Dashboard — phone layout | Claude Design | 1 |
| Dashboard — desktop layout | Claude Design | 1 |
| Calendar views — daily, weekly, monthly, agenda | Claude Design | 2 |
| Event create/edit modal | Claude Design | 0.5 |
| Routine view — kid-facing (tablet) | Claude Design | 1 |
| List view with check-off | Claude Design | 0.5 |
| Kiosk lock screen + PIN entry | Claude Design | 0.5 |
| Recipe import flow (3 screens) | Claude Design | 1 |
| Recipe detail + cooking mode | Claude Design | 1 |
| Meal plan weekly grid | Claude Design | 1 |
| Shopping list | Claude Design | 0.5 |
| Equity dashboard | Claude Design | 1.5 |
| Dark mode variants (5 key screens) | Claude Design | 1 |
| Interactive prototype flows (4 flows) | Claude Design | 2 |
| Export all handoff bundles for Claude Code | Claude Design | 1 |
| Export PDFs for docs/design/ | Claude Design | 0.5 |

**Sprint 0.5 deliverable:** Complete UI designs for all v0.1 screens. Handoff bundles ready. Interactive prototypes for user testing. PDF reference for contributors.

### Sprint 1: Calendar Core (Weeks 2-3)

**Goal:** Local calendar with event CRUD, daily/weekly views, and Google Calendar sync.

| Task | Tool | Hours |
|---|---|---|
| Calendar + Event database schema + migrations | Claude Code | 2 |
| Event CRUD handlers + service + sqlc queries | Claude Code | 4 |
| RRULE expansion (teambition/rrule-go) + unit tests | Claude Code | 3 |
| Conflict detection logic + unit tests | Claude Code | 2 |
| WebSocket broadcast on event changes (gorilla/websocket) | Claude Code | 3 |
| Google Calendar sync adapter (Go, using google API client) | Claude Code | 4 |
| iCal URL import adapter (Go, using go-ical) | Claude Code | 2 |
| React: calendar day view component | Codex | 3 |
| React: calendar week view component | Codex | 3 |
| React: event creation/edit modal | Codex | 2 |
| React: member color coding + avatar display | Codex | 2 |
| Integration tests for all calendar endpoints | Claude Code | 3 |
| Smoke tests | Claude Code | 1 |

**Sprint 1 deliverable:** Create events, view calendar, sync with Google Calendar. Real-time updates across tabs.

### Sprint 2: Lists, Routines & Kiosk (Weeks 4-5)

**Goal:** To-do lists, basic routines, kiosk mode with PIN auth, and phone layout.

| Task | Tool | Hours |
|---|---|---|
| Lists + Items schema + CRUD | Claude Code | 3 |
| Routines + Steps schema + CRUD | Claude Code | 3 |
| Basic star rewards (earn on completion) | Claude Code | 2 |
| PIN auth flow (kiosk mode) | Claude Code | 2 |
| React: kiosk dashboard layout | Codex | 4 |
| React: routine step-by-step view | Codex | 3 |
| React: list view with check-off | Codex | 2 |
| React: phone responsive layout | Codex | 3 |
| React: member selector + PIN entry screen | Codex | 2 |
| Completion animations (canvas-confetti, checkmark) | Codex | 2 |
| Dark mode + auto-switching | Codex | 2 |
| Integration tests | Claude Code | 2 |
| E2E tests (Playwright): onboarding, kiosk, list workflow | Claude Code | 3 |

**Sprint 2 deliverable:** Full MVP loop: create family → add members → calendar + lists + routines → kiosk mode on tablet.

### Sprint 3: Python Services + Recipe Database (Weeks 6-7)

**Goal:** CalDAV sync via Python, recipe import from URL, meal planning.

| Task | Tool | Hours |
|---|---|---|
| Python sync-worker: project setup, Dockerfile, DB connection | Claude Code | 2 |
| CalDAV adapter (python-caldav) + VCR tests | Claude Code | 4 |
| Outlook adapter (msgraph) + VCR tests | Claude Code | 3 |
| Sync engine: polling, conflict resolution, audit logging | Claude Code | 3 |
| Python recipe-scraper: project setup, Dockerfile | Claude Code | 1 |
| Recipe scraper (recipe-scrapers library) + tests | Claude Code | 3 |
| Recipe CRUD endpoints (Go) | Claude Code | 3 |
| Ingredient normalization + canonical DB seed | Claude Code | 3 |
| Meal plan CRUD endpoints (Go) | Claude Code | 2 |
| Shopping list generation from meal plan | Claude Code | 3 |
| React: recipe import flow (paste URL → preview → save) | Codex | 3 |
| React: recipe detail view + serving scaler | Codex | 2 |
| React: meal plan weekly grid | Codex | 3 |
| React: shopping list view | Codex | 2 |
| Integration tests for all recipe/meal endpoints | Claude Code | 2 |
| AI feature: LLM fallback for recipe parsing (test with Ollama) | Claude Code + Ollama | 2 |

**Sprint 3 deliverable:** CalDAV sync works with Nextcloud. Recipe URL import works for 631 sites. Meal plan → shopping list generation works.

### Sprint 4: Polish, Billing & Deploy (Weeks 8-9)

**Goal:** Audit log, backups, maintenance mode, Stripe billing (Cloud), Lambda deployment, PWA.

| Task | Tool | Hours |
|---|---|---|
| Audit log system | Claude Code | 2 |
| Backup/restore (pg_dump based) | Claude Code | 2 |
| Maintenance mode (CLI + API) | Claude Code | 1 |
| Data export (ZIP) | Claude Code | 2 |
| PWA manifest + service worker + offline cache | Codex | 3 |
| Stripe integration (Cloud billing repo) | Claude Code | 4 |
| CDK infrastructure (Lambda, API Gateway, Aurora, RDS Proxy, Redis, S3, SES) | Claude Code | 6 |
| Lambda deployment pipeline | Claude Code | 3 |
| i18n framework + English + German translations | Codex | 3 |
| Accessibility audit + fixes | Codex | 3 |
| Performance optimization + Lighthouse audit | Codex | 2 |
| Full E2E test suite | Claude Code | 4 |
| Documentation: setup guide, API docs, contributing | Codex | 3 |

**Sprint 4 deliverable:** v0.1 release. Self-hosted Docker Compose works. Lambda deploys to AWS. Stripe billing live. PWA installable.

### Sprint 5: Launch (Week 10)

| Task | Tool | Hours |
|---|---|---|
| Marketing site (tidyboard.dev) | Codex | 4 |
| Comparison blog posts (Hearth, Skylight) | Claude (chat) | 2 |
| README polish, screenshots, demo video | Manual + Codex | 3 |
| Hacker News / Reddit / Product Hunt launch posts | Claude (chat) | 2 |
| Monitor, respond, hotfix | All tools | ongoing |

---

## 3. Pre-Implementation Checklist

Before writing any code:

- [ ] Register tidyboard.dev and tidyboard.cloud domains
- [ ] Create GitHub repository (tidyboard/tidyboard)
- [ ] Create private repo (tidyboard/tidyboard-cloud) for billing code
- [ ] Set up Stripe account (need LLC/business entity first)
- [ ] Check UC Davis IP agreement
- [ ] Set up Google Cloud project for Google Calendar OAuth (dev/test)
- [ ] Install Claude Code, Codex CLI, Ollama on development machine
- [ ] Pull Ollama models: `ollama pull llama3.2:3b && ollama pull mistral:7b`
- [ ] Copy CLAUDE.md to project root (also symlink as AGENTS.md for Codex)
- [ ] Set up Go 1.23+, Node 22+, Docker on development machine
- [ ] Create config.yaml from config.example.yaml with local Postgres credentials

---

## 4. Estimated Timeline

| Phase | Duration | Deliverable |
|---|---|---|
| Sprint 0: Foundation | 1 week | Project skeleton, auth, CI |
| Sprint 0.5: Design (parallel) | 1 week | All UI screens in Claude Design, handoff bundles |
| Sprint 1: Calendar | 2 weeks | Calendar CRUD + Google sync + views |
| Sprint 2: Lists/Routines/Kiosk | 2 weeks | Full MVP UX loop |
| Sprint 3: Python + Recipes | 2 weeks | CalDAV sync, recipe import, meal planning |
| Sprint 4: Polish + Deploy | 2 weeks | v0.1 release candidate |
| Sprint 5: Launch | 1 week | Public release |
| **Total** | **~10 weeks** | **v0.1 MVP** |

Sprint 0.5 (Design) runs in parallel with Sprint 0 (Foundation). You work in Claude Design while Claude Code scaffolds the backend. By the time Sprint 1 starts, both the Go backend skeleton AND all UI designs are ready — frontend implementation can begin immediately from handoff bundles.
