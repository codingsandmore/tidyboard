# Cozyla-Informed Family Hub Design

Source issue: [#72 research cozyla](https://github.com/codingsandmore/tidyboard/issues/72)

Research sources:

- Cozyla Calendar+ 2 product page: https://www.cozyla.com/products/touchscreen-family-calendar-best-digital-calendar
- Cozyla release notes: https://www.cozyla.com/pages/release-notes
- Cozyla portable touch hardware manual: https://support.cozyla.com/hc/en-us/article_attachments/26664654324379
- AutoSpec skill library: https://github.com/berlinguyinca/autospec

## Summary

Cozyla is a useful benchmark for a wall-mounted family command center, but Tidyboard should not clone its cloud-first model. The product direction is a local-first, real-account, kiosk-first family hub that integrates Cozyla's strongest interaction ideas with Tidyboard's current calendar, routines, chores, rewards, meals, recipes, shopping, pantry, notes, helper inbox, and local production goals.

The spec uses the autospec workflow: preserve the master spec, decompose into LLM-sized GitHub issues, add dependency links, route to a project, and require each implementation issue to carry its own acceptance criteria and verification.

## Research Findings

Cozyla Calendar+ 2 positions itself as a shared display for schedules, to-dos, routines, chores, and meal plans. The current product page highlights shared calendar sync, family profiles, member color tags, day/week/month views, chore and routine points, rewards, meal planning, grocery lists, recipe library, pantry management, custom widgets, layout templates, app folders, smart home apps, parental lock, AI, smart import, companion app, notes, sleep mode, and screensaver.

Cozyla's FAQ says it supports Apple, Google, Outlook, CalDAV, and URL calendars with two-way sync, up to eight family profiles, photo-frame screensavers, Google Home/Alexa apps, voice assistants, and streaming/media apps. It also states that Cozyla services are hosted on AWS in the United States.

Cozyla release notes show several important interaction details Tidyboard should use as product references:

- AI voice assistant as a unified entry point across apps and dashboard.
- Batch actions for chores, routines, calendar events, and meal plans.
- Meal categories for breakfast, lunch, dinner, and snack.
- Grocery list grouping by aisle, recipe, or none.
- To-do lists with descriptions, due dates, reminders, assignments, profile view, and list view.
- Reward statuses: available, pending approval, redeemed.
- Calendar widgets that open event details directly.
- Dashboard editing with rearrangeable pages, templates, page-specific wallpapers, and persistent notifications.
- Clock and weather widget with manual location and unit settings.
- QR-code style device setup through a companion app.

The hardware manual confirms a family-display class device shape: 1920x1080, 16:9, 10-point touch, Ethernet, Wi-Fi, Bluetooth, and 90-degree rotation support. Tidyboard local mode should validate the same physical interaction envelope while staying browser/PWA based.

## Product Principles

- Real household data only on production routes.
- Local-first and self-hostable by default.
- Kiosk is the primary interface, not a phone simulation.
- Every glanceable item must open into a real detailed view.
- Empty states teach the family what to add next; they do not invent data.
- AI is optional and must improve workflows without becoming a hard dependency.
- Pets are first-class household profiles for care and schedules, but not wallets or rewards.

## Feature Integration Map

| Cozyla feature | Tidyboard direction |
| --- | --- |
| Shared calendar sync | Keep CalDAV/import sync, add clearer account/calendar ownership and event detail entry from widgets. |
| Family profiles and color tags | Extend real roster model across people and pets with color, avatar, role, and visibility rules. |
| Day/week/month views | Preserve existing calendar routes and add touch-first event detail/edit from every card. |
| Widgets and pages | Add configurable kiosk pages with fixed templates first, then drag/reorder later. |
| Chores, routines, rewards | Unify today's tasks, routines, chores, rewards, and approval states without losing wallet rules. |
| Meal planning and grocery lists | Add meal categories and deterministic shopping generation grouped by aisle or recipe. |
| Recipe library and pantry | Tie recipe import, pantry staples, low-stock reminders, and meal plan gaps together. |
| Smart import | Use optional local Ollama/OCR pipeline for photos and URLs; keep manual creation as fallback. |
| AI voice assistant | Add local text-first command inbox before voice; voice can follow once permissions and device support are clear. |
| Companion app | Use responsive PWA companion flows for phones instead of native app dependency. |
| Screensaver and sleep | Add ambient modes: photo/notes, next events, weather/clock, and quiet hours. |
| Parental lock | Add kiosk lock, app restrictions, adult PIN unlock, and child-safe display rules. |
| Smart home and streaming apps | Defer native app store clone; support shortcuts/links where useful. |

## Target Experience

### First Run

The first-run path is real-account onboarding:

1. Create or sign in to an account.
2. Create household and timezone.
3. Define adults, children, and pets.
4. Choose member colors and avatars.
5. Select a kiosk layout template.
6. Configure local calendar/import providers and optional local AI.
7. Land on the live kiosk dashboard.

No demo family data appears in this flow.

### Kiosk Dashboard

The default kiosk shows a high-density but calm command center:

- Today strip with now/next/later.
- Family member rail with color filters.
- Calendar widget with event detail tap targets.
- Routines/tasks widget with assignee filtering.
- Meals widget with breakfast/lunch/dinner/snack and grocery actions.
- Shopping/pantry widget with active list and low-stock cues.
- Notes/helper inbox widget for approvals and family messages.
- Clock/weather widget with local settings.

The dashboard supports multiple fixed pages before freeform drag-and-drop:

- Today.
- Week.
- Meals and shopping.
- Tasks and rewards.
- Notes and memories.

### Calendar

Calendar work must close the gap the user already reported: every event card and widget row opens a detail view. Calendar views should support family and member filters, member color tags, event ownership, recurring-event metadata, third-party source labels, and edit/delete permissions.

### Tasks, Routines, Chores, Rewards

Tasks should include one-off to-dos, routines, chores, ad hoc child requests, and rewards. The implementation should preserve current wallet and allowance behavior while adding:

- Temporary tasks with due date, reminder, description, and assignees.
- Routine/chore recurring rules.
- Reward catalog with available, pending approval, and redeemed states.
- Family progress widget for motivation.
- Pet care tasks that do not award pet wallets.

### Meals, Recipes, Shopping, Pantry

Meals should support categories: breakfast, lunch, dinner, snack. Shopping generation should work deterministically from recipe ingredients and pantry gaps. Lists should support grouping by aisle, recipe, or manual order. Pantry should support staples, low-stock reminders, expiration dates, and recipe suggestions based on available items.

### Smart Import And AI

Smart import should be local-first:

- URL import for recipes and events.
- Photo import using OCR where installed.
- Optional local Ollama normalization and classification.
- A review screen before creating calendar events, recipes, shopping items, or tasks.
- No AI-only blocking path.

### Ambient, Lock, And Display Modes

The display should support:

- Screensaver with photos, notes, next event cards, weather, and clock.
- Sleep schedule and quiet hours.
- Persistent reminders with snooze/dismiss.
- Kiosk lock and child-safe mode.
- 1920x1080 landscape validation, plus portrait handling for rotating displays.

## Implementation Phases

1. Research and spec foundation.
2. Kiosk dashboard pages and widget architecture.
3. Calendar event detail and member calendar filtering.
4. Unified task/routine/chore/reward model and widgets.
5. Meals, recipe, shopping, and pantry enhancements.
6. Smart import and optional local AI command inbox.
7. Ambient display, lock, sleep, and touch-display validation.
8. PWA companion flows for phone management.

## Acceptance Criteria

- Every generated implementation issue links this master spec and has dependency metadata.
- Production app routes continue to use real household data only.
- Kiosk routes are full-screen browser interfaces, not simulated devices.
- Event cards open real detail views.
- Widgets use real APIs or explicit empty/error states.
- Local-first privacy remains a differentiator from Cozyla's AWS-hosted model.
- AI and smart import are optional and review-based.
- Manuals are updated with user-facing behavior in the same PR as each implementation change.

## Verification

- Autospec dry-run validation passes before GitHub issues are created.
- Roadmap issues include source spec, dependencies, acceptance criteria, and verification.
- For implementation issues, run targeted unit/component tests plus 1920x1080 Playwright visual smoke for kiosk changes.
- Manual smoke after production deployment covers onboarding, kiosk, calendar detail, tasks, meals, shopping, pantry, and display modes as they ship.

## Documentation

Implementation PRs must update the user manual when user-facing flows change. The agent manual changes only when the workflow, PR policy, CI, merge, deployment, or issue closure process changes.
