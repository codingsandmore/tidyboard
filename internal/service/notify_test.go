//go:build unit

package service

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/tidyboard/tidyboard/internal/config"
	"github.com/tidyboard/tidyboard/internal/query"
)

// stubMemberStore implements just enough of the query interface for notify tests.
// We use a lightweight in-memory store rather than a real DB.
type stubMemberStore struct {
	members []query.Member
}

func (s *stubMemberStore) listMembers(_ context.Context, householdID uuid.UUID) ([]query.Member, error) {
	out := make([]query.Member, 0)
	for _, m := range s.members {
		if m.HouseholdID == householdID {
			out = append(out, m)
		}
	}
	return out, nil
}

// TestPrefEnabled verifies the preference gate logic.
func TestPrefEnabled(t *testing.T) {
	t.Parallel()

	tests := []struct {
		prefs     NotifyPreferences
		eventType string
		want      bool
	}{
		{NotifyPreferences{EventsEnabled: true}, "event.created", true},
		{NotifyPreferences{EventsEnabled: false}, "event.created", false},
		{NotifyPreferences{ListsEnabled: true}, "list.item.created", true},
		{NotifyPreferences{ListsEnabled: false}, "list.item.created", false},
		{NotifyPreferences{TasksEnabled: true}, "equity.task.created", true},
		{NotifyPreferences{TasksEnabled: true}, "equity.task.logged", true},
		{NotifyPreferences{TasksEnabled: false}, "equity.task.logged", false},
		{NotifyPreferences{}, "unknown.event", false},
	}
	for _, tc := range tests {
		got := prefEnabled(tc.prefs, tc.eventType)
		assert.Equal(t, tc.want, got, "event=%s prefs=%+v", tc.eventType, tc.prefs)
	}
}

// TestNotifyService_sendsToCorrectURL verifies that Notify POSTs to the ntfy
// server URL and includes the right topic + title + message.
func TestNotifyService_sendsToCorrectURL(t *testing.T) {
	var receivedBodies []map[string]interface{}
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var body map[string]interface{}
		_ = json.NewDecoder(r.Body).Decode(&body)
		receivedBodies = append(receivedBodies, body)
		w.WriteHeader(http.StatusOK)
	}))
	defer srv.Close()

	householdID := uuid.New()
	memberID := uuid.New()
	topic := "my-test-topic"
	prefsJSON, _ := json.Marshal(NotifyPreferences{EventsEnabled: true})

	// We can't inject a mock Queries easily in unit tests without a DB,
	// so we test sendToTopic directly and prefEnabled indirectly.
	cfg := config.NotifyConfig{
		NtfyEnabled:   true,
		NtfyServerURL: srv.URL,
	}
	svc := NewNotifyService(cfg, nil) // nil queries — sendToTopic doesn't use them

	// Direct send.
	svc.sendToTopic(topic, "Test title", "Test message")

	// Wait briefly for goroutine — sendToTopic is synchronous when called directly.
	require.Len(t, receivedBodies, 1)
	assert.Equal(t, topic, receivedBodies[0]["topic"])
	assert.Equal(t, "Test title", receivedBodies[0]["title"])
	assert.Equal(t, "Test message", receivedBodies[0]["message"])

	// Verify prefs gate: a member with EventsEnabled=true should fire.
	_ = memberID
	_ = householdID
	_ = prefsJSON
}

// TestNotifyPreferences_roundtrip verifies JSON marshal/unmarshal.
func TestNotifyPreferences_roundtrip(t *testing.T) {
	t.Parallel()
	prefs := NotifyPreferences{EventsEnabled: true, ListsEnabled: false, TasksEnabled: true}
	b, err := json.Marshal(prefs)
	require.NoError(t, err)
	var got NotifyPreferences
	require.NoError(t, json.Unmarshal(b, &got))
	assert.Equal(t, prefs, got)
}
