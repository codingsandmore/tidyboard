package handler

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/tidyboard/tidyboard/internal/handler/respond"
	"github.com/tidyboard/tidyboard/internal/middleware"
	"github.com/tidyboard/tidyboard/internal/query"
	"github.com/tidyboard/tidyboard/internal/service"
)

// ChoreHandler handles chore and chore-completion routes.
type ChoreHandler struct {
	svc *service.ChoreService
	q   *query.Queries
}

// NewChoreHandler constructs a ChoreHandler.
func NewChoreHandler(svc *service.ChoreService, q *query.Queries) *ChoreHandler {
	return &ChoreHandler{svc: svc, q: q}
}

// isAdmin returns true when the caller's role is "admin" or "owner".
func isAdmin(role string) bool {
	return role == "admin" || role == "owner"
}

// List handles GET /v1/chores
// Query params: member_id (UUID), include_archived (bool).
func (h *ChoreHandler) List(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, r, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}

	q := r.URL.Query()

	var memberFilter *uuid.NullUUID
	if m := q.Get("member_id"); m != "" {
		id, err := uuid.Parse(m)
		if err != nil {
			respond.Error(w, r, http.StatusBadRequest, "bad_request", "invalid member_id")
			return
		}
		memberFilter = &uuid.NullUUID{UUID: id, Valid: true}
	}

	includeArchived := q.Get("include_archived") == "true"

	chores, err := h.q.ListChores(r.Context(), query.ListChoresParams{
		HouseholdID:     householdID,
		MemberID:        memberFilter,
		IncludeArchived: includeArchived,
	})
	if err != nil {
		respond.Error(w, r, http.StatusInternalServerError, "internal_error", "failed to list chores")
		return
	}
	respond.JSON(w, http.StatusOK, chores)
}

// createChoreRequest is the JSON body for POST /v1/chores.
type createChoreRequest struct {
	MemberID      string   `json:"member_id"`
	Name          string   `json:"name"`
	Weight        int      `json:"weight"`
	FrequencyKind string   `json:"frequency_kind"`
	DaysOfWeek    []string `json:"days_of_week"`
	AutoApprove   bool     `json:"auto_approve"`
}

// Create handles POST /v1/chores (admin only).
func (h *ChoreHandler) Create(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, r, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}

	if !isAdmin(middleware.RoleFromCtx(r.Context())) {
		respond.Error(w, r, http.StatusForbidden, "forbidden", "admin role required")
		return
	}

	var req createChoreRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, r, http.StatusBadRequest, "bad_request", "invalid JSON body")
		return
	}
	if req.Name == "" {
		respond.Error(w, r, http.StatusBadRequest, "validation_error", "name is required")
		return
	}
	memberID, err := uuid.Parse(req.MemberID)
	if err != nil {
		respond.Error(w, r, http.StatusBadRequest, "validation_error", "valid member_id is required")
		return
	}
	if req.FrequencyKind == "" {
		respond.Error(w, r, http.StatusBadRequest, "validation_error", "frequency_kind is required")
		return
	}

	chore, err := h.svc.Create(r.Context(), householdID, service.ChoreCreateInput{
		MemberID:      memberID,
		Name:          req.Name,
		Weight:        req.Weight,
		FrequencyKind: req.FrequencyKind,
		DaysOfWeek:    req.DaysOfWeek,
		AutoApprove:   req.AutoApprove,
	})
	if err != nil {
		respond.Error(w, r, http.StatusInternalServerError, "internal_error", "failed to create chore")
		return
	}
	respond.JSON(w, http.StatusCreated, chore)
}

// updateChoreRequest is the JSON body for PATCH /v1/chores/{id}.
type updateChoreRequest struct {
	Name          *string  `json:"name"`
	Weight        *int32   `json:"weight"`
	FrequencyKind *string  `json:"frequency_kind"`
	DaysOfWeek    []string `json:"days_of_week"`
	AutoApprove   *bool    `json:"auto_approve"`
}

// Update handles PATCH /v1/chores/{id} (admin only).
func (h *ChoreHandler) Update(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, r, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}

	if !isAdmin(middleware.RoleFromCtx(r.Context())) {
		respond.Error(w, r, http.StatusForbidden, "forbidden", "admin role required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respond.Error(w, r, http.StatusBadRequest, "bad_request", "invalid chore ID")
		return
	}

	var req updateChoreRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, r, http.StatusBadRequest, "bad_request", "invalid JSON body")
		return
	}

	chore, err := h.svc.Update(r.Context(), householdID, id, query.UpdateChoreParams{
		Name:          req.Name,
		Weight:        req.Weight,
		FrequencyKind: req.FrequencyKind,
		DaysOfWeek:    req.DaysOfWeek,
		AutoApprove:   req.AutoApprove,
	})
	if err != nil {
		respond.Error(w, r, http.StatusInternalServerError, "internal_error", "failed to update chore")
		return
	}
	respond.JSON(w, http.StatusOK, chore)
}

