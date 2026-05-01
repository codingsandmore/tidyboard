package handler

// Reset endpoint — guarded by the TIDYBOARD_ALLOW_RESET environment variable.
// This file is compiled into the production binary but the endpoint returns
// 403 unless TIDYBOARD_ALLOW_RESET=true is explicitly set, making it safe to
// ship without a build-tag while still being harmless in prod.
//
// To enable: start the server with TIDYBOARD_ALLOW_RESET=true.
// This is set automatically by e2e-real/global-setup.ts.

import (
	"context"
	"fmt"
	"net/http"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/tidyboard/tidyboard/internal/handler/respond"
)

// ResetHandler exposes POST /v1/admin/reset for integration tests.
type ResetHandler struct {
	pool *pgxpool.Pool
}

// NewResetHandler constructs a ResetHandler.
func NewResetHandler(pool *pgxpool.Pool) *ResetHandler {
	return &ResetHandler{pool: pool}
}

// Reset handles POST /v1/admin/reset.
// Truncates all application tables in dependency order.
// Returns 403 unless TIDYBOARD_ALLOW_RESET=true.
func (h *ResetHandler) Reset(w http.ResponseWriter, r *http.Request) {
	if os.Getenv("TIDYBOARD_ALLOW_RESET") != "true" {
		respond.Error(w, r, http.StatusForbidden, "forbidden",
			"reset endpoint is disabled; set TIDYBOARD_ALLOW_RESET=true to enable")
		return
	}

	// Truncate in reverse FK order so constraints are not violated.
	// goose migrations table is left intact so migrations don't re-run.
	tables := []string{
		"audit_log",
		"list_items",
		"lists",
		"events",
		"calendar_sources",
		"members",
		"households",
		"accounts",
	}

	for _, tbl := range tables {
		if _, err := h.pool.Exec(
			context.Background(),
			fmt.Sprintf("TRUNCATE TABLE %s CASCADE", tbl),
		); err != nil {
			// Table might not exist yet (partial migration). Log and continue.
			respond.Error(w, r, http.StatusInternalServerError, "reset_error",
				fmt.Sprintf("failed to truncate %s: %v", tbl, err))
			return
		}
	}

	respond.JSON(w, http.StatusOK, map[string]string{
		"status":  "ok",
		"message": "all tables truncated",
	})
}
