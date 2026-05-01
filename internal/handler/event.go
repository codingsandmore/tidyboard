package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/tidyboard/tidyboard/internal/handler/respond"
	"github.com/tidyboard/tidyboard/internal/middleware"
	"github.com/tidyboard/tidyboard/internal/model"
	"github.com/tidyboard/tidyboard/internal/service"
)

// EventHandler handles event CRUD routes.
type EventHandler struct {
	svc *service.EventService
}

// NewEventHandler constructs an EventHandler.
func NewEventHandler(svc *service.EventService) *EventHandler {
	return &EventHandler{svc: svc}
}

// List handles GET /v1/events.
// Query params: start, end (RFC3339), member_id (UUID), calendar_id.
func (h *EventHandler) List(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, r, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}

	q := r.URL.Query()
	var start, end time.Time
	if s := q.Get("start"); s != "" {
		if t, err := time.Parse(time.RFC3339, s); err == nil {
			start = t
		}
	}
	if e := q.Get("end"); e != "" {
		if t, err := time.Parse(time.RFC3339, e); err == nil {
			end = t
		}
	}

	var memberID *uuid.UUID
	if m := q.Get("member_id"); m != "" {
		if id, err := uuid.Parse(m); err == nil {
			memberID = &id
		}
	}

	events, err := h.svc.ListInRange(r.Context(), householdID, start, end, memberID)
	if err != nil {
		respond.Error(w, r, http.StatusInternalServerError, "internal_error", "failed to list events")
		return
	}
	respond.JSON(w, http.StatusOK, events)
}

// Create handles POST /v1/events.
func (h *EventHandler) Create(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, r, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}

	var req model.CreateEventRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, r, http.StatusBadRequest, "bad_request", "invalid JSON body")
		return
	}
	if req.Title == "" {
		respond.Error(w, r, http.StatusBadRequest, "validation_error", "title is required")
		return
	}

	event, err := h.svc.Create(r.Context(), householdID, req)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrInvalidMember):
			respond.Error(w, r, http.StatusBadRequest, "invalid_member", "one or more assigned members do not belong to this household")
		default:
			respond.Error(w, r, http.StatusInternalServerError, "internal_error", "failed to create event")
		}
		return
	}
	respond.JSON(w, http.StatusCreated, event)
}

// Get handles GET /v1/events/:id.
func (h *EventHandler) Get(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, r, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respond.Error(w, r, http.StatusBadRequest, "bad_request", "invalid event ID")
		return
	}

	event, err := h.svc.Get(r.Context(), householdID, id)
	if err != nil {
		switch err {
		case service.ErrNotFound:
			respond.Error(w, r, http.StatusNotFound, "not_found", "event not found")
		default:
			respond.Error(w, r, http.StatusInternalServerError, "internal_error", "failed to fetch event")
		}
		return
	}
	respond.JSON(w, http.StatusOK, event)
}

// Update handles PATCH /v1/events/:id.
func (h *EventHandler) Update(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, r, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respond.Error(w, r, http.StatusBadRequest, "bad_request", "invalid event ID")
		return
	}

	var req model.UpdateEventRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, r, http.StatusBadRequest, "bad_request", "invalid JSON body")
		return
	}

	event, err := h.svc.Update(r.Context(), householdID, id, req)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrNotFound):
			respond.Error(w, r, http.StatusNotFound, "not_found", "event not found")
		case errors.Is(err, service.ErrInvalidMember):
			respond.Error(w, r, http.StatusBadRequest, "invalid_member", "one or more assigned members do not belong to this household")
		default:
			respond.Error(w, r, http.StatusInternalServerError, "internal_error", "failed to update event")
		}
		return
	}
	respond.JSON(w, http.StatusOK, event)
}

// Delete handles DELETE /v1/events/:id.
func (h *EventHandler) Delete(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, r, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respond.Error(w, r, http.StatusBadRequest, "bad_request", "invalid event ID")
		return
	}

	if err := h.svc.Delete(r.Context(), householdID, id); err != nil {
		switch err {
		case service.ErrNotFound:
			respond.Error(w, r, http.StatusNotFound, "not_found", "event not found")
		default:
			respond.Error(w, r, http.StatusInternalServerError, "internal_error", "failed to delete event")
		}
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
