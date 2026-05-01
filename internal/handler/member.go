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

// MemberHandler handles member CRUD routes.
type MemberHandler struct {
	svc *service.MemberService
}

// NewMemberHandler constructs a MemberHandler.
func NewMemberHandler(svc *service.MemberService) *MemberHandler {
	return &MemberHandler{svc: svc}
}

// ListCurrent handles GET /v1/households/current/members.
func (h *MemberHandler) ListCurrent(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}

	members, err := h.svc.List(r.Context(), householdID)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "internal_error", "failed to list members")
		return
	}
	respond.JSON(w, http.StatusOK, members)
}

// List handles GET /v1/households/:id/members.
func (h *MemberHandler) List(w http.ResponseWriter, r *http.Request) {
	householdID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "bad_request", "invalid household ID")
		return
	}

	members, err := h.svc.List(r.Context(), householdID)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "internal_error", "failed to list members")
		return
	}
	respond.JSON(w, http.StatusOK, members)
}

// Create handles POST /v1/households/:id/members.
func (h *MemberHandler) Create(w http.ResponseWriter, r *http.Request) {
	householdID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "bad_request", "invalid household ID")
		return
	}

	var req model.CreateMemberRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, http.StatusBadRequest, "bad_request", "invalid JSON body")
		return
	}
	if req.Name == "" {
		respond.Error(w, http.StatusBadRequest, "validation_error", "name is required")
		return
	}

	member, err := h.svc.Create(r.Context(), householdID, req)
	if err != nil {
		switch err {
		case service.ErrForbidden:
			respond.Error(w, http.StatusBadRequest, "validation_error", "pet profiles cannot have account or PIN credentials")
		default:
			respond.Error(w, http.StatusInternalServerError, "internal_error", "failed to create member")
		}
		return
	}
	respond.JSON(w, http.StatusCreated, member)
}

// Get handles GET /v1/households/:id/members/:memberID.
func (h *MemberHandler) Get(w http.ResponseWriter, r *http.Request) {
	householdID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "bad_request", "invalid household ID")
		return
	}
	memberID, err := uuid.Parse(chi.URLParam(r, "memberID"))
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "bad_request", "invalid member ID")
		return
	}

	member, err := h.svc.Get(r.Context(), householdID, memberID)
	if err != nil {
		switch err {
		case service.ErrNotFound:
			respond.Error(w, http.StatusNotFound, "not_found", "member not found")
		default:
			respond.Error(w, http.StatusInternalServerError, "internal_error", "failed to fetch member")
		}
		return
	}
	respond.JSON(w, http.StatusOK, member)
}

// Update handles PATCH /v1/households/:id/members/:memberID.
func (h *MemberHandler) Update(w http.ResponseWriter, r *http.Request) {
	householdID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "bad_request", "invalid household ID")
		return
	}
	memberID, err := uuid.Parse(chi.URLParam(r, "memberID"))
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "bad_request", "invalid member ID")
		return
	}

	var req model.UpdateMemberRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, http.StatusBadRequest, "bad_request", "invalid JSON body")
		return
	}

	member, err := h.svc.Update(r.Context(), householdID, memberID, req)
	if err != nil {
		switch err {
		case service.ErrNotFound:
			respond.Error(w, http.StatusNotFound, "not_found", "member not found")
		case service.ErrForbidden:
			respond.Error(w, http.StatusBadRequest, "validation_error", "pet profiles cannot have account or PIN credentials")
		default:
			respond.Error(w, http.StatusInternalServerError, "internal_error", "failed to update member")
		}
		return
	}
	respond.JSON(w, http.StatusOK, member)
}

// Delete handles DELETE /v1/households/:id/members/:memberID.
func (h *MemberHandler) Delete(w http.ResponseWriter, r *http.Request) {
	householdID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "bad_request", "invalid household ID")
		return
	}
	memberID, err := uuid.Parse(chi.URLParam(r, "memberID"))
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "bad_request", "invalid member ID")
		return
	}

	if err := h.svc.Delete(r.Context(), householdID, memberID); err != nil {
		switch err {
		case service.ErrNotFound:
			respond.Error(w, http.StatusNotFound, "not_found", "member not found")
		default:
			respond.Error(w, http.StatusInternalServerError, "internal_error", "failed to delete member")
		}
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
