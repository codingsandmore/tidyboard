package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/tidyboard/tidyboard/internal/handler/respond"
	"github.com/tidyboard/tidyboard/internal/middleware"
	"github.com/tidyboard/tidyboard/internal/model"
	"github.com/tidyboard/tidyboard/internal/service"
)

// RewardHandler handles rewards catalog, redemption state machine,
// cost adjustments, savings goals, and timeline routes.
type RewardHandler struct {
	svc *service.RewardService
}

// NewRewardHandler constructs a RewardHandler.
func NewRewardHandler(svc *service.RewardService) *RewardHandler {
	return &RewardHandler{svc: svc}
}

// ── Catalog ────────────────────────────────────────────────────────────────

// List handles GET /v1/rewards.
// Query param: active=false to include archived rewards (default: active-only).
func (h *RewardHandler) List(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}
	onlyActive := r.URL.Query().Get("active") != "false" // default true
	rows, err := h.svc.ListRewards(r.Context(), householdID, onlyActive)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "internal_error", "list rewards")
		return
	}
	respond.JSON(w, http.StatusOK, rows)
}

// Create handles POST /v1/rewards (admin only).
func (h *RewardHandler) Create(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}
	if !isAdmin(middleware.RoleFromCtx(r.Context())) {
		respond.Error(w, http.StatusForbidden, "forbidden", "admin role required")
		return
	}
	var req model.CreateRewardRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, http.StatusBadRequest, "bad_request", "invalid JSON body")
		return
	}
	if req.Name == "" {
		respond.Error(w, http.StatusBadRequest, "validation_error", "name required")
		return
	}
	if req.CostPoints < 0 {
		respond.Error(w, http.StatusBadRequest, "validation_error", "cost_points must be >= 0")
		return
	}
	if req.FulfillmentKind != "self_serve" && req.FulfillmentKind != "needs_approval" {
		respond.Error(w, http.StatusBadRequest, "validation_error", "invalid fulfillment_kind")
		return
	}

	accountID, _ := middleware.AccountIDFromCtx(r.Context())
	rw, err := h.svc.CreateReward(r.Context(), householdID, req.Name, req.Description, req.ImageURL, req.CostPoints, req.FulfillmentKind, &accountID)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "internal_error", "create reward")
		return
	}
	respond.JSON(w, http.StatusCreated, rw)
}

// Update handles PATCH /v1/rewards/{id} (admin only).
func (h *RewardHandler) Update(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}
	if !isAdmin(middleware.RoleFromCtx(r.Context())) {
		respond.Error(w, http.StatusForbidden, "forbidden", "admin role required")
		return
	}
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "bad_request", "invalid id")
		return
	}
	var req model.UpdateRewardRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, http.StatusBadRequest, "bad_request", "invalid JSON body")
		return
	}
	rw, err := h.svc.UpdateReward(r.Context(), householdID, id, req.Name, req.Description, req.ImageURL, req.CostPoints, req.FulfillmentKind, req.Active)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "internal_error", "update reward")
		return
	}
	respond.JSON(w, http.StatusOK, rw)
}

