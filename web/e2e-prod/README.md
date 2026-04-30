# Production E2E Tests (`e2e-prod/`)

End-to-end integration tests that hit the **live** https://tidyboard.org deployment.

Distinct from `e2e-real/` (which spins up a local stack). These tests:
- Hit real Cognito + the real Path C EC2 + real RDS Postgres
- Create entities under a unique run prefix `[E2E-{timestamp}]` and clean up in `afterAll`
- Skip auth-requiring tests gracefully if `TIDYBOARD_TEST_TOKEN` is not set

## Test classes

| Suite | Auth needed? | Run on every CI? |
|---|---|---|
| `tests/public.spec.ts` | No | Yes — should always pass |
| `tests/family-flow.spec.ts` | Yes (`TIDYBOARD_TEST_TOKEN`) | Yes if token in CI secrets |

## Running locally

```bash
# Public surface only (no token needed)
npm run e2e:prod

# With auth — see "Getting a token" below
TIDYBOARD_TEST_TOKEN="eyJraWQ..." npm run e2e:prod
```

## Getting a `TIDYBOARD_TEST_TOKEN`

Cognito Hosted UI is the only adult-auth path in production, so we can't script
sign-up. Instead, log in as your test/dev user once and pull the token out of
the browser session:

1. Open https://tidyboard.org/login in a browser, sign in (real Cognito creds).
2. Open DevTools → Application → Local Storage → `https://tidyboard.org`.
3. Copy the value of `id_token` (or whichever key the auth-store uses; check
   `web/src/lib/auth/auth-store.tsx` for the current name).
4. Export it: `export TIDYBOARD_TEST_TOKEN=...`
5. Tokens expire (typically ~1 hour). Refresh by re-logging in or calling the
   Cognito refresh endpoint.

For CI, store it as a GitHub Actions secret of the same name and pass it via
`env:` in the workflow.

## Cleanup guarantees

Every entity created during a run is registered in `helpers/cleanup.ts::CleanupQueue`
and deleted in reverse order in `afterAll`. Cleanup is **best-effort** — if a
delete fails (e.g. backend is down mid-test), the run still completes and the
failure is logged but not re-thrown.

If you ever see leftover `[E2E-...]`-prefixed households in production, you can
manually purge them with:

```bash
TIDYBOARD_TEST_TOKEN=... node -e '
  const fetch = (...a) => import("node-fetch").then(({default:f}) => f(...a));
  // … iterate /v1/households where name starts with [E2E-]
'
```

(That utility script doesn't exist yet — manual SQL on the box is the current
escape hatch.)

## Why a separate suite from `e2e-real/`?

| | `e2e-real/` | `e2e-prod/` |
|---|---|---|
| Backend | Local docker compose | https://tidyboard.org |
| Auth | HMAC stub (`/v1/auth/register`) | Real Cognito |
| DB reset | `apiReset()` between runs | No reset — cleanup tracker only |
| Speed | Fast (in-process) | Slow (network + Cognito) |
| Risk | Local-only, can be destructive | Targets shared prod — must self-clean |

`e2e-real/` is the dev-loop suite. `e2e-prod/` is the post-deploy smoke suite.
