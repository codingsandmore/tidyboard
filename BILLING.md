# Billing (Stripe Cloud Tier)

Tidyboard's billing integration is opt-in and disabled by default. Self-hosted installs never need it.

## Architecture

```
Frontend (settings/billing card)
  → POST /v1/billing/checkout   → BillingHandler → BillingService
  → POST /v1/billing/portal     → BillingHandler → BillingService
  → GET  /v1/billing/subscription → BillingHandler → BillingService
Stripe
  → POST /v1/billing/webhook    → BillingHandler → BillingService (no auth — signature verified)
```

## Configuration

All config is in `internal/config/config.go` under `StripeConfig`. Set via environment variables or `config.yaml`:

| Env var | Description |
|---|---|
| `TIDYBOARD_STRIPE_ENABLED` | Set to `true` to enable billing |
| `TIDYBOARD_STRIPE_SECRET_KEY` | Stripe secret key (`sk_live_...` or `sk_test_...`) |
| `TIDYBOARD_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (returned to frontend if needed) |
| `TIDYBOARD_STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret (`whsec_...`) |

Additional YAML-only config:

```yaml
stripe:
  price_cloud: "price_XXXXXXXXXXXX"      # Price ID for the Cloud tier
  portal_return_url: "https://app.tidyboard.dev/settings/billing"
  checkout_success_url: "https://app.tidyboard.dev/settings/billing?status=success"
  checkout_cancel_url: "https://app.tidyboard.dev/settings/billing?status=canceled"
```

## Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/v1/billing/checkout` | JWT | Creates a Stripe Checkout session, returns `{"url":"..."}` |
| `POST` | `/v1/billing/portal` | JWT | Creates a Stripe Customer Portal session, returns `{"url":"..."}` |
| `GET` | `/v1/billing/subscription` | JWT | Returns current subscription row or `{"subscription":null}` |
| `POST` | `/v1/billing/webhook` | None | Stripe webhook — verifies `Stripe-Signature` header |

## Database

Migration: `migrations/20260423000011_subscriptions.sql`

One `subscriptions` row per household (unique constraint on `household_id`). Status values: `active`, `trialing`, `past_due`, `canceled`, `incomplete`.

## Webhook events handled

- `customer.subscription.created` / `customer.subscription.updated` — upserts subscription row
- `customer.subscription.deleted` — marks status `canceled`
- `invoice.payment_succeeded` — marks status `active`
- `invoice.payment_failed` — marks status `past_due`

## Frontend

- `web/src/lib/api/use-subscription.ts` — `useSubscription()` hook
- `web/src/app/settings/page.tsx` — `BillingCard` component
- Controlled by `NEXT_PUBLIC_STRIPE_ENABLED` env var (default: enabled). Set to `"false"` for self-hosted installs to show "Self-hosted — no billing needed" instead.

## Security notes

- Webhook endpoint is mounted **outside** the JWT auth middleware group
- Stripe signature is always verified — no dev bypass
- Secret key and webhook secret are never logged
