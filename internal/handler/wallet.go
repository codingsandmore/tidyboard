package handler

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/tidyboard/tidyboard/internal/handler/respond"
	"github.com/tidyboard/tidyboard/internal/middleware"
	"github.com/tidyboard/tidyboard/internal/query"
	"github.com/tidyboard/tidyboard/internal/service"
)

// WalletHandler handles wallet, allowance, and ad-hoc task routes.
type WalletHandler struct {
	svc *service.WalletService
	q   *query.Queries
}

// NewWalletHandler constructs a WalletHandler.
func NewWalletHandler(svc *service.WalletService, q *query.Queries) *WalletHandler {
	return &WalletHandler{svc: svc, q: q}
}

// walletResponse bundles wallet balance with recent transactions.
type walletResponse struct {
	Wallet       query.Wallet              `json:"wallet"`
	Transactions []query.WalletTransaction `json:"transactions"`
}

// GetWallet handles GET /v1/wallet/{member_id}.
func (h *WalletHandler) GetWallet(w http.ResponseWriter, r *http.Request) {
	_, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}

	memberID, err := uuid.Parse(chi.URLParam(r, "member_id"))
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "bad_request", "invalid member_id")
		return
	}

	wallet, err := h.svc.GetWallet(r.Context(), memberID)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "internal_error", "failed to get wallet")
		return
	}

	txns, err := h.svc.ListTransactions(r.Context(), memberID, 20, 0)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "internal_error", "failed to list transactions")
		return
	}

	respond.JSON(w, http.StatusOK, walletResponse{Wallet: wallet, Transactions: txns})
}

// tipRequest is the JSON body for POST /v1/wallet/{member_id}/tip.
type tipRequest struct {
	AmountCents int64  `json:"amount_cents"`
	Reason      string `json:"reason"`
}

// Tip handles POST /v1/wallet/{member_id}/tip (admin only).
func (h *WalletHandler) Tip(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}

	if !isAdmin(middleware.RoleFromCtx(r.Context())) {
		respond.Error(w, http.StatusForbidden, "forbidden", "admin role required")
		return
	}

	memberID, err := uuid.Parse(chi.URLParam(r, "member_id"))
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "bad_request", "invalid member_id")
		return
	}

	accountID, _ := middleware.AccountIDFromCtx(r.Context())

	var req tipRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, http.StatusBadRequest, "bad_request", "invalid JSON body")
		return
	}
	if req.AmountCents <= 0 {
		respond.Error(w, http.StatusBadRequest, "validation_error", "amount_cents must be positive")
		return
	}

	tx, err := h.svc.Tip(r.Context(), householdID, memberID, &accountID, req.AmountCents, req.Reason)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "internal_error", "failed to record tip")
		return
	}
	respond.JSON(w, http.StatusCreated, tx)
}

// cashOutRequest is the JSON body for POST /v1/wallet/{member_id}/cash-out.
type cashOutRequest struct {
	AmountCents int64  `json:"amount_cents"`
	Method      string `json:"method"`
	Note        string `json:"note"`
}

// CashOut handles POST /v1/wallet/{member_id}/cash-out (admin only).
func (h *WalletHandler) CashOut(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}

	if !isAdmin(middleware.RoleFromCtx(r.Context())) {
		respond.Error(w, http.StatusForbidden, "forbidden", "admin role required")
		return
	}

	memberID, err := uuid.Parse(chi.URLParam(r, "member_id"))
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "bad_request", "invalid member_id")
		return
	}

	accountID, _ := middleware.AccountIDFromCtx(r.Context())

	var req cashOutRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, http.StatusBadRequest, "bad_request", "invalid JSON body")
		return
	}
	if req.AmountCents <= 0 {
		respond.Error(w, http.StatusBadRequest, "validation_error", "amount_cents must be positive")
		return
	}
	if req.Method == "" {
		respond.Error(w, http.StatusBadRequest, "validation_error", "method is required")
		return
	}

	tx, err := h.svc.CashOut(r.Context(), householdID, memberID, &accountID, req.AmountCents, req.Method, req.Note)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "internal_error", "failed to record cash-out")
		return
	}
	respond.JSON(w, http.StatusCreated, tx)
}

// adjustRequest is the JSON body for POST /v1/wallet/{member_id}/adjust.
type adjustRequest struct {
	AmountCents int64  `json:"amount_cents"`
	Reason      string `json:"reason"`
}

