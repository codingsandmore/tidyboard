//go:build unit

package handler_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/tidyboard/tidyboard/internal/handler"
	"github.com/tidyboard/tidyboard/internal/middleware"
	"github.com/tidyboard/tidyboard/internal/service"
)

// buildCollectionRouter creates a test router with household context injected.
func buildCollectionRouter(h *handler.RecipeCollectionHandler) http.Handler {
	hid := uuid.New().String()
	r := chi.NewRouter()
	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
			req = middleware.WithTestHouseholdID(req, hid)
			next.ServeHTTP(w, req)
		})
	})
	r.Get("/v1/recipe-collections", h.List)
	r.Post("/v1/recipe-collections", h.Create)
	r.Patch("/v1/recipe-collections/{id}", h.Update)
	r.Delete("/v1/recipe-collections/{id}", h.Delete)
	r.Post("/v1/recipe-collections/{id}/recipes", h.AddRecipe)
	r.Delete("/v1/recipe-collections/{id}/recipes/{recipe_id}", h.RemoveRecipe)
	r.Get("/v1/recipe-collections/{id}/recipes", h.ListRecipes)
	return r
}

// TestRecipeCollectionHandler_NoHousehold verifies that requests without a
// household context return 401.
func TestRecipeCollectionHandler_NoHousehold(t *testing.T) {
	svc := service.NewRecipeCollectionService(nil)
	h := handler.NewRecipeCollectionHandler(svc)

	// Register without the household-injecting middleware.
	r := chi.NewRouter()
	r.Get("/v1/recipe-collections", h.List)

	req := httptest.NewRequest(http.MethodGet, "/v1/recipe-collections", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

// TestRecipeCollectionHandler_CreateValidation verifies that POST without a
// name returns 400.
func TestRecipeCollectionHandler_CreateValidation(t *testing.T) {
	svc := service.NewRecipeCollectionService(nil)
	h := handler.NewRecipeCollectionHandler(svc)
	router := buildCollectionRouter(h)

	body, _ := json.Marshal(map[string]string{"name": ""})
	req := httptest.NewRequest(http.MethodPost, "/v1/recipe-collections", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

// TestRecipeCollectionHandler_AddRecipeValidation verifies that POST without
// recipe_id returns 400.
func TestRecipeCollectionHandler_AddRecipeValidation(t *testing.T) {
	svc := service.NewRecipeCollectionService(nil)
	h := handler.NewRecipeCollectionHandler(svc)
	router := buildCollectionRouter(h)

	colID := uuid.New().String()
	body, _ := json.Marshal(map[string]string{})
	req := httptest.NewRequest(http.MethodPost, "/v1/recipe-collections/"+colID+"/recipes", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

// TestRecipeCollectionHandler_InvalidUUID checks that non-UUID path params return 400.
func TestRecipeCollectionHandler_InvalidUUID(t *testing.T) {
	svc := service.NewRecipeCollectionService(nil)
	h := handler.NewRecipeCollectionHandler(svc)
	router := buildCollectionRouter(h)

	req := httptest.NewRequest(http.MethodDelete, "/v1/recipe-collections/not-a-uuid", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}
