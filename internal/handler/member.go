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
	svc   *service.MemberService
	audit *service.AuditService
}

// NewMemberHandler constructs a MemberHandler.
func NewMemberHandler(svc *service.MemberService) *MemberHandler {
	return &MemberHandler{svc: svc}
}

// WithAudit wires an AuditService for logging member-rate edits. The audit
// service is optional; when nil, edits silently skip audit-log writes (this
// keeps the existing test wiring working).
func (h *MemberHandler) WithAudit(a *service.AuditService) *MemberHandler {
	h.audit = a
	return h
}

// redactHourlyRateForViewer scrubs HourlyRate fields off members the viewer is
// not authorized to see. Non-mutating to other fields. Operates in place.
func redactHourlyRateForViewer(members []*model.Member, viewerMemberID uuid.UUID, viewerRole string) {
	for _, m := range members {
		if !service.CanViewHourlyRate(viewerMemberID, m.ID, viewerRole) {
			m.RedactHourlyRate()
		}
	}
}

// ListCurrent handles GET /v1/households/current/members.
func (h *MemberHandler) ListCurrent(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, r, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}

	members, err := h.svc.List(r.Context(), householdID)
	if err != nil {
		respond.Error(w, r, http.StatusInternalServerError, "internal_error", "failed to list members")
		return
	}
	viewerMemberID, _ := middleware.MemberIDFromCtx(r.Context())
	redactHourlyRateForViewer(members, viewerMemberID, middleware.RoleFromCtx(r.Context()))
	respond.JSON(w, http.StatusOK, members)
}

// List handles GET /v1/households/:id/members.
func (h *MemberHandler) List(w http.ResponseWriter, r *http.Request) {
	householdID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respond.Error(w, r, http.StatusBadRequest, "bad_request", "invalid household ID")
		return
	}

	members, err := h.svc.List(r.Context(), householdID)
	if err != nil {
		respond.Error(w, r, http.StatusInternalServerError, "internal_error", "failed to list members")
		return
	}
	viewerMemberID, _ := middleware.MemberIDFromCtx(r.Context())
	redactHourlyRateForViewer(members, viewerMemberID, middleware.RoleFromCtx(r.Context()))
	respond.JSON(w, http.StatusOK, members)
}

// Create handles POST /v1/households/:id/members.
func (h *MemberHandler) Create(w http.ResponseWriter, r *http.Request) {
	householdID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respond.Error(w, r, http.StatusBadRequest, "bad_request", "invalid household ID")
		return
	}

	var req model.CreateMemberRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, r, http.StatusBadRequest, "bad_request", "invalid JSON body")
		return
	}
	if req.Name == "" {
		respond.Error(w, r, http.StatusBadRequest, "validation_error", "name is required")
		return
	}

	member, err := h.svc.Create(r.Context(), householdID, req)
	if err != nil {
		switch err {
		case service.ErrForbidden:
			respond.Error(w, r, http.StatusBadRequest, "validation_error", "pet profiles cannot have account or PIN credentials")
		default:
			respond.Error(w, r, http.StatusInternalServerError, "internal_error", "failed to create member")
		}
		return
	}
	respond.JSON(w, http.StatusCreated, member)
}

// Get handles GET /v1/households/:id/members/:memberID.
func (h *MemberHandler) Get(w http.ResponseWriter, r *http.Request) {
	householdID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respond.Error(w, r, http.StatusBadRequest, "bad_request", "invalid household ID")
		return
	}
	memberID, err := uuid.Parse(chi.URLParam(r, "memberID"))
	if err != nil {
		respond.Error(w, r, http.StatusBadRequest, "bad_request", "invalid member ID")
		return
	}

	member, err := h.svc.Get(r.Context(), householdID, memberID)
	if err != nil {
		switch err {
		case service.ErrNotFound:
			respond.Error(w, r, http.StatusNotFound, "not_found", "member not found")
		default:
			respond.Error(w, r, http.StatusInternalServerError, "internal_error", "failed to fetch member")
		}
		return
	}
	viewerMemberID, _ := middleware.MemberIDFromCtx(r.Context())
	if !service.CanViewHourlyRate(viewerMemberID, member.ID, middleware.RoleFromCtx(r.Context())) {
		member.RedactHourlyRate()
	}
	respond.JSON(w, http.StatusOK, member)
}