// Archive handles DELETE /v1/chores/{id} (admin only).
func (h *ChoreHandler) Archive(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, r, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}

	if !isAdmin(middleware.RoleFromCtx(r.Context())) {
		respond.Error(w, r, http.StatusForbidden, "forbidden", "admin role required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respond.Error(w, r, http.StatusBadRequest, "bad_request", "invalid chore ID")
		return
	}

	if err := h.svc.Archive(r.Context(), householdID, id); err != nil {
		respond.Error(w, r, http.StatusInternalServerError, "internal_error", "failed to archive chore")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// Complete handles POST /v1/chores/{id}/complete.
// Query param: date=YYYY-MM-DD (defaults to today).
// Caller must be the chore's assignee OR admin.
func (h *ChoreHandler) Complete(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, r, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}

	callerMember, hasMember := middleware.MemberIDFromCtx(r.Context())
	role := middleware.RoleFromCtx(r.Context())

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respond.Error(w, r, http.StatusBadRequest, "bad_request", "invalid chore ID")
		return
	}

	// Parse optional date param; default to today.
	date := time.Now().UTC()
	if ds := r.URL.Query().Get("date"); ds != "" {
		if t, err := time.Parse("2006-01-02", ds); err == nil {
			date = t
		} else {
			respond.Error(w, r, http.StatusBadRequest, "bad_request", "date must be YYYY-MM-DD")
			return
		}
	}

	// Fetch chore to check assignee.
	chore, err := h.q.GetChore(r.Context(), query.GetChoreParams{
		ID:          id,
		HouseholdID: householdID,
	})
	if err != nil {
		respond.Error(w, r, http.StatusNotFound, "not_found", "chore not found")
		return
	}

	// Enforce: caller is assignee OR admin.
	if !isAdmin(role) {
		if !hasMember || callerMember != chore.MemberID {
			respond.Error(w, r, http.StatusForbidden, "forbidden", "you can only complete your own chores")
			return
		}
	}

	completion, err := h.svc.Complete(r.Context(), householdID, id, date, callerMember)
	if err != nil {
		respond.Error(w, r, http.StatusInternalServerError, "internal_error", "failed to record completion")
		return
	}
	respond.JSON(w, http.StatusCreated, completion)
}

// UndoComplete handles DELETE /v1/chores/{id}/complete/{date}.
// Caller must be the chore's assignee OR admin.
func (h *ChoreHandler) UndoComplete(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, r, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}

	callerMember, hasMember := middleware.MemberIDFromCtx(r.Context())
	role := middleware.RoleFromCtx(r.Context())

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respond.Error(w, r, http.StatusBadRequest, "bad_request", "invalid chore ID")
		return
	}

	dateStr := chi.URLParam(r, "date")
	date, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		respond.Error(w, r, http.StatusBadRequest, "bad_request", "date must be YYYY-MM-DD")
		return
	}

	// Fetch chore to check assignee.
	chore, err := h.q.GetChore(r.Context(), query.GetChoreParams{
		ID:          id,
		HouseholdID: householdID,
	})
	if err != nil {
		respond.Error(w, r, http.StatusNotFound, "not_found", "chore not found")
		return
	}

	// Enforce: caller is assignee OR admin.
	if !isAdmin(role) {
		if !hasMember || callerMember != chore.MemberID {
			respond.Error(w, r, http.StatusForbidden, "forbidden", "you can only undo your own chore completions")
			return
		}
	}

	if err := h.svc.Undo(r.Context(), householdID, id, date); err != nil {
		respond.Error(w, r, http.StatusInternalServerError, "internal_error", "failed to undo completion")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ListCompletions handles GET /v1/chores/completions.
// Query params: from, to (YYYY-MM-DD), member_id.
func (h *ChoreHandler) ListCompletions(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, r, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}

	q := r.URL.Query()

	// Default range: past 30 days.
	now := time.Now().UTC()
	fromTime := now.AddDate(0, 0, -30)
	toTime := now

	if f := q.Get("from"); f != "" {
		if t, err := time.Parse("2006-01-02", f); err == nil {
			fromTime = t
		} else {
			respond.Error(w, r, http.StatusBadRequest, "bad_request", "from must be YYYY-MM-DD")
			return
		}
	}
	if t := q.Get("to"); t != "" {
		if parsed, err := time.Parse("2006-01-02", t); err == nil {
			toTime = parsed
		} else {
			respond.Error(w, r, http.StatusBadRequest, "bad_request", "to must be YYYY-MM-DD")
			return
		}
	}

	var memberFilter *uuid.NullUUID
	if m := q.Get("member_id"); m != "" {
		id, err := uuid.Parse(m)
		if err != nil {
			respond.Error(w, r, http.StatusBadRequest, "bad_request", "invalid member_id")
			return
		}
		memberFilter = &uuid.NullUUID{UUID: id, Valid: true}
	}

	completions, err := h.q.ListChoreCompletionsForRange(r.Context(), query.ListChoreCompletionsForRangeParams{
		HouseholdID: householdID,
		Date:        pgtype.Date{Time: fromTime.Truncate(24 * time.Hour), Valid: true},
		Date_2:      pgtype.Date{Time: toTime.Truncate(24 * time.Hour), Valid: true},
		MemberID:    memberFilter,
	})
	if err != nil {
		respond.Error(w, r, http.StatusInternalServerError, "internal_error", "failed to list completions")
		return
	}
	respond.JSON(w, http.StatusOK, completions)
}
