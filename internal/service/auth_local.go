package service

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/tidyboard/tidyboard/internal/auth"
	"github.com/tidyboard/tidyboard/internal/model"
	"github.com/tidyboard/tidyboard/internal/query"
)

// ErrLocalOwnerExists is returned by LocalSetupOwner when an owner has already
// completed the first-run flow. Callers should map to 409 Conflict.
var ErrLocalOwnerExists = errors.New("local owner already exists")

// ErrLocalPasswordTooShort is returned by LocalSetupOwner when the supplied
// password is shorter than auth.MinLocalPasswordLen. Callers should map to 400.
var ErrLocalPasswordTooShort = errors.New("password too short")

// LocalSetupOwner creates the single local-mode owner account for a fresh
// install. Idempotency rule: if any account with a non-NULL password_hash
// already exists, this returns ErrLocalOwnerExists — operators must reset the
// DB or sign in instead. Cloud-mode (Cognito) accounts have password_hash=NULL
// and are ignored by this gate, which lets the mode flip work without a data
// migration.
//
// On success returns the created account and a bearer JWT scoped to it. The
// account has no household/member yet — the caller must complete onboarding
// (POST /v1/households) to create those.
func (s *AuthService) LocalSetupOwner(ctx context.Context, email, password string) (*model.Account, *model.AuthResponse, error) {
	email = strings.ToLower(strings.TrimSpace(email))
	if email == "" {
		return nil, nil, ErrInvalidCredentials
	}

	count, err := s.q.CountAccountsWithPassword(ctx)
	if err != nil {
		return nil, nil, fmt.Errorf("counting local accounts: %w", err)
	}
	if count > 0 {
		return nil, nil, ErrLocalOwnerExists
	}

	hash, err := auth.HashLocalPassword(password)
	if err != nil {
		if errors.Is(err, auth.ErrLocalPasswordTooShort) {
			return nil, nil, ErrLocalPasswordTooShort
		}
		return nil, nil, fmt.Errorf("hashing local password: %w", err)
	}

	hashStr := hash
	acc, err := s.q.CreateAccount(ctx, query.CreateAccountParams{
		ID:           uuid.New(),
		Email:        email,
		PasswordHash: &hashStr,
		// No OIDC linkage in local mode.
		OidcProvider: nil,
		OidcSubject:  nil,
		IsActive:     true,
	})
	if err != nil {
		return nil, nil, fmt.Errorf("creating local owner: %w", err)
	}

	tok, exp, err := s.IssueToken(acc.ID, uuid.Nil, uuid.Nil, "")
	if err != nil {
		return nil, nil, err
	}

	return accountToModel(acc), &model.AuthResponse{
		Token:     tok,
		ExpiresAt: exp,
		Account:   accountToModel(acc),
	}, nil
}

// LocalLogin verifies an email + password against the accounts row and returns
// a fresh bearer JWT. Returns ErrInvalidCredentials for any failure (missing
// account, no password set, bad password) so the handler can return a single
// 401 without leaking which field was wrong.
func (s *AuthService) LocalLogin(ctx context.Context, email, password string) (*model.Account, *model.AuthResponse, error) {
	email = strings.ToLower(strings.TrimSpace(email))
	if email == "" || password == "" {
		return nil, nil, ErrInvalidCredentials
	}

	acc, err := s.q.GetAccountByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil, ErrInvalidCredentials
		}
		return nil, nil, fmt.Errorf("loading local account: %w", err)
	}
	if acc.PasswordHash == nil || *acc.PasswordHash == "" {
		return nil, nil, ErrInvalidCredentials
	}
	if !acc.IsActive {
		return nil, nil, ErrInvalidCredentials
	}
	if err := auth.CheckLocalPassword(*acc.PasswordHash, password); err != nil {
		return nil, nil, ErrInvalidCredentials
	}

	tok, exp, err := s.IssueToken(acc.ID, uuid.Nil, uuid.Nil, "")
	if err != nil {
		return nil, nil, err
	}
	return accountToModel(acc), &model.AuthResponse{
		Token:     tok,
		ExpiresAt: exp,
		Account:   accountToModel(acc),
	}, nil
}

// LocalOwnerExists reports whether at least one account with a password hash
// is present. Used by the handler to map "GET /v1/auth/local/setup" to a
// 200/409 split so the web app can pick the right first-run / login screen.
func (s *AuthService) LocalOwnerExists(ctx context.Context) (bool, error) {
	count, err := s.q.CountAccountsWithPassword(ctx)
	if err != nil {
		return false, fmt.Errorf("counting local accounts: %w", err)
	}
	return count > 0, nil
}

// LocalIssueAt is exposed only for tests that want to assert token freshness.
// Production callers go through IssueToken directly.
var LocalIssueAt = func() time.Time { return time.Now() }
