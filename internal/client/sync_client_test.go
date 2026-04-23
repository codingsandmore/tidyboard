//go:build unit

package client_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/tidyboard/tidyboard/internal/client"
)

func TestSyncClient_Health_OK(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, http.MethodGet, r.Method)
		assert.Equal(t, "/health", r.URL.Path)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"ok"}`))
	}))
	defer srv.Close()

	c := client.NewSyncClient(srv.URL, 5*time.Second)
	err := c.Health(context.Background())
	require.NoError(t, err)
}

func TestSyncClient_Health_ServiceDown(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusServiceUnavailable)
		_, _ = w.Write([]byte(`{"detail":"down"}`))
	}))
	defer srv.Close()

	c := client.NewSyncClient(srv.URL, 5*time.Second, client.WithSyncRetries(0))
	err := c.Health(context.Background())
	require.Error(t, err)
	assert.Contains(t, err.Error(), "503")
}

func TestSyncClient_Sync_ParsesResponse(t *testing.T) {
	rrule := "FREQ=WEEKLY;BYDAY=MO"
	loc := "Conference Room A"
	events := []map[string]any{
		{
			"external_id": "abc-123",
			"summary":     "Team Standup",
			"dtstart":     "2024-01-15T09:00:00Z",
			"dtend":       "2024-01-15T09:30:00Z",
			"rrule":       rrule,
			"location":    loc,
			"description": nil,
		},
		{
			"external_id": "def-456",
			"summary":     "Lunch",
			"dtstart":     "2024-01-15T12:00:00Z",
			"dtend":       "2024-01-15T13:00:00Z",
			"rrule":       nil,
			"location":    nil,
			"description": nil,
		},
	}

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, http.MethodPost, r.Method)
		assert.Equal(t, "/sync", r.URL.Path)
		assert.Equal(t, "application/json", r.Header.Get("Content-Type"))

		// Verify request body fields (no password logged, but body is structurally valid)
		var body map[string]any
		require.NoError(t, json.NewDecoder(r.Body).Decode(&body))
		assert.Equal(t, "household-uuid", body["household_id"])
		assert.Equal(t, "testuser", body["username"])

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		require.NoError(t, json.NewEncoder(w).Encode(events))
	}))
	defer srv.Close()

	c := client.NewSyncClient(srv.URL, 5*time.Second)
	req := client.SyncRequest{
		HouseholdID: "household-uuid",
		CalendarURL: "https://caldav.example.com/cal",
		Username:    "testuser",
		Password:    "s3cret",
		RangeStart:  "2024-01-01T00:00:00Z",
		RangeEnd:    "2024-02-01T00:00:00Z",
	}

	got, err := c.Sync(context.Background(), req)
	require.NoError(t, err)
	require.Len(t, got, 2)

	assert.Equal(t, "abc-123", got[0].ExternalID)
	assert.Equal(t, "Team Standup", got[0].Summary)
	assert.Equal(t, "2024-01-15T09:00:00Z", got[0].DTStart)
	assert.Equal(t, "2024-01-15T09:30:00Z", got[0].DTEnd)
	require.NotNil(t, got[0].RRule)
	assert.Equal(t, rrule, *got[0].RRule)
	require.NotNil(t, got[0].Location)
	assert.Equal(t, loc, *got[0].Location)
	assert.Nil(t, got[0].Description)

	assert.Equal(t, "def-456", got[1].ExternalID)
	assert.Nil(t, got[1].RRule)
	assert.Nil(t, got[1].Location)
}

func TestSyncClient_Sync_5xxTriggersRetry(t *testing.T) {
	var callCount atomic.Int32

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		n := callCount.Add(1)
		if n == 1 {
			// First call: 500
			w.WriteHeader(http.StatusInternalServerError)
			_, _ = w.Write([]byte(`{"detail":"transient error"}`))
			return
		}
		// Second call: success
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`[{"external_id":"x","summary":"s","dtstart":"","dtend":"","rrule":null,"location":null,"description":null}]`))
	}))
	defer srv.Close()

	// maxRetries=1 means up to 2 attempts total
	c := client.NewSyncClient(srv.URL, 5*time.Second, client.WithSyncRetries(1))
	got, err := c.Sync(context.Background(), client.SyncRequest{
		HouseholdID: "h",
		CalendarURL: "https://cal.example.com",
		Username:    "u",
		Password:    "p",
		RangeStart:  "2024-01-01T00:00:00Z",
		RangeEnd:    "2024-02-01T00:00:00Z",
	})
	require.NoError(t, err)
	assert.Len(t, got, 1)
	assert.EqualValues(t, 2, callCount.Load())
}

func TestSyncClient_Sync_5xxExhaustsRetries(t *testing.T) {
	var callCount atomic.Int32

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		callCount.Add(1)
		w.WriteHeader(http.StatusBadGateway)
		_, _ = w.Write([]byte(`{"detail":"bad gateway"}`))
	}))
	defer srv.Close()

	c := client.NewSyncClient(srv.URL, 5*time.Second, client.WithSyncRetries(2))
	_, err := c.Sync(context.Background(), client.SyncRequest{
		HouseholdID: "h",
		CalendarURL: "https://cal.example.com",
		Username:    "u",
		Password:    "p",
		RangeStart:  "2024-01-01T00:00:00Z",
		RangeEnd:    "2024-02-01T00:00:00Z",
	})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "502")
	assert.EqualValues(t, 3, callCount.Load()) // 1 initial + 2 retries
}

func TestSyncClient_Sync_ContextCancellation(t *testing.T) {
	started := make(chan struct{}, 1)
	// The server signals it has started handling, then sleeps briefly so the
	// client's context cancellation races cleanly without blocking the server
	// goroutine indefinitely (which would cause httptest.Server.Close to hang).
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		started <- struct{}{}
		// Give the client time to cancel, but don't block forever.
		select {
		case <-r.Context().Done():
		case <-time.After(2 * time.Second):
		}
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`[]`))
	}))
	defer srv.Close()

	ctx, cancel := context.WithCancel(context.Background())

	c := client.NewSyncClient(srv.URL, 5*time.Second, client.WithSyncRetries(0))

	done := make(chan error, 1)
	go func() {
		_, err := c.Sync(ctx, client.SyncRequest{
			HouseholdID: "h",
			CalendarURL: "https://cal.example.com",
			Username:    "u",
			Password:    "p",
			RangeStart:  "2024-01-01T00:00:00Z",
			RangeEnd:    "2024-02-01T00:00:00Z",
		})
		done <- err
	}()

	<-started
	cancel()

	select {
	case err := <-done:
		require.Error(t, err)
		assert.Contains(t, err.Error(), "context canceled")
	case <-time.After(3 * time.Second):
		t.Fatal("Sync did not abort after context cancellation")
	}
}

func TestSyncClient_HTTPError_StatusAndBody(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusUnprocessableEntity)
		_, _ = w.Write([]byte(`{"detail":"invalid date range"}`))
	}))
	defer srv.Close()

	c := client.NewSyncClient(srv.URL, 5*time.Second, client.WithSyncRetries(0))
	_, err := c.Sync(context.Background(), client.SyncRequest{
		HouseholdID: "h",
		CalendarURL: "https://cal.example.com",
		Username:    "u",
		Password:    "p",
		RangeStart:  "bad",
		RangeEnd:    "bad",
	})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "422")
	assert.Contains(t, err.Error(), "invalid date range")
}
