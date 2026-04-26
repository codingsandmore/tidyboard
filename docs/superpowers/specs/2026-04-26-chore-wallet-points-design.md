# Chore Wallet + Behavior Points Design

**Date:** 2026-04-26
**Author:** Brainstorm with Claude Opus 4.7 + user
**Status:** Spec — implementation plan to follow

---

## 1. Overview

A pocket-money administration system + a behavior-points / rewards system for kids in a Tidyboard household. Two separate ledgers that share the same `members`, `accounts`, and `households` infrastructure. Closes the largest spec gap vs. Hearth Display (kid gamification + rewards loop).

**Problem:** kids in the family need a clear way to see what they've earned for chores, parents need a low-friction way to track allowance + bonus pay, and the family needs a behavior-reinforcement loop with redeemable rewards. Today this is done with sticky notes and Venmo memos.

**Goal:** real, working money + points + rewards system live on tidyboard.org with kid-facing screens that match the existing TB design language and parent-facing admin that doesn't require a daily ritual.

---

## 2. Architectural decisions

| # | Decision | Choice |
|---|---|---|
| 1 | Money + points are **two separate ledgers**, not one | Separate |
| 2 | Chore allowance is **parent-weighted auto-split**: per-instance = `(allowance × weight) ÷ Σ(weight × frequency)` | Weighted |
| 3 | **Hybrid verification:** routine chores trust-mode (auto-credit), ad-hoc tasks + tips need parent approval. `auto_approve` flag on chore. | Hybrid |
| 4 | **Streak bonus** (+10% on a chore's weekly total when 100% completed). Not penalty, not carry-over. | Streak |
| 5 | Wallet is **pure ledger + parent "Cash out" button** that records a payout transaction. Tidyboard never moves real money. | Ledger |
| 6 | Points have **multi-category breakdown** (household-defined: Kindness / Effort / Responsibility / Listening). Single point pool internally; per-category sums derived. | Multi-cat |
| 7 | Reward redemption is **hybrid by reward type** (`fulfillment_kind=self_serve` or `needs_approval`). Savings goals are soft earmarks (UI progress only). | Hybrid |
| 8 | **Reward cost adjustments** are a separate negative mechanic from point penalties — they raise a *specific* reward's cost for a *specific* kid without touching balance. Visible on a per-kid timeline. | Adjustment |

**Explicitly out of scope (YAGNI):** real banking integration, multi-currency, tax docs, nested chore dependencies, point trading between kids, negative-balance overdrafts, AI-suggested chore weights, parent-side mobile push notifications (use existing ntfy), point-trading between siblings.

---

## 3. Data model

All amounts in smallest unit (cents for money, integer for points). All ledger writes wrap balance update + transaction insert in one DB transaction.

### 3.1 Wallet system (System A)

| Table | Columns of note |
|---|---|
| `chores` | id · household_id · member_id (assignee) · name · weight (1–5) · frequency_kind (`daily` \| `weekdays` \| `specific_days` \| `weekly`) · days_of_week (bitmask, used when frequency_kind=specific_days) · auto_approve bool · archived_at nullable |
| `chore_completions` | id · chore_id · member_id · date (the day it was *for*, not when marked) · marked_at · approved bool · approved_by_account_id nullable · payout_cents (set at insert time using the formula in 3.4) · closed bool (set true at week-end batch — immutable after) — UNIQUE(chore_id, date) |
| `wallets` | id · member_id (UNIQUE) · balance_cents · updated_at — cached balance for fast reads; recomputed nightly to detect drift |
| `wallet_transactions` | id · wallet_id · member_id · amount_cents (signed) · kind (`chore_payout`, `streak_bonus`, `tip`, `ad_hoc`, `cash_out`, `adjustment`) · reference_id (FK to source row, nullable) · reason text · created_by_account_id · created_at |
| `allowance_settings` | household_id · member_id · amount_cents · active_from |
| `weekly_summaries` | id · household_id · member_id · week_start (date) · earned_cents · streak_bonus_cents · chores_completed · chores_possible · created_at — written by the week-end batch for parent review and historical reporting |

Household-level settings live on the existing `households.settings` JSON blob: `week_starts_on` ("sun" \| "mon", default "sun") applies to chore weeks for *all* members in that household.
| `ad_hoc_tasks` | id · household_id · member_id · name · payout_cents · requires_approval bool (default true) · status (`open`, `pending`, `approved`, `declined`) · created_by_account_id · completed_at nullable · approved_at nullable · approved_by_account_id nullable · expires_at nullable · decline_reason text |

### 3.2 Points / Rewards system (System B)

| Table | Columns of note |
|---|---|
| `point_categories` | id · household_id · name · color · sort_order · archived_at nullable (soft-delete preserves history) |
| `behaviors` | id · household_id · name · category_id · suggested_points (default value when granting) · archived_at nullable |
| `point_grants` | id · household_id · member_id · category_id (denormalized for speed; nullable for redemptions) · behavior_id nullable · points (signed) · reason text · granted_by_account_id · granted_at |
| `rewards` | id · household_id · name · description · image_url nullable · cost_points · fulfillment_kind (`self_serve` \| `needs_approval`) · active bool · created_by_account_id |
| `redemptions` | id · reward_id · member_id · points_at_redemption (snapshot of effective cost) · status (`pending` \| `approved` \| `fulfilled` \| `declined`) · requested_at · decided_at nullable · decided_by_account_id nullable · decline_reason text |
| `savings_goals` | id · member_id (UNIQUE — one active at a time) · reward_id · started_at · cleared_at nullable |
| `reward_cost_adjustments` | id · household_id · member_id · reward_id · delta_points (signed) · reason text · expires_at nullable · created_by_account_id · created_at |

**Effective cost formula:**
```
effective_cost(member, reward) = reward.cost_points
  + Σ(delta_points from reward_cost_adjustments
      where member_id == member AND reward_id == reward
      AND (expires_at IS NULL OR expires_at > now()))
```

### 3.3 Reuses

`members` (assignee + recipient), `accounts` (parent who granted/approved), `households` (scoping), existing `AuditService`, existing WebSocket `Broadcaster`, `robfig/cron` for week-end batch.

---

## 4. API surface

All routes scoped by household via existing JWT middleware. Adult role required for create/update/delete of definitions; kids can mark their own completions + see own balance + scoreboard.

### 4.1 Wallet system (`/v1/...`)
```
GET    /v1/chores                          list (filter member_id, active)
POST   /v1/chores                          create  (admin)
PATCH  /v1/chores/{id}                     update  (admin)
DELETE /v1/chores/{id}                     archive (admin)
POST   /v1/chores/{id}/complete            kid: ?date=YYYY-MM-DD (default today)
DELETE /v1/chores/{id}/complete/{date}     kid: undo (within 24h grace)
GET    /v1/chores/completions              ?from=&to=&member_id= for calendar feed

POST   /v1/ad-hoc-tasks                    admin: create
POST   /v1/ad-hoc-tasks/{id}/complete      kid: mark done (always pending)
POST   /v1/ad-hoc-tasks/{id}/approve       admin
POST   /v1/ad-hoc-tasks/{id}/decline       admin (with reason)

GET    /v1/wallet/{member_id}              balance + recent transactions (paged)
GET    /v1/wallet/{member_id}/week         per-chore expected vs earned, streak bonuses, total
POST   /v1/wallet/{member_id}/tip          admin: { amount_cents, reason }
POST   /v1/wallet/{member_id}/cash-out     admin: { amount_cents, method?, note? }
POST   /v1/wallet/{member_id}/adjust       admin: { amount_cents, reason } — arbitrary ±

GET    /v1/allowance                       list per-kid weekly amounts
PUT    /v1/allowance/{member_id}           admin: set/change (creates new active_from row)
```

### 4.2 Points system (`/v1/...`)
```
GET/POST/PATCH/DELETE /v1/point-categories
GET/POST/PATCH/DELETE /v1/behaviors

POST   /v1/points/{member_id}/grant        admin: { behavior_id?, points, reason }
POST   /v1/points/{member_id}/adjust       admin: { points, reason } — arbitrary ±
GET    /v1/points/{member_id}              total + per-category + recent grants
GET    /v1/points/scoreboard               all kids: total + per-category, sorted desc

GET/POST/PATCH/DELETE /v1/rewards          catalog (rewards.active filter)

POST   /v1/rewards/{id}/redeem             kid: triggers self-serve OR creates pending request
POST   /v1/redemptions/{id}/approve        admin
POST   /v1/redemptions/{id}/decline        admin (with reason)
POST   /v1/redemptions/{id}/fulfill        admin: "I've delivered the reward"
GET    /v1/redemptions                     ?status=&member_id= history

PUT    /v1/savings-goals/{member_id}       kid: set/clear "I'm saving for reward X"

POST   /v1/rewards/{id}/cost-adjust        admin: { member_id, delta_points, reason, expires_at? }
DELETE /v1/reward-adjustments/{id}         admin: forgive / revoke
GET    /v1/timeline/{member_id}            ?reward_id=&limit=&before= chronological events
```

### 4.3 WebSocket events
Existing broadcaster; new event types:
- `chore.completed`, `chore.uncompleted`, `chore.payout` (week-end batch)
- `wallet.transaction` (any kind)
- `points.granted`, `points.adjusted`
- `redemption.requested`, `redemption.decided`, `redemption.fulfilled`
- `reward.cost_adjusted`
- `timeline.event` (covers all of the above as a unified stream for the timeline UI)

---

## 5. Frontend pages & screens

Mounted in existing nav. Uses TB tokens + member colors throughout. Dark mode supported via existing `dark` prop pattern.

### 5.1 Kid-facing routes

| Route | Component | Content |
|---|---|---|
| `/wallet` | `WalletKid` | Big balance in member color · weekly progress ring (earned/max possible) · today's chores as tappable cards · "earned $0.30" toast on tap · weekly graph · streak indicators |
| `/chores` | `ChoresKid` | Calendar week view: 7 columns × N chore rows · tappable check per cell · 100%-complete chores glow in member color |
| `/rewards` | `RewardsKid` | Catalog grid (image + name + cost) · progress ring if "saving for" · Redeem (self-serve) or Request (needs-approval) modal |
| `/scoreboard` | `Scoreboard` | Tablet/kiosk view: kids ranked by total · per-category bars · 1st place crown + member-color glow · live via WebSocket · "this week / month / all time" toggle |
| `/timeline/{member_id}` | `Timeline` | Vertical scrolling timeline · color-coded event cards (green grant / red penalty / orange cost adjustment / purple redemption / gold chore payout / blue tip) · filter chips · monthly grouping · live updates |

### 5.2 Parent-facing admin routes

| Route | Component | Content |
|---|---|---|
| `/admin/wallets` | `WalletsAdmin` | Per-kid card: balance · YTD paid out · "Cash out" button · recent transactions |
| `/admin/wallets/{id}` | `WalletDetail` | Full ledger paginated · edit allowance · assign/edit chores (drag-and-drop weight slider) · one-tap "Tip $X" · approve/decline pending |
| `/admin/chores` | `ChoresAdmin` | Library of chore templates per kid · grid view · weight slider 1–5 · frequency picker · auto-approve toggle · assignee |
| `/admin/ad-hoc` | `AdHocAdmin` | Quick-assign form: kid · name · $ · expires_at · pending approvals at top |
| `/admin/points` | `PointsAdmin` | Tabs: Behaviors (templates: name + category + suggested_points) and Categories (CRUD with color picker) |
| `/admin/points/award` | `QuickAward` | Member tile → category → behavior → "Give 5 pts" one tap · last-used default for fast bursts. Also a kiosk-dashboard widget. |
| `/admin/rewards` | `RewardsAdmin` | Catalog CRUD: name · description · image upload · cost · fulfillment_kind · active toggle · pending redemptions queue |

### 5.3 Dashboard widgets

Added to existing kiosk + desktop dashboards:
- "Today's chores" widget per kid (large tap targets, member-color theming)
- "Scoreboard" widget (top 3 kids with category bars)
- "Pending approvals" badge on parent dashboard (count of redemptions + ad-hoc tasks awaiting decision)

### 5.4 Nav integration

- Kid bottom-nav adds: `Wallet`, `Rewards`, `Scoreboard` (rotates with current items per viewport)
- Parent settings adds: `Admin → Kids` section linking to all admin routes

### 5.5 Shared UI primitives (`web/src/components/ui/`)

- `MoneyDisplay` — cents → "$X.XX", member-color tinted
- `PointsBadge` — per-category color + value
- `StreakIndicator` — flame icon + count, animated when 100%
- `RewardCard` — image + cost + progress ring (uses effective_cost not raw cost when in member context)

### 5.6 Design language

- Kid views: oversized tap targets (≥56px per design system), bright member colors, emoji-forward, celebratory micro-animations on every check-off (canvas-confetti already in package.json — finally a reason)
- Admin views: dense tables, member-color avatars, audit-log-friendly (every change shows who/when)
- Timeline cards: connector line down the middle in member color; cards with member-color stripe down the left edge; fade-in on new events; expired adjustments grey out and dim

---

## 6. Key flows

### 6.1 Daily chore mark-done (auto-approve path)

```
Kid taps "✓ feed dog" on /chores
  → POST /v1/chores/{id}/complete?date=YYYY-MM-DD
  → server checks chore.assignee == caller.member_id (or caller is admin)
  → compute per_instance_cents = (allowance × weight) ÷ Σ(weight × frequency)
       for this kid's active chores this week
  → INSERT chore_completions { approved=true, payout_cents=per_instance_cents }
  → INSERT wallet_transactions { kind=chore_payout, amount=per_instance_cents, ref=completion_id }
  → wallet.balance_cents += per_instance_cents (atomic, in same tx)
  → publish chore.completed + wallet.transaction events
  → optimistic UI confetti
```

Idempotency: re-tapping same `(chore_id, date)` is a no-op (UNIQUE index). Undo (DELETE) within 24h reverses both rows in one transaction.

### 6.2 Ad-hoc task → approval gate

```
Admin creates ad_hoc_task → kid sees "New task: clean pool filter (+$1)"
Kid taps "Mark done" → status=pending, NO wallet credit yet
Admin sees pending in /admin/wallets — taps Approve
  → wallet_transactions { kind=ad_hoc, amount=+100, reason }
  → balance updated, kid sees toast
Decline → status=declined, written reason shown to kid
```

Tips are similar but skip the pending state — parent acts intentionally, no kid action involved.

### 6.3 Week-end batch (cron, Sundays 23:59 household-local time, day-of-week governed by `households.settings.week_starts_on`)

Per-kid payouts have already been written to `wallet_transactions` as completions came in (see 6.1). The batch only handles week-close + streak bonuses + reporting:

1. Walk this week's `chore_completions`, group by chore
2. For each chore where `count(completed) == frequency`: write one `wallet_transactions { kind=streak_bonus, amount=round(0.10 × Σ(payout_cents for this chore this week)), reason="100% streak: <chore name>" }` and credit the wallet
3. Set `closed=true` on all of this week's `chore_completions` (immutable after this — no late edits)
4. Insert a `weekly_summaries` row for parent review (used by `/v1/wallet/{member_id}/week` and the parent dashboard)

### 6.4 Reward redemption — self-serve

```
Kid taps "Redeem stickers" (fulfillment_kind=self_serve)
  → effective_cost = reward.cost_points + Σ(active reward_cost_adjustments)
  → if balance < effective_cost: 409 Conflict, kid sees "you need N more pts"
  → else INSERT redemption { status=approved, points_at_redemption=effective_cost }
       INSERT point_grants { points = -effective_cost, reason="Redeemed: stickers", behavior_id=null }
  → balance updated, parent sees "Sarah redeemed stickers — please deliver"
  → admin clicks Fulfilled when done → status=fulfilled
```

### 6.5 Reward redemption — needs-approval

```
Kid taps "Request Xbox game" → INSERT redemption { status=pending, points_at_redemption=current_effective_cost }
  → NO points deducted yet
  → parent sees pending request
Approve → write the negative point_grants row + status=approved + decided_at
Decline → status=declined + decline_reason; nothing deducted
Fulfilled later → status=fulfilled
```

**Edge case:** kid's effective cost goes UP between request and approval (parent adjusts cost, or kid spent points elsewhere). On approve, server compares balance against `points_at_redemption` snapshot. If balance < snapshot cost, parent sees a warning ("Sarah no longer has enough — proceed anyway? cancel? counter-offer?").

### 6.6 Reward cost adjustment lands while a savings goal is active

```
Admin creates reward_cost_adjustments { member, reward, delta=+50, reason="hit at school" }
  → effective_cost recomputed lazily on every read
  → savings_goal progress ring re-renders (slides backward visually with animation)
  → timeline event card pushed via WebSocket
  → kid sees the orange card appear with the reason
```

No mutation to `point_grants` — balance unchanged. Pure goalpost shift.

### 6.7 Cash-out → parent settles

```
Admin clicks "Pay Sarah $42.30" → POST /v1/wallet/{id}/cash-out
  → INSERT wallet_transactions { kind=cash_out, amount=-4230, method, note }
  → balance -= 4230
  → audit log row
  → kid sees a blue "Paid out by Mom · $42.30" timeline card
```

Partial cash-outs allowed.

### 6.8 Category rename / delete safety

- Renaming = `UPDATE point_categories.name`. Historical grants keep their FK.
- Delete = soft-delete (`archived_at`). Old grants still aggregate under the original name in history; the category no longer appears in the Award UI.

### 6.9 Saving-goal switching

A kid can have one active savings_goal at a time. Switching it is a one-tap "Save for ___ instead" — replaces the prior row, keeps history. Doesn't move points; it's purely a UI marker.

### 6.10 Race-safe writes

All ledger writes always wrap balance update + transaction insert in one DB transaction. Reads of balance always sum the ledger as truth (cached `wallets.balance_cents` is just for fast list views — recomputed nightly to detect drift).

---

## 7. Testing strategy

### 7.1 Backend Go unit (`internal/service/...`)

Pure-function service layer, no DB. Most valuable here because the **money math is the bug surface**.

- `wallet_math_test.go` — table-driven: `(allowance, [chores with weight + freq])` → expected per-instance payouts; 0¢ rounding edges, single-chore, mismatched currencies, streak-bonus rounding
- `point_grants_test.go` — signed sums match per-category aggregates after random sequences
- `redemption_test.go` — `effective_cost` vs raw cost across various adjustment combos (incl. expired adjustments)
- `cron_weekly_test.go` — week-end batch: correct streak bonuses, immutable closure, idempotent on re-run
- Race tests with `t.Parallel()` + `-race` for the ledger transaction wrapper

### 7.2 Backend Go integration (`internal/handler/...`, requires `TIDYBOARD_TEST_DSN`)

- Per route, the auth + role checks: kid can only complete *their own* chores, only admin can grant points / cash-out
- Concurrency: 2 simultaneous `POST /complete` for same `(chore, date)` → exactly one row written
- Approval state machine for redemptions: `pending → approved → fulfilled`, no skips, no resurrection from declined
- Soft-deleted category still aggregates historical grants

### 7.3 Frontend Vitest (`web/src/...`)

- `lib/wallet/payout-math.test.ts` — same table-driven cases as Go tests, ported (catches divergence between client preview math and server)
- Hook tests for `useWallet`, `usePoints`, `useScoreboard` — fallback shape, error handling, optimistic update rollback on mutation failure
- Component tests for `WalletKid`, `Scoreboard`, `Timeline` — render with sample fixtures, member-color theming, dark mode, empty state, skeletons

### 7.4 Frontend Playwright e2e (`web/e2e/`, fallback mode)

Three flows end-to-end (hermetic, in CI):

1. **Kid happy path:** PIN sign-in → `/chores` → tap 3 chores → see balance update + confetti + streak bar
2. **Parent admin path:** sign in → `/admin/chores` → create chore → set weight + frequency → set kid allowance → see derived per-instance payout in preview
3. **Redemption path:** kid requests Xbox → parent sees pending → approves → kid sees timeline card + balance drop

### 7.5 Prod e2e (`web/e2e-prod/`) — extend the new suite

Add to `tests/family-flow.spec.ts`:
- Create chore → mark complete → verify wallet transaction row
- Grant points → verify scoreboard endpoint reflects it
- Create reward → kid (PIN session) requests → admin approves → verify redemption flow
- Cost-adjustment → effective_cost on subsequent GET reflects the bump
- All under `[E2E-{timestamp}]` naming + cleanup queue.

### 7.6 Coverage targets

Backend ≥80% line, ≥75% branch on the new packages. Frontend hooks + math helpers ≥90% (high-value, low-cost).

### 7.7 Out of scope

Load tests, fuzz tests, accessibility tests beyond what shipped axe-core covers — punt to a separate quality pass.
