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

// WithTestHouseholdID returns a copy of r with the given household ID injected
// into the context. Test-only; never compiled into the production binary.
func WithTestHouseholdID(r *http.Request, householdID string) *http.Request {
	ctx := context.WithValue(r.Context(), contextKeyHouseholdID, householdID)
	return r.WithContext(ctx)
}

// WithTestMemberID returns a copy of r with the given member ID injected into
// the context. Test-only; never compiled into the production binary.
func WithTestMemberID(r *http.Request, memberID string) *http.Request {
	ctx := context.WithValue(r.Context(), contextKeyMemberID, memberID)
	return r.WithContext(ctx)
}
