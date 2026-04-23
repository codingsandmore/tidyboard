# Routes

## CRUD Resources

- **`/v1/households`** GET | POST | GET/:id | PATCH/:id | DELETE/:id → Household
- **`/v1/households/{id}/members`** GET | POST | GET/:id | PATCH/:id | DELETE/:id → Member
- **`/v1/events`** GET | POST | GET/:id | PATCH/:id | DELETE/:id → Event
- **`/v1/lists`** GET | POST | GET/:id | PATCH/:id | DELETE/:id → List
- **`/v1/lists/{id}/items`** GET | POST | GET/:id | PATCH/:id | DELETE/:id → Item
- **`/v1/recipes`** GET | POST | GET/:id | PATCH/:id | DELETE/:id → Recipe

## Other Routes

### chi

- `GET` `/health` params() [auth, db, cache, payment, upload] ✓
- `GET` `/ready` params() [auth, db, cache, payment, upload] ✓
- `GET` `/metrics` params() [auth, db, cache, payment, upload]
- `POST` `/v1/auth/register` params() [auth, db, cache, payment, upload] ✓
- `POST` `/v1/auth/login` params() [auth, db, cache, payment, upload] ✓
- `POST` `/v1/auth/pin` params() [auth, db, cache, payment, upload] ✓
- `POST` `/v1/billing/webhook` params() [auth, db, cache, payment, upload]
- `GET` `/v1/auth/oauth/google/callback` params() [auth, db, cache, payment, upload]
- `GET` `/v1/auth/me` params() [auth, db, cache, payment, upload] ✓
- `GET` `/v1/ws` params() [auth, db, cache, payment, upload]
- `POST` `/v1/recipes/import` params() [auth, db, cache, payment, upload] ✓
- `GET` `/v1/calendars` params() [auth, db, cache, payment, upload]
- `POST` `/v1/calendars/ical` params() [auth, db, cache, payment, upload]
- `POST` `/v1/calendars/{id}/sync` params(id) [auth, db, cache, payment, upload]
- `POST` `/v1/calendars/{id}/sync-ical` params(id) [auth, db, cache, payment, upload]
- `GET` `/v1/audit` params() [auth, db, cache, payment, upload] ✓
- `POST` `/v1/admin/backup/run` params() [auth, db, cache, payment, upload]
- `POST` `/v1/admin/reset` params() [auth, db, cache, payment, upload]
- `POST` `/v1/billing/checkout` params() [auth, db, cache, payment, upload]
- `POST` `/v1/billing/portal` params() [auth, db, cache, payment, upload]
- `GET` `/v1/billing/subscription` params() [auth, db, cache, payment, upload]
- `POST` `/v1/auth/oauth/google/start` params() [auth, db, cache, payment, upload]
- `POST` `/v1/media/upload` params() [auth, db, cache, payment, upload] ✓
- `GET` `/v1/media/sign/*` params() [auth, db, cache, payment, upload] ✓
- `GET` `/v1/media/*` params() [auth, db, cache, payment, upload] ✓
- `ALL` `/media/*` params() [auth, db, cache, payment, upload]
- `GET` `Content-Type` params()
- `GET` `limit` params() [auth, db]
- `GET` `offset` params() [auth, db]
- `GET` `Stripe-Signature` params() [auth, payment]
- `GET` `start` params() [auth, db] ✓
- `GET` `end` params() [auth, db] ✓
- `GET` `expiry` params() [auth, db, cache, upload]
- `GET` `code` params() [auth, db]
- `GET` `state` params() [auth, db]
- `GET` `origin` params() [auth, db] ✓
- `GET` `Authorization` params() [auth, db]
- `GET` `token` params() [auth, db] ✓
- `GET` `Accept-Encoding` params() [queue]
- `GET` `User-Agent` params()
- `GET` `Origin` params() [auth, cache, queue]
- `GET` `Access-Control-Allow-Origin` params() [cache]
- `GET` `Access-Control-Allow-Credentials` params() [cache]
- `GET` `Access-Control-Max-Age` params() [cache]
- `GET` `Vary` params() [cache]
- `GET` `X-Request-Id` params() [auth]
- `GET` `Retry-After` params() [auth, cache]
- `GET` `X-RateLimit-Limit` params() [auth, cache]
- `GET` `X-RateLimit-Remaining` params() [auth, cache]

### fastapi

- `POST` `/scrape` params() → in: ScrapeRequest, out: HealthResponse ✓
- `POST` `/sync` params() → in: SyncRequest, out: HealthResponse [auth] ✓
- `POST` `/sync/ical` params() → in: SyncRequest, out: HealthResponse [auth]