// Adjust handles POST /v1/wallet/{member_id}/adjust (admin only).
func (h *WalletHandler) Adjust(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}

	if !isAdmin(middleware.RoleFromCtx(r.Context())) {
		respond.Error(w, http.StatusForbidden, "forbidden", "admin role required")
		return
	}

	memberID, err := uuid.Parse(chi.URLParam(r, "member_id"))
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "bad_request", "invalid member_id")
		return
	}

	accountID, _ := middleware.AccountIDFromCtx(r.Context())

	var req adjustRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, http.StatusBadRequest, "bad_request", "invalid JSON body")
		return
	}
	if req.Reason == "" {
		respond.Error(w, http.StatusBadRequest, "validation_error", "reason is required")
		return
	}

	tx, err := h.svc.Adjust(r.Context(), householdID, memberID, &accountID, req.AmountCents, req.Reason)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "internal_error", "failed to record adjustment")
		return
	}
	respond.JSON(w, http.StatusCreated, tx)
}

// ListAllowances handles GET /v1/allowance.
func (h *WalletHandler) ListAllowances(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}

	allowances, err := h.q.ListAllowances(r.Context(), householdID)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "internal_error", "failed to list allowances")
		return
	}
	respond.JSON(w, http.StatusOK, allowances)
}

// setAllowanceRequest is the JSON body for PUT /v1/allowance/{member_id}.
type setAllowanceRequest struct {
	AmountCents int64 `json:"amount_cents"`
}

// SetAllowance handles PUT /v1/allowance/{member_id} (admin only).
func (h *WalletHandler) SetAllowance(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}

	if !isAdmin(middleware.RoleFromCtx(r.Context())) {
		respond.Error(w, http.StatusForbidden, "forbidden", "admin role required")
		return
	}

	memberID, err := uuid.Parse(chi.URLParam(r, "member_id"))
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "bad_request", "invalid member_id")
		return
	}

	var req setAllowanceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, http.StatusBadRequest, "bad_request", "invalid JSON body")
		return
	}
	if req.AmountCents < 0 {
		respond.Error(w, http.StatusBadRequest, "validation_error", "amount_cents must be non-negative")
		return
	}

	allowance, err := h.q.UpsertAllowance(r.Context(), query.UpsertAllowanceParams{
		HouseholdID: householdID,
		MemberID:    memberID,
		AmountCents: req.AmountCents,
		ActiveFrom:  pgtype.Date{Time: time.Now().UTC().Truncate(24 * time.Hour), Valid: true},
	})
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "internal_error", "failed to set allowance")
		return
	}
	respond.JSON(w, http.StatusOK, allowance)
}

// createAdHocTaskRequest is the JSON body for POST /v1/ad-hoc-tasks.
type createAdHocTaskRequest struct {
	MemberID         string  `json:"member_id"`
	Name             string  `json:"name"`
	PayoutCents      int32   `json:"payout_cents"`
	RequiresApproval bool    `json:"requires_approval"`
	ExpiresAt        *string `json:"expires_at"`
}

// CreateAdHocTask handles POST /v1/ad-hoc-tasks (admin only).
func (h *WalletHandler) CreateAdHocTask(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}

	if !isAdmin(middleware.RoleFromCtx(r.Context())) {
		respond.Error(w, http.StatusForbidden, "forbidden", "admin role required")
		return
	}

	accountID, _ := middleware.AccountIDFromCtx(r.Context())

	var req createAdHocTaskRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, http.StatusBadRequest, "bad_request", "invalid JSON body")
		return
	}
	if req.Name == "" {
		respond.Error(w, http.StatusBadRequest, "validation_error", "name is required")
		return
	}
	memberID, err := uuid.Parse(req.MemberID)
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "validation_error", "valid member_id is required")
		return
	}

	var expiresAt pgtype.Timestamptz
	if req.ExpiresAt != nil && *req.ExpiresAt != "" {
		t, err := time.Parse(time.RFC3339, *req.ExpiresAt)
		if err != nil {
			respond.Error(w, http.StatusBadRequest, "bad_request", "expires_at must be RFC3339")
			return
		}
		expiresAt = pgtype.Timestamptz{Time: t, Valid: true}
	}

	byAccountID := &uuid.NullUUID{UUID: accountID, Valid: true}
	task, err := h.q.CreateAdHocTask(r.Context(), query.CreateAdHocTaskParams{
		HouseholdID:        householdID,
		MemberID:           memberID,
		Name:               req.Name,
		PayoutCents:        req.PayoutCents,
		RequiresApproval:   req.RequiresApproval,
		CreatedByAccountID: byAccountID,
		ExpiresAt:          expiresAt,
	})
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "internal_error", "failed to create ad-hoc task")
		return
	}
	respond.JSON(w, http.StatusCreated, task)
}

