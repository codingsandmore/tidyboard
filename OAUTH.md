# Google OAuth (Calendar Integration)

Google OAuth is used to connect a user's Google Calendar so events appear on the family dashboard.

## Architecture

```
Frontend (onboarding step 5 / settings)
  → POST /v1/auth/oauth/google/start  (returns redirect_url)
  → browser redirects to Google consent screen
  → Google calls GET /v1/auth/oauth/google/callback?code=...&state=...
  → server exchanges code, stores token, redirects to /onboarding?step=5&connected=1
```

## Configuration

Extends `AuthConfig.OAuth` in `internal/config/config.go`:

| Env var | Description |
|---|---|
| `TIDYBOARD_AUTH_OAUTH_GOOGLE_CLIENT_ID` | Google OAuth 2.0 client ID |
| `TIDYBOARD_AUTH_OAUTH_GOOGLE_CLIENT_SECRET` | Google OAuth 2.0 client secret |

Enable in `config.yaml`:

```yaml
auth:
  oauth:
    google_enabled: true
```

Configure your OAuth callback URL in the Google Cloud Console:
```
https://your-domain/v1/auth/oauth/google/callback
```

## Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/v1/auth/oauth/google/start` | JWT | Returns `{"redirect_url":"..."}` — redirect the browser here |
| `GET` | `/v1/auth/oauth/google/callback` | None | Google callback — exchanges code, stores token, redirects back |

## State management

Pending OAuth states are stored in-memory in `OAuthService` with a 10-minute TTL. State entries are purged lazily. For multi-instance deployments, consider moving state to Redis (the broadcaster's Redis client is available in main.go).

## Database

Migration: `migrations/20260423000012_oauth_tokens.sql`

Table: `oauth_tokens` — one row per `(account_id, provider)`. Unique constraint prevents duplicates.

## Token storage

Tokens are currently stored unencrypted (see `TODO(crypto)` comments in `internal/service/oauth.go`). Before production use:
- Wire AES-GCM or envelope encryption using a KMS key
- Tokens are **never logged** (enforced by convention — no `slog` calls with token values)

## Scopes requested

- `openid`
- `https://www.googleapis.com/auth/calendar`

## Frontend

- `web/src/app/onboarding/page.tsx` — step 5 calls `/v1/auth/oauth/google/start`, redirects full window to Google
- After callback, server redirects to `/onboarding?step=5&connected=1`
- The page detects `connected=1` in search params, shows green confirmation, and advance skips the OAuth redirect

## iCal URL (alternative calendar path)

Users who have a public `.ics` URL can connect without OAuth:

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/v1/calendars/ical` | JWT | Creates a `calendars` row with `source='ical_url'`; returns new calendar |
| `GET` | `/v1/calendars` | JWT | Lists all calendars for the household |
| `POST` | `/v1/calendars/:id/sync-ical` | JWT | Pulls events via sync-worker `/sync/ical`; upserts into events table |

Onboarding step 5 (`ObCalendar`) shows both "Connect Google Calendar" and "Add iCal URL" as primary options.
Settings page shows a Calendars card with list of connected calendars, kind badges, and the same two add buttons.
