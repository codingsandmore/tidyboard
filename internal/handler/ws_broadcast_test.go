//go:build integration

package handler_test

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/coder/websocket"
	"github.com/coder/websocket/wsjson"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/tidyboard/tidyboard/internal/auth"
	"github.com/tidyboard/tidyboard/internal/broadcast"
	"github.com/tidyboard/tidyboard/internal/config"
	"github.com/tidyboard/tidyboard/internal/handler"
	"github.com/tidyboard/tidyboard/internal/middleware"
	"github.com/tidyboard/tidyboard/internal/model"
	"github.com/tidyboard/tidyboard/internal/query"
	"github.com/tidyboard/tidyboard/internal/service"
	"github.com/tidyboard/tidyboard/internal/testutil"
)

// setupWSBroadcastFixture creates one account, one household, and two members.
// Returns a test server handling POST /v1/events and GET /v1/ws,
// plus JWTs for each member (both scoped to the same household).
func setupWSBroadcastFixture(t *testing.T) (srv *httptest.Server, tokenA, tokenB string) {
	t.Helper()
	pool := testutil.SetupTestDB(t)
	q := query.New(pool)
	ctx := context.Background()
	hash := "$2a$10$wIq1V7o4.LXZK5bY5b5b5OyZQZ5b5b5b5b5b5b5b5b5b5b5b5b5b"

	// Single account that owns the household.
	acc, err := q.CreateAccount(ctx, query.CreateAccountParams{
		ID:           uuid.New(),
		Email:        fmt.Sprintf("ws-%s@test.com", uuid.New().String()),
		PasswordHash: &hash,
		IsActive:     true,
	})
	require.NoError(t, err)

	authSvc := service.NewAuthService(config.AuthConfig{JWTSecret: testutil.TestJWTSecret}, q)
	hhSvc := service.NewHouseholdService(q)
	hh, err := hhSvc.Create(ctx, acc.ID, model.CreateHouseholdRequest{
		Name:     "WS Broadcast Test Family",
		Timezone: "UTC",
	})
	require.NoError(t, err)

	memberSvc := service.NewMemberService(q, authSvc)

	// Two members in the same household.
	memA, err := memberSvc.Create(ctx, hh.ID, model.CreateMemberRequest{
		Name: "Poster", DisplayName: "Poster", Color: "#FF0000", Role: "admin", AgeGroup: "adult",
	})
	require.NoError(t, err)

	memB, err := memberSvc.Create(ctx, hh.ID, model.CreateMemberRequest{
		Name: "Listener", DisplayName: "Listener", Color: "#00FF00", Role: "admin", AgeGroup: "adult",
	})
	require.NoError(t, err)

	// Both tokens reference the same account and household but different member IDs.
	tokenA = testutil.MakeJWT(acc.ID, hh.ID, memA.ID, "admin")
	tokenB = testutil.MakeJWT(acc.ID, hh.ID, memB.ID, "admin")

	bc := broadcast.NewMemoryBroadcaster()
	auditSvc := service.NewAuditService(q)
	eventSvc := service.NewEventService(q, bc, auditSvc)
	eventHandler := handler.NewEventHandler(eventSvc)

	verifier, err := auth.NewVerifier(ctx, config.AuthConfig{JWTSecret: testutil.TestJWTSecret})
	require.NoError(t, err)

	wsHandler := handler.NewWSHandler(bc, verifier, q)

	r := chi.NewRouter()
	r.With(middleware.Auth(verifier, q)).Post("/v1/events", eventHandler.Create)
	r.Get("/v1/ws", wsHandler.ServeWS)

	srv = httptest.NewServer(r)
	t.Cleanup(srv.Close)
	return
}

// TestWSBroadcast_TwoClients verifies that when member A creates an event,
// member B (connected via WebSocket to the same household channel) receives
// the broadcast within 1 second.
func TestWSBroadcast_TwoClients(t *testing.T) {
	srv, tokenA, tokenB := setupWSBroadcastFixture(t)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Connect client B as WebSocket listener using the ?token= query param.
	wsURL := "ws" + srv.URL[4:] + "/v1/ws?token=" + tokenB
	conn, _, err := websocket.Dial(ctx, wsURL, nil)
	require.NoError(t, err, "WS dial for client B failed")
	defer conn.CloseNow()

	// Small pause so the subscription is registered in the broadcaster before publish.
	time.Sleep(50 * time.Millisecond)

	// Client A creates an event via HTTP POST.
	now := time.Now().UTC()
	body, _ := json.Marshal(map[string]any{
		"title":      "WS Broadcast Test Event",
		"start_time": now.Add(time.Hour).Format(time.RFC3339),
		"end_time":   now.Add(2 * time.Hour).Format(time.RFC3339),
		"all_day":    false,
	})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, srv.URL+"/v1/events", bytes.NewReader(body))
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+tokenA)

	resp, err := http.DefaultClient.Do(req)
	require.NoError(t, err)
	defer resp.Body.Close()
	assert.Equal(t, http.StatusCreated, resp.StatusCode, "event creation should succeed")

	// Client B must receive an event.created broadcast within 1 second.
	readCtx, readCancel := context.WithTimeout(context.Background(), time.Second)
	defer readCancel()

	var msg broadcast.Event
	err = wsjson.Read(readCtx, conn, &msg)
	require.NoError(t, err, "client B did not receive a WS broadcast within 1s")
	assert.Equal(t, "event.created", msg.Type)
}
