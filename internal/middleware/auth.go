package middleware

import (
	"context"
	"errors"
	"net/http"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/tidyboard/tidyboard/internal/auth"
	"github.com/tidyboard/tidyboard/internal/handler/respond"
	"github.com/tidyboard/tidyboard/internal/query"
)

type contextKey string

const (
	contextKeyAccountID   contextKey = "account_id"
	contextKeyHouseholdID contextKey = "household_id"
	contextKeyMemberID    contextKey = "member_id"
	contextKeyRole        contextKey = "role"
)

// Auth returns middleware that validates a Bearer token via the supplied
// Verifier and resolves the caller's account / household / member context
// from the database, then injects all four into request context.
//
// Resolution rules:
//   - Cognito (production): look up account by (oidc_provider="cognito",
//     oidc_subject=Identity.Subject). If absent, create the row using
//     Identity.Email. Then look up the user's earliest household membership;
//     if absent, leave household/member/role empty (user is mid-onboarding).
//   - Test stub: if the token contains the legacy account_id/household_id/
//     member_id/role claims (Identity.Test*), trust them directly. Lets
//     existing testutil.MakeJWT integration tests keep working without
//     seeding oidc_subject rows or creating account-linked members.
//
// Failures from the verifier always return 401 with a generic body.
func Auth(verifier auth.Verifier, q *query.Queries) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			raw := auth.ExtractBearer(r.Header.Get("Authorization"))
			if raw == "" {
				respond.Error(w, http.StatusUnauthorized, "unauthorized", "missing or malformed Authorization header")
				return
			}

			ctx := r.Context()
			id, err := verifier.Verify(ctx, raw)
			if err != nil {
				respond.Error(w, http.StatusUnauthorized, "unauthorized", "invalid or expired token")
				return
			}

			accountID, householdID, memberID, role, err := resolveContext(ctx, q, id)
			if err != nil {
				respond.Error(w, http.StatusUnauthorized, "unauthorized", "could not resolve identity")
				return
			}

			ctx = context.WithValue(ctx, contextKeyAccountID, accountID.String())
			if householdID != uuid.Nil {
				ctx = context.WithValue(ctx, contextKeyHouseholdID, householdID.String())
			}
			if memberID != uuid.Nil {
				ctx = context.WithValue(ctx, contextKeyMemberID, memberID.String())
			}
			if role != "" {
				ctx = context.WithValue(ctx, contextKeyRole, role)
			}
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// Resolve maps a verified Identity onto Tidyboard's domain IDs. Exported so
// non-HTTP callers (e.g. the WebSocket handler, which auths from a query
// param) can reuse the same lookup-or-create flow without going through the
// HTTP middleware.
//
// Returns uuid.Nil for household/member when the user has no membership yet.
func Resolve(ctx context.Context, q *query.Queries, id *auth.Identity) (
	accountID, householdID, memberID uuid.UUID, role string, err error,
) {
	return resolveContext(ctx, q, id)
}

// resolveContext maps the verified Identity onto Tidyboard's domain IDs.
// Returns uuid.Nil for household/member when the user has no membership yet.
func resolveContext(ctx context.Context, q *query.Queries, id *auth.Identity) (
	accountID, householdID, memberID uuid.UUID, role string, err error,
) {
	// Test-stub shortcut: integration tests stamp legacy claims directly into
	// the JWT — honour them without DB round-trips.
	if id.Provider == "test" && id.TestAccountID != "" {
		accountID, err = uuid.Parse(id.TestAccountID)
		if err != nil {
			return uuid.Nil, uuid.Nil, uuid.Nil, "", err
		}
		if id.TestHouseholdID != "" {
			householdID, _ = uuid.Parse(id.TestHouseholdID)
		}
		if id.TestMemberID != "" {
			memberID, _ = uuid.Parse(id.TestMemberID)
		}
		role = id.TestRole
		return accountID, householdID, memberID, role, nil
	}

	// Production: resolve via federated identity.
	if q == nil {
		return uuid.Nil, uuid.Nil, uuid.Nil, "", errors.New("middleware.Auth: no DB queries")
	}
	if id.Subject == "" {
		return uuid.Nil, uuid.Nil, uuid.Nil, "", errors.New("verified token has empty subject")
	}

	provider := id.Provider
	if provider == "" {
		provider = "cognito"
	}
	sub := id.Subject

	acc, err := q.GetAccountByOIDC(ctx, query.GetAccountByOIDCParams{
		OidcProvider: &provider,
		OidcSubject:  &sub,
	})
	if errors.Is(err, pgx.ErrNoRows) {
		// First login — auto-provision the account row from Identity claims.
		// The user's onboarding flow then creates their household + member.
		acc, err = q.CreateAccount(ctx, query.CreateAccountParams{
			ID:           uuid.New(),
			Email:        id.Email,
			OidcProvider: &provider,
			OidcSubject:  &sub,
			IsActive:     true,
		})
	}
	if err != nil {
		return uuid.Nil, uuid.Nil, uuid.Nil, "", err
	}

	accIDArg := uuid.NullUUID{UUID: acc.ID, Valid: true}
	pm, err := q.GetPrimaryMemberByAccount(ctx, &accIDArg)
	if err == nil {
		return acc.ID, pm.HouseholdID, pm.ID, pm.Role, nil
	}
	if errors.Is(err, pgx.ErrNoRows) {
		// Logged in, no membership yet — onboarding will create one.
		return acc.ID, uuid.Nil, uuid.Nil, "", nil
	}
	return uuid.Nil, uuid.Nil, uuid.Nil, "", err
}

// AccountIDFromCtx extracts the account UUID from context (set by Auth middleware).
func AccountIDFromCtx(ctx context.Context) (uuid.UUID, bool) {
	s, ok := ctx.Value(contextKeyAccountID).(string)
	if !ok || s == "" {
		return uuid.Nil, false
	}
	id, err := uuid.Parse(s)
	return id, err == nil
}

// HouseholdIDFromCtx extracts the household UUID from context. ok=false when
// the user is logged in but has no household yet (mid-onboarding).
func HouseholdIDFromCtx(ctx context.Context) (uuid.UUID, bool) {
	s, ok := ctx.Value(contextKeyHouseholdID).(string)
	if !ok || s == "" {
		return uuid.Nil, false
	}
	id, err := uuid.Parse(s)
	return id, err == nil
}

// MemberIDFromCtx extracts the member UUID from context. ok=false when the
// user has no household membership yet.
func MemberIDFromCtx(ctx context.Context) (uuid.UUID, bool) {
	s, ok := ctx.Value(contextKeyMemberID).(string)
	if !ok || s == "" {
		return uuid.Nil, false
	}
	id, err := uuid.Parse(s)
	return id, err == nil
}

// RoleFromCtx extracts the role string from context. Empty when the user has
// no household membership yet.
func RoleFromCtx(ctx context.Context) string {
	s, _ := ctx.Value(contextKeyRole).(string)
	return s
}
