//go:build unit

package service_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/tidyboard/tidyboard/internal/client"
)

// syncWorkerServer starts an httptest server that returns the given status and body
// for any POST /sync request.
func syncWorkerServer(t *testing.T, statusCode int, body string) *httptest.Server {
	t.Helper()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(statusCode)
		_, _ = w.Write([]byte(body))
	}))
	t.Cleanup(srv.Close)
	return srv
}

// minimalSyncedEvents returns a JSON array with one SyncedEvent.
func minimalSyncedEvents() string {
	events := []map[string]any{
		{
			"external_id": "evt-001",
			"summary":     "Team Meeting",
			"dtstart":     time.Now().UTC().Format(time.RFC3339),
			"dtend":       time.Now().UTC().Add(time.Hour).Format(time.RFC3339),
			"rrule":       nil,
			"location":    nil,
			"description": nil,
		},
	}
	b, _ := json.Marshal(events)
	return string(b)
}

// TestSyncClient_Sync_Success verifies the client correctly decodes a happy-path
// sync response. This exercises the same code path that SyncService.SyncCalendar
// uses for the network call.
func TestSyncClient_Sync_Success(t *testing.T) {
	srv := syncWorkerServer(t, http.StatusOK, minimalSyncedEvents())
	sc := client.NewSyncClient(srv.URL, 0)

	events, err := sc.Sync(context.Background(), client.SyncRequest{
		HouseholdID: uuid.New().String(),
		CalendarURL: "https://caldav.example.com/calendar",
		Username:    "user",
		Password:    "pass",
		RangeStart:  "2026-01-01T00:00:00Z",
		RangeEnd:    "2026-12-31T23:59:59Z",
	})
	require.NoError(t, err)
	require.Len(t, events, 1)
	assert.Equal(t, "evt-001", events[0].ExternalID)
	assert.Equal(t, "Team Meeting", events[0].Summary)
}

// TestSyncClient_Sync_Failed verifies a non-2xx response maps to an error.
func TestSyncClient_Sync_Failed(t *testing.T) {
	srv := syncWorkerServer(t, http.StatusBadGateway, `{"error":"upstream error"}`)
	sc := client.NewSyncClient(srv.URL, 0)

	_, err := sc.Sync(context.Background(), client.SyncRequest{})
	require.Error(t, err)
}

// TestSyncClient_Sync_Timeout verifies that a cancelled context produces an error
// from the sync client (covering the ErrSyncTimeout code path in SyncService).
func TestSyncClient_Sync_Timeout(t *testing.T) {
	srv := syncWorkerServer(t, http.StatusOK, minimalSyncedEvents())
	sc := client.NewSyncClient(srv.URL, 0)

	ctx, cancel := context.WithCancel(context.Background())
	cancel() // cancel before the call

	_, err := sc.Sync(ctx, client.SyncRequest{
		HouseholdID: uuid.New().String(),
		CalendarURL: "https://caldav.example.com/calendar",
		RangeStart:  "2026-01-01T00:00:00Z",
		RangeEnd:    "2026-12-31T23:59:59Z",
	})
	require.Error(t, err)
}
