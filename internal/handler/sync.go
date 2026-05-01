package handler

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/tidyboard/tidyboard/internal/handler/respond"
	"github.com/tidyboard/tidyboard/internal/middleware"
	"github.com/tidyboard/tidyboard/internal/service"
)

// SyncHandler handles calendar sync routes.
type SyncHandler struct {
	svc *service.SyncService
}

// NewSyncHandler constructs a SyncHandler.
func NewSyncHandler(svc *service.SyncService) *SyncHandler {
	return &SyncHandler{svc: svc}
}

type syncRequest struct {
	RangeStart time.Time `json:"range_start"`
	RangeEnd   time.Time `json:"range_end"`
}

// Sync handles POST /v1/calendars/{id}/sync.
func (h *SyncHandler) Sync(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, r, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}

	calendarID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respond.Error(w, r, http.StatusBadRequest, "bad_request", "invalid calendar ID")
		return
	}

	var req syncRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, r, http.StatusBadRequest, "bad_request", "invalid JSON body")
		return
	}
	if req.RangeStart.IsZero() || req.RangeEnd.IsZero() {
		respond.Error(w, r, http.StatusBadRequest, "validation_error", "range_start and range_end are required")
		return
	}

	result, err := h.svc.SyncCalendar(r.Context(), householdID, calendarID, req.RangeStart, req.RangeEnd)
	if err != nil {
		switch err {
		case service.ErrNotFound:
			respond.Error(w, r, http.StatusNotFound, "not_found", "calendar not found")
		case service.ErrSyncTimeout:
			respond.Error(w, r, http.StatusGatewayTimeout, "sync_timeout", "calendar sync worker timed out")
		case service.ErrSyncFailed:
			respond.Error(w, r, http.StatusBadGateway, "sync_failed", "calendar sync worker failed")
		default:
			respond.Error(w, r, http.StatusInternalServerError, "internal_error", "sync failed")
		}
		return
	}

	respond.JSON(w, http.StatusOK, result)
}
