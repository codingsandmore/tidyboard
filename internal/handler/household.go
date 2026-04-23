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

// HouseholdHandler handles household CRUD routes.
type HouseholdHandler struct {
	svc *service.HouseholdService
}

// NewHouseholdHandler constructs a HouseholdHandler.
func NewHouseholdHandler(svc *service.HouseholdService) *HouseholdHandler {
	return &HouseholdHandler{svc: svc}
}

// Create handles POST /v1/households.
func (h *HouseholdHandler) Create(w http.ResponseWriter, r *http.Request) {
	accountID, ok := middleware.AccountIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, http.StatusUnauthorized, "unauthorized", "missing account context")
		return
	}

	var req model.CreateHouseholdRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, http.StatusBadRequest, "bad_request", "invalid JSON body")
		return
	}
	if req.Name == "" {
		respond.Error(w, http.StatusBadRequest, "validation_error", "name is required")
		return
	}

	household, err := h.svc.Create(r.Context(), accountID, req)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "internal_error", "failed to create household")
		return
	}
	respond.JSON(w, http.StatusCreated, household)
}

// Get handles GET /v1/households/:id.
func (h *HouseholdHandler) Get(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "bad_request", "invalid household ID")
		return
	}

	household, err := h.svc.Get(r.Context(), id)
	if err != nil {
		switch err {
		case service.ErrNotFound:
			respond.Error(w, http.StatusNotFound, "not_found", "household not found")
		default:
			respond.Error(w, http.StatusInternalServerError, "internal_error", "failed to fetch household")
		}
		return
	}
	respond.JSON(w, http.StatusOK, household)
}

// Update handles PATCH /v1/households/:id.
func (h *HouseholdHandler) Update(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "bad_request", "invalid household ID")
		return
	}

	var req model.UpdateHouseholdRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, http.StatusBadRequest, "bad_request", "invalid JSON body")
		return
	}

	household, err := h.svc.Update(r.Context(), id, req)
	if err != nil {
		switch err {
		case service.ErrNotFound:
			respond.Error(w, http.StatusNotFound, "not_found", "household not found")
		default:
			respond.Error(w, http.StatusInternalServerError, "internal_error", "failed to update household")
		}
		return
	}
	respond.JSON(w, http.StatusOK, household)
}

// Delete handles DELETE /v1/households/:id.
func (h *HouseholdHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "bad_request", "invalid household ID")
		return
	}

	if err := h.svc.Delete(r.Context(), id); err != nil {
		switch err {
		case service.ErrNotFound:
			respond.Error(w, http.StatusNotFound, "not_found", "household not found")
		default:
			respond.Error(w, http.StatusInternalServerError, "internal_error", "failed to delete household")
		}
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
