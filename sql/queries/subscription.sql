-- sql/queries/subscription.sql
-- Stripe subscription queries. Run `sqlc generate` to produce Go code.

-- name: UpsertSubscription :one
INSERT INTO subscriptions (
    id,
    household_id,
    stripe_customer_id,
    stripe_subscription_id,
    status,
    current_period_end,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(), $1, $2, $3, $4, $5, NOW(), NOW()
)
ON CONFLICT (household_id) DO UPDATE SET
    stripe_customer_id     = EXCLUDED.stripe_customer_id,
    stripe_subscription_id = EXCLUDED.stripe_subscription_id,
    status                 = EXCLUDED.status,
    current_period_end     = EXCLUDED.current_period_end,
    updated_at             = NOW()
RETURNING *;

-- name: GetSubscriptionByHousehold :one
SELECT * FROM subscriptions
WHERE household_id = $1
LIMIT 1;

-- name: GetSubscriptionByCustomer :one
SELECT * FROM subscriptions
WHERE stripe_customer_id = $1
LIMIT 1;

-- name: UpdateSubscriptionStatus :exec
UPDATE subscriptions
SET
    status             = $2,
    current_period_end = $3,
    updated_at         = NOW()
WHERE stripe_subscription_id = $1;
