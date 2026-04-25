package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/tidyboard/tidyboard/internal/config"
	"github.com/tidyboard/tidyboard/internal/model"
	"github.com/tidyboard/tidyboard/internal/query"
	"golang.org/x/crypto/bcrypt"
)

// AuthService handles password hashing, JWT issuance, and PIN authentication.
type AuthService struct {
	cfg config.AuthConfig
	q   *query.Queries
}

// NewAuthService constructs an AuthService.
func NewAuthService(cfg config.AuthConfig, q *query.Queries) *AuthService {
	return &AuthService{cfg: cfg, q: q}
}

// HashPIN returns a bcrypt hash of the 4-6 digit PIN.
func (s *AuthService) HashPIN(pin string) (string, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(pin), bcrypt.DefaultCost)
	if err != nil {
		return "", fmt.Errorf("hashing PIN: %w", err)
	}
	return string(hash), nil
}

// CheckPIN returns nil if pin matches hash.
func (s *AuthService) CheckPIN(hash, pin string) error {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(pin))
}

// IssueToken generates a signed JWT for the given account/household/member context.
func (s *AuthService) IssueToken(accountID, householdID, memberID uuid.UUID, role string) (string, time.Time, error) {
	expiresAt := time.Now().Add(s.cfg.JWTExpiry)
	claims := jwt.MapClaims{
		"sub":          accountID.String(),
		"account_id":   accountID.String(),
		"household_id": householdID.String(),
		"member_id":    memberID.String(),
		"role":         role,
		"exp":          expiresAt.Unix(),
		"iat":          time.Now().Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString([]byte(s.cfg.JWTSecret))
	if err != nil {
		return "", time.Time{}, fmt.Errorf("signing token: %w", err)
	}
	return signed, expiresAt, nil
}

// PINLogin authenticates a child member by PIN and issues a scoped JWT.
func (s *AuthService) PINLogin(ctx context.Context, req model.PINLoginRequest) (*model.AuthResponse, error) {
	mem, err := s.q.GetMember(ctx, query.GetMemberParams{
		ID:          req.MemberID,
		HouseholdID: req.HouseholdID,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrInvalidCredentials
		}
		return nil, fmt.Errorf("fetching member: %w", err)
	}

	if mem.PinHash == nil {
		return nil, ErrInvalidCredentials
	}
	if err := s.CheckPIN(*mem.PinHash, req.PIN); err != nil {
		return nil, ErrInvalidCredentials
	}

	token, expiresAt, err := s.IssueToken(uuid.Nil, req.HouseholdID, mem.ID, mem.Role)
	if err != nil {
		return nil, err
	}

	return &model.AuthResponse{
		Token:     token,
		ExpiresAt: expiresAt,
	}, nil
}

// accountToModel converts a query.Account to a model.Account.
func accountToModel(a query.Account) *model.Account {
	m := &model.Account{
		ID:           a.ID,
		Email:        a.Email,
		IsActive:     a.IsActive,
		OIDCProvider: a.OidcProvider,
		OIDCSubject:  a.OidcSubject,
	}
	if a.CreatedAt.Valid {
		m.CreatedAt = a.CreatedAt.Time
	}
	if a.UpdatedAt.Valid {
		m.UpdatedAt = a.UpdatedAt.Time
	}
	return m
}
