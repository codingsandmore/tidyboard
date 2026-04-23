package handler

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/tidyboard/tidyboard/internal/handler/respond"
	"github.com/tidyboard/tidyboard/internal/middleware"
	"github.com/tidyboard/tidyboard/internal/query"
	"github.com/tidyboard/tidyboard/internal/service"
)

// CalendarHandler handles calendar management routes.
type CalendarHandler struct {
	q    *query.Queries
	sync *service.SyncService
}

// NewCalendarHandler constructs a CalendarHandler.
func NewCalendarHandler(q *query.Queries, sync *service.SyncService) *CalendarHandler {
	return &CalendarHandler{q: q, sync: sync}
}

// calendarResponse is the JSON shape returned for a calendar.
type calendarResponse struct {
	ID          string `json:"id"`
	HouseholdID string `json:"household_id"`
	Name        string `json:"name"`
	Kind        string `json:"kind"`
	URL         string `json:"url"`
	CreatedAt   string `json:"created_at"`
}

func toCalendarResponse(c query.Calendar) calendarResponse {
	createdAt := ""
	if c.CreatedAt.Valid {
		createdAt = c.CreatedAt.Time.UTC().Format(time.RFC3339)
	}
	return calendarResponse{
		ID:          c.ID.String(),
		HouseholdID: c.HouseholdID.String(),
		Name:        c.Name,
		Kind:        c.Source,
		URL:         c.Url,
		CreatedAt:   createdAt,
	}
}

// List handles GET /v1/calendars — returns all calendars for the household.
func (h *CalendarHandler) List(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}

	cals, err := h.q.ListCalendars(r.Context(), householdID)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "internal_error", "failed to list calendars")
		return
	}

	out := make([]calendarResponse, len(cals))
	for i, c := range cals {
		out[i] = toCalendarResponse(c)
	}
	respond.JSON(w, http.StatusOK, out)
}

type addICalRequest struct {
	Name string `json:"name"`
	URL  string `json:"url"`
}

// AddICal handles POST /v1/calendars/ical — creates an iCal calendar row.
func (h *CalendarHandler) AddICal(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}

	var req addICalRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, http.StatusBadRequest, "bad_request", "invalid JSON body")
		return
	}
	if req.Name == "" || req.URL == "" {
		respond.Error(w, http.StatusBadRequest, "validation_error", "name and url are required")
		return
	}

	cal, err := h.q.CreateCalendar(r.Context(), query.CreateCalendarParams{
		ID:          uuid.New(),
		HouseholdID: householdID,
		Name:        req.Name,
		Source:      "ical_url",
		Url:         req.URL,
	})
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "internal_error", "failed to create calendar")
		return
	}

	respond.JSON(w, http.StatusCreated, toCalendarResponse(cal))
}

type syncICalRequest struct {
	RangeStart time.Time `json:"range_start"`
	RangeEnd   time.Time `json:"range_end"`
}

// SyncICal handles POST /v1/calendars/:id/sync-ical — syncs an iCal calendar.
func (h *CalendarHandler) SyncICal(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}

	calendarID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "bad_request", "invalid calendar ID")
		return
	}

	var req syncICalRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, http.StatusBadRequest, "bad_request", "invalid JSON body")
		return
	}
	if req.RangeStart.IsZero() || req.RangeEnd.IsZero() {
		respond.Error(w, http.StatusBadRequest, "validation_error", "range_start and range_end are required")
		return
	}

	// Fetch the calendar to get its iCal URL.
	cal, err := h.q.GetCalendar(r.Context(), query.GetCalendarParams{
		ID:          calendarID,
		HouseholdID: householdID,
	})
	if err != nil {
		respond.Error(w, http.StatusNotFound, "not_found", "calendar not found")
		return
	}
	if cal.Source != "ical_url" {
		respond.Error(w, http.StatusBadRequest, "bad_request", "calendar is not an iCal URL calendar")
		return
	}

	result, err := h.sync.SyncICalURL(
		r.Context(),
		householdID,
		calendarID,
		cal.Url,
		req.RangeStart.UTC().Format(time.RFC3339),
		req.RangeEnd.UTC().Format(time.RFC3339),
	)
	if err != nil {
		switch err {
		case service.ErrSyncTimeout:
			respond.Error(w, http.StatusGatewayTimeout, "sync_timeout", "calendar sync worker timed out")
		case service.ErrSyncFailed:
			respond.Error(w, http.StatusBadGateway, "sync_failed", "calendar sync worker failed")
		default:
			respond.Error(w, http.StatusInternalServerError, "internal_error", "sync failed")
		}
		return
	}

	respond.JSON(w, http.StatusOK, result)
}

