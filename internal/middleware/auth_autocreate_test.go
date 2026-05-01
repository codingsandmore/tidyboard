//go:build integration

package middleware_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"github.com/tidyboard/tidyboard/internal/auth"
	"github.com/tidyboard/tidyboard/internal/config"
	"github.com/tidyboard/tidyboard/internal/handler"
	"github.com/tidyboard/tidyboard/internal/middleware"
	"github.com/tidyboard/tidyboard/internal/query"
	"github.com/tidyboard/tidyboard/internal/service"
	"github.com/tidyboard/tidyboard/internal/testutil"
)

type staticVerifier struct {
	identity *auth.Identity
}

func (v staticVerifier) Verify(context.Context, string) (*auth.Identity, error) {
	return v.identity, nil
}

func TestAuthCreatesStarterHouseholdForNewCognitoAccount(t *testing.T) {
	pool := testutil.SetupTestDB(t)
	q := query.New(pool)
	authSvc := service.NewAuthService(config.AuthConfig{JWTSecret: testutil.TestJWTSecret}, q)
	authH := handler.NewAuthHandler(authSvc)

	verifier := staticVerifier{identity: &auth.Identity{
		Subject:  "cognito-user-without-household",
		Email:    "new-user@example.com",
		Provider: "cognito",
	}}

	r := chi.NewRouter()
	r.Use(middleware.Auth(verifier, q))
	r.Get("/v1/auth/me", authH.Me)

	srv := httptest.NewServer(r)
	t.Cleanup(srv.Close)

	req, err := http.NewRequest(http.MethodGet, srv.URL+"/v1/auth/me", nil)
	require.NoError(t, err)
	req.Header.Set("Authorization", "Bearer valid-cognito-token")

	resp, err := http.DefaultClient.Do(req)
	require.NoError(t, err)
	defer resp.Body.Close()
	require.Equal(t, http.StatusOK, resp.StatusCode)

	var me map[string]any
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&me))
	householdID, ok := me["household_id"].(string)
	require.True(t, ok)
	memberID, ok := me["member_id"].(string)
	require.True(t, ok)
	require.NotEqual(t, uuid.Nil.String(), householdID)
	require.NotEqual(t, uuid.Nil.String(), memberID)
	require.Equal(t, "admin", me["role"])

	households, err := q.ListHouseholdsByAccount(context.Background(), &uuid.NullUUID{
		UUID:  uuid.MustParse(me["account_id"].(string)),
		Valid: true,
	})
	require.NoError(t, err)
	require.Len(t, households, 1)
	require.Equal(t, "My household", households[0].Name)
}