// Archive handles DELETE /v1/rewards/{id} (admin only).
func (h *RewardHandler) Archive(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}
	if !isAdmin(middleware.RoleFromCtx(r.Context())) {
		respond.Error(w, http.StatusForbidden, "forbidden", "admin role required")
		return
	}
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "bad_request", "invalid id")
		return
	}
	if err := h.svc.ArchiveReward(r.Context(), householdID, id); err != nil {
		respond.Error(w, http.StatusInternalServerError, "internal_error", "archive")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ── Redemptions ─────────────────────────────────────────────────────────────

// Redeem handles POST /v1/rewards/{id}/redeem.
// Uses the caller's member_id from the JWT/PIN session via MemberIDFromCtx.
// Falls back to ?member_id= query param so admins can redeem on behalf of a kid.
func (h *RewardHandler) Redeem(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}
	rewardID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "bad_request", "invalid id")
		return
	}

	// Prefer member_id from the authenticated session (kid's JWT/PIN token).
	var memberID uuid.UUID
	if mid, ok := middleware.MemberIDFromCtx(r.Context()); ok {
		memberID = mid
	} else if m := r.URL.Query().Get("member_id"); m != "" {
		// Admin redeeming on behalf of a kid.
		mid, err := uuid.Parse(m)
		if err != nil {
			respond.Error(w, http.StatusBadRequest, "bad_request", "invalid member_id")
			return
		}
		memberID = mid
	} else {
		respond.Error(w, http.StatusBadRequest, "bad_request", "member_id required")
		return
	}

	accountID, _ := middleware.AccountIDFromCtx(r.Context())
	resp, err := h.svc.Redeem(r.Context(), householdID, memberID, rewardID, &accountID)
	if errors.Is(err, service.ErrInsufficientPoints) {
		respond.Error(w, http.StatusConflict, "insufficient_points", "not enough points to redeem this reward")
		return
	}
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "internal_error", "redeem")
		return
	}
	respond.JSON(w, http.StatusOK, resp)
}

// Approve handles POST /v1/redemptions/{id}/approve (admin only).
func (h *RewardHandler) Approve(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}
	if !isAdmin(middleware.RoleFromCtx(r.Context())) {
		respond.Error(w, http.StatusForbidden, "forbidden", "admin role required")
		return
	}
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "bad_request", "invalid id")
		return
	}
	accountID, _ := middleware.AccountIDFromCtx(r.Context())
	red, err := h.svc.ApproveRedemption(r.Context(), householdID, id, &accountID)
	if errors.Is(err, service.ErrInvalidStateTransition) {
		respond.Error(w, http.StatusConflict, "invalid_state", "redemption is not pending")
		return
	}
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "internal_error", "approve")
		return
	}
	respond.JSON(w, http.StatusOK, red)
}

// Decline handles POST /v1/redemptions/{id}/decline (admin only).
func (h *RewardHandler) Decline(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}
	if !isAdmin(middleware.RoleFromCtx(r.Context())) {
		respond.Error(w, http.StatusForbidden, "forbidden", "admin role required")
		return
	}
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "bad_request", "invalid id")
		return
	}
	var req model.DeclineRedemptionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, http.StatusBadRequest, "bad_request", "invalid JSON body")
		return
	}
	if req.Reason == "" {
		respond.Error(w, http.StatusBadRequest, "validation_error", "reason required")
		return
	}
	accountID, _ := middleware.AccountIDFromCtx(r.Context())
	red, err := h.svc.DeclineRedemption(r.Context(), householdID, id, req.Reason, &accountID)
	if errors.Is(err, service.ErrInvalidStateTransition) {
		respond.Error(w, http.StatusConflict, "invalid_state", "not pending")
		return
	}
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "internal_error", "decline")
		return
	}
	respond.JSON(w, http.StatusOK, red)
}

// Fulfill handles POST /v1/redemptions/{id}/fulfill (admin only).
func (h *RewardHandler) Fulfill(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}
	if !isAdmin(middleware.RoleFromCtx(r.Context())) {
		respond.Error(w, http.StatusForbidden, "forbidden", "admin role required")
		return
	}
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "bad_request", "invalid id")
		return
	}
	red, err := h.svc.FulfillRedemption(r.Context(), householdID, id)
	if errors.Is(err, service.ErrInvalidStateTransition) {
		respond.Error(w, http.StatusConflict, "invalid_state", "not approved")
		return
	}
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "internal_error", "fulfill")
		return
	}
	respond.JSON(w, http.StatusOK, red)
}

// ListRedemptions handles GET /v1/redemptions.
// Query params: member_id, status, limit, offset.
func (h *RewardHandler) ListRedemptions(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}
	var memberID *uuid.UUID
	if m := r.URL.Query().Get("member_id"); m != "" {
		id, err := uuid.Parse(m)
		if err != nil {
			respond.Error(w, http.StatusBadRequest, "bad_request", "invalid member_id")
			return
		}
		memberID = &id
	}
	var status *string
	if s := r.URL.Query().Get("status"); s != "" {
		status = &s
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))
	if offset < 0 {
		offset = 0
	}
	rows, err := h.svc.ListRedemptions(r.Context(), householdID, memberID, status, int32(limit), int32(offset))
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "internal_error", "list redemptions")
		return
	}
	respond.JSON(w, http.StatusOK, rows)
}

