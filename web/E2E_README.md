# Tidyboard — End-to-End Tests (Playwright)

This document explains how to run the Playwright e2e test suite, how the tests are
structured, and what a future CI integration looks like.

---

## Quick start

```bash
# From the web/ directory
npm run e2e          # headless, list reporter
npm run e2e:ui       # interactive Playwright UI mode
```

The `webServer` config in `playwright.config.ts` starts `npm run dev` automatically
before the tests run. Tests talk to `http://localhost:3000`. On re-runs the existing
server is reused (unless `CI=true`).

---

## API fallback mode

The dev server is started with `NEXT_PUBLIC_API_URL=''`, which tells the app to use
its built-in Smith Family mock data instead of calling the Go backend. This means
the full test suite runs correctly even without a running backend.

---

## Test suite layout

| File | Description | Tests |
|---|---|---|
| `e2e/fixtures.ts` | Shared helpers (`gotoAndWait`, `screenshot`) | — |
| `e2e/smoke.spec.ts` | Every real route loads and returns 200 | 13 |
| `e2e/onboarding.spec.ts` | 7-step wizard; Finish → redirect to / | 1 |
| `e2e/calendar.spec.ts` | Tab switcher, + Event modal, conflict warning | 3 |
| `e2e/shopping.spec.ts` | Checkbox toggle: unchecked ↔ checked | 2 |
| `e2e/routines.spec.ts` | Active step visible; toggle done; progress counter | 3 |
| `e2e/dark-mode.spec.ts` | Dark class on html; Light clears it; persists on reload | 3 |
| `e2e/a11y.spec.ts` | axe-core: zero critical violations on 6 routes + focus ring | 7 |
| `e2e/viewport.spec.ts` | 360/900/1440px → phone/kiosk/desktop variant visible | 3 |

**Total: ~35 tests** across two projects (chromium + mobile-safari).

---

## Browser projects

- **chromium** — Desktop Chrome at 1280×720 (default viewport in config)
- **mobile-safari** — iPhone 14 via Playwright device emulation

Viewport tests override the viewport per-test with `page.setViewportSize()`.

---

## Playwright configuration highlights

```ts
// playwright.config.ts
timeout: 30_000          // 30 s per test
retries: 1 on CI, 0 locally
webServer.env: { NEXT_PUBLIC_API_URL: '' }
```

---

## CI integration

Playwright runs as the `web-e2e` job in `.github/workflows/ci.yml`. It runs after
`web-build-test` passes and uses `chromium` only (WebKit requires a macOS runner).

The job sets `NEXT_PUBLIC_API_URL=''` so the Go backend is not needed.

### Viewing the HTML report from a failed CI run

1. Open the GitHub Actions run that failed.
2. Scroll to **Artifacts** at the bottom of the run summary.
3. Download `playwright-report` (retained 14 days).
4. Unzip and open `index.html` in your browser, or run:

```bash
npx playwright show-report path/to/playwright-report
```

### Reproducing a CI failure locally

1. Download the `playwright-test-results` artifact (retained 7 days) from the failing run.
2. Unzip it into `web/test-results/`.
3. Open the trace for the failing test:

```bash
npx playwright show-trace web/test-results/<test-name>/trace.zip
```

4. Re-run the specific spec that failed:

```bash
# From web/
npx playwright test e2e/<failing-spec>.spec.ts --project=chromium
```

5. To run with the same retry behaviour as CI:

```bash
CI=true npx playwright test e2e/<failing-spec>.spec.ts --project=chromium
```

> Note: `mobile-safari` is excluded from CI — WebKit on Linux requires additional
> system dependencies and a macOS runner. Run it locally with:
> `npx playwright test --project=mobile-safari`

---

## Screenshot gallery

Focus-ring screenshots are written to `test-results/screenshots/` on each run.
After running `npm run e2e` locally, find them at:

```
web/test-results/screenshots/focus-ring-homepage.png
```

These are captured by `e2e/a11y.spec.ts` during the keyboard-focus test.
They are excluded from git via `.gitignore` (`test-results/`).

---

## Ignored output directories

```
playwright-report/   # HTML report (open with: npx playwright show-report)
test-results/        # Traces, screenshots, videos on failure
.playwright/         # Internal Playwright cache
```

---

## Running a single spec

```bash
npx playwright test e2e/dark-mode.spec.ts --project=chromium
npx playwright test e2e/a11y.spec.ts --headed
npx playwright test --grep "focus ring"
```

---

## Debugging a failed test

```bash
# Re-run with headed mode + slow-mo
npx playwright test e2e/onboarding.spec.ts --headed --slowmo=500

# Open the last HTML report
npx playwright show-report
```
