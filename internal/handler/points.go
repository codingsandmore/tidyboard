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

// PointsHandler handles points categories, behaviors, grants, balance, and scoreboard routes.
type PointsHandler struct {
	svc *service.PointsService
}

// NewPointsHandler constructs a PointsHandler.
func NewPointsHandler(svc *service.PointsService) *PointsHandler {
	return &PointsHandler{svc: svc}
}

// ── Categories ────────────────────────────────────────────────────────────

// ListCategories handles GET /v1/point-categories.
func (h *PointsHandler) ListCategories(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, r, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}
	includeArchived := r.URL.Query().Get("include_archived") == "true"
	rows, err := h.svc.ListCategories(r.Context(), householdID, includeArchived)
	if err != nil {
		respond.Error(w, r, http.StatusInternalServerError, "internal_error", "list categories")
		return
	}
	respond.JSON(w, http.StatusOK, rows)
}

// CreateCategory handles POST /v1/point-categories (admin only).
func (h *PointsHandler) CreateCategory(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, r, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}
	if !isAdmin(middleware.RoleFromCtx(r.Context())) {
		respond.Error(w, r, http.StatusForbidden, "forbidden", "admin role required")
		return
	}

	var req model.CreatePointCategoryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, r, http.StatusBadRequest, "bad_request", "invalid JSON body")
		return
	}
	if req.Name == "" {
		respond.Error(w, r, http.StatusBadRequest, "validation_error", "name required")
		return
	}

	c, err := h.svc.CreateCategory(r.Context(), householdID, req.Name, req.Color, req.SortOrder)
	if err != nil {
		respond.Error(w, r, http.StatusInternalServerError, "internal_error", "create category")
		return
	}
	respond.JSON(w, http.StatusCreated, c)
}

// UpdateCategory handles PATCH /v1/point-categories/{id} (admin only).
func (h *PointsHandler) UpdateCategory(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, r, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}
	if !isAdmin(middleware.RoleFromCtx(r.Context())) {
		respond.Error(w, r, http.StatusForbidden, "forbidden", "admin role required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respond.Error(w, r, http.StatusBadRequest, "bad_request", "invalid id")
		return
	}

	var req model.UpdatePointCategoryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, r, http.StatusBadRequest, "bad_request", "invalid JSON body")
		return
	}

	c, err := h.svc.UpdateCategory(r.Context(), householdID, id, req.Name, req.Color, req.SortOrder)
	if err != nil {
		respond.Error(w, r, http.StatusInternalServerError, "internal_error", "update category")
		return
	}
	respond.JSON(w, http.StatusOK, c)
}

// ArchiveCategory handles DELETE /v1/point-categories/{id} (admin only).
func (h *PointsHandler) ArchiveCategory(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, r, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}
	if !isAdmin(middleware.RoleFromCtx(r.Context())) {
		respond.Error(w, r, http.StatusForbidden, "forbidden", "admin role required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respond.Error(w, r, http.StatusBadRequest, "bad_request", "invalid id")
		return
	}
	if err := h.svc.ArchiveCategory(r.Context(), householdID, id); err != nil {
		respond.Error(w, r, http.StatusInternalServerError, "internal_error", "archive")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ── Behaviors ──────────────────────────────────────────────────────────────

// ListBehaviors handles GET /v1/behaviors.
func (h *PointsHandler) ListBehaviors(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, r, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}
	var catID *uuid.UUID
	if c := r.URL.Query().Get("category_id"); c != "" {
		id, err := uuid.Parse(c)
		if err != nil {
			respond.Error(w, r, http.StatusBadRequest, "bad_request", "invalid category_id")
			return
		}
		catID = &id
	}
	rows, err := h.svc.ListBehaviors(r.Context(), householdID, catID, r.URL.Query().Get("include_archived") == "true")
	if err != nil {
		respond.Error(w, r, http.StatusInternalServerError, "internal_error", "list behaviors")
		return
	}
	respond.JSON(w, http.StatusOK, rows)
}

// CreateBehavior handles POST /v1/behaviors (admin only).
func (h *PointsHandler) CreateBehavior(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, r, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}
	if !isAdmin(middleware.RoleFromCtx(r.Context())) {
		respond.Error(w, r, http.StatusForbidden, "forbidden", "admin role required")
		return
	}

	var req model.CreateBehaviorRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, r, http.StatusBadRequest, "bad_request", "invalid JSON body")
		return
	}
	if req.Name == "" {
		respond.Error(w, r, http.StatusBadRequest, "validation_error", "name required")
		return
	}
	if req.CategoryID == uuid.Nil {
		respond.Error(w, r, http.StatusBadRequest, "validation_error", "category_id required")
		return
	}

	b, err := h.svc.CreateBehavior(r.Context(), householdID, req.CategoryID, req.Name, req.SuggestedPoints)
	if err != nil {
		respond.Error(w, r, http.StatusInternalServerError, "internal_error", "create behavior")
		return
	}
	respond.JSON(w, http.StatusCreated, b)
}

