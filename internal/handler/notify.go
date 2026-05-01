package handler

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/tidyboard/tidyboard/internal/handler/respond"
	"github.com/tidyboard/tidyboard/internal/middleware"
	"github.com/tidyboard/tidyboard/internal/service"
)

// NotifyHandler handles notification settings and test routes.
type NotifyHandler struct {
	svc *service.NotifyService
}

// NewNotifyHandler constructs a NotifyHandler.
func NewNotifyHandler(svc *service.NotifyService) *NotifyHandler {
	return &NotifyHandler{svc: svc}
}

// TestNotification handles POST /v1/notify/test.
// Body: {"member_id": "<uuid>"}
func (h *NotifyHandler) TestNotification(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok || householdID == uuid.Nil {
		respond.Error(w, r, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}

	var body struct {
		MemberID string `json:"member_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		respond.Error(w, r, http.StatusBadRequest, "bad_request", "invalid JSON body")
		return
	}
	memberID, err := uuid.Parse(body.MemberID)
	if err != nil {
		respond.Error(w, r, http.StatusBadRequest, "bad_request", "invalid member_id")
		return
	}

	if err := h.svc.SendTestNotification(r.Context(), householdID, memberID); err != nil {
		respond.Error(w, r, http.StatusBadRequest, "bad_request", err.Error())
		return
	}
	respond.JSON(w, http.StatusOK, map[string]string{"status": "sent"})
}

// UpdateMemberNotify handles PATCH /v1/members/:id/notify.
// Body: {"ntfy_topic": "...", "events_enabled": bool, "lists_enabled": bool, "tasks_enabled": bool}
func (h *NotifyHandler) UpdateMemberNotify(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok || householdID == uuid.Nil {
		respond.Error(w, r, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}

	memberID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respond.Error(w, r, http.StatusBadRequest, "bad_request", "invalid member ID")
		return
	}

	var body struct {
		NtfyTopic     *string `json:"ntfy_topic"`
		EventsEnabled bool    `json:"events_enabled"`
		ListsEnabled  bool    `json:"lists_enabled"`
		TasksEnabled  bool    `json:"tasks_enabled"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		respond.Error(w, r, http.StatusBadRequest, "bad_request", "invalid JSON body")
		return
	}

	prefs := service.NotifyPreferences{
		EventsEnabled: body.EventsEnabled,
		ListsEnabled:  body.ListsEnabled,
		TasksEnabled:  body.TasksEnabled,
	}

	if err := h.svc.UpdateMemberNotify(r.Context(), householdID, memberID, body.NtfyTopic, prefs); err != nil {
		respond.Error(w, r, http.StatusInternalServerError, "internal_error", "failed to update notify settings")
		return
	}
	respond.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
}
