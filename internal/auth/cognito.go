// Package auth holds the JWT verifier abstraction used by the auth middleware.
//
// Production: a Cognito-backed Verifier that fetches JWKS from the user pool's
// well-known endpoint, caches it, and validates RS256-signed id_tokens.
//
// Tests: a Stub Verifier that accepts HS256-signed tokens (so testutil.MakeJWT
// can stay symmetric without spinning up a fake JWKS server).
//
// The middleware picks the right verifier based on whether
// AuthConfig.Cognito.UserPoolID is set.
package auth

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/coreos/go-oidc/v3/oidc"
	"github.com/golang-jwt/jwt/v5"

	"github.com/tidyboard/tidyboard/internal/config"
)

// Identity is what the middleware extracts from a verified token. The DB-side
// account/household/member lookup is done separately — Identity is just the
// federation-layer view.
type Identity struct {
	Subject  string // Cognito user UUID — primary key for federated identity.
	Email    string
	Name     string
	Picture  string // optional avatar URL (Google fills this).
	Provider string // "cognito" in production; "test" for the HMAC stub.
}

// Verifier turns a Bearer token string into a verified Identity, or an error.
type Verifier interface {
	Verify(ctx context.Context, rawIDToken string) (*Identity, error)
}

// ErrUnauthorized is returned for any verification failure (signature, exp,
// audience, issuer, ...). Specific reasons are wrapped — callers shouldn't
// rely on the wrapped error type for control flow.
var ErrUnauthorized = errors.New("unauthorized")

// NewVerifier returns the production verifier when UserPoolID is set, or the
// HMAC stub otherwise. Returns an error only if the production verifier can't
// initialise (e.g. JWKS endpoint unreachable on first call).
func NewVerifier(ctx context.Context, cfg config.AuthConfig) (Verifier, error) {
	if cfg.Cognito.UserPoolID == "" {
		return &hmacVerifier{secret: []byte(cfg.JWTSecret)}, nil
	}
	return newCognitoVerifier(ctx, cfg.Cognito)
}

// ── Cognito verifier (production) ────────────────────────────────────────────

type cognitoVerifier struct {
	verifier *oidc.IDTokenVerifier
	clientID string
}

func newCognitoVerifier(ctx context.Context, cfg config.CognitoConfig) (*cognitoVerifier, error) {
	issuer := cfg.IssuerURL
	if issuer == "" {
		// Cognito's issuer URL is the well-known pattern; the .well-known
		// endpoint is auto-derived from this by go-oidc.
		issuer = fmt.Sprintf("https://cognito-idp.%s.amazonaws.com/%s", cfg.Region, cfg.UserPoolID)
	}
	provider, err := oidc.NewProvider(ctx, issuer)
	if err != nil {
		return nil, fmt.Errorf("cognito: init OIDC provider %q: %w", issuer, err)
	}
	return &cognitoVerifier{
		verifier: provider.Verifier(&oidc.Config{ClientID: cfg.ClientID}),
		clientID: cfg.ClientID,
	}, nil
}

// cognitoClaims captures the bits of a Cognito id_token we actually use.
// Claims not listed here are silently dropped after verification.
type cognitoClaims struct {
	Subject string `json:"sub"`
	Email   string `json:"email"`
	Name    string `json:"name"`
	Picture string `json:"picture"`
}

func (v *cognitoVerifier) Verify(ctx context.Context, rawIDToken string) (*Identity, error) {
	tok, err := v.verifier.Verify(ctx, rawIDToken)
	if err != nil {
		return nil, fmt.Errorf("%w: %v", ErrUnauthorized, err)
	}
	var c cognitoClaims
	if err := tok.Claims(&c); err != nil {
		return nil, fmt.Errorf("%w: parsing claims: %v", ErrUnauthorized, err)
	}
	if c.Subject == "" {
		return nil, fmt.Errorf("%w: missing sub claim", ErrUnauthorized)
	}
	return &Identity{
		Subject:  c.Subject,
		Email:    strings.ToLower(c.Email),
		Name:     c.Name,
		Picture:  c.Picture,
		Provider: "cognito",
	}, nil
}

// ── HMAC stub (tests only) ───────────────────────────────────────────────────

type hmacVerifier struct {
	secret []byte
}

func (v *hmacVerifier) Verify(_ context.Context, raw string) (*Identity, error) {
	if len(v.secret) == 0 {
		return nil, fmt.Errorf("%w: HMAC verifier disabled (empty secret)", ErrUnauthorized)
	}
	claims := jwt.MapClaims{}
	tok, err := jwt.ParseWithClaims(raw, claims, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, jwt.ErrSignatureInvalid
		}
		return v.secret, nil
	})
	if err != nil || !tok.Valid {
		return nil, fmt.Errorf("%w: %v", ErrUnauthorized, err)
	}
	if exp, ok := claims["exp"].(float64); ok && time.Now().After(time.Unix(int64(exp), 0)) {
		return nil, fmt.Errorf("%w: token expired", ErrUnauthorized)
	}
	id := &Identity{Provider: "test"}
	if s, _ := claims["sub"].(string); s != "" {
		id.Subject = s
	}
	if e, _ := claims["email"].(string); e != "" {
		id.Email = strings.ToLower(e)
	}
	if n, _ := claims["name"].(string); n != "" {
		id.Name = n
	}
	if p, _ := claims["picture"].(string); p != "" {
		id.Picture = p
	}
	return id, nil
}

// ── Helpers for extracting Bearer tokens ─────────────────────────────────────

// ExtractBearer returns the raw token from "Authorization: Bearer …", or "" if
// the header is missing or malformed. Empty return is an error condition the
// caller should reject.
func ExtractBearer(authzHeader string) string {
	parts := strings.SplitN(authzHeader, " ", 2)
	if len(parts) != 2 || !strings.EqualFold(parts[0], "bearer") {
		return ""
	}
	return strings.TrimSpace(parts[1])
}
