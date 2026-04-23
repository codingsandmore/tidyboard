package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/tidyboard/tidyboard/internal/handler/respond"
)

type contextKey string

const (
	contextKeyAccountID  contextKey = "account_id"
	contextKeyHouseholdID contextKey = "household_id"
	contextKeyMemberID   contextKey = "member_id"
	contextKeyRole       contextKey = "role"
)

// Claims are the JWT claims stored in Tidyboard tokens.
type Claims struct {
	jwt.RegisteredClaims
	AccountID   string `json:"account_id"`
	HouseholdID string `json:"household_id"`
	MemberID    string `json:"member_id"`
	Role        string `json:"role"`
}

// Auth returns a middleware that validates the JWT and injects claims into ctx.
func Auth(jwtSecret string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			header := r.Header.Get("Authorization")
			if header == "" {
				respond.Error(w, http.StatusUnauthorized, "unauthorized", "missing Authorization header")
				return
			}
			parts := strings.SplitN(header, " ", 2)
			if len(parts) != 2 || !strings.EqualFold(parts[0], "bearer") {
				respond.Error(w, http.StatusUnauthorized, "unauthorized", "invalid Authorization header format")
				return
			}
			tokenStr := parts[1]

			claims := &Claims{}
			token, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (interface{}, error) {
				if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
					return nil, jwt.ErrSignatureInvalid
				}
				return []byte(jwtSecret), nil
			})
			if err != nil || !token.Valid {
				respond.Error(w, http.StatusUnauthorized, "unauthorized", "invalid or expired token")
				return
			}

			ctx := r.Context()
			ctx = context.WithValue(ctx, contextKeyAccountID, claims.AccountID)
			ctx = context.WithValue(ctx, contextKeyHouseholdID, claims.HouseholdID)
			ctx = context.WithValue(ctx, contextKeyMemberID, claims.MemberID)
			ctx = context.WithValue(ctx, contextKeyRole, claims.Role)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
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

// HouseholdIDFromCtx extracts the household UUID from context (set by Auth middleware).
func HouseholdIDFromCtx(ctx context.Context) (uuid.UUID, bool) {
	s, ok := ctx.Value(contextKeyHouseholdID).(string)
	if !ok || s == "" {
		return uuid.Nil, false
	}
	id, err := uuid.Parse(s)
	return id, err == nil
}

// MemberIDFromCtx extracts the member UUID from context (set by Auth middleware).
func MemberIDFromCtx(ctx context.Context) (uuid.UUID, bool) {
	s, ok := ctx.Value(contextKeyMemberID).(string)
	if !ok || s == "" {
		return uuid.Nil, false
	}
	id, err := uuid.Parse(s)
	return id, err == nil
}

// RoleFromCtx extracts the role string from context (set by Auth middleware).
func RoleFromCtx(ctx context.Context) string {
	s, _ := ctx.Value(contextKeyRole).(string)
	return s
}
