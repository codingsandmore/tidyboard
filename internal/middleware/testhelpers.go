//go:build unit || integration

package middleware

import (
	"context"
	"net/http"
)

// WithTestAccountID returns a copy of r with the given account ID injected into
// the context.  This helper is exported only under the unit/integration build
// tags so it is never compiled into the production binary.
//
// In production the account_id is set by the Auth middleware after JWT validation.
func WithTestAccountID(r *http.Request, accountID string) *http.Request {
	ctx := context.WithValue(r.Context(), contextKeyAccountID, accountID)
	return r.WithContext(ctx)
}
