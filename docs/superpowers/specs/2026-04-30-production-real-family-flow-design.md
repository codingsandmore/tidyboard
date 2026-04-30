# Production Real Family Flow Design

## Summary

Production Tidyboard must run as a real household application, not as a demo or
phone-frame preview. App routes must require a real account, a completed
household onboarding flow, and live household data. Demo/sample data may exist
only on explicit preview routes and must never silently fill production
dashboards, calendar, chores, wallet, meals, or shopping screens.

## Goals

- Remove production use of Smith/demo/fallback family data from app routes.
- Make onboarding create a real household and require the full household roster,
  including pets, before the dashboard is usable.
- Render the kiosk dashboard as the real full-screen interface, not inside a
  simulated tablet or phone frame.
- Ensure calendar items can be opened from dashboards and calendar views for
  detailed viewing/editing.
- Ensure member-specific surfaces use real member context instead of a generic
  sign-in dead end.
- Make shopping-list generation deterministic from meal plans, recipes, and
  pantry gaps without requiring AI.

## Non-Goals

- Do not build a public demo mode for production app routes.
- Do not add AI-dependent shopping generation.
- Do not give pets login, PIN, wallet, rewards, or allowance flows.
- Do not rewrite unrelated visual systems beyond what is needed to make the
  production flow correct.

## Route And Data Policy

Production routes use live API data only. If an API call fails, the UI should
show a clear recoverable error or empty state instead of falling back to demo
records. Fallback/sample data can remain for isolated preview/story/test usage
only, behind explicitly named preview routes or test mocks.

Unauthenticated users are routed to sign-in/onboarding. Authenticated users with
no household, no member profile, or incomplete household setup are routed to
onboarding. Completed households reach the dashboard.

## Onboarding Flow

The first usable production flow is:

1. Sign in or create an account through the configured auth provider.
2. Create household name and timezone.
3. Create the adult owner profile.
4. Define the complete household roster before continuing:
   - Adult profiles.
   - Child profiles, with optional PIN setup.
   - Pet profiles.
5. Review the roster and complete setup.

Pets are first-class household profiles for schedules and care work. They can
appear in calendar ownership, routines, lists, meal/shopping context, and care
tasks such as walks, feeding, vet visits, grooming, and supplies. Pets do not
authenticate, do not receive wallets, and do not participate in rewards.

Onboarding should store progress server-side where backend support exists. The
frontend can keep temporary form state while a user is moving through the flow,
but completion must be based on persisted household/member data.

## Kiosk Dashboard

`/dashboard/kiosk` and the authenticated home dashboard render a real
full-screen dashboard. They must not use `TabletFrame`, `Scene`, fixed phone
mockups, or static preview chrome. The kiosk should adapt to tablet and desktop
kiosk displays with stable full-viewport layout.

The kiosk reads only live household members, events, routines, lists, meals, and
weather. Empty sections should explain what the family can add next, for
example no upcoming events, no meal planned, or no routines today. Empty states
must not invent events, meals, names, stars, chores, or schedules.

Member filtering uses real member and event membership. A family-wide event can
show for multiple members. A member-specific event should appear only for that
member and on family-wide views.

## Calendar Details

Every event row/card on dashboards and calendar views must be interactive. The
common behavior is to navigate to `/calendar?event=<event_id>`. The calendar
screen opens the event detail/edit modal for that id and loads current event
data from the API.

The detail view shows title, start/end, location, notes, assigned members,
recurrence, and countdown visibility when present. Missing data is shown as an
empty field, not sample content.

## Member-Specific Surfaces

Wallet and chores require an active real member context. If the user is signed
in but no member is active, the page should show a household member selector or
route to the kiosk PIN flow. It must not show a generic sign-in page when the
account is already authenticated.

Adult/admin wallet and chore management remains separate from child/member
views. Pets are excluded from wallet and reward flows.

## Shopping Generation

Shopping-list generation is deterministic and works without AI:

1. Read the selected week meal plan.
2. Collect ingredients from planned recipes.
3. Compare against pantry staples and already-completed shopping items where
   available.
4. Create or update the active shopping list with grouped items, quantities,
   units, and source recipe labels.

If there is no meal plan or no recipe ingredient data, the UI shows a useful
empty state explaining what is needed. The button must not silently fail.

Future AI enhancements may normalize ingredient names or suggest substitutions,
but the base generation path must not depend on provider keys.

## Error Handling

- Auth missing: route to sign-in/onboarding.
- Household incomplete: route to onboarding resume.
- API failure: show retryable error state.
- Empty real data: show empty-state guidance.
- Shopping generation missing prerequisites: explain the missing meal-plan or
  recipe data.
- Member-specific page without member context: show member selection or PIN
  route.

## Testing And Verification

Automated tests should cover:

- Production app routes do not render fallback/demo household data.
- Unauthenticated users cannot reach dashboards.
- Authenticated users with incomplete household setup are routed to onboarding.
- Onboarding requires adults/children/pets roster review before completion.
- Pets appear in calendar/routine/list contexts and are excluded from wallet and
  rewards.
- `/dashboard/kiosk` renders full-screen, without frame/scene preview wrappers.
- Calendar event click opens the event detail modal by id.
- Member filters do not show every event for every person unless events are
  genuinely shared.
- Wallet and chores show member-selection/PIN flow instead of generic sign-in
  for authenticated users.
- Shopping generation creates a list from meal-plan recipe ingredients without
  AI.

Manual production smoke after deployment should verify:

- Sign-in/onboarding gate.
- Complete household setup with adults, children, and at least one pet.
- Kiosk full-screen route.
- Calendar detail opening.
- Chores and wallet member-context behavior.
- Shopping generation from a planned recipe.

## Documentation

Any implementation PR must update the user manual for onboarding, kiosk,
calendar details, member context, pets, and shopping generation behavior. The
agent manual should be updated only if the issue/PR/deploy process changes.
