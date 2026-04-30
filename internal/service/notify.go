package service

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/tidyboard/tidyboard/internal/config"
	"github.com/tidyboard/tidyboard/internal/query"
)

// NotifyPreferences is the per-member preference set stored in
// members.notification_preferences as JSON.
type NotifyPreferences struct {
	EventsEnabled bool `json:"events_enabled"`
	ListsEnabled  bool `json:"lists_enabled"`
	TasksEnabled  bool `json:"tasks_enabled"`
}

// NotifyService sends push notifications via ntfy.sh.
// All sends run in goroutines so callers are never blocked.
// Errors are logged but never fatal.
type NotifyService struct {
	cfg    config.NotifyConfig
	q      *query.Queries
	client *http.Client
}

// NewNotifyService constructs a NotifyService.
func NewNotifyService(cfg config.NotifyConfig, q *query.Queries) *NotifyService {
	return &NotifyService{
		cfg: cfg,
		q:   q,
		client: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

// ntfyPayload is the JSON body sent to ntfy.sh.
type ntfyPayload struct {
	Topic    string `json:"topic"`
	Title    string `json:"title"`
	Message  string `json:"message"`
	Priority int    `json:"priority,omitempty"`
}

// sendToTopic posts a notification to a single ntfy topic.
func (s *NotifyService) sendToTopic(topic, title, message string) {
	if topic == "" {
		return
	}
	payload := ntfyPayload{
		Topic:   topic,
		Title:   title,
		Message: message,
	}
	body, err := json.Marshal(payload)
	if err != nil {
		slog.Warn("notify: failed to marshal payload", "err", err)
		return
	}

	serverURL := s.cfg.NtfyServerURL
	if serverURL == "" {
		serverURL = "https://ntfy.sh"
	}

	req, err := http.NewRequestWithContext(context.Background(), http.MethodPost, serverURL, bytes.NewReader(body))
	if err != nil {
		slog.Warn("notify: failed to build request", "err", err)
		return
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.client.Do(req)
	if err != nil {
		slog.Warn("notify: HTTP error", "topic", topic, "err", err)
		return
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 400 {
		slog.Warn("notify: bad status from ntfy", "topic", topic, "status", resp.StatusCode)
	}
}

// Notify sends a notification to all members of a household who have the
// relevant preference enabled and have set an ntfy_topic.
// The eventType parameter controls which preference gate to check:
//
//	"event.created"         → events_enabled
//	"list.item.created"     → lists_enabled
//	"equity.task.created"   → tasks_enabled
//	"equity.task.logged"    → tasks_enabled
func (s *NotifyService) Notify(ctx context.Context, householdID uuid.UUID, eventType string, title, message string) {
	if !s.cfg.NtfyEnabled {
		return
	}

	members, err := s.q.ListMembers(ctx, householdID)
	if err != nil {
		slog.Warn("notify: failed to list members", "err", err, "household_id", householdID)
		return
	}

	for _, m := range members {
		m := m // capture for goroutine
		topic := ""
		if m.NtfyTopic != nil {
			topic = *m.NtfyTopic
		}
		if topic == "" {
			continue
		}

		var prefs NotifyPreferences
		if len(m.NotificationPreferences) > 0 {
			_ = json.Unmarshal(m.NotificationPreferences, &prefs)
		}

		if !prefEnabled(prefs, eventType) {
			continue
		}

		go s.sendToTopic(topic, title, message)
	}
}

// SendTestNotification sends a test push to a single member's ntfy topic.
// Returns an error if the member has no topic configured.
func (s *NotifyService) SendTestNotification(ctx context.Context, householdID, memberID uuid.UUID) error {
	m, err := s.q.GetMember(ctx, query.GetMemberParams{
		ID:          memberID,
		HouseholdID: householdID,
	})
	if err != nil {
		return fmt.Errorf("member not found: %w", err)
	}
	if m.NtfyTopic == nil || *m.NtfyTopic == "" {
		return fmt.Errorf("member has no ntfy_topic configured")
	}

	go s.sendToTopic(*m.NtfyTopic, "Tidyboard test", "Push notifications are working!")
	return nil
}

// UpdateMemberNotify persists ntfy_topic and notification_preferences for a member.
func (s *NotifyService) UpdateMemberNotify(ctx context.Context, householdID, memberID uuid.UUID, topic *string, prefs NotifyPreferences) error {
	prefsJSON, err := json.Marshal(prefs)
	if err != nil {
		return fmt.Errorf("marshaling prefs: %w", err)
	}
	_, err = s.q.UpdateMemberNotify(ctx, query.UpdateMemberNotifyParams{
		ID:                      memberID,
		HouseholdID:             householdID,
		NtfyTopic:               topic,
		NotificationPreferences: prefsJSON,
	})
	if err != nil {
		return fmt.Errorf("updating member notify: %w", err)
	}
	return nil
}

// prefEnabled returns true when the event type's corresponding preference flag is set.
func prefEnabled(prefs NotifyPreferences, eventType string) bool {
	switch eventType {
	case "event.created":
		return prefs.EventsEnabled
	case "list.item.created":
		return prefs.ListsEnabled
	case "equity.task.created", "equity.task.logged":
		return prefs.TasksEnabled
	default:
		return false
	}
}
