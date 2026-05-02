// Package auth — local-mode password helpers.
//
// Local-mode (Deployment.Mode=local) replaces the Cognito Hosted UI signup +
// login round-trip with on-box password verification: bcrypt hash on the
// accounts row, plaintext password posted over TLS to the Go server, and a
// short-lived HMAC JWT issued by the existing AuthService.IssueToken path.
//
// The pieces:
//
//   - HashLocalPassword + CheckLocalPassword wrap bcrypt with a single, audited
//     cost setting so callers can't accidentally regress to a weak factor.
//   - The handler in internal/handler/auth_local.go enforces "exactly one
//     local owner" by gating /v1/auth/local/setup on a CountAccountsWithPassword
//     read.
//
// Cloud mode is unaffected: the routes are registered behind a
// Deployment.Mode=="local" gate in cmd/server/main.go.
package auth

import (
	"errors"
	"fmt"

	"golang.org/x/crypto/bcrypt"
)

// MinLocalPasswordLen is the floor for local owner passwords. The cloud /
// Cognito flow already enforces its own policy via Hosted UI; this is the
// equivalent for self-hosted deploys. Kept short enough that operators
// can't legitimately complain in tests, long enough that brute-force
// against bcrypt is impractical.
const MinLocalPasswordLen = 8

// ErrLocalPasswordTooShort is returned by HashLocalPassword when the caller
// passes a password under MinLocalPasswordLen runes.
var ErrLocalPasswordTooShort = errors.New("password must be at least 8 characters")

// ErrLocalPasswordMismatch is returned by CheckLocalPassword when the supplied
// password doesn't match the stored hash. Wraps ErrUnauthorized so existing
// middleware error-classification continues to work.
var ErrLocalPasswordMismatch = fmt.Errorf("%w: bad local password", ErrUnauthorized)

// HashLocalPassword bcrypt-hashes a plaintext password for local-mode account
// rows. Returns ErrLocalPasswordTooShort when below the configured floor —
// the handler converts this to a 400.
func HashLocalPassword(plaintext string) (string, error) {
	if len(plaintext) < MinLocalPasswordLen {
		return "", ErrLocalPasswordTooShort
	}
	h, err := bcrypt.GenerateFromPassword([]byte(plaintext), bcrypt.DefaultCost)
	if err != nil {
		return "", fmt.Errorf("local: bcrypt hash: %w", err)
	}
	return string(h), nil
}

// CheckLocalPassword verifies the plaintext against the stored bcrypt hash.
// Returns ErrLocalPasswordMismatch on any mismatch or malformed-hash error;
// callers should map this to 401 without leaking which field was wrong.
func CheckLocalPassword(storedHash, plaintext string) error {
	if storedHash == "" {
		return ErrLocalPasswordMismatch
	}
	if err := bcrypt.CompareHashAndPassword([]byte(storedHash), []byte(plaintext)); err != nil {
		return ErrLocalPasswordMismatch
	}
	return nil
}
