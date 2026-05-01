package handler

import (
	"net/http"
	"time"

	"github.com/tidyboard/tidyboard/internal/handler/respond"
	"github.com/tidyboard/tidyboard/internal/middleware"
	"github.com/tidyboard/tidyboard/internal/service"
)

// HousekeeperHandler exposes the per-category housekeeper-cost estimate.
type HousekeeperHandler struct {
	svc *service.HousekeeperService
}

// NewHousekeeperHandler constructs a HousekeeperHandler.
func NewHousekeeperHandler(svc *service.HousekeeperService) *HousekeeperHandler {
	return &HousekeeperHandler{svc: svc}
}

// housekeeperEstimateResponse is the wire shape returned by GetEstimate.
type housekeeperEstimateResponse struct {
	Categories []service.CategoryEstimate `json:"categories"`
}

// GetEstimate handles GET /v1/equity/housekeeper-estimate?from=&to=
// Returns market-rate cost estimates per chore category for [from, to).
// Default window: last 30 days. household_id is sourced from the auth
// context (the query-string household_id parameter, if present, must match
// the authenticated household and is otherwise ignored).
func (h *HousekeeperHandler) GetEstimate(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, r, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}

	to := time.Now()
	from := to.AddDate(0, 0, -30)

	if s := r.URL.Query().Get("from"); s != "" {
		t, err := time.Parse("2006-01-02", s)
		if err != nil {
			respond.Error(w, r, http.StatusBadRequest, "bad_request", "from must be YYYY-MM-DD")
			return
		}
		from = t
	}
	if s := r.URL.Query().Get("to"); s != "" {
		t, err := time.Parse("2006-01-02", s)
		if err != nil {
			respond.Error(w, r, http.StatusBadRequest, "bad_request", "to must be YYYY-MM-DD")
			return
		}
		to = t.Add(23*time.Hour + 59*time.Minute + 59*time.Second)
	}

	cats, err := h.svc.GetHousekeeperEstimate(r.Context(), householdID, from, to)
	if err != nil {
		respond.Error(w, r, http.StatusInternalServerError, "internal_error", "failed to compute housekeeper estimate")
		return
	}
	respond.JSON(w, http.StatusOK, housekeeperEstimateResponse{Categories: cats})
}