// CompleteAdHocTask handles POST /v1/ad-hoc-tasks/{id}/complete.
// Kid marks task done — sets status=pending. Caller must be the task's member OR admin.
func (h *WalletHandler) CompleteAdHocTask(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}

	callerMember, hasMember := middleware.MemberIDFromCtx(r.Context())
	role := middleware.RoleFromCtx(r.Context())

	taskID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "bad_request", "invalid task ID")
		return
	}

	task, err := h.q.GetAdHocTask(r.Context(), query.GetAdHocTaskParams{
		ID:          taskID,
		HouseholdID: householdID,
	})
	if err != nil {
		respond.Error(w, http.StatusNotFound, "not_found", "ad-hoc task not found")
		return
	}

	// Enforce: caller is the task's member OR admin.
	if !isAdmin(role) {
		if !hasMember || callerMember != task.MemberID {
			respond.Error(w, http.StatusForbidden, "forbidden", "you can only complete your own tasks")
			return
		}
	}

	updated, err := h.q.MarkAdHocTaskCompleted(r.Context(), query.MarkAdHocTaskCompletedParams{
		ID:          taskID,
		HouseholdID: householdID,
	})
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "internal_error", "failed to mark task completed")
		return
	}
	respond.JSON(w, http.StatusOK, updated)
}

// ApproveAdHocTask handles POST /v1/ad-hoc-tasks/{id}/approve (admin only).
// Sets status=approved and credits the member's wallet via WalletService.Credit.
func (h *WalletHandler) ApproveAdHocTask(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}

	if !isAdmin(middleware.RoleFromCtx(r.Context())) {
		respond.Error(w, http.StatusForbidden, "forbidden", "admin role required")
		return
	}

	accountID, _ := middleware.AccountIDFromCtx(r.Context())

	taskID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "bad_request", "invalid task ID")
		return
	}

	byAccountID := &uuid.NullUUID{UUID: accountID, Valid: true}
	task, err := h.q.ApproveAdHocTask(r.Context(), query.ApproveAdHocTaskParams{
		ID:                  taskID,
		HouseholdID:         householdID,
		ApprovedByAccountID: byAccountID,
	})
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "internal_error", "failed to approve task")
		return
	}

	// Credit the member's wallet.
	if task.PayoutCents > 0 {
		refID := task.ID
		if _, credErr := h.svc.Credit(r.Context(), householdID, service.CreditInput{
			MemberID:           task.MemberID,
			AmountCents:        int64(task.PayoutCents),
			Kind:               "ad_hoc",
			Reason:             task.Name,
			ReferenceID:        &refID,
			CreatedByAccountID: &accountID,
		}); credErr != nil {
			respond.Error(w, http.StatusInternalServerError, "internal_error", "task approved but wallet credit failed")
			return
		}
	}

	respond.JSON(w, http.StatusOK, task)
}

// declineAdHocTaskRequest is the JSON body for POST /v1/ad-hoc-tasks/{id}/decline.
type declineAdHocTaskRequest struct {
	Reason string `json:"reason"`
}

// DeclineAdHocTask handles POST /v1/ad-hoc-tasks/{id}/decline (admin only).
func (h *WalletHandler) DeclineAdHocTask(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}

	if !isAdmin(middleware.RoleFromCtx(r.Context())) {
		respond.Error(w, http.StatusForbidden, "forbidden", "admin role required")
		return
	}

	taskID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "bad_request", "invalid task ID")
		return
	}

	var req declineAdHocTaskRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, http.StatusBadRequest, "bad_request", "invalid JSON body")
		return
	}

	task, err := h.q.DeclineAdHocTask(r.Context(), query.DeclineAdHocTaskParams{
		ID:            taskID,
		HouseholdID:   householdID,
		DeclineReason: req.Reason,
	})
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "internal_error", "failed to decline task")
		return
	}
	respond.JSON(w, http.StatusOK, task)
}

// ListAdHocTasks handles GET /v1/ad-hoc-tasks.
// Query params: status, member_id.
func (h *WalletHandler) ListAdHocTasks(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}

	q := r.URL.Query()

	var memberFilter *uuid.NullUUID
	if m := q.Get("member_id"); m != "" {
		id, err := uuid.Parse(m)
		if err != nil {
			respond.Error(w, http.StatusBadRequest, "bad_request", "invalid member_id")
			return
		}
		memberFilter = &uuid.NullUUID{UUID: id, Valid: true}
	}

	var statusFilter *string
	if s := q.Get("status"); s != "" {
		statusFilter = &s
	}

	tasks, err := h.q.ListAdHocTasks(r.Context(), query.ListAdHocTasksParams{
		HouseholdID: householdID,
		MemberID:    memberFilter,
		Status:      statusFilter,
	})
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "internal_error", "failed to list ad-hoc tasks")
		return
	}
	respond.JSON(w, http.StatusOK, tasks)
}
