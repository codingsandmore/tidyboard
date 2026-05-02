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
//
// The `normalizer` field powers issue #87 (review-based smart import). It
// is optional: when nil, the SmartImport endpoint returns 503 with a
// clear message ("smart import is not configured on this server"). The
// existing synchronous Import + async StartImportJob endpoints do not
// depend on it.
type RecipeHandler struct {
	svc        *service.RecipeService
	normalizer *service.Normalizer
}

// NewRecipeHandler constructs a RecipeHandler.
func NewRecipeHandler(svc *service.RecipeService) *RecipeHandler { return &RecipeHandler{svc: svc} }

// WithNormalizer attaches a smart-import Normalizer (issue #87). Returns
// the handler so callers can chain. Pass nil to disable smart import.
func (h *RecipeHandler) WithNormalizer(n *service.Normalizer) *RecipeHandler {
	h.normalizer = n
	return h
}

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

// SmartImport handles POST /v1/recipes/smart-import — issue #87.
//
// Returns a {draft, normalized?, ai_provider, ai_error?} envelope without
// persisting the recipe. The frontend confirms the draft (after the user
// reviews + edits) by POSTing it through the regular POST /v1/recipes
// endpoint. Errors:
//
//	400 — bad JSON or unsupported kind
//	502 — scraper failed (URL kind)
//	503 — server is missing a Normalizer (smart import not configured)
//	504 — scraper timeout
func (h *RecipeHandler) SmartImport(w http.ResponseWriter, r *http.Request) {
	if _, ok := middleware.HouseholdIDFromCtx(r.Context()); !ok {
		respond.Error(w, r, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}
	if h.normalizer == nil {
		respond.Error(w, r, http.StatusServiceUnavailable, "smart_import_disabled",
			"smart import is not configured on this server")
		return
	}

	var req model.ImportRecipeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, r, http.StatusBadRequest, "bad_request", "invalid JSON body")
		return
	}

	kind := service.SmartImportKind(req.Kind)
	if kind == "" {
		kind = service.SmartImportKindURL
	}

	switch kind {
	case service.SmartImportKindURL:
		if req.URL == "" {
			respond.Error(w, r, http.StatusBadRequest, "validation_error", "url is required for kind=url")
			return
		}
	case service.SmartImportKindPhoto:
		if req.PhotoDataURL == "" {
			respond.Error(w, r, http.StatusBadRequest, "validation_error", "photo_data_url is required for kind=photo")
			return
		}
	default:
		respond.Error(w, r, http.StatusBadRequest, "validation_error", "unsupported kind: must be 'url' or 'photo'")
		return
	}

	resp, err := h.normalizer.NormalizeImport(r.Context(), service.SmartImportRequest{
		Kind:         kind,
		URL:          req.URL,
		PhotoDataURL: req.PhotoDataURL,
	})
	if err != nil {
		switch {
		case errors.Is(err, service.ErrScraperTimeout):
			respond.Error(w, r, http.StatusGatewayTimeout, "scraper_timeout", "recipe scraper timed out")
		case errors.Is(err, service.ErrScraperFailed):
			respond.Error(w, r, http.StatusBadGateway, "scraper_failed", "recipe scraper failed")
		default:
			respond.Error(w, r, http.StatusInternalServerError, "internal_error", "failed to build smart import draft")
		}
		return
	}
	respond.JSON(w, http.StatusOK, resp)
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
