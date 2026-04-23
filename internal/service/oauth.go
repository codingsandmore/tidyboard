package service

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"net/http"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/tidyboard/tidyboard/internal/config"
	"github.com/tidyboard/tidyboard/internal/query"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

// ErrOAuthNotConfigured is returned when Google OAuth is not enabled.
var ErrOAuthNotConfigured = errors.New("google oauth is not configured")

// ErrInvalidOAuthState is returned when the OAuth state doesn't match.
var ErrInvalidOAuthState = errors.New("invalid or expired oauth state")

// oauthStateEntry holds the account ID and expiry for a pending OAuth flow.
type oauthStateEntry struct {
	accountID uuid.UUID
	expiresAt time.Time
}

// OAuthService handles Google OAuth flows and token persistence.
type OAuthService struct {
	cfg         config.OAuthConfig
	q           *query.Queries
	oauthConfig *oauth2.Config

	mu     sync.Mutex
	states map[string]oauthStateEntry
}

// NewOAuthService constructs an OAuthService.
func NewOAuthService(cfg config.OAuthConfig, q *query.Queries) *OAuthService {
	var oauthCfg *oauth2.Config
	if cfg.GoogleEnabled && cfg.GoogleClientID != "" {
		oauthCfg = &oauth2.Config{
			ClientID:     cfg.GoogleClientID,
			ClientSecret: cfg.GoogleClientSecret,
			RedirectURL:  "", // set at startup or per-request
			Scopes: []string{
				"openid",
				"https://www.googleapis.com/auth/calendar",
			},
			Endpoint: google.Endpoint,
		}
	}
	return &OAuthService{
		cfg:         cfg,
		q:           q,
		oauthConfig: oauthCfg,
		states:      make(map[string]oauthStateEntry),
	}
}

// SetRedirectURL allows configuring the OAuth callback URL at runtime.
func (s *OAuthService) SetRedirectURL(u string) {
	if s.oauthConfig != nil {
		s.oauthConfig.RedirectURL = u
	}
}

// StartFlow generates a state token, stores it, and returns the Google redirect URL.
func (s *OAuthService) StartFlow(ctx context.Context, accountID uuid.UUID) (redirectURL, state string, err error) {
	if !s.cfg.GoogleEnabled || s.oauthConfig == nil {
		return "", "", ErrOAuthNotConfigured
	}

	// Generate cryptographically random state.
	raw := make([]byte, 24)
	if _, err = rand.Read(raw); err != nil {
		return "", "", fmt.Errorf("generating oauth state: %w", err)
	}
	state = base64.URLEncoding.EncodeToString(raw)

	s.mu.Lock()
	s.states[state] = oauthStateEntry{
		accountID: accountID,
		expiresAt: time.Now().Add(10 * time.Minute),
	}
	s.mu.Unlock()

	// Clean up stale states opportunistically.
	go s.purgeExpiredStates()

	redirectURL = s.oauthConfig.AuthCodeURL(state, oauth2.AccessTypeOffline)
	return redirectURL, state, nil
}

// HandleCallback exchanges the code for a token, validates state, and stores the token.
func (s *OAuthService) HandleCallback(ctx context.Context, code, state string) error {
	if !s.cfg.GoogleEnabled || s.oauthConfig == nil {
		return ErrOAuthNotConfigured
	}

	s.mu.Lock()
	entry, ok := s.states[state]
	if ok {
		delete(s.states, state)
	}
	s.mu.Unlock()

	if !ok || time.Now().After(entry.expiresAt) {
		return ErrInvalidOAuthState
	}

	token, err := s.oauthConfig.Exchange(ctx, code)
	if err != nil {
		return fmt.Errorf("exchanging oauth code: %w", err)
	}

	expiry := pgtype.Timestamptz{Valid: false}
	if !token.Expiry.IsZero() {
		expiry = pgtype.Timestamptz{Time: token.Expiry.UTC(), Valid: true}
	}

	// TODO(crypto): encrypt tokens before storage. Currently stored as-is.
	// NEVER log token values.
	_, err = s.q.UpsertOAuthToken(ctx, query.UpsertOAuthTokenParams{
		AccountID:             entry.accountID,
		Provider:              "google",
		AccessTokenEncrypted:  token.AccessToken,  // TODO(crypto)
		RefreshTokenEncrypted: token.RefreshToken, // TODO(crypto)
		TokenExpiry:           expiry,
		Scopes:                s.oauthConfig.Scopes,
	})
	if err != nil {
		return fmt.Errorf("persisting oauth token: %w", err)
	}
	return nil
}

// GetClient returns an oauth2 HTTP client that auto-refreshes the token.
func (s *OAuthService) GetClient(ctx context.Context, accountID uuid.UUID) (*http.Client, error) {
	if !s.cfg.GoogleEnabled || s.oauthConfig == nil {
		return nil, ErrOAuthNotConfigured
	}

	row, err := s.q.GetOAuthToken(ctx, query.GetOAuthTokenParams{
		AccountID: accountID,
		Provider:  "google",
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("fetching oauth token: %w", err)
	}

	// TODO(crypto): decrypt tokens before use.
	tok := &oauth2.Token{
		AccessToken:  row.AccessTokenEncrypted,  // TODO(crypto)
		RefreshToken: row.RefreshTokenEncrypted, // TODO(crypto)
	}
	if row.TokenExpiry.Valid {
		tok.Expiry = row.TokenExpiry.Time
	}

	return s.oauthConfig.Client(ctx, tok), nil
}

func (s *OAuthService) purgeExpiredStates() {
	now := time.Now()
	s.mu.Lock()
	defer s.mu.Unlock()
	for k, v := range s.states {
		if now.After(v.expiresAt) {
			delete(s.states, k)
		}
	}
}
