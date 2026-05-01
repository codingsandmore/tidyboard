package handler

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/tidyboard/tidyboard/internal/handler/respond"
	"github.com/tidyboard/tidyboard/internal/middleware"
	"github.com/tidyboard/tidyboard/internal/model"
	"github.com/tidyboard/tidyboard/internal/service"
)

// MealPlanHandler handles meal plan CRUD routes.
type MealPlanHandler struct {
	svc *service.MealPlanService
}

// NewMealPlanHandler constructs a MealPlanHandler.
func NewMealPlanHandler(svc *service.MealPlanService) *MealPlanHandler {
	return &MealPlanHandler{svc: svc}
}

// Upsert handles POST /v1/meal-plan.
func (h *MealPlanHandler) Upsert(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, r, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}

	var req model.UpsertMealPlanRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, r, http.StatusBadRequest, "bad_request", "invalid JSON body")
		return
	}
	if req.Date == "" {
		respond.Error(w, r, http.StatusBadRequest, "validation_error", "date is required")
		return
	}
	validSlots := map[string]bool{"breakfast": true, "lunch": true, "dinner": true, "snack": true}
	if !validSlots[req.Slot] {
		respond.Error(w, r, http.StatusBadRequest, "validation_error", "slot must be breakfast, lunch, dinner, or snack")
		return
	}

	entry, err := h.svc.Upsert(r.Context(), householdID, req)
	if err != nil {
		respond.Error(w, r, http.StatusInternalServerError, "internal_error", "failed to upsert meal plan entry")
		return
	}
	respond.JSON(w, http.StatusOK, entry)
}

// List handles GET /v1/meal-plan?from=YYYY-MM-DD&to=YYYY-MM-DD.
func (h *MealPlanHandler) List(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, r, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}

	from := r.URL.Query().Get("from")
	to := r.URL.Query().Get("to")
	if from == "" || to == "" {
		respond.Error(w, r, http.StatusBadRequest, "validation_error", "from and to query params are required (YYYY-MM-DD)")
		return
	}

	entries, err := h.svc.List(r.Context(), householdID, from, to)
	if err != nil {
		respond.Error(w, r, http.StatusInternalServerError, "internal_error", "failed to list meal plan entries")
		return
	}
	respond.JSON(w, http.StatusOK, entries)
}

// Delete handles DELETE /v1/meal-plan/:id.
func (h *MealPlanHandler) Delete(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, r, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respond.Error(w, r, http.StatusBadRequest, "bad_request", "invalid meal plan entry ID")
		return
	}

	if err := h.svc.Delete(r.Context(), householdID, id); err != nil {
		respond.Error(w, r, http.StatusInternalServerError, "internal_error", "failed to delete meal plan entry")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
