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

// RoutineHandler handles all /v1/routines routes.
type RoutineHandler struct {
	svc *service.RoutineService
}

// NewRoutineHandler constructs a RoutineHandler.
func NewRoutineHandler(svc *service.RoutineService) *RoutineHandler {
	return &RoutineHandler{svc: svc}
}

// List handles GET /v1/routines.
func (h *RoutineHandler) List(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, r, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}

	var memberID *uuid.UUID
	if raw := r.URL.Query().Get("member_id"); raw != "" {
		id, err := uuid.Parse(raw)
		if err != nil {
			respond.Error(w, r, http.StatusBadRequest, "bad_request", "invalid member_id")
			return
		}
		memberID = &id
	}

	var timeSlot *string
	if ts := r.URL.Query().Get("time_slot"); ts != "" {
		timeSlot = &ts
	}

	routines, err := h.svc.List(r.Context(), householdID, memberID, timeSlot)
	if err != nil {
		respond.Error(w, r, http.StatusInternalServerError, "internal_error", "failed to list routines")
		return
	}
	respond.JSON(w, http.StatusOK, routines)
}

// Create handles POST /v1/routines.
func (h *RoutineHandler) Create(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, r, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}

	var req model.CreateRoutineRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, r, http.StatusBadRequest, "bad_request", "invalid JSON body")
		return
	}
	if req.Name == "" {
		respond.Error(w, r, http.StatusBadRequest, "validation_error", "name is required")
		return
	}

	routine, err := h.svc.Create(r.Context(), householdID, req)
	if err != nil {
		respond.Error(w, r, http.StatusInternalServerError, "internal_error", "failed to create routine")
		return
	}
	respond.JSON(w, http.StatusCreated, routine)
}

// Update handles PATCH /v1/routines/:id.
func (h *RoutineHandler) Update(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, r, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respond.Error(w, r, http.StatusBadRequest, "bad_request", "invalid routine ID")
		return
	}

	var req model.UpdateRoutineRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, r, http.StatusBadRequest, "bad_request", "invalid JSON body")
		return
	}

	routine, err := h.svc.Update(r.Context(), householdID, id, req)
	if err != nil {
		switch err {
		case service.ErrNotFound:
			respond.Error(w, r, http.StatusNotFound, "not_found", "routine not found")
		default:
			respond.Error(w, r, http.StatusInternalServerError, "internal_error", "failed to update routine")
		}
		return
	}
	respond.JSON(w, http.StatusOK, routine)
}

// Delete handles DELETE /v1/routines/:id.
func (h *RoutineHandler) Delete(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, r, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respond.Error(w, r, http.StatusBadRequest, "bad_request", "invalid routine ID")
		return
	}

	if err := h.svc.Delete(r.Context(), householdID, id); err != nil {
		switch err {
		case service.ErrNotFound:
			respond.Error(w, r, http.StatusNotFound, "not_found", "routine not found")
		default:
			respond.Error(w, r, http.StatusInternalServerError, "internal_error", "failed to delete routine")
		}
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// AddStep handles POST /v1/routines/:id/steps.
func (h *RoutineHandler) AddStep(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, r, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}
	routineID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respond.Error(w, r, http.StatusBadRequest, "bad_request", "invalid routine ID")
		return
	}

	var req model.AddStepRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, r, http.StatusBadRequest, "bad_request", "invalid JSON body")
		return
	}
	if req.Name == "" {
		respond.Error(w, r, http.StatusBadRequest, "validation_error", "name is required")
		return
	}

	step, err := h.svc.AddStep(r.Context(), householdID, routineID, req)
	if err != nil {
		switch err {
		case service.ErrNotFound:
			respond.Error(w, r, http.StatusNotFound, "not_found", "routine not found")
		default:
			respond.Error(w, r, http.StatusInternalServerError, "internal_error", "failed to add step")
		}
		return
	}
	respond.JSON(w, http.StatusCreated, step)
}

// UpdateStep handles PATCH /v1/routines/:id/steps/:stepID.
func (h *RoutineHandler) UpdateStep(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, r, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}
	routineID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respond.Error(w, r, http.StatusBadRequest, "bad_request", "invalid routine ID")
		return
	}
	stepID, err := uuid.Parse(chi.URLParam(r, "stepID"))
	if err != nil {
		respond.Error(w, r, http.StatusBadRequest, "bad_request", "invalid step ID")
		return
	}

	var req model.UpdateStepRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, r, http.StatusBadRequest, "bad_request", "invalid JSON body")
		return
	}

	step, err := h.svc.UpdateStep(r.Context(), householdID, routineID, stepID, req)
	if err != nil {
		switch err {
		case service.ErrNotFound:
			respond.Error(w, r, http.StatusNotFound, "not_found", "step not found")
		default:
			respond.Error(w, r, http.StatusInternalServerError, "internal_error", "failed to update step")
		}
		return
	}
	respond.JSON(w, http.StatusOK, step)
}