// ── Savings goals ──────────────────────────────────────────────────────────

// SetSavingsGoal handles PUT /v1/members/{member_id}/savings-goal.
func (h *RewardHandler) SetSavingsGoal(w http.ResponseWriter, r *http.Request) {
	if _, ok := middleware.HouseholdIDFromCtx(r.Context()); !ok {
		respond.Error(w, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}
	memberID, err := uuid.Parse(chi.URLParam(r, "member_id"))
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "bad_request", "invalid member_id")
		return
	}
	var req model.SetSavingsGoalRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, http.StatusBadRequest, "bad_request", "invalid JSON body")
		return
	}
	g, err := h.svc.SetSavingsGoal(r.Context(), memberID, req.RewardID)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "internal_error", "set savings goal")
		return
	}
	respond.JSON(w, http.StatusOK, g)
}

// ── Cost adjustments ───────────────────────────────────────────────────────

// CostAdjust handles POST /v1/rewards/{id}/cost-adjustments (admin only).
func (h *RewardHandler) CostAdjust(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}
	if !isAdmin(middleware.RoleFromCtx(r.Context())) {
		respond.Error(w, http.StatusForbidden, "forbidden", "admin role required")
		return
	}
	rewardID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "bad_request", "invalid id")
		return
	}
	var req model.CostAdjustRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, http.StatusBadRequest, "bad_request", "invalid JSON body")
		return
	}
	if req.MemberID == uuid.Nil || req.DeltaPoints == 0 {
		respond.Error(w, http.StatusBadRequest, "validation_error", "member_id and non-zero delta_points required")
		return
	}

	var expiresAt *time.Time
	if req.ExpiresAt != nil && *req.ExpiresAt != "" {
		t, err := time.Parse(time.RFC3339, *req.ExpiresAt)
		if err != nil {
			respond.Error(w, http.StatusBadRequest, "validation_error", "invalid expires_at")
			return
		}
		expiresAt = &t
	}
	accountID, _ := middleware.AccountIDFromCtx(r.Context())
	adj, err := h.svc.CreateCostAdjustment(r.Context(), householdID, req.MemberID, rewardID, req.DeltaPoints, req.Reason, expiresAt, &accountID)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "internal_error", "adjust")
		return
	}
	respond.JSON(w, http.StatusCreated, adj)
}

// DeleteCostAdjustment handles DELETE /v1/rewards/cost-adjustments/{id} (admin only).
func (h *RewardHandler) DeleteCostAdjustment(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}
	if !isAdmin(middleware.RoleFromCtx(r.Context())) {
		respond.Error(w, http.StatusForbidden, "forbidden", "admin role required")
		return
	}
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "bad_request", "invalid id")
		return
	}
	if err := h.svc.DeleteCostAdjustment(r.Context(), householdID, id); err != nil {
		respond.Error(w, http.StatusInternalServerError, "internal_error", "delete")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ── Timeline ───────────────────────────────────────────────────────────────

// Timeline handles GET /v1/members/{member_id}/timeline.
// Query params: limit, offset.
func (h *RewardHandler) Timeline(w http.ResponseWriter, r *http.Request) {
	if _, ok := middleware.HouseholdIDFromCtx(r.Context()); !ok {
		respond.Error(w, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}
	memberID, err := uuid.Parse(chi.URLParam(r, "member_id"))
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "bad_request", "invalid member_id")
		return
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))
	if offset < 0 {
		offset = 0
	}
	rows, err := h.svc.Timeline(r.Context(), memberID, limit, offset)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "internal_error", "timeline")
		return
	}
	respond.JSON(w, http.StatusOK, rows)
}
