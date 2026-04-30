package query

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

type txBeginner interface {
	Begin(context.Context) (pgx.Tx, error)
}

// WithAccountLock runs fn inside a transaction that locks the account row.
// It is used for idempotent per-account provisioning paths.
func (q *Queries) WithAccountLock(ctx context.Context, accountID uuid.UUID, fn func(*Queries) error) error {
	beginner, ok := q.db.(txBeginner)
	if !ok {
		return fn(q)
	}

	tx, err := beginner.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx, "SELECT id FROM accounts WHERE id = $1 FOR UPDATE", accountID); err != nil {
		return err
	}

	if err := fn(q.WithTx(tx)); err != nil {
		return err
	}
	return tx.Commit(ctx)
}