// Update handles PATCH /v1/households/:id/members/:memberID.
func (h *MemberHandler) Update(w http.ResponseWriter, r *http.Request) {
	householdID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respond.Error(w, r, http.StatusBadRequest, "bad_request", "invalid household ID")
		return
	}
	memberID, err := uuid.Parse(chi.URLParam(r, "memberID"))
	if err != nil {
		respond.Error(w, r, http.StatusBadRequest, "bad_request", "invalid member ID")
		return
	}

	var req model.UpdateMemberRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, r, http.StatusBadRequest, "bad_request", "invalid JSON body")
		return
	}

	// Hourly rate is private — require self or household admin.
	wantsRateChange := req.HourlyRateCentsMin != nil || req.HourlyRateCentsMax != nil
	if wantsRateChange {
		viewerMemberID, _ := middleware.MemberIDFromCtx(r.Context())
		if !service.CanEditHourlyRate(viewerMemberID, memberID, middleware.RoleFromCtx(r.Context())) {
			respond.Error(w, r, http.StatusForbidden, "forbidden", "not allowed to modify this member's hourly rate")
			return
		}
		if req.HourlyRateCentsMin != nil && req.HourlyRateCentsMax != nil &&
			*req.HourlyRateCentsMin > *req.HourlyRateCentsMax {
			respond.Error(w, r, http.StatusBadRequest, "validation_error", "hourly_rate_cents_min must be <= hourly_rate_cents_max")
			return
		}
	}

	// Strip rate fields from the generic Update path so they don't leak into
	// the audit-log payload below; then apply them via the dedicated helper.
	rateMin := req.HourlyRateCentsMin
	rateMax := req.HourlyRateCentsMax
	req.HourlyRateCentsMin = nil
	req.HourlyRateCentsMax = nil

	member, err := h.svc.Update(r.Context(), householdID, memberID, req)
	if err != nil {
		switch err {
		case service.ErrNotFound:
			respond.Error(w, r, http.StatusNotFound, "not_found", "member not found")
		case service.ErrForbidden:
			respond.Error(w, r, http.StatusBadRequest, "validation_error", "pet profiles cannot have account or PIN credentials")
		default:
			respond.Error(w, r, http.StatusInternalServerError, "internal_error", "failed to update member")
		}
		return
	}

	if wantsRateChange {
		updated, err := h.svc.UpdateHourlyRate(r.Context(), householdID, memberID, rateMin, rateMax)
		if err != nil {
			switch err {
			case service.ErrNotFound:
				respond.Error(w, r, http.StatusNotFound, "not_found", "member not found")
			case service.ErrValidation:
				respond.Error(w, r, http.StatusBadRequest, "validation_error", "invalid hourly rate range")
			default:
				respond.Error(w, r, http.StatusInternalServerError, "internal_error", "failed to update member")
			}
			return
		}
		member = updated
		// Privacy: audit-log entry MUST NOT contain rate values.
		if h.audit != nil {
			h.audit.Log(r.Context(), "member.hourly_rate.updated", "member", memberID, map[string]any{
				"member_id": memberID.String(),
			})
		}
	}

	// Redact for the response if the viewer isn't authorized (defense-in-depth).
	viewerMemberID, _ := middleware.MemberIDFromCtx(r.Context())
	if !service.CanViewHourlyRate(viewerMemberID, member.ID, middleware.RoleFromCtx(r.Context())) {
		member.RedactHourlyRate()
	}

	respond.JSON(w, http.StatusOK, member)
}

// Delete handles DELETE /v1/households/:id/members/:memberID.
func (h *MemberHandler) Delete(w http.ResponseWriter, r *http.Request) {
	householdID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respond.Error(w, r, http.StatusBadRequest, "bad_request", "invalid household ID")
		return
	}
	memberID, err := uuid.Parse(chi.URLParam(r, "memberID"))
	if err != nil {
		respond.Error(w, r, http.StatusBadRequest, "bad_request", "invalid member ID")
		return
	}

	if err := h.svc.Delete(r.Context(), householdID, memberID); err != nil {
		switch err {
		case service.ErrNotFound:
			respond.Error(w, r, http.StatusNotFound, "not_found", "member not found")
		default:
			respond.Error(w, r, http.StatusInternalServerError, "internal_error", "failed to delete member")
		}
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
