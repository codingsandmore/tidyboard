package handler

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/tidyboard/tidyboard/internal/handler/respond"
	"github.com/tidyboard/tidyboard/internal/middleware"
	"github.com/tidyboard/tidyboard/internal/model"
	"github.com/tidyboard/tidyboard/internal/service"
)

// EquityHandler handles equity engine routes.
type EquityHandler struct {
	svc *service.EquityService
}

// NewEquityHandler constructs an EquityHandler.
func NewEquityHandler(svc *service.EquityService) *EquityHandler {
	return &EquityHandler{svc: svc}
}

// GetDashboard handles GET /v1/equity?from=&to=
// Returns per-member equity breakdown, domain list, and trend.
// Default window: last 30 days.
func (h *EquityHandler) GetDashboard(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}

	to := time.Now()
	from := to.AddDate(0, 0, -30)

	if s := r.URL.Query().Get("from"); s != "" {
		t, err := time.Parse("2006-01-02", s)
		if err != nil {
			respond.Error(w, http.StatusBadRequest, "bad_request", "from must be YYYY-MM-DD")
			return
		}
		from = t
	}
	if s := r.URL.Query().Get("to"); s != "" {
		t, err := time.Parse("2006-01-02", s)
		if err != nil {
			respond.Error(w, http.StatusBadRequest, "bad_request", "to must be YYYY-MM-DD")
			return
		}
		to = t.Add(23*time.Hour + 59*time.Minute + 59*time.Second)
	}

	dash, err := h.svc.GetDashboard(r.Context(), householdID, from, to)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "internal_error", "failed to compute equity dashboard")
		return
	}
	respond.JSON(w, http.StatusOK, dash)
}

// GetSuggestions handles GET /v1/equity/suggestions
func (h *EquityHandler) GetSuggestions(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}

	to := time.Now()
	from := to.AddDate(0, 0, -30)

	suggestions, err := h.svc.GetRebalanceSuggestions(r.Context(), householdID, from, to)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "internal_error", "failed to compute rebalance suggestions")
		return
	}
	respond.JSON(w, http.StatusOK, suggestions)
}

// ListDomains handles GET /v1/equity/domains
func (h *EquityHandler) ListDomains(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}

	domains, err := h.svc.ListDomains(r.Context(), householdID)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "internal_error", "failed to list domains")
		return
	}
	respond.JSON(w, http.StatusOK, domains)
}

// ListTasks handles GET /v1/equity/tasks
func (h *EquityHandler) ListTasks(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}

	tasks, err := h.svc.ListTasks(r.Context(), householdID)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "internal_error", "failed to list tasks")
		return
	}
	respond.JSON(w, http.StatusOK, tasks)
}

// CreateTask handles POST /v1/equity/tasks
func (h *EquityHandler) CreateTask(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}

	var req model.CreateEquityTaskRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, http.StatusBadRequest, "bad_request", "invalid JSON body")
		return
	}
	if req.Name == "" {
		respond.Error(w, http.StatusBadRequest, "validation_error", "name is required")
		return
	}
	if req.DomainID == (uuid.UUID{}) {
		respond.Error(w, http.StatusBadRequest, "validation_error", "domain_id is required")
		return
	}

	task, err := h.svc.CreateTask(r.Context(), householdID, req)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "internal_error", "failed to create task")
		return
	}
	respond.JSON(w, http.StatusCreated, task)
}

// UpdateTask handles PATCH /v1/equity/tasks/:id
func (h *EquityHandler) UpdateTask(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}

	taskID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "bad_request", "invalid task ID")
		return
	}

	var req model.UpdateEquityTaskRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, http.StatusBadRequest, "bad_request", "invalid JSON body")
		return
	}

	task, err := h.svc.UpdateTask(r.Context(), householdID, taskID, req)
	if err != nil {
		if err == service.ErrNotFound {
			respond.Error(w, http.StatusNotFound, "not_found", "task not found")
			return
		}
		respond.Error(w, http.StatusInternalServerError, "internal_error", "failed to update task")
		return
	}
	respond.JSON(w, http.StatusOK, task)
}

// DeleteTask handles DELETE /v1/equity/tasks/:id
func (h *EquityHandler) DeleteTask(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}

	taskID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "bad_request", "invalid task ID")
		return
	}

	if err := h.svc.DeleteTask(r.Context(), householdID, taskID); err != nil {
		respond.Error(w, http.StatusInternalServerError, "internal_error", "failed to delete task")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// LogTaskTime handles POST /v1/equity/tasks/:id/log
func (h *EquityHandler) LogTaskTime(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}

	taskID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "bad_request", "invalid task ID")
		return
	}

	var req model.LogTaskTimeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, http.StatusBadRequest, "bad_request", "invalid JSON body")
		return
	}
	if req.DurationMinutes <= 0 {
		respond.Error(w, http.StatusBadRequest, "validation_error", "duration_minutes must be > 0")
		return
	}
	if req.MemberID == (uuid.UUID{}) {
		respond.Error(w, http.StatusBadRequest, "validation_error", "member_id is required")
		return
	}

	entry, err := h.svc.LogTaskTime(r.Context(), householdID, taskID, req)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "internal_error", "failed to log task time")
		return
	}
	respond.JSON(w, http.StatusCreated, entry)
}
