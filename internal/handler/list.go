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

// ListHandler handles list and list-item CRUD routes.
type ListHandler struct {
	svc *service.ListService
}

// NewListHandler constructs a ListHandler.
func NewListHandler(svc *service.ListService) *ListHandler { return &ListHandler{svc: svc} }

// ListAll handles GET /v1/lists.
func (h *ListHandler) ListAll(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}
	lists, err := h.svc.List(r.Context(), householdID)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "internal_error", "failed to list lists")
		return
	}
	respond.JSON(w, http.StatusOK, lists)
}

// Create handles POST /v1/lists.
func (h *ListHandler) Create(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}

	var req model.CreateListRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, http.StatusBadRequest, "bad_request", "invalid JSON body")
		return
	}
	if req.Name == "" {
		respond.Error(w, http.StatusBadRequest, "validation_error", "name is required")
		return
	}

	list, err := h.svc.Create(r.Context(), householdID, req)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "internal_error", "failed to create list")
		return
	}
	respond.JSON(w, http.StatusCreated, list)
}

// Get handles GET /v1/lists/:id.
func (h *ListHandler) Get(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "bad_request", "invalid list ID")
		return
	}

	list, err := h.svc.Get(r.Context(), householdID, id)
	if err != nil {
		switch err {
		case service.ErrNotFound:
			respond.Error(w, http.StatusNotFound, "not_found", "list not found")
		default:
			respond.Error(w, http.StatusInternalServerError, "internal_error", "failed to fetch list")
		}
		return
	}
	respond.JSON(w, http.StatusOK, list)
}

// Update handles PATCH /v1/lists/:id.
func (h *ListHandler) Update(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "bad_request", "invalid list ID")
		return
	}

	var req model.UpdateListRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, http.StatusBadRequest, "bad_request", "invalid JSON body")
		return
	}

	list, err := h.svc.Update(r.Context(), householdID, id, req)
	if err != nil {
		switch err {
		case service.ErrNotFound:
			respond.Error(w, http.StatusNotFound, "not_found", "list not found")
		default:
			respond.Error(w, http.StatusInternalServerError, "internal_error", "failed to update list")
		}
		return
	}
	respond.JSON(w, http.StatusOK, list)
}

// Delete handles DELETE /v1/lists/:id.
func (h *ListHandler) Delete(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "bad_request", "invalid list ID")
		return
	}

	if err := h.svc.Delete(r.Context(), householdID, id); err != nil {
		switch err {
		case service.ErrNotFound:
			respond.Error(w, http.StatusNotFound, "not_found", "list not found")
		default:
			respond.Error(w, http.StatusInternalServerError, "internal_error", "failed to delete list")
		}
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ListItems handles GET /v1/lists/:id/items.
func (h *ListHandler) ListItems(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "bad_request", "invalid list ID")
		return
	}

	items, err := h.svc.ListItems(r.Context(), householdID, id)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "internal_error", "failed to list items")
		return
	}
	respond.JSON(w, http.StatusOK, items)
}

// CreateItem handles POST /v1/lists/:id/items.
func (h *ListHandler) CreateItem(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "bad_request", "invalid list ID")
		return
	}

	var req model.CreateListItemRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, http.StatusBadRequest, "bad_request", "invalid JSON body")
		return
	}
	if req.Text == "" {
		respond.Error(w, http.StatusBadRequest, "validation_error", "text is required")
		return
	}

	item, err := h.svc.CreateItem(r.Context(), householdID, id, req)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "internal_error", "failed to create item")
		return
	}
	respond.JSON(w, http.StatusCreated, item)
}

// UpdateItem handles PATCH /v1/lists/:id/items/:itemID.
func (h *ListHandler) UpdateItem(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "bad_request", "invalid list ID")
		return
	}
	itemID, err := uuid.Parse(chi.URLParam(r, "itemID"))
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "bad_request", "invalid item ID")
		return
	}

	var req model.UpdateListItemRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, http.StatusBadRequest, "bad_request", "invalid JSON body")
		return
	}

	item, err := h.svc.UpdateItem(r.Context(), householdID, id, itemID, req)
	if err != nil {
		switch err {
		case service.ErrNotFound:
			respond.Error(w, http.StatusNotFound, "not_found", "item not found")
		default:
			respond.Error(w, http.StatusInternalServerError, "internal_error", "failed to update item")
		}
		return
	}
	respond.JSON(w, http.StatusOK, item)
}

// DeleteItem handles DELETE /v1/lists/:id/items/:itemID.
func (h *ListHandler) DeleteItem(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "bad_request", "invalid list ID")
		return
	}
	itemID, err := uuid.Parse(chi.URLParam(r, "itemID"))
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "bad_request", "invalid item ID")
		return
	}

	if err := h.svc.DeleteItem(r.Context(), householdID, id, itemID); err != nil {
		switch err {
		case service.ErrNotFound:
			respond.Error(w, http.StatusNotFound, "not_found", "item not found")
		default:
			respond.Error(w, http.StatusInternalServerError, "internal_error", "failed to delete item")
		}
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
