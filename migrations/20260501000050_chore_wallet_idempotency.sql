-- +goose Up
-- +goose StatementBegin

-- Issue #137 / spec section C: chore→wallet payout wiring + idempotency.
--
-- 1. Households gain a `payout_cents_per_weight` setting. When a household has
--    no per-member allowance configured but does have chores with auto_approve,
--    each completion still credits the wallet at this flat rate
--    (cents = chore.weight × payout_cents_per_weight). Default 500 cents per
--    weight unit (= 5 stones per weight in the Flintstones currency).
--
-- 2. Idempotency: enforce that at most one chore_payout wallet_transaction
--    exists per (chore_completion). The completion table already has
--    UNIQUE(chore_id, date), and chore_payout transactions reference that
--    completion via wallet_transactions.reference_id. A partial unique index
--    on (kind='chore_payout', reference_id) closes the loop so even a
--    retried Credit() call cannot double-write.

ALTER TABLE households
    ADD COLUMN IF NOT EXISTS payout_cents_per_weight INTEGER NOT NULL DEFAULT 500;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_wallet_tx_chore_payout_reference
    ON wallet_transactions (reference_id)
    WHERE kind = 'chore_payout' AND reference_id IS NOT NULL;

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

DROP INDEX IF EXISTS uniq_wallet_tx_chore_payout_reference;
ALTER TABLE households DROP COLUMN IF EXISTS payout_cents_per_weight;

-- +goose StatementEnd
