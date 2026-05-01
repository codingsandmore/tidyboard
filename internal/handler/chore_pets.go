package handler

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/tidyboard/tidyboard/internal/handler/respond"
	"github.com/tidyboard/tidyboard/internal/middleware"
	"github.com/tidyboard/tidyboard/internal/service"
)

// ChorePetsHandler exposes the chore_pets join table over HTTP.
//
// Spec: docs/specs/2026-05-01-fairplay-design.md, section D.2.
type ChorePetsHandler struct {
	svc *service.ChorePetsService
}

// NewChorePetsHandler constructs a ChorePetsHandler.
func NewChorePetsHandler(svc *service.ChorePetsService) *ChorePetsHandler {
	return &ChorePetsHandler{svc: svc}
}

// setChorePetsRequest is the JSON body for POST /v1/chores/{id}/pets.
type setChorePetsRequest struct {
	PetMemberIDs []string `json:"pet_member_ids"`
}

// setChorePetsResponse is the JSON body returned by POST /v1/chores/{id}/pets
// and GET /v1/chores/{id}/pets.
type setChorePetsResponse struct {
	ChoreID      uuid.UUID   `json:"chore_id"`
	PetMemberIDs []uuid.UUID `json:"pet_member_ids"`
}

// Set handles POST /v1/chores/{id}/pets — replace-set semantics.
// Body: {"pet_member_ids": ["uuid", ...]}
// Caller must be admin or owner.
func (h *ChorePetsHandler) Set(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, r, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}
	if !isAdmin(middleware.RoleFromCtx(r.Context())) {
		respond.Error(w, r, http.StatusForbidden, "forbidden", "admin role required")
		return
	}

	choreID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respond.Error(w, r, http.StatusBadRequest, "bad_request", "invalid chore ID")
		return
	}

	var req setChorePetsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, r, http.StatusBadRequest, "bad_request", "invalid JSON body")
		return
	}

	petIDs := make([]uuid.UUID, 0, len(req.PetMemberIDs))
	seen := make(map[uuid.UUID]struct{}, len(req.PetMemberIDs))
	for _, s := range req.PetMemberIDs {
		id, err := uuid.Parse(s)
		if err != nil {
			respond.Error(w, r, http.StatusBadRequest, "bad_request", "invalid pet member ID: "+s)
			return
		}
		if _, dup := seen[id]; dup {
			continue
		}
		seen[id] = struct{}{}
		petIDs = append(petIDs, id)
	}

	if err := h.svc.LinkChorePets(r.Context(), householdID, choreID, petIDs); err != nil {
		if errors.Is(err, service.ErrChorePetsInvalidMember) {
			respond.Error(w, r, http.StatusBadRequest, "validation_error", err.Error())
			return
		}
		respond.Error(w, r, http.StatusInternalServerError, "internal_error", "failed to link chore pets")
		return
	}

	respond.JSON(w, http.StatusOK, setChorePetsResponse{
		ChoreID:      choreID,
		PetMemberIDs: petIDs,
	})
}

// List handles GET /v1/chores/{id}/pets.
func (h *ChorePetsHandler) List(w http.ResponseWriter, r *http.Request) {
	if _, ok := middleware.HouseholdIDFromCtx(r.Context()); !ok {
		respond.Error(w, r, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}
	choreID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respond.Error(w, r, http.StatusBadRequest, "bad_request", "invalid chore ID")
		return
	}
	ids, err := h.svc.ListPetMemberIDs(r.Context(), choreID)
	if err != nil {
		respond.Error(w, r, http.StatusInternalServerError, "internal_error", "failed to list chore pets")
		return
	}
	respond.JSON(w, http.StatusOK, setChorePetsResponse{
		ChoreID:      choreID,
		PetMemberIDs: ids,
	})
}
