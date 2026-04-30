package handler

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/tidyboard/tidyboard/internal/handler/respond"
	"github.com/tidyboard/tidyboard/internal/middleware"
	"github.com/tidyboard/tidyboard/internal/service"
)

// InviteHandler handles invite-by-code and join-request routes.
type InviteHandler struct {
	svc *service.InviteService
}

// NewInviteHandler constructs an InviteHandler.
func NewInviteHandler(svc *service.InviteService) *InviteHandler {
	return &InviteHandler{svc: svc}
}

// RegenerateInviteCode handles POST /v1/households/:id/invite/regenerate.
func (h *InviteHandler) RegenerateInviteCode(w http.ResponseWriter, r *http.Request) {
	householdID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "bad_request", "invalid household ID")
		return
	}

	code, err := h.svc.RegenerateInviteCode(r.Context(), householdID)
	if err != nil {
		switch err {
		case service.ErrNotFound:
			respond.Error(w, http.StatusNotFound, "not_found", "household not found")
		default:
			respond.Error(w, http.StatusInternalServerError, "internal_error", "failed to regenerate invite code")
		}
		return
	}
	respond.JSON(w, http.StatusOK, map[string]string{"invite_code": code})
}

// GetByCode handles GET /v1/households/by-code/:code.
func (h *InviteHandler) GetByCode(w http.ResponseWriter, r *http.Request) {
	code := chi.URLParam(r, "code")
	if code == "" {
		respond.Error(w, http.StatusBadRequest, "bad_request", "invite code is required")
		return
	}

	preview, err := h.svc.GetHouseholdByCode(r.Context(), code)
	if err != nil {
		switch err {
		case service.ErrNotFound:
			respond.Error(w, http.StatusNotFound, "not_found", "household not found for this code")
		default:
			respond.Error(w, http.StatusInternalServerError, "internal_error", "failed to look up household")
		}
		return
	}
	respond.JSON(w, http.StatusOK, preview)
}

// RequestJoin handles POST /v1/households/by-code/:code/join.
func (h *InviteHandler) RequestJoin(w http.ResponseWriter, r *http.Request) {
	accountID, ok := middleware.AccountIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, http.StatusUnauthorized, "unauthorized", "missing account context")
		return
	}

	code := chi.URLParam(r, "code")
	if code == "" {
		respond.Error(w, http.StatusBadRequest, "bad_request", "invite code is required")
		return
	}

	// Look up the household by code first.
	preview, err := h.svc.GetHouseholdByCode(r.Context(), code)
	if err != nil {
		switch err {
		case service.ErrNotFound:
			respond.Error(w, http.StatusNotFound, "not_found", "household not found for this code")
		default:
			respond.Error(w, http.StatusInternalServerError, "internal_error", "failed to look up household")
		}
		return
	}

	jr, err := h.svc.CreateJoinRequest(r.Context(), preview.HouseholdID, accountID)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "internal_error", "failed to create join request")
		return
	}
	respond.JSON(w, http.StatusCreated, jr)
}

// ListJoinRequests handles GET /v1/households/:id/join-requests.
func (h *InviteHandler) ListJoinRequests(w http.ResponseWriter, r *http.Request) {
	householdID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "bad_request", "invalid household ID")
		return
	}

	requests, err := h.svc.ListJoinRequests(r.Context(), householdID)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "internal_error", "failed to list join requests")
		return
	}
	respond.JSON(w, http.StatusOK, requests)
}

// ApproveJoinRequest handles POST /v1/join-requests/:id/approve.
func (h *InviteHandler) ApproveJoinRequest(w http.ResponseWriter, r *http.Request) {
	accountID, ok := middleware.AccountIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, http.StatusUnauthorized, "unauthorized", "missing account context")
		return
	}

	requestID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "bad_request", "invalid join request ID")
		return
	}

	jr, err := h.svc.ApproveJoinRequest(r.Context(), requestID, accountID)
	if err != nil {
		switch err {
		case service.ErrNotFound:
			respond.Error(w, http.StatusNotFound, "not_found", "join request not found")
		case service.ErrForbidden:
			respond.Error(w, http.StatusConflict, "conflict", "join request is not pending")
		default:
			respond.Error(w, http.StatusInternalServerError, "internal_error", "failed to approve join request")
		}
		return
	}
	respond.JSON(w, http.StatusOK, jr)
}

// RejectJoinRequest handles POST /v1/join-requests/:id/reject.
func (h *InviteHandler) RejectJoinRequest(w http.ResponseWriter, r *http.Request) {
	accountID, ok := middleware.AccountIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, http.StatusUnauthorized, "unauthorized", "missing account context")
		return
	}

	requestID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "bad_request", "invalid join request ID")
		return
	}

	jr, err := h.svc.RejectJoinRequest(r.Context(), requestID, accountID)
	if err != nil {
		switch err {
		case service.ErrNotFound:
			respond.Error(w, http.StatusNotFound, "not_found", "join request not found")
		case service.ErrForbidden:
			respond.Error(w, http.StatusConflict, "conflict", "join request is not pending")
		default:
			respond.Error(w, http.StatusInternalServerError, "internal_error", "failed to reject join request")
		}
		return
	}
	respond.JSON(w, http.StatusOK, jr)
}
