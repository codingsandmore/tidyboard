//go:build integration

package handler_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"

	"github.com/tidyboard/tidyboard/internal/config"
	"github.com/tidyboard/tidyboard/internal/handler"
	"github.com/tidyboard/tidyboard/internal/query"
	"github.com/tidyboard/tidyboard/internal/service"
	"github.com/tidyboard/tidyboard/internal/testutil"
)

// Email/password Register + Login tests have been removed — Cognito owns
// signup and password auth now. The kiosk PIN flow is the only auth path
// the Go server still implements end-to-end, so it stays under test here.
// Cognito JWT verification has its own coverage in internal/auth.

// TestAuth_PINLogin_NoPin checks the kiosk PIN handler rejects a request for
// a member that doesn't exist with 401 (rather than leaking 404 / 500).
func TestAuth_PINLogin_NoPin(t *testing.T) {
	pool := testutil.SetupTestDB(t)
	q := query.New(pool)
	authSvc := service.NewAuthService(config.AuthConfig{
		JWTSecret: testutil.TestJWTSecret,
	}, q)
	h := handler.NewAuthHandler(authSvc)

	body, _ := json.Marshal(map[string]any{
		"household_id": "00000000-0000-0000-0000-000000000001",
		"member_id":    "00000000-0000-0000-0000-000000000002",
		"pin":          "1234",
	})
	req := httptest.NewRequest(http.MethodPost, "/v1/auth/pin", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	h.PINLogin(rec, req)
	assert.Equal(t, http.StatusUnauthorized, rec.Code)
}