// DeleteStep handles DELETE /v1/routines/:id/steps/:stepID.
func (h *RoutineHandler) DeleteStep(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, r, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}
	routineID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respond.Error(w, r, http.StatusBadRequest, "bad_request", "invalid routine ID")
		return
	}
	stepID, err := uuid.Parse(chi.URLParam(r, "stepID"))
	if err != nil {
		respond.Error(w, r, http.StatusBadRequest, "bad_request", "invalid step ID")
		return
	}

	if err := h.svc.DeleteStep(r.Context(), householdID, routineID, stepID); err != nil {
		switch err {
		case service.ErrNotFound:
			respond.Error(w, r, http.StatusNotFound, "not_found", "step not found")
		default:
			respond.Error(w, r, http.StatusInternalServerError, "internal_error", "failed to delete step")
		}
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// MarkComplete handles POST /v1/routines/:id/complete.
func (h *RoutineHandler) MarkComplete(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, r, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}
	routineID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respond.Error(w, r, http.StatusBadRequest, "bad_request", "invalid routine ID")
		return
	}

	var req model.MarkCompleteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, r, http.StatusBadRequest, "bad_request", "invalid JSON body")
		return
	}
	if req.MemberID == uuid.Nil {
		respond.Error(w, r, http.StatusBadRequest, "validation_error", "member_id is required")
		return
	}

	comp, err := h.svc.MarkComplete(r.Context(), householdID, routineID, req)
	if err != nil {
		switch err {
		case service.ErrNotFound:
			respond.Error(w, r, http.StatusNotFound, "not_found", "routine not found")
		default:
			respond.Error(w, r, http.StatusInternalServerError, "internal_error", "failed to mark completion")
		}
		return
	}
	respond.JSON(w, http.StatusCreated, comp)
}

// UnmarkCompletion handles DELETE /v1/routines/:id/complete/:completionID.
func (h *RoutineHandler) UnmarkCompletion(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, r, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}
	routineID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respond.Error(w, r, http.StatusBadRequest, "bad_request", "invalid routine ID")
		return
	}
	completionID, err := uuid.Parse(chi.URLParam(r, "completionID"))
	if err != nil {
		respond.Error(w, r, http.StatusBadRequest, "bad_request", "invalid completion ID")
		return
	}

	if err := h.svc.UnmarkCompletion(r.Context(), householdID, routineID, completionID); err != nil {
		switch err {
		case service.ErrNotFound:
			respond.Error(w, r, http.StatusNotFound, "not_found", "routine not found")
		default:
			respond.Error(w, r, http.StatusInternalServerError, "internal_error", "failed to unmark completion")
		}
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// GetStreak handles GET /v1/routines/:id/streak.
func (h *RoutineHandler) GetStreak(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, r, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}
	routineID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respond.Error(w, r, http.StatusBadRequest, "bad_request", "invalid routine ID")
		return
	}
	memberIDStr := r.URL.Query().Get("member_id")
	if memberIDStr == "" {
		respond.Error(w, r, http.StatusBadRequest, "validation_error", "member_id query param is required")
		return
	}
	memberID, err := uuid.Parse(memberIDStr)
	if err != nil {
		respond.Error(w, r, http.StatusBadRequest, "bad_request", "invalid member_id")
		return
	}

	streak, err := h.svc.GetStreak(r.Context(), householdID, routineID, memberID)
	if err != nil {
		switch err {
		case service.ErrNotFound:
			respond.Error(w, r, http.StatusNotFound, "not_found", "routine not found")
		default:
			respond.Error(w, r, http.StatusInternalServerError, "internal_error", "failed to get streak")
		}
		return
	}
	respond.JSON(w, http.StatusOK, model.StreakResponse{
		RoutineID: routineID,
		MemberID:  memberID,
		Streak:    streak,
	})
}

// ListCompletionsForDay handles GET /v1/routines/completions?date=YYYY-MM-DD.
func (h *RoutineHandler) ListCompletionsForDay(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, r, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}

	dateStr := r.URL.Query().Get("date")
	if dateStr == "" {
		dateStr = time.Now().UTC().Format("2006-01-02")
	}
	date, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		respond.Error(w, r, http.StatusBadRequest, "bad_request", "invalid date format, use YYYY-MM-DD")
		return
	}

	var memberID *uuid.UUID
	if raw := r.URL.Query().Get("member_id"); raw != "" {
		id, err := uuid.Parse(raw)
		if err != nil {
			respond.Error(w, r, http.StatusBadRequest, "bad_request", "invalid member_id")
			return
		}
		memberID = &id
	}

	completions, err := h.svc.ListCompletionsForDay(r.Context(), householdID, date, memberID)
	if err != nil {
		respond.Error(w, r, http.StatusInternalServerError, "internal_error", "failed to list completions")
		return
	}
	respond.JSON(w, http.StatusOK, completions)
}
