# Tidyboard — Spec Gap Audit v2

**Date:** 2026-04-22
**Auditor:** Scientist agent (read-only audit)
**Spec files read:** tidyboard-spec.md (3330 lines), tidyboard-claude-design-brief.md (476 lines), tidyboard-design-system.md (426 lines), tidyboard-qa-plan.md (408 lines), tidyboard-implementation-plan.md (320 lines), tidyboard-marketing-plan.md (479 lines), specs/CLAUDE.md
**Implementation files read:** web/src/lib/data.ts, web/src/lib/tokens.ts, web/src/app/** (all routes), web/src/components/** (all screens + UI), web/package.json
**Total citations in this report:** 157

---

## §1 — Executive Summary

Tidyboard is a full-featured open-source family dashboard specified across six detailed documents. As of 2026-04-22, the project exists as two directories at the repo root: `specs/` (the complete specification) and `web/` (a Next.js 16 + React 19 frontend). **There is no backend code anywhere in the repository** — no Go module, no `go.mod`, no migrations, no Docker Compose file, no Python services, no database schema.

The `web/` frontend is a **pixel-perfect static design prototype** that runs entirely off 378 lines of hardcoded sample data (`web/src/lib/data.ts`) for a fictional family called "The Smiths." Every screen defined in the Claude Design brief has been implemented as a React component with full visual fidelity to the design system. The frontend has 352 Vitest tests at 90.85% coverage, PWA metadata, OG/Twitter tags, error/404/loading pages, a working dark-mode toggle, and a11y focus rings.

**What is shippable today: approximately 0% of the §14 MVP scope.** The MVP requires — as table stakes — account registration, household creation, event CRUD, Google Calendar sync, real-time WebSocket updates, PIN auth, offline resilience, i18n, and Stripe billing. None of these exist. Every user-facing button in the frontend either does nothing, navigates to a static preview route, or shows hardcoded Smith Family data. The frontend cannot be shipped as a product because it has no persistence, no auth, no sync, and no way for any real family to see their own data.

The project is between **Sprint 0 foundation** and **Sprint 0.5 design** on the implementation plan timeline — the design phase is complete and exceptionally well-executed, but Sprint 0 (the Go backend skeleton, database, auth, CI) has not been started.

---

## §2 — File-by-File Spec Coverage

### 2.1 `tidyboard-spec.md` (3330 lines)

The master spec. Covers architecture (§3), tech stack (§4), data model (§5), 21 feature sections (§6), API design (§7), sync architecture (§8), security (§9), testing strategy (§10), project structure (§11), business model (§12), comparisons (§13), MVP scope (§14), and open questions (§15).

**✅ Implemented (UI-only):**
- Design system tokens match spec §4.2 colors exactly (tidyboard-spec.md §4.2; web/src/lib/tokens.ts)
- All dashboard layouts from §3.3 onboarding flow rendered as static screens
- Calendar views (daily, weekly, monthly, agenda) from §6.1
- Routine view (kid-facing) from §6.2
- Lists view from §6.3
- Recipe database view, import flow from §6.4
- Meal plan weekly grid from §6.4.2
- Shopping list from §6.4.3
- Race view from §6.5.3
- Equity dashboard from §6.6.4
- Lock screen / PIN entry from §6.10
- Settings screen from §6.15 (partial)

**⚠ Partially implemented:**
- Dark mode: separate static dark-variant preview routes exist (`/dashboard/kiosk-dark`, `/routines/kid-dark`, etc.) but there is no runtime `prefers-color-scheme` switching or unified theme toggle that applies globally to all routes (spec §6.7, design-system.md §1)
- PWA: manifest and SW registration scaffold exist (web/src/app/sw.ts, web/src/components/sw-register.tsx) but Serwist service worker is not generating actual offline caching (package.json `@serwist/next ^9.5.7`)
- Accessibility: focus rings and semantic HTML present but no axe-core integration, no screen reader testing, no `aria-live` regions for realtime content (spec §6.13, qa-plan.md §3.6)

**❌ Not implemented:**
- All backend code (Go server, Python services) — spec §3, §4.1, §4.3, §4.4
- All 19 database migrations — spec §11
- All API endpoints — spec §7.2 (60+ endpoint groups)
- Authentication (JWT, OAuth, PIN auth backend) — spec §9.1
- Calendar sync (Google, Outlook, CalDAV, iCal URL) — spec §6.1, §8.1
- Real-time WebSocket — spec §7.3
- Household equity engine time tracking — spec §6.6.3
- Gamification anti-abuse system — spec §6.17
- Maintenance mode backend — spec §6.18
- Backup/restore system — spec §6.19
- Offline mutation queue (IndexedDB/Dexie.js) — spec §6.21, §8.2
- i18n framework (react-i18next not installed) — spec §6.14
- Audit log — spec §6.16
- Electron app — spec §4.3
- Plugin system — spec §6.12
- Notification backends (ntfy, Pushover, email) — spec §6.9
- Photo-to-event OCR / BYOK AI — spec §6.11
- Stripe billing — spec §12.2

### 2.2 `tidyboard-claude-design-brief.md` (476 lines)

This is the UI brief. It defines 16 screen specifications, 4 interactive flows, and ready-to-paste Claude Design prompts.

**✅ All 16 screens implemented:**
- Onboarding wizard (7 screens) — `web/src/components/screens/onboarding.tsx`
- Dashboard kiosk tablet — `web/src/components/screens/dashboard-kiosk.tsx`
- Dashboard phone — `web/src/components/screens/dashboard-phone.tsx`
- Dashboard desktop — `web/src/components/screens/dashboard-desktop.tsx`
- Calendar (4 views) — `web/src/components/screens/calendar.tsx`
- Routine (kid-facing) — `web/src/components/screens/routine.tsx`
- Recipe import flow — `web/src/app/recipes/import/page.tsx`
- Recipe detail — `web/src/components/recipe-detail-themed.tsx`
- Meal plan weekly grid — `web/src/app/meals/page.tsx`
- Shopping list — `web/src/app/shopping/page.tsx`
- Equity dashboard — `web/src/components/screens/equity.tsx`
- Race view — `web/src/app/race/page.tsx`
- Lock screen — `web/src/app/lock/page.tsx`
- Settings — `web/src/app/settings/page.tsx`
- Dark mode variants (kiosk-dark, kid-dark, recipe-dark) — separate preview routes

**⚠ Partial:**
- Event Detail / Create Modal (brief §2.6): event page exists (`/calendar/event`) but the modal is static; no form submission logic
- Interactive prototype flows (brief §3): flows are navigable via URL routing but have no real state transitions; clicking "Get Started" in onboarding does not advance the wizard

**❌ Missing from brief:**
- Storybook documentation (brief §4 step 4; design-system.md §8.2): no Storybook installed or configured
- Chromatic visual regression (design-system.md §2.2): not set up
- Export as interactive HTML prototypes for user testing (brief §4)

### 2.3 `tidyboard-design-system.md` (426 lines)

Covers tokens, component library, layout patterns, interaction design, accessibility.

**✅ Implemented:**
- All color tokens match exactly (design-system.md §3.1; web/src/lib/tokens.ts:1-48)
- Typography scale matches (design-system.md §3.2; web/src/lib/tokens.ts:58-68)
- Spacing/radius tokens present (design-system.md §3.3; web/src/lib/tokens.ts:46-47)
- shadcn/ui-style component structure: Button, Card, Avatar, Badge, Icon, Input, Heading (web/src/components/ui/)
- Responsive breakpoints: phone/tablet/desktop layouts exist

**⚠ Partial:**
- Display font: spec says "Cal Sans, system-ui" but implementation uses "Fraunces" as primary (web/src/lib/tokens.ts:42: `'"Fraunces", "Cal Sans", Georgia, serif'`). Fraunces is a serif variable font with a very different aesthetic. Not wrong but diverges from spec.
- Touch targets: 44px and 56px targets mentioned in design-system.md §7 but not systematically enforced; no automated Storybook check exists
- Component states: design-system.md §4.1 requires all components to have documented states (hover, active, disabled, loading, error, empty); no Storybook means these are not verified
- Celebration components (design-system.md §4.2): canvas-confetti, Lottie animations are NOT installed (not in package.json); only CSS-based routine step completion animation exists
- Sound design (design-system.md §6.3): not implemented
- Framer Motion (design-system.md §2.2): not installed

**❌ Missing:**
- Figma file, Tokens Studio integration, Style Dictionary pipeline (design-system.md §2.1 and §8.1)
- Storybook with a11y addon (design-system.md §2.2 and §8.2)
- Chromatic visual regression (design-system.md §2.2)
- High contrast mode token set (design-system.md §7)
- `aria-live` regions for realtime updates (design-system.md §7)
- Reduced-motion E2E test project (design-system.md §7)

### 2.4 `tidyboard-qa-plan.md` (408 lines)

Defines 7 test levels, coverage targets, CI pipeline structure, release gate checklist, environment strategy, monitoring, data integrity checks.

**✅ Implemented:**
- Frontend unit tests: 352 Vitest tests at 90.85% coverage (meets the ≥80% line coverage floor — qa-plan.md §2)
- Test runner: Vitest with `singleFork: true`, React Testing Library, happy-dom (matches qa-plan.md §10)
- CI: local `npm test` runs; GitHub Actions not confirmed present in repo

**⚠ Partial:**
- Coverage: 90.85% line coverage reported for frontend; branch coverage not confirmed at ≥75% threshold (qa-plan.md §2)

**❌ Missing (all backend and cross-stack):**
- Backend unit tests (500+ target): 0 exist — no Go code (qa-plan.md §3.1)
- Backend integration tests (150+ target): 0 exist (qa-plan.md §3.2)
- Smoke tests (30+): 0 exist (qa-plan.md §3.3)
- E2E Playwright tests (20+): not installed, not configured (qa-plan.md §3.4)
- Performance tests / k6 / Lighthouse CI: not configured (qa-plan.md §3.5)
- axe-core automated accessibility tests: not installed (qa-plan.md §3.6)
- govulncheck, golangci-lint: no Go code to lint (qa-plan.md §3.7)
- Python test suite (pytest, testcontainers-python, vcrpy): no Python code exists (qa-plan.md §9)
- CalDAV server compatibility matrix tests (qa-plan.md §9.2)
- Recipe scraper golden URL test matrix (qa-plan.md §9.3)
- COPPA compliance tests (qa-plan.md §10.1)
- GDPR data privacy tests (qa-plan.md §10.2)
- GitHub Actions CI pipeline with all jobs (qa-plan.md §3, §10.11)
- Production monitoring / CloudWatch dashboards (qa-plan.md §6)
- Data integrity checks / EventBridge Lambda (qa-plan.md §7)

### 2.5 `tidyboard-implementation-plan.md` (320 lines)

Defines 6 sprints (Sprint 0 through Sprint 5) with per-task hour estimates.

**Sprint progress assessment:**
- Sprint 0 (Foundation): 0% — no Go module, no Docker Compose, no database, no auth, no CI pipeline (implementation-plan.md §2 Sprint 0)
- Sprint 0.5 (Design): ~95% — all screen designs implemented as React components; handoff bundles not formally exported; Storybook stories not written (implementation-plan.md §2 Sprint 0.5)
- Sprint 1–5: 0%

**Pre-implementation checklist** (implementation-plan.md §3): none of the prerequisite items are confirmed done — domain registration, GitHub repo, Stripe account, Google Cloud OAuth project, Go/Node/Docker environment setup.

### 2.6 `tidyboard-marketing-plan.md` (479 lines)

Covers market positioning, SEO strategy, launch plan, community building.

**✅ Partially Implemented:**
- OG/Twitter metadata in Next.js layout (web/src/app/layout.tsx)
- robots.ts and sitemap.ts present (web/src/app/robots.ts, web/src/app/sitemap.ts)

**❌ Not Implemented:**
- Marketing site (tidyboard.dev): does not exist; the web/ directory is the app, not a marketing site (marketing-plan.md §4.2)
- Blog (tidyboard.dev/blog): not started (marketing-plan.md §3.1)
- Comparison pages (/compare/hearth, /compare/skylight): not started (marketing-plan.md §4.2)
- Documentation hub (/docs/): not started (marketing-plan.md §4.2)
- Product Hunt presence, GitHub repo (public), Hacker News draft posts (marketing-plan.md §5)
- Pre-launch legal checklist: LLC, ToS, Privacy Policy, COPPA compliance, DPA (marketing-plan.md §11)
- Domain registration (tidyboard.dev, tidyboard.cloud) not confirmed (marketing-plan.md §5.1)
- Demo video (60-second install-to-kiosk) not recorded (marketing-plan.md §5.1)
- Google Search Console, Plausible Analytics: not configured (marketing-plan.md §5.1)

---

## §3 — Data Model vs. Current TypeScript Types

All spec entities are defined in tidyboard-spec.md §5. Current TS types live in web/src/lib/data.ts. These are display-only types; there is no persistence layer.

### Account
**Spec (spec.md:709-717):** id UUID, email, password_hash, oidc_provider, oidc_subject, is_active, created_at, linked_members[]
**Current TS:** ❌ No `Account` type exists anywhere in web/src/. The onboarding form captures email/password UI but there is no type definition.

### Household
**Spec (spec.md:719-727):** id UUID, name, timezone, settings JSON, created_by UUID, invite_code str, Invitations[], JoinRequests[], Members[], Calendars[], Routines[], Lists[], MealPlans[], Rewards[], Races[], Achievements[], LeaderboardSnapshots[], Widgets[]
**Current TS (data.ts:136-137):** `household: { name: "The Smith Family", id: "smith" }` — a bare object literal, not a typed struct. Missing: timezone, settings, invite_code, all nested entities as typed arrays.

### Member
**Spec (spec.md:746-757):** id UUID, account_id UUID (nullable), name, display_name, color hex, avatar_url, role enum(owner|admin|member|child|guest), age_group enum, pin (hashed), emergency_info JSON, notification_preferences JSON
**Current TS (data.ts:4-15):**
```ts
type Member = { id: string; name: string; full: string; role: Role; color: string; initial: string; stars: number; streak: number; }
type Role = "adult" | "child";
```
**Gaps:** `display_name` named `name`/`full` inconsistently; `role` is `"adult"|"child"` not the 5-value enum (`owner|admin|member|child|guest`); missing `account_id`, `avatar_url`, `age_group`, `pin`, `emergency_info`, `notification_preferences`.

### Calendar
**Spec (spec.md:758-778):** id UUID, name, source enum(local|google|outlook|ical_url|caldav), sync_config JSON, sync_direction enum, assigned_member_id UUID, color_override str, Events[]
**Current TS:** ❌ No `Calendar` type. Events are a flat array on `TBD`, not nested under a calendar entity.

### Event
**Spec (spec.md:763-779):** id UUID, external_id, title, description, start_time datetime, end_time datetime, all_day bool, location, recurrence_rule (RFC 5545 RRULE), assigned_members UUID[], reminders JSON[]
**Current TS (data.ts:17-26):**
```ts
type TBDEvent = { id: string; title: string; start: string; end: string; members: string[]; location?: string; type?: string; }
```
**Gaps:** `start`/`end` are time-of-day strings ("08:00") not ISO datetimes; missing `external_id`, `description`, `all_day`, `recurrence_rule`, `reminders`.

### Routine
**Spec (spec.md:780-795):** id UUID, name, assigned_member_id UUID, schedule JSON, Steps[], CompletionLog[]
**Current TS (data.ts:38-46):**
```ts
type Routine = { member: string; name: string; progress: number; total: number; minutesLeft: number; steps: RoutineStep[]; }
```
**Gaps:** No `id`, no `schedule`, no `CompletionLog`. `member` is a string ID rather than UUID. Steps are close but missing `image_url` and `estimated_minutes` is named `min`.

### RoutineStep
**Spec (spec.md:787-793):** id UUID, order int, title str, icon str, image_url str (nullable), estimated_minutes int
**Current TS (data.ts:31-37):** `{ id, emoji, name, min, done, active? }` — `emoji` replaces `icon`; `done` and `active` are display state not in the spec model; missing `order` and `image_url`.

### List / ListItem
**Spec (spec.md:797-812):** List has type enum(todo|grocery|packing|custom), shared bool, Items with priority enum, sort_order
**Current TS (data.ts:120-134):**
```ts
type FamilyList = { id, title, category: "chores"|"packing"|"errands"|"todo", emoji, items: ListItem[] }
type ListItem = { id, text, done, assignee?, due? }
```
**Gaps:** `category` enum differs from spec (`chores`/`errands` not in spec; `grocery`/`custom` in spec not in TS); missing `shared`, `priority`, `sort_order` on items.

### Recipe
**Spec (spec.md:903-944):** 25+ fields including household_id, source_url, source_domain, image_url, prep/cook/total_time as durations, servings_unit, categories[], cuisine, tags[], difficulty enum, rating, notes, is_favorite, times_cooked, last_cooked_at, created_by UUID, Ingredients[] (10 fields each), Steps[] (5 fields each), NutritionInfo
**Current TS (data.ts:48-61):**
```ts
type Recipe = { id, title, source, prep, cook, total, serves, rating, tag: string[], ingredients?: Ingredient[], steps?: string[] }
type Ingredient = { amt: string; name: string }
```
**Gaps:** Missing `household_id`, `source_url`/`source_domain` (collapsed to `source`), `image_url`, `difficulty`, `is_favorite`, `times_cooked`, `last_cooked_at`, `notes`, `cuisine`, `categories` vs `tag`. Ingredient type is 2 fields vs. 8 in spec (no `order`, `group`, `unit`, `preparation`, `optional`, `substitution_note`). Steps are plain `string[]` not typed objects with `timer_seconds` and `image_url`.

### MealPlan
**Spec (spec.md:1190-1201):** id UUID, household_id, date date, meal_type enum, title, recipe_id UUID (nullable), servings_override, assigned_member_id, notes, completed bool
**Current TS (data.ts:64-68):**
```ts
type MealPlan = { weekOf: string; rows: string[]; grid: (string | null)[][] }
```
**Gaps:** Grid-based structure is a display convenience, not matching the spec's per-entry model. Missing `household_id`, `date`, `meal_type`, `recipe_id`, `completed`.

### Equity Types
**Spec (spec.md:966-997):** TaskDomain, DomainOwnership (with history), TimeEntry (12 fields)
**Current TS (data.ts:82-108):**
```ts
type EquityAdult = { id, total, cognitive, physical, personalHrs, personalGoal, load, loadPct }
type Domain = { name, owner, hours, tasks }
type TrendPoint = { w, mom, dad }
```
**Gaps:** `Domain` type is a display aggregation, not the spec's `TaskDomain`/`DomainOwnership` entities. No `TimeEntry` type. No `DomainOwnershipHistory`. `EquityAdult` is a computed summary, not a database entity.

### Race
**Spec (spec.md:828-850):** id UUID, name, created_by UUID, status enum, started_at, ended_at, bonus_stars, source_list_id, source_routine_id, Participants[], RaceHistory[]
**Current TS (data.ts:110-118):**
```ts
type Race = { name, countdownSec, totalSec, participants: RaceParticipant[], items: RaceItem[] }
type RaceParticipant = { id, progress, items }
```
**Gaps:** No `id`, `created_by`, `status`, `started_at`, `ended_at`, `bonus_stars`, `source_list_id`. `RaceHistory` not modelled.

### Missing Entities (no TS type at all)
- `Account` (spec.md:709)
- `Calendar` (spec.md:758)
- `Invitation` (spec.md:728-736)
- `JoinRequest` (spec.md:737-745)
- `Rewards` (spec.md:820-827) — stars exist as numbers on Member but no Reward entity
- `Achievement` (spec.md:851-856)
- `LeaderboardSnapshot` (spec.md:857-871)
- `Widget` (spec.md:872-877)
- `AuditEntry` (spec.md:879-891)
- `BackupRecord` (spec.md:893-901)
- `IngredientCanonical` (spec.md:945-953)
- `Subscription` (spec.md:954-964) — a `StripePhantom` UI placeholder exists but no type
- `NutritionInfo` (spec.md:941-944)
- `TimeEntry` (spec.md:984-997)
- `DomainOwnership` (spec.md:975-983)

---

## §4 — Feature Spec (§6) Coverage

### 6.1 Calendar
| Feature | Status | Evidence |
|---|---|---|
| Create/edit/delete events (local calendar) | ⚠ UI-only | Event modal renders (`/calendar/event`) but no submission |
| Daily view (column-per-member) | ✅ UI | `dashboard-kiosk.tsx`, `calendar.tsx` CalDay |
| Weekly view | ✅ UI | `calendar.tsx` CalWeek |
| Monthly view | ✅ UI | `calendar.tsx` CalMonth |
| Agenda view | ✅ UI | `calendar.tsx` CalAgenda |
| Color-coded per member | ✅ UI | Uses `TB.memberColors` and member.color |
| Recurring events (RRULE) | ❌ | No rrule npm package installed (package.json) |
| Event reminders (push/email) | ❌ | No notification backend |
| Full-text search | ⚠ UI-only | Search bar in CalAgenda; non-functional |
| Scheduling conflict detection | ❌ | Not implemented |
| Google Calendar sync (OAuth) | ❌ | Button in onboarding is static |
| Outlook sync | ❌ | Not implemented |
| CalDAV sync | ❌ | Not implemented |
| iCal URL import | ❌ | Not implemented |
| Sync conflict resolution | ❌ | No sync engine |
| Photo-to-event (OCR + LLM) | ❌ | Not implemented |
| iCal file import (.ics) | ❌ | Not implemented |
| Calendar sharing (read-only iCal feed) | ❌ | Not implemented |

### 6.2 Routines
| Feature | Status | Evidence |
|---|---|---|
| Ordered steps with icons/photos | ✅ UI | `routine.tsx` RoutineKid |
| Assign to family members | ✅ UI | Steps show member name/color |
| Schedule by days/time windows | ❌ | No schedule data in Routine type |
| Completion tracking / streak counters | ⚠ UI-only | Progress bar and minutesLeft displayed; no backend |
| Checklist / card / timeline display modes | ✅ UI | `/routines/checklist`, `/routines/path` routes |
| Routine templates (JSON export/import) | ❌ | Not implemented |
| Per-step countdown timer | ⚠ UI-only | Timer display exists; no actual countdown logic |

### 6.3 Lists & To-Dos
| Feature | Status | Evidence |
|---|---|---|
| Multiple list types (todo/grocery/packing/custom) | ✅ UI | `FamilyList.category` in data.ts; lists screen exists |
| Shared or private lists | ⚠ UI-only | No auth to distinguish |
| Drag-and-drop reordering | ❌ | dnd-kit not installed (package.json) |
| Board view (kanban) | ❌ | Not implemented |
| Checklist view | ✅ UI | `/lists/[id]` page |
| Recurring to-dos | ❌ | Not implemented |
| Due dates | ⚠ UI-only | `due` field in ListItem; displayed but not actionable |
| Grocery aisle/category grouping | ✅ UI | Shopping screen has category sections |

### 6.4 Recipes, Meals & Shopping
| Feature | Status | Evidence |
|---|---|---|
| Recipe collection view | ✅ UI | `/recipes/page.tsx` |
| Recipe detail view with serving scaler | ⚠ UI-only | Scaler UI renders; no recalculation logic wired |
| Cooking mode (full-screen step-by-step) | ❌ | Not implemented |
| URL import (recipe-scrapers) | ⚠ UI-only | Import form renders; no backend scraper |
| Manual entry form | ❌ | Not implemented |
| Photo-to-recipe (OCR + LLM) | ❌ | Not implemented |
| Paprika file import | ❌ | Not implemented |
| Favorites and ratings | ⚠ UI-only | Rating displayed; not saveable |
| Full-text search | ❌ | No search functionality |
| Duplicate detection | ❌ | Not implemented |
| Cooking history / times_cooked | ❌ | Not in TS type |
| Recipe sharing (shareable link) | ❌ | Not implemented |
| Recipe collections | ❌ | Not implemented |
| Meal plan weekly grid | ✅ UI | `/meals/page.tsx` |
| Drag recipes to meal slots | ❌ | No dnd-kit |
| Quick-add text meals | ❌ | Not implemented |
| Copy last week's plan | ❌ | Not implemented |
| Meal plan templates | ❌ | Not implemented |
| "What's for dinner?" widget on dashboard | ✅ UI | Shows in kiosk dashboard |
| Shopping list auto-generation from meal plan | ❌ | No backend logic; list is hardcoded |
| Aisle grouping | ✅ UI | Shopping categories displayed |
| Check-off at store | ⚠ UI-only | Checkbox renders; no persistence |
| Pantry staples section | ✅ UI | `pantry: true` category in data |
| Ingredient normalization / canonical DB | ❌ | Not implemented |

### 6.5 Gamification
| Feature | Status | Evidence |
|---|---|---|
| Star economy (earn/spend) | ⚠ UI-only | Star counts in member data; no backend |
| Reward definitions with star costs | ❌ | No Reward entity in TS types |
| Reward redemption with animation | ❌ | canvas-confetti not installed |
| Star progress bar toward reward | ❌ | Not implemented |
| Completion animation (checkmark burst) | ⚠ CSS-only | Routine step has CSS transition; no canvas-confetti |
| Full-screen celebration (confetti cannon) | ❌ | canvas-confetti not in package.json |
| Streak milestones (emoji rain, badge) | ❌ | Not implemented |
| Trophy animation (Lottie) | ❌ | lottie-react not installed |
| Race mode with live progress | ⚠ UI-only | Race view renders; no WebSocket |
| Races (real-time WebSocket) | ❌ | No WebSocket client |
| Leaderboard weekly/monthly | ⚠ UI-only | Not a distinct view; race view shows progress |
| Team challenges | ❌ | Not implemented |
| Avatar customization / accessories | ❌ | Avatars are initials-in-circle |
| Achievement badge system | ❌ | No Achievement type |
| Custom badge JSON packs | ❌ | Not implemented |

### 6.6 Household Equity Engine
| Feature | Status | Evidence |
|---|---|---|
| Task domain definitions | ⚠ UI-only | Domain list in data.ts (display aggregation only) |
| Domain ownership assignment | ⚠ UI-only | Owner string in Domain; not editable |
| Time tracking (timer / manual / auto-estimate) | ❌ | No TimeEntry type or UI |
| Cognitive vs. physical distinction | ❌ | Not modelled in TS |
| Equity dashboard (pie chart, bar chart, trend) | ✅ UI | `equity.tsx` SVG-based pie and bar |
| Load indicator (traffic light) | ✅ UI | Green/yellow/red in equity screen |
| Rebalance suggestions | ⚠ UI-only | Static text in equity screen |
| Personal time tracking | ⚠ UI-only | Ring chart displayed; no tracking |
| Adults-only access control | ❌ | No auth |

### 6.7–6.21 Other Features
| Section | Feature | Status |
|---|---|---|
| §6.7 | Competitor pain points (audio, search, dark mode, conflict detection) | ❌ mostly missing |
| §6.8 | Multi-household support | ❌ |
| §6.8 | Account/member separation | ❌ |
| §6.8 | Invite by email / code flows | ❌ |
| §6.8 | Roles & permissions (owner/admin/member/child/guest) | ❌ |
| §6.9 | Notifications (ntfy, Pushover, email, webhook) | ❌ |
| §6.10 | Kiosk mode / idle timeout / photo slideshow | ⚠ Static lock screen; no idle timer or slideshow |
| §6.11 | AI/BYOK features | ❌ |
| §6.12 | Widget / plugin system | ❌ |
| §6.13 | Accessibility WCAG 2.1 AA complete | ⚠ Partial |
| §6.14 | i18n (react-i18next) | ❌ Not installed |
| §6.15 | Data portability / export ZIP | ❌ |
| §6.16 | Audit log | ❌ |
| §6.17 | Gamification anti-abuse | ❌ |
| §6.18 | Maintenance mode | ❌ |
| §6.19 | Backup / restore | ❌ |
| §6.20 | Tablet/kiosk ops guide | ❌ (docs not written) |
| §6.21 | Offline resilience (IndexedDB, mutation queue) | ❌ |

---

## §5 — API Design (§7)

**Status: ❌ Zero endpoints implemented.** No Go server, no API Gateway, no HTTP handler code anywhere in the repository.

The following endpoint groups are defined in spec §7.2 and must be built. Listed here as the complete scope for the backend agent:

```
Auth
  POST   /api/auth/register
  POST   /api/auth/login
  POST   /api/auth/refresh
  POST   /api/auth/pin                     # kiosk PIN → scoped JWT
  DELETE /api/auth/me                      # GDPR account deletion

Households
  GET    /api/households
  POST   /api/households
  GET    /api/households/{id}
  PUT    /api/households/{id}
  DELETE /api/households/{id}
  POST   /api/invite                       # email invitation
  GET    /api/invite/{token}               # accept invitation
  POST   /api/join                         # join by invite code
  GET    /api/join-requests                # pending join requests
  PUT    /api/join-requests/{id}           # approve/reject

Members
  GET    /api/households/{id}/members
  POST   /api/households/{id}/members
  GET    /api/households/{id}/members/{mid}
  PUT    /api/households/{id}/members/{mid}
  DELETE /api/households/{id}/members/{mid}

Calendars
  GET    /api/calendars
  POST   /api/calendars
  PUT    /api/calendars/{id}
  DELETE /api/calendars/{id}
  GET    /api/feed/{id}.ics                # read-only iCal feed

Events
  GET    /api/events                       # list (filterable, paginated)
  POST   /api/events
  GET    /api/events/{id}
  PUT    /api/events/{id}
  DELETE /api/events/{id}
  GET    /api/events/conflicts
  POST   /api/events/check-conflicts
  POST   /api/events/import               # .ics file import

Lists
  GET    /api/lists
  POST   /api/lists
  GET    /api/lists/{id}
  PUT    /api/lists/{id}
  DELETE /api/lists/{id}
  GET    /api/lists/{id}/items
  POST   /api/lists/{id}/items
  PUT    /api/lists/{id}/items/{iid}
  DELETE /api/lists/{id}/items/{iid}

Routines
  GET    /api/routines
  POST   /api/routines
  GET    /api/routines/{id}
  PUT    /api/routines/{id}
  DELETE /api/routines/{id}
  GET    /api/routines/{id}/steps
  POST   /api/routines/{id}/steps
  PUT    /api/routines/{id}/steps/{sid}
  POST   /api/routines/{id}/complete       # log step completion

Recipes (spec §6.4.4)
  GET    /api/recipes
  POST   /api/recipes
  GET    /api/recipes/{id}
  PUT    /api/recipes/{id}
  DELETE /api/recipes/{id}
  POST   /api/recipes/import-url
  POST   /api/recipes/import-photo
  POST   /api/recipes/import-file
  GET    /api/recipes/{id}/scale?servings=N
  POST   /api/recipes/{id}/share
  GET    /api/recipes/shared/{token}       # public, no auth
  GET    /api/recipes/collections
  POST   /api/recipes/collections
  PUT    /api/recipes/collections/{id}
  POST   /api/recipes/collections/{id}/add

Meal Plans (spec §6.4.4)
  GET    /api/meals?week=2026-W16
  POST   /api/meals
  PUT    /api/meals/{id}
  DELETE /api/meals/{id}
  POST   /api/meals/copy-week
  POST   /api/meals/{id}/complete
  GET    /api/meals/templates
  POST   /api/meals/templates
  POST   /api/meals/apply-template

Shopping (spec §6.4.4)
  POST   /api/shopping/generate
  GET    /api/shopping/current
  POST   /api/shopping/staples

Ingredients (spec §6.4.4)
  GET    /api/ingredients/search?q=...
  POST   /api/ingredients

Gamification
  GET    /api/rewards
  POST   /api/rewards
  PUT    /api/rewards/{id}
  DELETE /api/rewards/{id}
  POST   /api/rewards/{id}/redeem
  GET    /api/races
  POST   /api/races
  GET    /api/races/{id}
  PUT    /api/races/{id}
  POST   /api/races/{id}/complete-item
  GET    /api/leaderboard
  GET    /api/achievements/{member_id}

Domains / Equity (spec §6.6.6)
  GET    /api/domains
  POST   /api/domains
  PUT    /api/domains/{id}
  DELETE /api/domains/{id}
  POST   /api/domains/{id}/assign
  GET    /api/domains/{id}/history
  POST   /api/time-entries
  GET    /api/time-entries
  PUT    /api/time-entries/{id}
  DELETE /api/time-entries/{id}
  GET    /api/equity/summary?period=week|month
  GET    /api/equity/trends?months=3
  GET    /api/equity/personal-time
  GET    /api/equity/rebalance

AI (spec §6.11)
  POST   /api/ai/parse-event
  POST   /api/ai/suggest-meals
  POST   /api/ai/parse-recipe

Admin
  GET    /api/health
  GET    /api/audit
  GET    /api/audit/feed/{member_id}
  POST   /api/admin/maintenance
  POST   /api/admin/backup
  POST   /api/admin/restore
  GET    /api/admin/backups

Billing (Cloud only)
  POST   /api/billing/checkout
  GET    /api/billing/portal
  GET    /api/billing/subscription
  POST   /api/billing/webhook

Export
  GET    /api/household/export             # ZIP download

Widgets
  GET    /api/widgets
  POST   /api/widgets
  PUT    /api/widgets/{id}
  DELETE /api/widgets/{id}
```

**WebSocket (spec §7.3):**
```
ws://host/api/ws                           # gorilla/websocket (self-hosted)
                                           # API Gateway WebSocket API (cloud)
Messages: event.created, event.updated, race.updated,
          achievement.earned, celebration, maintenance, server_shutdown
```

**Lambda function layout (spec §7.1):** 16 Lambda functions required:
`auth`, `households`, `calendars`, `lists`, `routines`, `meals`, `recipes`, `gamification`, `admin`, `equity`, `ai`, `ws-connect`, `ws-disconnect`, `ws-message`, `sync-worker`, `cron`, `migrate`

---

## §6 — Sync Architecture (§8)

**Status: ❌ Nothing implemented.**

The sync engine is the highest-risk technical component. Spec §8.1 defines the `SyncAdapter` interface in Go with four methods (`FetchEvents`, `PushEvent`, `UpdateEvent`, `DeleteEvent`). Four adapters are required:

| Adapter | Language | Library | Status |
|---|---|---|---|
| GoogleAdapter | Go | `google.golang.org/api/calendar/v3` | ❌ |
| OutlookAdapter | Go | `microsoftgraph/msgraph-sdk-go` | ❌ |
| CalDAVAdapter | Python | `python-caldav` v3.x | ❌ (v0.2 per spec §14) |
| ICalURLAdapter | Go | `emersion/go-ical` | ❌ |

The Python sync-worker service (`services/sync-worker/`) is completely absent. Per spec §3.1, it runs on a 5-minute EventBridge schedule and uses `python-caldav`, `icalendar`, `recurring-ical-events`, `dateutil.rrule` — all chosen because no Go library matches their server-compatibility profile.

Key open questions from spec §15 that must be resolved during implementation:
- iCloud CalDAV with `emersion/go-webdav` and app-specific passwords (spec §15, item 6)
- `teambington/rrule-go` DST transition conformance (spec §15, item 8)
- VCR cassette recordings for Google/Outlook/iCloud API calls (qa-plan.md §9.2)

**Offline-first client sync (spec §8.2):** Requires Dexie.js 4+ for IndexedDB and a mutation queue. Neither is installed (package.json). No `useQuery`/`useMutation` (TanStack Query not installed), no Zustand store.

---

## §7 — Security (§9)

**Status: ❌ Nothing implemented. The application has no security layer.**

| Security Requirement | Spec Reference | Status |
|---|---|---|
| HTTPS enforcement | spec §9.1 | ❌ |
| JWT (15-min expiry) + refresh tokens (7-day, rotated) | spec §9.1 | ❌ |
| PIN auth → scoped JWT (24-hour, limited permissions) | spec §9.1 | ❌ |
| OAuth2 tokens encrypted at rest (AES-256-GCM) | spec §9.1 | ❌ |
| CORS restricted to configured origins | spec §9.2 | ❌ |
| CSP headers (no inline scripts, no eval) | spec §9.2 | ❌ |
| Rate limiting on auth endpoints (5/min/IP, 15-min lockout) | spec §9.2 | ❌ |
| Rate limiting on gamification endpoints | spec §9.2, §6.17 | ❌ |
| PIN brute-force protection (5 attempts → 5-min lockout) | spec §9.2 | ❌ |
| Admin endpoints require owner/admin role JWT | spec §9.2 | ❌ |
| household_id scoping on every sqlc query | CLAUDE.md | ❌ (no queries exist) |
| No telemetry / no external requests (self-hosted) | spec §9.3 | ✅ (trivially — app makes no network calls) |
| Account deletion cascade (GDPR-style) | spec §9.3 | ❌ |
| Server secret key management | spec §9.4 | ❌ |
| Docker image runs as non-root | spec §9.4 | ❌ |
| govulncheck in CI | spec §9.4, qa-plan.md §3.7 | ❌ |
| Signed Docker images (cosign) | spec §9.4 | ❌ |
| COPPA compliance flow | spec §3.2 | ❌ |
| GDPR consent flow (Cloud) | spec §3.2 | ❌ |

**Critical risk:** Because there is no auth layer, the current frontend hardcodes `household.id = "smith"` (data.ts:137). When a real backend is added, every component must be refactored to use dynamic household-scoped data from JWT context rather than the static TBD object. This is a pervasive refactor across all 30+ screen components.

---

## §8 — Testing Strategy

### Current State

| Test Type | Spec Target | Current Count | Gap |
|---|---|---|---|
| Frontend unit (Vitest) | ≥80% line coverage | 352 tests, 90.85% coverage | ✅ Meets target |
| Backend unit (Go) | 500+ tests, ≥80% coverage | 0 | ❌ |
| Backend integration | 150+ tests | 0 | ❌ |
| Smoke tests | 30+ | 0 | ❌ |
| E2E (Playwright) | 20+ scenarios × 3 viewports | 0 | ❌ |
| Performance (k6) | 10+ load tests | 0 | ❌ |
| Accessibility (axe-core) | Zero violations CI gate | 0 | ❌ |
| Python tests (pytest) | Full suite with testcontainers | 0 | ❌ |
| CalDAV compat matrix | 6 servers (qa-plan.md §9.2) | 0 | ❌ |
| Recipe scraper golden URLs | 20 URLs (qa-plan.md §9.3) | 0 | ❌ |
| COPPA compliance tests | qa-plan.md §10.1 | 0 | ❌ |
| GDPR data privacy tests | qa-plan.md §10.2 | 0 | ❌ |

### Missing Test Infrastructure

The following testing libraries are not installed (package.json) and must be added:
- Playwright (`@playwright/test`) — E2E tests (qa-plan.md §3.4)
- `@axe-core/playwright` — accessibility CI gate (qa-plan.md §3.6)
- MSW (Mock Service Worker) — API mocking for frontend tests (spec §10.3)

The following cannot exist until the backend is written:
- testcontainers-go (real Postgres for integration tests)
- go-vcr (VCR cassette recording for Google/Outlook API)
- testify (Go assertion library)
- golangci-lint (static analysis)
- pytest + testcontainers-python (Python service tests)
- vcrpy (Python VCR for CalDAV/recipe scraper)

### Release Gate Checklist (qa-plan.md §4.2) — Current Pass/Fail

| Gate | Required | Current |
|---|---|---|
| All CI checks green | ✅ Required | ⚠ Unknown (no GitHub Actions confirmed) |
| Coverage ≥80% backend | ✅ Required | ❌ No backend |
| Coverage ≥80% line / ≥75% branch frontend | ✅ Required | ✅ 90.85% line (branch unconfirmed) |
| No P0/P1 bugs | ✅ Required | N/A (not in production) |
| Performance benchmarks within targets | ✅ Required | ❌ Not measured |
| Lighthouse score ≥90 all viewports | ✅ Required | ❌ Not measured |
| axe-core zero violations | ✅ Required | ❌ Not installed |
| DB migration tested (fresh + upgrade) | ✅ Required | ❌ No migrations |
| Docker image builds on amd64 + arm64 | ✅ Required | ❌ No Dockerfile |
| Lambda deployment tested on staging | ✅ Required | ❌ No Lambda |
| CHANGELOG.md updated | ✅ Required | ❌ Not present |
| Documentation updated | ✅ Required | ❌ No docs/ |

**Current release gate status: 1 of 12 items passing (frontend coverage only).**

---

## §9 — Project Structure (§11)

The spec defines a canonical project layout (spec.md §11 / CLAUDE.md). Reality:

```
tidyboard/                             # repo root
├── specs/                             # ✅ exists
└── web/                               # ✅ exists (Next.js frontend)
    ├── src/
    │   ├── app/           (routes)    # ✅ extensive
    │   ├── components/                # ✅ extensive
    │   └── lib/data.ts, tokens.ts    # ✅ design data
    └── package.json                   # ✅ frontend only

MISSING (entirely absent):
├── go.mod                             # ❌
├── go.sum                             # ❌
├── Makefile                           # ❌
├── Dockerfile                         # ❌
├── docker-compose.yml                 # ❌
├── config.example.yaml                # ❌
├── migrations/                        # ❌ (19 SQL files needed)
├── cmd/server/                        # ❌
├── cmd/lambda/                        # ❌ (16 entry points)
├── internal/                          # ❌ (config, model, query, handler, service, sync, middleware, broadcast, testutil)
├── sql/queries/                       # ❌ (18 .sql files)
├── tests/smoke/                       # ❌
├── services/sync-worker/              # ❌ (Python)
├── services/recipe-scraper/           # ❌ (Python)
├── desktop/                           # ❌ (Electron app)
├── plugins/                           # ❌ (weather, clock, photo-frame)
└── docs/                              # ❌ (setup.md, api.md, self-hosting.md, contributing.md)
```

**The backend is 100% absent.** Zero Go source files. Zero Python source files. Zero SQL files. Zero Docker configuration.

---

## §10 — Business / Monetization (§12)

**Status: ❌ Nothing implemented.**

| Business Component | Spec Reference | Status |
|---|---|---|
| Stripe Checkout session creation | spec §12.2 | ❌ |
| Stripe Billing (subscription management) | spec §12.2 | ❌ |
| Stripe Customer Portal | spec §12.2 | ❌ |
| Stripe Webhooks (invoice.paid, subscription.updated) | spec §12.2 | ❌ |
| Entitlement engine (member limits, storage quotas) | spec §12.2 | ❌ |
| Subscription data model | spec §12.2 (Subscription entity) | ❌ |
| Free tier limits (4 members, 2 calendar syncs, 500MB) | spec §12.2 | ❌ |
| Family tier ($4.99/mo) | spec §12.2 | ❌ |
| Family+ tier ($8.99/mo) | spec §12.2 | ❌ |
| Extended tier ($14.99/mo, 3 households) | spec §12.2 | ❌ |
| BYOK AI cost structure (users pay own keys) | spec §6.11, §12.1 | ❌ |
| Private cloud billing repo (tidyboard-cloud) | spec §12.2, §3.2 | ❌ |
| AGPL boundary enforcement | spec §3.2 | ❌ |

**Frontend note:** `web/src/components/ui/stripe-placeholder.tsx` exists as a UI placeholder stub. It is a display-only component with no Stripe.js integration.

**Legal prerequisites before Cloud launch (spec §3.2, marketing-plan.md §11):**
- LLC or business entity registration
- UC Davis IP agreement review
- Terms of Service
- Privacy Policy (must address child COPPA data)
- Cookie Policy
- DPA (for EU users)
- COPPA compliance implementation
- Stripe account with verified business entity
- SES production access (currently sandbox)

---

## §11 — Implementation Plan Sprint Mapping

Based on implementation-plan.md §2:

| Sprint | Goal | Target | Actual Progress |
|---|---|---|---|
| Sprint 0 (Week 1) | Go skeleton, DB, auth, CI | 15.5 hours of tasks | **0%** — no Go code exists |
| Sprint 0.5 (Weeks 1-2, parallel) | All UI designs | 18.5 hours of tasks | **~90%** — all screens designed and implemented; Storybook stories missing |
| Sprint 1 (Weeks 2-3) | Calendar CRUD + Google sync | 30 hours of tasks | **0%** |
| Sprint 2 (Weeks 4-5) | Lists, routines, kiosk, PIN auth | 28 hours of tasks | **0%** |
| Sprint 3 (Weeks 6-7) | Python services, CalDAV, recipes | 36 hours of tasks | **0%** |
| Sprint 4 (Weeks 8-9) | Polish, billing, Lambda deploy, PWA | 35 hours of tasks | **0%** |
| Sprint 5 (Week 10) | Launch | 11 hours of tasks | **0%** |

**Estimated remaining effort to v0.1:** approximately 145 engineering hours across the backend, CI pipeline, and integration work, based on the implementation plan's own estimates. This does not count debugging, iteration, or unexpected complexity in CalDAV compatibility.

**Where we actually are:** The equivalent of having beautifully designed store shelves with perfect product displays — but no inventory management system, no cash register, and no loading dock.

---

## §12 — QA Plan & Acceptance Criteria

Every ship-gate from qa-plan.md §4.2:

| Gate | Description | Pass? |
|---|---|---|
| G1 | All CI checks green (lint, typecheck, unit, integration, smoke, E2E) | ❌ No CI pipeline confirmed; no backend tests; no E2E |
| G2 | Coverage ≥80% backend, ≥80% line / ≥75% branch frontend | ❌ Backend: 0%. Frontend: 90.85% line (branch unverified) |
| G3 | No P0 or P1 bugs in the milestone | N/A |
| G4 | Performance benchmarks within targets | ❌ No benchmarks run |
| G5 | Lighthouse score ≥90 on all three viewports | ❌ Not measured |
| G6 | axe-core: zero accessibility violations | ❌ Not installed |
| G7 | DB migration tested: fresh install + upgrade from previous version | ❌ No migrations |
| G8 | Docker image builds and runs on amd64 and arm64 | ❌ No Dockerfile |
| G9 | Lambda deployment tested on staging environment | ❌ No Lambda |
| G10 | CHANGELOG.md updated | ❌ Missing |
| G11 | Documentation updated for new features | ❌ No docs/ directory |

**Onboarding QA (qa-plan.md §11):** The wizard must be completable in <60 seconds on all viewports and must be able to resume if interrupted. Currently: the wizard is a static display — "Get Started" navigates to a preview page, not to the next step. No actual flow works.

---

## §13 — Marketing

| Marketing Item | Status |
|---|---|
| Marketing site (tidyboard.dev) — Hugo or Astro static site | ❌ Does not exist |
| Landing page with "Open Source Family Dashboard" h1 | ❌ |
| /compare/hearth comparison page | ❌ |
| /compare/skylight comparison page | ❌ |
| /docs/ documentation hub | ❌ |
| /pricing page | ❌ |
| /download page | ❌ |
| Blog (/blog/) | ❌ |
| XML sitemap submitted to Google Search Console | ❌ |
| Demo video (60-second install → kiosk) | ❌ |
| Product Hunt submission draft | ❌ |
| GitHub repository (public, polished README) | ❌ Not confirmed public |
| Hacker News "Show HN" post draft | ❌ |
| r/selfhosted post draft | ❌ |
| Google Search Console setup | ❌ |
| Plausible Analytics (self-hosted) | ❌ |
| "Coming soon" page with email signup | ❌ |
| Pre-launch legal checklist complete | ❌ |
| OG/Twitter metadata in app | ✅ web/src/app/layout.tsx |
| robots.ts, sitemap.ts in app | ✅ web/src/app/ |

The web/ app has good SEO metadata scaffolding from Next.js conventions, but the marketing site is a distinct property (marketing-plan.md §4.2) that does not yet exist.

---

## §14 — Prioritized "To Ship v0.1" Punch List

Items derived from spec §14 MVP scope and sprint plan. Ordered by dependency chain.

### (S) < 1 day

- **S1:** Register domains tidyboard.dev and tidyboard.cloud (marketing-plan.md §5.1; pre-implementation-plan.md §3)
- **S2:** Check UC Davis IP agreement for side project clearance (spec §3.2; implementation-plan.md §3)
- **S3:** Create public GitHub repository (implementation-plan.md §3)
- **S4:** Initialize Go module (`go mod init github.com/tidyboard/tidyboard`) and basic project layout per CLAUDE.md
- **S5:** Create `config.example.yaml` from spec §4.6 config struct
- **S6:** Add `docker-compose.yml` (Postgres 16 + Redis 7 + Go server placeholder) per spec §3.1
- **S7:** Add GitHub Actions CI workflow: lint + frontend unit tests (spec §10.11)
- **S8:** Add Playwright to `web/package.json` and write first E2E smoke test (spec §10.9, qa-plan.md §3.4)
- **S9:** Add `@axe-core/playwright` and configure zero-violations CI gate (qa-plan.md §3.6)
- **S10:** Add MSW to web for API mocking in frontend tests (spec §10.3)
- **S11:** Install `react-i18next` and extract all hardcoded English strings into en.json (spec §6.14)
- **S12:** Install `dnd-kit` for drag-and-drop in lists and meal plan (spec §6.3; package.json missing)
- **S13:** Install `canvas-confetti` for completion animations (design-system.md §4.2; package.json missing)
- **S14:** Create `CHANGELOG.md` (qa-plan.md §4.2 gate G10)
- **S15:** Create `docs/` directory with `setup.md`, `contributing.md`, `self-hosting.md` stubs (qa-plan.md §4.2 gate G11)

### (M) 1–3 days

- **M1:** Go: Kong config struct + all sub-configs (`ServerConfig`, `DatabaseConfig`, `RedisConfig`, `AuthConfig`, etc.) per spec §4.6 — this is the foundation every other Go component depends on (CLAUDE.md; spec §4.6)
- **M2:** Go: 19 goose SQL migrations matching the spec §5 data model — all tables, indexes, household_id foreign keys (spec §11, migrations list)
- **M3:** Go: sqlc setup + queries for Account, Household, Member tables (CLAUDE.md; spec §11)
- **M4:** Go: JWT auth middleware + PIN auth handler (spec §9.1; spec §6.8.7; implementation-plan.md Sprint 0)
- **M5:** Go: Health endpoint + chi router with all route mounts (spec §7.1 `cmd/server/main.go` skeleton)
- **M6:** Go: Household CRUD handlers + member management endpoints (spec §7.2)
- **M7:** Go: Email-based invitation flow + invite code flow (spec §6.8.3; spec §7.2)
- **M8:** Go: Google Calendar OAuth flow + sync adapter scaffolding (spec §6.1 sync; spec §8.1)
- **M9:** Go: Event CRUD handlers + RRULE expansion with `teambington/rrule-go` (spec §6.1; spec §7.2)
- **M10:** Go: WebSocket hub (gorilla/websocket for self-hosted) + broadcast on mutations (spec §7.3; spec §8.2)
- **M11:** Go: Audit log service — log all mutations (spec §6.16)
- **M12:** Frontend: Replace all hardcoded `TBD` data with TanStack Query hooks fetching from real API (requires M5+M6 to be done first); install TanStack Query (spec §4.2; package.json missing)
- **M13:** Frontend: Install Zustand and create global store for active household, member, UI prefs (spec §4.2; package.json missing)
- **M14:** Frontend: Wire onboarding wizard steps to real API calls (register, create household, add member, connect Google Calendar) (spec §3.3; qa-plan.md §11)
- **M15:** Frontend: Wire PIN entry on lock screen to `/api/auth/pin` endpoint (spec §6.8.7)

### (L) 1–2 weeks

- **L1:** Go: List and ListItem CRUD + star rewards on completion (spec §6.3; spec §6.5.1; Sprint 2)
- **L2:** Go: Routine CRUD + completion logging + streak calculation (spec §6.2; Sprint 2)
- **L3:** Go: Recipe CRUD + meal plan CRUD + shopping list generation from meal plan (spec §6.4; Sprint 3)
- **L4:** Go: Rate limiting middleware (auth: 5/min, API: 120/min, gamification: 30/min) with Redis (spec §9.2; config.example.yaml rate_limiting section)
- **L5:** Go: Backup/restore system using `pg_dump` + configurable destinations (spec §6.19; Sprint 4)
- **L6:** Go: Maintenance mode (CLI + API + WebSocket broadcast) (spec §6.18; Sprint 4)
- **L7:** Go: Data export ZIP endpoint (spec §6.15; Sprint 4)
- **L8:** Go: Admin audit log endpoint with filtering (spec §6.16; spec §7.2)
- **L9:** Go: Conflict detection logic for overlapping events (spec §6.1; Sprint 1)
- **L10:** Frontend: Offline resilience — install Dexie.js, implement IndexedDB cache and mutation queue (spec §6.21; spec §8.2; package.json missing)
- **L11:** Frontend: Dark mode — replace separate preview routes with a single unified theme provider switching on `prefers-color-scheme` or user preference (design-system.md §1, §5; settings page already has toggle)
- **L12:** Frontend: Serving scaler logic in recipe detail (ingredient amounts recalculate proportionally) (spec §6.4.1)
- **L13:** Frontend: Wire all interactive elements to real API (event CRUD modals, list item check-off, routine step completion, race participation) — requires L1, L2, L3
- **L14:** Frontend: i18n wiring — extract all strings, configure language bundles, add German translations (spec §6.14; qa-plan.md launch requirement)
- **L15:** Go + CI: Full GitHub Actions pipeline matching spec §10.11 (lint, unit, integration with testcontainers, smoke, E2E)

### (XL) Weeks of effort

- **XL1:** Go: Full gamification engine — races with WebSocket real-time progress, leaderboard snapshots, achievement badge system, anti-abuse cooldowns (spec §6.5; spec §6.17; Sprint 2 + deferred to v0.2 per §14 but partially in v0.1 star rewards)
- **XL2:** Python: `services/sync-worker/` — CalDAV sync service with `python-caldav`, VCR test cassettes for 6 server types, DST edge cases (spec §3.1; spec §8.1; qa-plan.md §9.2) — this is the highest-risk item
- **XL3:** Python: `services/recipe-scraper/` — recipe-scrapers library integration, ingredient normalization, image downloader, IngredientCanonical seed data (~500 ingredients) (spec §6.4.1; spec §3.1; qa-plan.md §9.3)
- **XL4:** AWS CDK infrastructure — VPC, Aurora Serverless v2, RDS Proxy, ElastiCache Redis, API Gateway HTTP + WebSocket, Lambda function definitions, EventBridge schedules, CloudFront + WAF, SES, Secrets Manager, CloudWatch dashboards (spec §12.3; Sprint 4) — requires private tidyboard-cloud repo
- **XL5:** Stripe billing integration — Checkout, Billing, Customer Portal, webhooks, entitlement engine (spec §12.2; Sprint 4) — requires LLC/business entity first
- **XL6:** Household equity engine — TaskDomain CRUD, DomainOwnership with history, TimeEntry CRUD (timer/manual/auto-estimate), cognitive vs. physical distinction, equity dashboard API (spec §6.6; deferred to v0.2 per §14 but UI is already built)
- **XL7:** Go: Household equity time tracking backend + equity summary/trends/rebalance suggestion API (spec §6.6.6)
- **XL8:** Marketing site (tidyboard.dev) — separate Astro/Hugo static site with homepage, /compare/hearth, /compare/skylight, /pricing, /docs/quickstart, /blog (marketing-plan.md §3-4; Sprint 5)

---

## §15 — Recommended Immediate Next Moves (Top 10)

The following are ordered by impact × unblocked-ness. Items that unblock many others come first.

**1. Start Sprint 0: Go module and config struct (S4 + M1)**
Nothing can proceed without this. Run `go mod init github.com/tidyboard/tidyboard`, create `internal/config/config.go` matching the Kong struct in spec §4.6 exactly. This is the foundation every other Go component attaches to. Estimated: 2 hours.

**2. Write the 19 goose SQL migrations (M2)**
The schema is completely specified in spec §5. Converting it to goose SQL files is mechanical work with high value — it defines the entire data contract. Once migrations exist, `testutil.SetupTestDB` can be implemented and integration tests can run. Estimated: 4 hours.

**3. Add Docker Compose with Postgres + Redis (S6)**
Unblocks all local backend development. Spec §3.1 gives the exact docker-compose.yml. Without this, no developer can run the backend locally. Estimated: 1 hour.

**4. Implement JWT auth + PIN auth (M4)**
This is the first API capability real users need. It also unblocks the frontend from being able to authenticate any request. Auth is the prerequisite for every other handler. Estimated: 3-4 hours.

**5. Implement Household + Member CRUD endpoints (M6)**
The onboarding flow (which is already designed and beautiful) becomes functional the moment a user can register an account, create a household, and add members. This is the "moment of value" flow. Estimated: 4-6 hours.

**6. Install TanStack Query + Zustand and create API client in web/ (M12 + M13)**
The frontend is 100% static. Installing TanStack Query and Zustand and creating a typed API client (even if most calls return mock data initially via MSW) transforms the frontend from a design prototype into an app architecture. This must happen in parallel with backend work. Estimated: 1-2 hours.

**7. Wire the onboarding wizard to real API calls (M14)**
The onboarding is the most important UX flow. Once auth + household + member endpoints exist (moves 4 + 5), wiring the 7 onboarding steps to real API calls makes Tidyboard usable by a real family for the first time. Estimated: 1-2 days.

**8. Set up GitHub Actions CI with lint + frontend + integration tests (L15 partial)**
CI is the safety net that prevents regressions as the team moves fast. Start with: lint (golangci-lint) + Go unit tests + Vitest frontend tests. Add integration tests once testcontainers-go is set up. This also serves as the public-facing quality signal for the open-source project. Estimated: 2-4 hours.

**9. Install axe-core and run the first accessibility audit (S9)**
The frontend is already built. Running axe-core against it now will surface real WCAG violations that are cheap to fix before they become embedded in architecture. The qa-plan's zero-violations CI gate should be established early, not retrofitted. Estimated: 2-4 hours.

**10. Implement Event CRUD + iCal URL import + Google Calendar OAuth (M8 + M9)**
Calendar is the core value proposition. A family will not adopt a family dashboard if their real calendar isn't in it. Google Calendar OAuth is specifically called out in spec §14 as a v0.1 requirement. RRULE expansion with `teambington/rrule-go` needs a comprehensive test suite before any feature depends on it (spec §15, item 8). Estimated: 1 week including VCR cassettes.

---

*Total citations in this report: 157 (spec file:line references across tidyboard-spec.md, tidyboard-claude-design-brief.md, tidyboard-design-system.md, tidyboard-qa-plan.md, tidyboard-implementation-plan.md, tidyboard-marketing-plan.md, specs/CLAUDE.md, and web/src/* implementation files)*

*Files audited: 120+ source files across web/src/ plus all 7 specification documents*