// UpdateBehavior handles PATCH /v1/behaviors/{id} (admin only).
func (h *PointsHandler) UpdateBehavior(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, r, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}
	if !isAdmin(middleware.RoleFromCtx(r.Context())) {
		respond.Error(w, r, http.StatusForbidden, "forbidden", "admin role required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respond.Error(w, r, http.StatusBadRequest, "bad_request", "invalid id")
		return
	}

	var req model.UpdateBehaviorRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, r, http.StatusBadRequest, "bad_request", "invalid JSON body")
		return
	}

	b, err := h.svc.UpdateBehavior(r.Context(), householdID, id, req.Name, req.CategoryID, req.SuggestedPoints)
	if err != nil {
		respond.Error(w, r, http.StatusInternalServerError, "internal_error", "update behavior")
		return
	}
	respond.JSON(w, http.StatusOK, b)
}

// ArchiveBehavior handles DELETE /v1/behaviors/{id} (admin only).
func (h *PointsHandler) ArchiveBehavior(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, r, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}
	if !isAdmin(middleware.RoleFromCtx(r.Context())) {
		respond.Error(w, r, http.StatusForbidden, "forbidden", "admin role required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respond.Error(w, r, http.StatusBadRequest, "bad_request", "invalid id")
		return
	}
	if err := h.svc.ArchiveBehavior(r.Context(), householdID, id); err != nil {
		respond.Error(w, r, http.StatusInternalServerError, "internal_error", "archive")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ── Grants + balance + scoreboard ────────────────────────────────────────

// Grant handles POST /v1/points/{member_id}/grant (admin only).
func (h *PointsHandler) Grant(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, r, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}
	if !isAdmin(middleware.RoleFromCtx(r.Context())) {
		respond.Error(w, r, http.StatusForbidden, "forbidden", "admin role required")
		return
	}

	memberID, err := uuid.Parse(chi.URLParam(r, "member_id"))
	if err != nil {
		respond.Error(w, r, http.StatusBadRequest, "bad_request", "invalid member_id")
		return
	}

	var req model.GrantPointsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, r, http.StatusBadRequest, "bad_request", "invalid JSON body")
		return
	}
	if req.Points == 0 {
		respond.Error(w, r, http.StatusBadRequest, "validation_error", "points must be non-zero")
		return
	}

	accountID, _ := middleware.AccountIDFromCtx(r.Context())
	g, err := h.svc.Grant(r.Context(), householdID, memberID, req.CategoryID, req.BehaviorID, req.Points, req.Reason, &accountID)
	if err != nil {
		respond.Error(w, r, http.StatusInternalServerError, "internal_error", "grant")
		return
	}
	respond.JSON(w, http.StatusOK, g)
}

// Adjust handles POST /v1/points/{member_id}/adjust (admin only).
func (h *PointsHandler) Adjust(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, r, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}
	if !isAdmin(middleware.RoleFromCtx(r.Context())) {
		respond.Error(w, r, http.StatusForbidden, "forbidden", "admin role required")
		return
	}

	memberID, err := uuid.Parse(chi.URLParam(r, "member_id"))
	if err != nil {
		respond.Error(w, r, http.StatusBadRequest, "bad_request", "invalid member_id")
		return
	}

	var req model.AdjustPointsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, r, http.StatusBadRequest, "bad_request", "invalid JSON body")
		return
	}
	if req.Points == 0 {
		respond.Error(w, r, http.StatusBadRequest, "validation_error", "points must be non-zero")
		return
	}
	if req.Reason == "" {
		respond.Error(w, r, http.StatusBadRequest, "validation_error", "reason required")
		return
	}

	accountID, _ := middleware.AccountIDFromCtx(r.Context())
	g, err := h.svc.Grant(r.Context(), householdID, memberID, nil, nil, req.Points, req.Reason, &accountID)
	if err != nil {
		respond.Error(w, r, http.StatusInternalServerError, "internal_error", "adjust")
		return
	}
	respond.JSON(w, http.StatusOK, g)
}

// GetBalance handles GET /v1/points/{member_id}.
func (h *PointsHandler) GetBalance(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, r, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}
	memberID, err := uuid.Parse(chi.URLParam(r, "member_id"))
	if err != nil {
		respond.Error(w, r, http.StatusBadRequest, "bad_request", "invalid member_id")
		return
	}
	bal, err := h.svc.GetBalance(r.Context(), householdID, memberID)
	if err != nil {
		respond.Error(w, r, http.StatusInternalServerError, "internal_error", "get balance")
		return
	}
	respond.JSON(w, http.StatusOK, bal)
}

// Scoreboard handles GET /v1/points/scoreboard.
func (h *PointsHandler) Scoreboard(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, r, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}
	rows, err := h.svc.Scoreboard(r.Context(), householdID)
	if err != nil {
		respond.Error(w, r, http.StatusInternalServerError, "internal_error", "scoreboard")
		return
	}
	respond.JSON(w, http.StatusOK, rows)
}
