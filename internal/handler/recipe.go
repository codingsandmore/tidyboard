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

// RecipeHandler handles recipe CRUD and import routes.
type RecipeHandler struct {
	svc *service.RecipeService
}

// NewRecipeHandler constructs a RecipeHandler.
func NewRecipeHandler(svc *service.RecipeService) *RecipeHandler { return &RecipeHandler{svc: svc} }

// List handles GET /v1/recipes.
func (h *RecipeHandler) List(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, r, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}
	recipes, err := h.svc.List(r.Context(), householdID)
	if err != nil {
		respond.Error(w, r, http.StatusInternalServerError, "internal_error", "failed to list recipes")
		return
	}
	respond.JSON(w, http.StatusOK, recipes)
}

// Create handles POST /v1/recipes.
func (h *RecipeHandler) Create(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, r, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}
	memberID, ok := middleware.MemberIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, r, http.StatusUnauthorized, "unauthorized", "missing member context")
		return
	}

	var req model.CreateRecipeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, r, http.StatusBadRequest, "bad_request", "invalid JSON body")
		return
	}
	if req.Title == "" {
		respond.Error(w, r, http.StatusBadRequest, "validation_error", "title is required")
		return
	}

	recipe, err := h.svc.Create(r.Context(), householdID, memberID, req)
	if err != nil {
		respond.Error(w, r, http.StatusInternalServerError, "internal_error", "failed to create recipe")
		return
	}
	respond.JSON(w, http.StatusCreated, recipe)
}

// Import handles POST /v1/recipes/import — URL scraping via Python service.
func (h *RecipeHandler) Import(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, r, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}
	memberID, ok := middleware.MemberIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, r, http.StatusUnauthorized, "unauthorized", "missing member context")
		return
	}

	var req model.ImportRecipeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, r, http.StatusBadRequest, "bad_request", "invalid JSON body")
		return
	}
	if req.URL == "" {
		respond.Error(w, r, http.StatusBadRequest, "validation_error", "url is required")
		return
	}

	recipe, err := h.svc.Import(r.Context(), householdID, memberID, req.URL)
	if err != nil {
		switch err {
		case service.ErrScraperTimeout:
			respond.Error(w, r, http.StatusGatewayTimeout, "scraper_timeout", "recipe scraper timed out")
		case service.ErrScraperFailed:
			respond.Error(w, r, http.StatusBadGateway, "scraper_failed", "recipe scraper failed")
		default:
			if errors.Is(err, service.ErrScraperFailed) {
				respond.Error(w, r, http.StatusBadGateway, "scraper_failed", "recipe scraper failed")
				return
			}
			respond.Error(w, r, http.StatusInternalServerError, "internal_error", "failed to import recipe")
		}
		return
	}
	respond.JSON(w, http.StatusCreated, recipe)
}

// StartImportJob handles POST /v1/recipes/import-jobs — async URL scraping.
// The handler returns 202 Accepted with the freshly-created job row; clients
// then poll GET /v1/recipes/import-jobs/{id} until status is terminal.
func (h *RecipeHandler) StartImportJob(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, r, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}
	memberID, ok := middleware.MemberIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, r, http.StatusUnauthorized, "unauthorized", "missing member context")
		return
	}

	var req model.ImportRecipeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, r, http.StatusBadRequest, "bad_request", "invalid JSON body")
		return
	}
	if req.URL == "" {
		respond.Error(w, r, http.StatusBadRequest, "validation_error", "url is required")
		return
	}

	job, err := h.svc.StartImportJob(r.Context(), householdID, memberID, req.URL)
	if err != nil {
		respond.Error(w, r, http.StatusInternalServerError, "internal_error", "failed to start import job")
		return
	}
	respond.JSON(w, http.StatusAccepted, job)
}

// GetImportJob handles GET /v1/recipes/import-jobs/{id}.
func (h *RecipeHandler) GetImportJob(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, r, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respond.Error(w, r, http.StatusBadRequest, "bad_request", "invalid job ID")
		return
	}

	job, err := h.svc.GetImportJob(r.Context(), householdID, id)
	if err != nil {
		switch err {
		case service.ErrNotFound:
			respond.Error(w, r, http.StatusNotFound, "not_found", "import job not found")
		default:
			respond.Error(w, r, http.StatusInternalServerError, "internal_error", "failed to fetch import job")
		}
		return
	}
	respond.JSON(w, http.StatusOK, job)
}

// Get handles GET /v1/recipes/:id.
func (h *RecipeHandler) Get(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, r, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respond.Error(w, r, http.StatusBadRequest, "bad_request", "invalid recipe ID")
		return
	}

	recipe, err := h.svc.Get(r.Context(), householdID, id)
	if err != nil {
		switch err {
		case service.ErrNotFound:
			respond.Error(w, r, http.StatusNotFound, "not_found", "recipe not found")
		default:
			respond.Error(w, r, http.StatusInternalServerError, "internal_error", "failed to fetch recipe")
		}
		return
	}
	respond.JSON(w, http.StatusOK, recipe)
}

// Update handles PATCH /v1/recipes/:id.
func (h *RecipeHandler) Update(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, r, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respond.Error(w, r, http.StatusBadRequest, "bad_request", "invalid recipe ID")
		return
	}

	var req model.UpdateRecipeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, r, http.StatusBadRequest, "bad_request", "invalid JSON body")
		return
	}

	recipe, err := h.svc.Update(r.Context(), householdID, id, req)
	if err != nil {
		switch err {
		case service.ErrNotFound:
			respond.Error(w, r, http.StatusNotFound, "not_found", "recipe not found")
		default:
			respond.Error(w, r, http.StatusInternalServerError, "internal_error", "failed to update recipe")
		}
		return
	}
	respond.JSON(w, http.StatusOK, recipe)
}

// Delete handles DELETE /v1/recipes/:id.
func (h *RecipeHandler) Delete(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, r, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respond.Error(w, r, http.StatusBadRequest, "bad_request", "invalid recipe ID")
		return
	}

	if err := h.svc.Delete(r.Context(), householdID, id); err != nil {
		switch err {
		case service.ErrNotFound:
			respond.Error(w, r, http.StatusNotFound, "not_found", "recipe not found")
		default:
			respond.Error(w, r, http.StatusInternalServerError, "internal_error", "failed to delete recipe")
		}
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
