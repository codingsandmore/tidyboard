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
	"github.com/tidyboard/tidyboard/internal/query"
	"github.com/tidyboard/tidyboard/internal/service"
)

// ChoreTimerHandler exposes timer-start/stop, manual-entry, and member-summary
// endpoints. It depends on ChoreTimerService for business logic and on the
// generated *query.Queries for chore-existence + ownership checks.
type ChoreTimerHandler struct {
	svc *service.ChoreTimerService
	q   *query.Queries
}

// NewChoreTimerHandler constructs a ChoreTimerHandler.
func NewChoreTimerHandler(svc *service.ChoreTimerService, q *query.Queries) *ChoreTimerHandler {
	return &ChoreTimerHandler{svc: svc, q: q}
}

// resolveChore fetches a chore in the caller's household. Returns an HTTP-ready
// error response if the chore does not exist or the household context is
// missing. Returns the chore + true on success.
func (h *ChoreTimerHandler) resolveChore(w http.ResponseWriter, r *http.Request) (query.Chore, bool) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, r, http.StatusUnauthorized, "unauthorized", "missing household context")
		return query.Chore{}, false
	}
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respond.Error(w, r, http.StatusBadRequest, "bad_request", "invalid chore ID")
		return query.Chore{}, false
	}
	chore, err := h.q.GetChore(r.Context(), query.GetChoreParams{
		ID:          id,
		HouseholdID: householdID,
	})
	if err != nil {
		respond.Error(w, r, http.StatusNotFound, "not_found", "chore not found")
		return query.Chore{}, false
	}
	return chore, true
}

// callerMember returns the authenticated member ID, or writes a 401 and
// returns false.
func callerMember(w http.ResponseWriter, r *http.Request) (uuid.UUID, bool) {
	id, ok := middleware.MemberIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, r, http.StatusUnauthorized, "unauthorized", "missing member context")
		return uuid.UUID{}, false
	}
	return id, true
}

// StartTimer handles POST /v1/chores/{id}/timer/start.
// Member is taken from auth context; if a timer is already running for
// (chore, member) it returns 409 with code "timer_already_running".
func (h *ChoreTimerHandler) StartTimer(w http.ResponseWriter, r *http.Request) {
	chore, ok := h.resolveChore(w, r)
	if !ok {
		return
	}
	memberID, ok := callerMember(w, r)
	if !ok {
		return
	}

	entry, err := h.svc.Start(r.Context(), chore.ID, memberID)
	if err != nil {
		if errors.Is(err, service.ErrTimerAlreadyRunning) {
			respond.Error(w, r, http.StatusConflict, "timer_already_running", "a timer is already running for this chore")
			return
		}
		respond.Error(w, r, http.StatusInternalServerError, "internal_error", "failed to start timer")
		return
	}
	respond.JSON(w, http.StatusCreated, entry)
}

// StopTimer handles POST /v1/chores/{id}/timer/stop.
// ended_at is server-set; client value (if any) is ignored.
func (h *ChoreTimerHandler) StopTimer(w http.ResponseWriter, r *http.Request) {
	chore, ok := h.resolveChore(w, r)
	if !ok {
		return
	}
	memberID, ok := callerMember(w, r)
	if !ok {
		return
	}

	entry, err := h.svc.Stop(r.Context(), chore.ID, memberID)
	if err != nil {
		if errors.Is(err, service.ErrNoOpenTimer) {
			respond.Error(w, r, http.StatusConflict, "no_open_timer", "no timer is currently running for this chore")
			return
		}
		respond.Error(w, r, http.StatusInternalServerError, "internal_error", "failed to stop timer")
		return
	}
	respond.JSON(w, http.StatusOK, entry)
}

// manualEntryRequest is the JSON body for POST /v1/chores/{id}/time-entries.
type manualEntryRequest struct {
	MemberID  string `json:"member_id"`
	StartedAt string `json:"started_at"`
	EndedAt   string `json:"ended_at"`
	Note      string `json:"note"`
}

