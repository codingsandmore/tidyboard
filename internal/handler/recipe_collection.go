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

// RecipeCollectionHandler handles recipe collection routes.
type RecipeCollectionHandler struct {
	svc *service.RecipeCollectionService
}

// NewRecipeCollectionHandler constructs a RecipeCollectionHandler.
func NewRecipeCollectionHandler(svc *service.RecipeCollectionService) *RecipeCollectionHandler {
	return &RecipeCollectionHandler{svc: svc}
}

// List handles GET /v1/recipe-collections.
func (h *RecipeCollectionHandler) List(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, r, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}
	cols, err := h.svc.List(r.Context(), householdID)
	if err != nil {
		respond.Error(w, r, http.StatusInternalServerError, "internal_error", "failed to list recipe collections")
		return
	}
	respond.JSON(w, http.StatusOK, cols)
}

// Create handles POST /v1/recipe-collections.
func (h *RecipeCollectionHandler) Create(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, r, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}
	var req model.CreateRecipeCollectionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, r, http.StatusBadRequest, "bad_request", "invalid JSON body")
		return
	}
	if req.Name == "" {
		respond.Error(w, r, http.StatusBadRequest, "validation_error", "name is required")
		return
	}
	col, err := h.svc.Create(r.Context(), householdID, req)
	if err != nil {
		respond.Error(w, r, http.StatusInternalServerError, "internal_error", "failed to create recipe collection")
		return
	}
	respond.JSON(w, http.StatusCreated, col)
}

// Update handles PATCH /v1/recipe-collections/:id.
func (h *RecipeCollectionHandler) Update(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, r, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respond.Error(w, r, http.StatusBadRequest, "bad_request", "invalid collection ID")
		return
	}
	var req model.UpdateRecipeCollectionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, r, http.StatusBadRequest, "bad_request", "invalid JSON body")
		return
	}
	col, err := h.svc.Update(r.Context(), householdID, id, req)
	if err != nil {
		switch err {
		case service.ErrNotFound:
			respond.Error(w, r, http.StatusNotFound, "not_found", "recipe collection not found")
		default:
			respond.Error(w, r, http.StatusInternalServerError, "internal_error", "failed to update recipe collection")
		}
		return
	}
	respond.JSON(w, http.StatusOK, col)
}

// Delete handles DELETE /v1/recipe-collections/:id.
func (h *RecipeCollectionHandler) Delete(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, r, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respond.Error(w, r, http.StatusBadRequest, "bad_request", "invalid collection ID")
		return
	}
	if err := h.svc.Delete(r.Context(), householdID, id); err != nil {
		switch err {
		case service.ErrNotFound:
			respond.Error(w, r, http.StatusNotFound, "not_found", "recipe collection not found")
		default:
			respond.Error(w, r, http.StatusInternalServerError, "internal_error", "failed to delete recipe collection")
		}
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// AddRecipe handles POST /v1/recipe-collections/:id/recipes.
func (h *RecipeCollectionHandler) AddRecipe(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, r, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respond.Error(w, r, http.StatusBadRequest, "bad_request", "invalid collection ID")
		return
	}
	var req model.AddRecipeToCollectionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, r, http.StatusBadRequest, "bad_request", "invalid JSON body")
		return
	}
	if req.RecipeID == uuid.Nil {
		respond.Error(w, r, http.StatusBadRequest, "validation_error", "recipe_id is required")
		return
	}
	if err := h.svc.AddRecipe(r.Context(), householdID, id, req); err != nil {
		switch err {
		case service.ErrNotFound:
			respond.Error(w, r, http.StatusNotFound, "not_found", "recipe collection not found")
		default:
			respond.Error(w, r, http.StatusInternalServerError, "internal_error", "failed to add recipe to collection")
		}
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// RemoveRecipe handles DELETE /v1/recipe-collections/:id/recipes/:recipe_id.
func (h *RecipeCollectionHandler) RemoveRecipe(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, r, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respond.Error(w, r, http.StatusBadRequest, "bad_request", "invalid collection ID")
		return
	}
	recipeID, err := uuid.Parse(chi.URLParam(r, "recipe_id"))
	if err != nil {
		respond.Error(w, r, http.StatusBadRequest, "bad_request", "invalid recipe ID")
		return
	}
	if err := h.svc.RemoveRecipe(r.Context(), householdID, id, recipeID); err != nil {
		switch err {
		case service.ErrNotFound:
			respond.Error(w, r, http.StatusNotFound, "not_found", "recipe collection not found")
		default:
			respond.Error(w, r, http.StatusInternalServerError, "internal_error", "failed to remove recipe from collection")
		}
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ListRecipes handles GET /v1/recipe-collections/:id/recipes.
func (h *RecipeCollectionHandler) ListRecipes(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, r, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respond.Error(w, r, http.StatusBadRequest, "bad_request", "invalid collection ID")
		return
	}
	recipes, err := h.svc.ListRecipes(r.Context(), householdID, id)
	if err != nil {
		switch err {
		case service.ErrNotFound:
			respond.Error(w, r, http.StatusNotFound, "not_found", "recipe collection not found")
		default:
			respond.Error(w, r, http.StatusInternalServerError, "internal_error", "failed to list recipes in collection")
		}
		return
	}
	respond.JSON(w, http.StatusOK, recipes)
}
