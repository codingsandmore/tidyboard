package handler

import (
	"net/http"
	"strconv"

	"github.com/tidyboard/tidyboard/internal/handler/respond"
	"github.com/tidyboard/tidyboard/internal/middleware"
	"github.com/tidyboard/tidyboard/internal/service"
)

// AdminHandler handles admin-only endpoints.
type AdminHandler struct {
	audit  *service.AuditService
	backup *service.BackupService
}

// NewAdminHandler constructs an AdminHandler.
func NewAdminHandler(audit *service.AuditService, backup *service.BackupService) *AdminHandler {
	return &AdminHandler{audit: audit, backup: backup}
}

// ListAudit handles GET /v1/audit.
// Requires role=admin.
func (h *AdminHandler) ListAudit(w http.ResponseWriter, r *http.Request) {
	if middleware.RoleFromCtx(r.Context()) != "admin" {
		respond.Error(w, r, http.StatusForbidden, "forbidden", "admin role required")
		return
	}

	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, r, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}

	limit := int32(100)
	offset := int32(0)
	if l := r.URL.Query().Get("limit"); l != "" {
		if v, err := strconv.ParseInt(l, 10, 32); err == nil && v > 0 {
			limit = int32(v)
		}
	}
	if o := r.URL.Query().Get("offset"); o != "" {
		if v, err := strconv.ParseInt(o, 10, 32); err == nil && v >= 0 {
			offset = int32(v)
		}
	}

	entries, err := h.audit.ListHousehold(r.Context(), householdID, limit, offset)
	if err != nil {
		respond.Error(w, r, http.StatusInternalServerError, "internal_error", "failed to list audit entries")
		return
	}
	respond.JSON(w, http.StatusOK, entries)
}

// TriggerBackup handles POST /v1/admin/backup/run.
// Requires role=admin.
func (h *AdminHandler) TriggerBackup(w http.ResponseWriter, r *http.Request) {
	if middleware.RoleFromCtx(r.Context()) != "admin" {
		respond.Error(w, r, http.StatusForbidden, "forbidden", "admin role required")
		return
	}

	if h.backup == nil {
		respond.Error(w, r, http.StatusServiceUnavailable, "backup_disabled", "backup service is not enabled")
		return
	}

	go func() {
		if err := h.backup.RunBackup(r.Context(), "manual"); err != nil {
			// Error already logged in BackupService.
			_ = err
		}
	}()

	respond.JSON(w, http.StatusAccepted, map[string]string{
		"status":  "accepted",
		"message": "backup started in background",
	})
}