// CreateManualEntry handles POST /v1/chores/{id}/time-entries.
// member_id defaults to the caller; admins may record on behalf of another
// member in the same household.
func (h *ChoreTimerHandler) CreateManualEntry(w http.ResponseWriter, r *http.Request) {
	chore, ok := h.resolveChore(w, r)
	if !ok {
		return
	}
	caller, ok := callerMember(w, r)
	if !ok {
		return
	}

	var req manualEntryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, r, http.StatusBadRequest, "bad_request", "invalid JSON body")
		return
	}

	memberID := caller
	if req.MemberID != "" {
		parsed, err := uuid.Parse(req.MemberID)
		if err != nil {
			respond.Error(w, r, http.StatusBadRequest, "validation_error", "invalid member_id")
			return
		}
		// Non-admins may only record their own entries.
		if parsed != caller && !isAdmin(middleware.RoleFromCtx(r.Context())) {
			respond.Error(w, r, http.StatusForbidden, "forbidden", "you can only record time for yourself")
			return
		}
		memberID = parsed
	}

	startedAt, err := time.Parse(time.RFC3339, req.StartedAt)
	if err != nil {
		respond.Error(w, r, http.StatusBadRequest, "validation_error", "started_at must be RFC3339")
		return
	}
	endedAt, err := time.Parse(time.RFC3339, req.EndedAt)
	if err != nil {
		respond.Error(w, r, http.StatusBadRequest, "validation_error", "ended_at must be RFC3339")
		return
	}

	entry, err := h.svc.RecordManualEntry(r.Context(), service.ManualEntryInput{
		ChoreID:   chore.ID,
		MemberID:  memberID,
		StartedAt: startedAt,
		EndedAt:   endedAt,
		Note:      req.Note,
	})
	if err != nil {
		respond.Error(w, r, http.StatusBadRequest, "validation_error", err.Error())
		return
	}
	respond.JSON(w, http.StatusCreated, entry)
}

// MemberSummary handles GET /v1/members/{id}/time-summary?from=&to=.
// Defaults to the last 7 days when no range is supplied.
func (h *ChoreTimerHandler) MemberSummary(w http.ResponseWriter, r *http.Request) {
	if _, ok := middleware.HouseholdIDFromCtx(r.Context()); !ok {
		respond.Error(w, r, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}
	memberID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respond.Error(w, r, http.StatusBadRequest, "bad_request", "invalid member ID")
		return
	}

	q := r.URL.Query()
	now := time.Now().UTC()
	from := now.AddDate(0, 0, -7)
	to := now

	if f := q.Get("from"); f != "" {
		if t, err := parseFlexibleTime(f); err == nil {
			from = t
		} else {
			respond.Error(w, r, http.StatusBadRequest, "bad_request", "from must be RFC3339 or YYYY-MM-DD")
			return
		}
	}
	if t := q.Get("to"); t != "" {
		if parsed, err := parseFlexibleTime(t); err == nil {
			to = parsed
		} else {
			respond.Error(w, r, http.StatusBadRequest, "bad_request", "to must be RFC3339 or YYYY-MM-DD")
			return
		}
	}

	if !from.Before(to) {
		respond.Error(w, r, http.StatusBadRequest, "validation_error", "from must be before to")
		return
	}

	summary, err := h.svc.Summary(r.Context(), memberID, from, to)
	if err != nil {
		respond.Error(w, r, http.StatusInternalServerError, "internal_error", "failed to compute summary")
		return
	}
	respond.JSON(w, http.StatusOK, summary)
}

// parseFlexibleTime accepts RFC3339 or a bare YYYY-MM-DD (interpreted as UTC).
func parseFlexibleTime(s string) (time.Time, error) {
	if t, err := time.Parse(time.RFC3339, s); err == nil {
		return t.UTC(), nil
	}
	if t, err := time.Parse("2006-01-02", s); err == nil {
		return t.UTC(), nil
	}
	return time.Time{}, errors.New("unrecognised time format")
}
