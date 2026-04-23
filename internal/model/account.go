package model

import (
	"time"

	"github.com/google/uuid"
)

// Account represents an authenticated user (adult with email/password or OAuth).
// Not household-scoped — one account can belong to multiple households.
type Account struct {
	ID           uuid.UUID  `json:"id"`
	Email        string     `json:"email"`
	PasswordHash string     `json:"-"` // never serialized
	OIDCProvider *string    `json:"oidc_provider,omitempty"`
	OIDCSubject  *string    `json:"oidc_subject,omitempty"`
	IsActive     bool       `json:"is_active"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
}

// CreateAccountRequest is the payload for POST /v1/auth/register.
type CreateAccountRequest struct {
	Email    string `json:"email"    validate:"required,email"`
	Password string `json:"password" validate:"required,min=8"`
}

// LoginRequest is the payload for POST /v1/auth/login.
type LoginRequest struct {
	Email    string `json:"email"    validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

// PINLoginRequest is the payload for POST /v1/auth/pin.
type PINLoginRequest struct {
	HouseholdID uuid.UUID `json:"household_id" validate:"required"`
	MemberID    uuid.UUID `json:"member_id"    validate:"required"`
	PIN         string    `json:"pin"          validate:"required,min=4,max=6,numeric"`
}

// AuthResponse is returned on successful login or registration.
type AuthResponse struct {
	Token        string    `json:"token"`
	RefreshToken string    `json:"refresh_token,omitempty"`
	ExpiresAt    time.Time `json:"expires_at"`
	Account      *Account  `json:"account,omitempty"`
}
