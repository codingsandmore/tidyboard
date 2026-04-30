package handler

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/tidyboard/tidyboard/internal/handler/respond"
	"github.com/tidyboard/tidyboard/internal/middleware"
	"github.com/tidyboard/tidyboard/internal/model"
	"github.com/tidyboard/tidyboard/internal/service"
)

// ShoppingHandler handles shopping list and ingredient routes.
type ShoppingHandler struct {
	svc *service.ShoppingService
}

// NewShoppingHandler constructs a ShoppingHandler.
func NewShoppingHandler(svc *service.ShoppingService) *ShoppingHandler {
	return &ShoppingHandler{svc: svc}
}

// Generate handles POST /v1/shopping/generate.
// Generates a new shopping list from a meal plan date range.
func (h *ShoppingHandler) Generate(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}

	var req model.GenerateShoppingListRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, http.StatusBadRequest, "bad_request", "invalid JSON body")
		return
	}
	if req.DateFrom == "" || req.DateTo == "" {
		respond.Error(w, http.StatusBadRequest, "validation_error", "date_from and date_to are required (YYYY-MM-DD)")
		return
	}

	list, err := h.svc.Generate(r.Context(), householdID, req)
	if err != nil {
		if errors.Is(err, service.ErrNoMealPlan) {
			respond.Error(w, http.StatusUnprocessableEntity, "missing_meal_plan", "add recipes to this meal plan before generating a shopping list")
			return
		}
		if errors.Is(err, service.ErrNoRecipeIngredients) {
			respond.Error(w, http.StatusUnprocessableEntity, "missing_recipe_ingredients", "planned recipes need ingredients before a shopping list can be generated")
			return
		}
		respond.Error(w, http.StatusInternalServerError, "internal_error", "failed to generate shopping list")
		return
	}
	respond.JSON(w, http.StatusCreated, list)
}

// GetCurrent handles GET /v1/shopping/current.
// Returns the current active shopping list with items.
func (h *ShoppingHandler) GetCurrent(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}

	list, err := h.svc.GetCurrent(r.Context(), householdID)
	if err != nil {
		if err == service.ErrNotFound {
			respond.Error(w, http.StatusNotFound, "not_found", "no active shopping list")
			return
		}
		respond.Error(w, http.StatusInternalServerError, "internal_error", "failed to fetch shopping list")
		return
	}
	respond.JSON(w, http.StatusOK, list)
}

// UpdateItem handles PATCH /v1/shopping/current/items/:id.
func (h *ShoppingHandler) UpdateItem(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "bad_request", "invalid item ID")
		return
	}

	var req model.UpdateShoppingListItemRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, http.StatusBadRequest, "bad_request", "invalid JSON body")
		return
	}

	item, err := h.svc.UpdateItemCompleted(r.Context(), householdID, id, req.Completed)
	if err != nil {
		if errors.Is(err, service.ErrNotFound) {
			respond.Error(w, http.StatusNotFound, "not_found", "shopping item not found")
			return
		}
		respond.Error(w, http.StatusInternalServerError, "internal_error", "failed to update shopping item")
		return
	}
	respond.JSON(w, http.StatusOK, item)
}

// UpsertStaple handles POST /v1/shopping/staples.
// Creates or updates a pantry staple.
func (h *ShoppingHandler) UpsertStaple(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}

	var req model.UpsertPantryStapleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, http.StatusBadRequest, "bad_request", "invalid JSON body")
		return
	}
	if req.Name == "" {
		respond.Error(w, http.StatusBadRequest, "validation_error", "name is required")
		return
	}

	staple, err := h.svc.UpsertStaple(r.Context(), householdID, req)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "internal_error", "failed to upsert pantry staple")
		return
	}
	respond.JSON(w, http.StatusOK, staple)
}

// ListStaples handles GET /v1/shopping/staples.
func (h *ShoppingHandler) ListStaples(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}

	staples, err := h.svc.ListStaples(r.Context(), householdID)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "internal_error", "failed to list pantry staples")
		return
	}
	respond.JSON(w, http.StatusOK, staples)
}

// DeleteStaple handles DELETE /v1/shopping/staples/:id.
func (h *ShoppingHandler) DeleteStaple(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "bad_request", "invalid staple ID")
		return
	}

	if err := h.svc.DeleteStaple(r.Context(), householdID, id); err != nil {
		respond.Error(w, http.StatusInternalServerError, "internal_error", "failed to delete pantry staple")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// SearchIngredients handles GET /v1/ingredients/search?q=...
func (h *ShoppingHandler) SearchIngredients(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query().Get("q")
	if q == "" {
		respond.Error(w, http.StatusBadRequest, "validation_error", "q query parameter is required")
		return
	}

	results, err := h.svc.SearchIngredients(r.Context(), q)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "internal_error", "failed to search ingredients")
		return
	}
	respond.JSON(w, http.StatusOK, results)
}
