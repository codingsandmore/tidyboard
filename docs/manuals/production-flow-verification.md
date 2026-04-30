# Production Flow Verification

Use this checklist to verify the real family flow after changes to onboarding, kiosk, calendar, wallet, chores, meals, recipes, shopping, or route gating.

## Automated Coverage

- `npm test` covers route gates, onboarding UI, kiosk full-screen component behavior, event detail opening, member-context wallet and chores pages, and shopping UI states.
- `npm run e2e -- --project=chromium` covers browser-level auth boundaries, including protected app routes such as `/dashboard/kiosk`, `/wallet`, `/chores`, `/calendar`, `/recipes`, `/meals`, and `/shopping`.
- `npm run e2e:prod` covers public production health/readiness checks without credentials. With `TIDYBOARD_TEST_TOKEN`, it also creates and cleans up a real roster in the authenticated household with adult, child, and pet profiles, exercises calendar/list/PIN/wallet/rewards flows, and verifies the production API path against the deployed system.
- `go test ./internal/handler -tags=integration` covers backend handler integration paths when `TIDYBOARD_TEST_DSN` is available. Shopping generation is covered from meal-plan recipe ingredients through the generated list response, missing ingredient errors, pantry staples, and same-week completed-item preservation.

## Production Smoke

After deployment, verify these with a real account:

- Unauthenticated users land on sign-in, and authenticated incomplete households land on onboarding.
- A household roster includes adults, children with optional PINs, and at least one pet.
- `/dashboard/kiosk` opens as a full-screen dashboard without phone, tablet, scene, or preview framing.
- Calendar rows or cards open the event detail view for the selected event.
- `/wallet` and `/chores` use member selection or kiosk PIN unlock when no active member is selected.
- Shopping generation creates a list from planned recipes with ingredient data and shows a clear prerequisite message when meal-plan or recipe ingredients are missing.

## Evidence To Record

For PRs or issue closure, record the local commands that passed, the PR checks that passed, the deployed workflow run, and the production smoke routes or account flow that were verified.
