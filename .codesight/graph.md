# Dependency Graph

## Most Imported Files (change these carefully)

- `net/http` — imported by **48** files
- `encoding/json` — imported by **33** files
- `net/http/httptest` — imported by **15** files
- `log/slog` — imported by **12** files
- `web/e2e/fixtures.ts` — imported by **8** files
- `loadtest/helpers/config.js` — imported by **7** files
- `path/filepath` — imported by **6** files
- `loadtest/helpers/data.js` — imported by **6** files
- `web/src/components/screens/calendar.tsx` — imported by **6** files
- `web/src/components/screens/routine.tsx` — imported by **6** files
- `web/src/components/screens/recipes.tsx` — imported by **6** files
- `web/src/components/screens/equity.tsx` — imported by **5** files
- `/clock.py` — imported by **4** files
- `web/e2e-real/helpers/api.ts` — imported by **4** files
- `web/src/components/screens/bottom-nav.tsx` — imported by **4** files
- `web/src/components/ui/icon.tsx` — imported by **4** files
- `crypto/sha256` — imported by **3** files
- `web/src/components/screens/lists.tsx` — imported by **3** files
- `web/src/components/ui/avatar.tsx` — imported by **3** files
- `web/src/lib/ai/ai-keys.ts` — imported by **3** files

## Import Map (who imports what)

- `net/http` ← `cmd/server/main.go`, `internal/client/recipe_client.go`, `internal/client/recipe_client_test.go`, `internal/client/sync_client.go`, `internal/client/sync_client_test.go` +43 more
- `encoding/json` ← `internal/broadcast/broadcast.go`, `internal/broadcast/broadcast_test.go`, `internal/broadcast/chaos_test.go`, `internal/client/recipe_client.go`, `internal/client/recipe_client_test.go` +28 more
- `net/http/httptest` ← `internal/client/recipe_client_test.go`, `internal/client/sync_client_test.go`, `internal/handler/auth_test.go`, `internal/handler/event_test.go`, `internal/handler/health_test.go` +10 more
- `log/slog` ← `cmd/server/main.go`, `internal/broadcast/broadcast.go`, `internal/client/recipe_client.go`, `internal/client/sync_client.go`, `internal/handler/media.go` +7 more
- `web/e2e/fixtures.ts` ← `web/e2e/a11y.spec.ts`, `web/e2e/calendar.spec.ts`, `web/e2e/dark-mode.spec.ts`, `web/e2e/onboarding.spec.ts`, `web/e2e/routines.spec.ts` +3 more
- `loadtest/helpers/config.js` ← `loadtest/auth.js`, `loadtest/events.js`, `loadtest/load.js`, `loadtest/smoke.js`, `loadtest/soak.js` +2 more
- `path/filepath` ← `cmd/server/main.go`, `internal/service/backup.go`, `internal/service/backup_s3.go`, `internal/service/backup_test.go`, `internal/service/storage.go` +1 more
- `loadtest/helpers/data.js` ← `loadtest/events.js`, `loadtest/load.js`, `loadtest/smoke.js`, `loadtest/soak.js`, `loadtest/spike.js` +1 more
- `web/src/components/screens/calendar.tsx` ← `web/src/components/screens/calendar-agenda.stories.tsx`, `web/src/components/screens/calendar-event-modal.stories.tsx`, `web/src/components/screens/calendar-month.stories.tsx`, `web/src/components/screens/calendar-week.stories.tsx`, `web/src/components/screens/calendar.stories.tsx` +1 more
- `web/src/components/screens/routine.tsx` ← `web/src/components/screens/kiosk-lock-members.stories.tsx`, `web/src/components/screens/kiosk-lock.stories.tsx`, `web/src/components/screens/routine-checklist.stories.tsx`, `web/src/components/screens/routine-path.stories.tsx`, `web/src/components/screens/routine.stories.tsx` +1 more
